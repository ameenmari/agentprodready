import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { LocalReferenceComposition } from '../composition/local-reference-composition-helpers.js';
import { PRODUCT_VERSION } from '../config/local-reference-config.js';
import { validateInvokeRequest } from '../composition/local-reference-composition.js';
import { pipeRuntimeStreamToSse, writeSseHeaders } from './sse-stream.js';

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function correlationId(header: string | string[] | undefined): string {
  const value = headerValue(header);
  if (value !== undefined && value.trim() !== '') return value.trim();
  return crypto.randomUUID();
}

function jsonResponse(
  status: number,
  body: unknown,
  correlation: string,
): { readonly status: number; readonly headers: Record<string, string>; readonly body: string } {
  return Object.freeze({
    status,
    headers: Object.freeze({
      'Content-Type': 'application/json; charset=utf-8',
      'X-Correlation-Id': correlation,
    }),
    body: JSON.stringify(body),
  });
}

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const parts: string[] = [];
  for await (const chunk of request) {
    parts.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
  }
  if (parts.length === 0) return {};
  return JSON.parse(parts.join('')) as unknown;
}

export function createLocalReferenceServer(composition: LocalReferenceComposition): Server {
  return createServer((request, response) => {
    void handleRequest(composition, request, response);
  });
}

async function handleRequest(
  composition: LocalReferenceComposition,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
    const corr = correlationId(request.headers['x-correlation-id']);
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/health') {
        const payload = Object.freeze({
          status: 'ok',
          service: 'agentforge-local-reference',
          version: PRODUCT_VERSION,
          uptimeMs: Date.now() - composition.startedAt,
          correlationId: corr,
        });
        const result = jsonResponse(200, payload, corr);
        response.writeHead(result.status, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/ready') {
        const ready = await composition.readinessService.isReady();
        const checks = (await composition.healthService.check()).map((item) =>
          Object.freeze({ name: item.name, status: item.status }),
        );
        const payload = Object.freeze({ ready, checks, correlationId: corr });
        const result = jsonResponse(ready ? 200 : 503, payload, corr);
        response.writeHead(result.status, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/v1/agents/reference-agent/invoke') {
        let body: unknown;
        try {
          body = await readJsonBody(request);
        } catch {
          const result = jsonResponse(
            400,
            {
              status: 'failed',
              correlationId: corr,
              errors: [{ code: 'REQUEST_INVALID', message: 'Invalid JSON body', retryable: false, details: {} }],
              diagnosticsReference: `local-reference:error:${corr}`,
            },
            corr,
          );
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }

        const validated = validateInvokeRequest(body);
        if (!validated.ok) {
          const result = jsonResponse(
            400,
            {
              status: 'failed',
              correlationId: corr,
              errors: [{ code: 'REQUEST_INVALID', message: validated.message, retryable: false, details: {} }],
              diagnosticsReference: `local-reference:error:${corr}`,
            },
            corr,
          );
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }

        const invokeResult = await composition.invoke(
          validated.objective,
          validated.inputs,
          corr,
          headerValue(request.headers.authorization),
        );
        const result = jsonResponse(invokeResult.status, invokeResult.body, invokeResult.correlationId);
        response.writeHead(result.status, result.headers);
        response.end(result.body);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/v1/agents/reference-agent/invoke/stream') {
        let body: unknown;
        try {
          body = await readJsonBody(request);
        } catch {
          const result = jsonResponse(
            400,
            {
              status: 'failed',
              correlationId: corr,
              errors: [{ code: 'REQUEST_INVALID', message: 'Invalid JSON body', retryable: false, details: {} }],
              diagnosticsReference: `local-reference:error:${corr}`,
            },
            corr,
          );
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }

        const validated = validateInvokeRequest(body);
        if (!validated.ok) {
          const result = jsonResponse(
            400,
            {
              status: 'failed',
              correlationId: corr,
              errors: [{ code: 'REQUEST_INVALID', message: validated.message, retryable: false, details: {} }],
              diagnosticsReference: `local-reference:error:${corr}`,
            },
            corr,
          );
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }

        const started = await composition.beginStreamInvoke(
          validated.objective,
          validated.inputs,
          corr,
          headerValue(request.headers.authorization),
        );
        if (!started.ok) {
          const result = jsonResponse(started.status, started.body, started.correlationId);
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }

        writeSseHeaders(response, started.correlationId);
        await pipeRuntimeStreamToSse(request, response, started.stream, {
          heartbeatIntervalMs: composition.config.streamingHeartbeatIntervalMs,
          maxDrainWaitMs: composition.config.streamingMaxDrainWaitMs,
          correlationId: started.correlationId,
          executionReference: started.executionReference,
          agentId: 'reference-agent',
          onCancel: started.cancel,
        });
        return;
      }

      response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'X-Correlation-Id': corr });
      response.end(
        JSON.stringify({
          status: 'failed',
          correlationId: corr,
          errors: [{ code: 'RESOURCE_NOT_FOUND', message: 'Route not found', retryable: false, details: {} }],
          diagnosticsReference: `local-reference:error:${corr}`,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      const result = jsonResponse(
        500,
        {
          status: 'failed',
          correlationId: corr,
          errors: [{ code: 'INTERNAL_ERROR', message, retryable: false, details: {} }],
          diagnosticsReference: `local-reference:error:${corr}`,
        },
        corr,
      );
      response.writeHead(result.status, result.headers);
      response.end(result.body);
    }
}

export async function startLocalReferenceServer(composition: LocalReferenceComposition): Promise<Server> {
  const server = createLocalReferenceServer(composition);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(composition.config.port, composition.config.host, () => {
      resolve();
    });
  });
  return server;
}

export async function stopLocalReferenceServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) reject(error);
      else resolve();
    });
  });
}
