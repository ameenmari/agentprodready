import type { RuntimeStreamEvent } from '@agentprodready/runtime';
import { SimpleAgentError } from './errors.js';
import type { AgentStreamEvent, AgentToolStreamStatus, AgentUsage } from './types.js';

export async function* mapRuntimeStream(
  executionId: string,
  stream: AsyncIterable<RuntimeStreamEvent>,
): AsyncIterable<AgentStreamEvent> {
  yield Object.freeze({ type: 'start', executionId });

  let completed = false;
  for await (const event of stream) {
    switch (event.type) {
      case 'delta': {
        if (event.payload.kind === 'text') {
          yield Object.freeze({ type: 'text', text: event.payload.text });
        } else if (event.payload.kind === 'usage') {
          yield Object.freeze({ type: 'usage', usage: toUsage(event.payload.usage) });
        } else {
          yield Object.freeze({
            type: event.payload.kind,
            toolCallId: event.payload.toolCallId,
            toolId: event.payload.toolId,
            status: toToolStatus(event.payload.status),
          });
        }
        break;
      }
      case 'completed': {
        completed = true;
        const resultUsage = extractUsageFromResult(event.result);
        if (resultUsage !== undefined) {
          yield Object.freeze({ type: 'usage', usage: resultUsage });
        }
        yield Object.freeze({ type: 'complete', executionId: event.executionId });
        break;
      }
      case 'failed': {
        throw mapStreamFailure(event.result.error.code, event.result.error.message, event.executionId);
      }
      case 'cancelled': {
        throw new SimpleAgentError(
          'AGENT_STREAM_FAILED',
          'Agent stream was cancelled.',
          event.executionId,
        );
      }
    }
  }

  if (!completed) {
    throw new SimpleAgentError(
      'AGENT_STREAM_FAILED',
      'Agent stream ended without a completion event.',
      executionId,
    );
  }
}

function toToolStatus(status: string): AgentToolStreamStatus {
  if (status === 'executing' || status === 'succeeded' || status === 'failed') return status;
  return 'failed';
}

function toUsage(usage: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}): AgentUsage {
  return Object.freeze({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  });
}

function extractUsageFromResult(result: unknown): AgentUsage | undefined {
  if (typeof result !== 'object' || result === null || !('output' in result)) return undefined;
  const output = (result as { output?: { aiResult?: { usage?: AgentUsage } } }).output;
  const usage = output?.aiResult?.usage;
  if (usage === undefined) return undefined;
  return Object.freeze({ ...usage });
}

function mapStreamFailure(code: string, message: string, executionId: string): SimpleAgentError {
  if (/timeout/i.test(code) || /timeout/i.test(message)) {
    return new SimpleAgentError('AGENT_TIMEOUT', 'Agent stream timed out.', executionId);
  }
  if (/provider|unavailable|ai_/i.test(code) || /provider/i.test(message)) {
    return new SimpleAgentError(
      'AGENT_PROVIDER_UNAVAILABLE',
      'The configured AI provider is unavailable.',
      executionId,
    );
  }
  if (/TOOL_AUTHORIZATION|tool authorization/i.test(code) || /tool authorization/i.test(message)) {
    return new SimpleAgentError('AGENT_TOOL_AUTHORIZATION', message, executionId);
  }
  if (/TOOL_APPROVAL|approval required/i.test(code) || /approval required/i.test(message)) {
    return new SimpleAgentError('AGENT_TOOL_APPROVAL_REQUIRED', message, executionId);
  }
  if (/TOOL_REJECTED|TOOL_MAX/i.test(code) || /TOOL_MAX/i.test(message)) {
    return new SimpleAgentError('AGENT_TOOL_REJECTED', message, executionId);
  }
  return new SimpleAgentError(
    'AGENT_STREAM_FAILED',
    'Agent stream failed. Check configuration and try again.',
    executionId,
  );
}
