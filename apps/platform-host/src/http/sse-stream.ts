import { once } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RuntimeStreamEvent } from '@agentprodready/runtime';
import type { LocalCapabilityExecutionOutput } from '../composition/local-reference-capability-execution.js';

export interface SseStreamOptions {
  readonly heartbeatIntervalMs: number;
  readonly maxDrainWaitMs: number;
  readonly correlationId: string;
  readonly executionReference: string;
  readonly agentId: string;
  readonly onCancel: () => void;
}

export interface SseStreamTelemetry {
  activeStreams: number;
  started: number;
  completed: number;
  failed: number;
  cancelled: number;
  clientDisconnects: number;
  backpressureWaits: number;
  drainTimeouts: number;
  bytesSent: number;
  chunkCount: number;
}

export const sseTelemetry: SseStreamTelemetry = {
  activeStreams: 0,
  started: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  clientDisconnects: 0,
  backpressureWaits: 0,
  drainTimeouts: 0,
  bytesSent: 0,
  chunkCount: 0,
};

export function writeSseHeaders(response: ServerResponse, correlationId: string): void {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Correlation-Id': correlationId,
  });
}

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function writeFrame(
  response: ServerResponse,
  payload: string,
  maxDrainWaitMs: number,
  onDrainTimeout: () => void,
): Promise<'ok' | 'drain-timeout' | 'closed'> {
  if (response.writableEnded || response.destroyed) return 'closed';
  const accepted = response.write(payload);
  sseTelemetry.bytesSent += Buffer.byteLength(payload);
  if (accepted) return 'ok';
  sseTelemetry.backpressureWaits++;
  try {
    await Promise.race([
      once(response, 'drain'),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('drain-timeout'));
        }, maxDrainWaitMs);
      }),
    ]);
    return 'ok';
  } catch {
    onDrainTimeout();
    sseTelemetry.drainTimeouts++;
    return 'drain-timeout';
  }
}

export async function pipeRuntimeStreamToSse(
  request: IncomingMessage,
  response: ServerResponse,
  stream: AsyncIterable<RuntimeStreamEvent<LocalCapabilityExecutionOutput>>,
  options: SseStreamOptions,
): Promise<void> {
  sseTelemetry.activeStreams++;
  sseTelemetry.started++;
  const state = { cancelled: false, finished: false };
  const firstChunkAt = { value: 0 };

  const cancelOnce = (): void => {
    if (state.cancelled || state.finished) return;
    state.cancelled = true;
    sseTelemetry.clientDisconnects++;
    options.onCancel();
  };

  const onRequestClose = (): void => {
    if (!state.finished) cancelOnce();
  };
  request.once('close', onRequestClose);

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  if (options.heartbeatIntervalMs > 0) {
    heartbeat = setInterval(() => {
      if (!response.writableEnded && !response.destroyed) {
        response.write(': ping\n\n');
      }
    }, options.heartbeatIntervalMs);
    if (typeof heartbeat.unref === 'function') heartbeat.unref();
  }

  const drainTimeoutCancel = (): void => {
    options.onCancel();
  };

  try {
    const startOk = await writeFrame(
      response,
      frame('start', {
        executionReference: options.executionReference,
        correlationId: options.correlationId,
        agentId: options.agentId,
      }),
      options.maxDrainWaitMs,
      drainTimeoutCancel,
    );
    if (startOk !== 'ok') return;

    for await (const event of stream) {
      if (state.cancelled || response.writableEnded || response.destroyed) break;

      switch (event.type) {
        case 'delta': {
          if (firstChunkAt.value === 0) firstChunkAt.value = Date.now();
          sseTelemetry.chunkCount++;
          if (event.payload.kind === 'text') {
            const status = await writeFrame(
              response,
              frame('delta', { sequence: event.sequence, text: event.payload.text }),
              options.maxDrainWaitMs,
              drainTimeoutCancel,
            );
            if (status !== 'ok') return;
          } else if (event.payload.kind === 'usage') {
            const status = await writeFrame(
              response,
              frame('usage', { sequence: event.sequence, usage: event.payload.usage }),
              options.maxDrainWaitMs,
              drainTimeoutCancel,
            );
            if (status !== 'ok') return;
          } else {
            const toolPayload = event.payload as Readonly<{
              kind: 'tool_call' | 'tool_result';
              toolCallId: string;
              toolId: string;
              status: string;
              errorCode?: string;
            }>;
            const status = await writeFrame(
              response,
              frame(toolPayload.kind, {
                sequence: event.sequence,
                toolCallId: toolPayload.toolCallId,
                toolId: toolPayload.toolId,
                status: toolPayload.status,
                ...(toolPayload.errorCode ? { errorCode: toolPayload.errorCode } : {}),
              }),
              options.maxDrainWaitMs,
              drainTimeoutCancel,
            );
            if (status !== 'ok') return;
          }
          break;
        }
        case 'completed': {
          const text = event.result.output.aiResult.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('');
          const status = await writeFrame(
            response,
            frame('complete', {
              sequence: event.sequence,
              executionReference: options.executionReference,
              state: 'completed',
              finishReason: event.result.output.aiResult.finishReason,
              text,
            }),
            options.maxDrainWaitMs,
            drainTimeoutCancel,
          );
          if (status === 'ok') sseTelemetry.completed++;
          state.finished = true;
          return;
        }
        case 'failed': {
          await writeFrame(
            response,
            frame('error', {
              sequence: event.sequence,
              executionReference: options.executionReference,
              state: 'failed',
              code: event.result.error.code,
              message: event.result.error.message,
            }),
            options.maxDrainWaitMs,
            drainTimeoutCancel,
          );
          sseTelemetry.failed++;
          state.finished = true;
          return;
        }
        case 'cancelled': {
          await writeFrame(
            response,
            frame('cancelled', {
              sequence: event.sequence,
              executionReference: options.executionReference,
              state: 'cancelled',
              code: event.result.error.code,
              message: event.result.error.message,
            }),
            options.maxDrainWaitMs,
            drainTimeoutCancel,
          );
          sseTelemetry.cancelled++;
          state.finished = true;
          return;
        }
      }
    }
  } finally {
    state.finished = true;
    if (heartbeat !== undefined) clearInterval(heartbeat);
    request.off('close', onRequestClose);
    sseTelemetry.activeStreams = Math.max(0, sseTelemetry.activeStreams - 1);
    if (!response.writableEnded) {
      response.end();
    }
  }
}
