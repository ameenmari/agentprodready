import type { AiExecutionRequest, AiFinishReason, NormalizedAiStreamEvent } from '@agentprodready/ai-provider';
import { ProviderAdapterError } from '@agentprodready/ai-provider';

/** Internal vendor stream event shape — never exported from package index. */
export type AnthropicStreamEvent =
  | { readonly type: 'message_start'; readonly message?: { readonly usage?: { readonly input_tokens?: number } } }
  | {
      readonly type: 'content_block_start';
      readonly index?: number;
      readonly content_block?: {
        readonly type?: string;
        readonly id?: string;
        readonly name?: string;
        readonly input?: unknown;
      };
    }
  | {
      readonly type: 'content_block_delta';
      readonly index?: number;
      readonly delta?: {
        readonly type?: string;
        readonly text?: string;
        readonly partial_json?: string;
      };
    }
  | { readonly type: 'content_block_stop'; readonly index?: number }
  | {
      readonly type: 'message_delta';
      readonly delta?: { readonly stop_reason?: string | null };
      readonly usage?: { readonly output_tokens?: number };
    }
  | { readonly type: 'message_stop' }
  | { readonly type: 'error'; readonly error?: { readonly message?: string } };

type ToolAssembly = {
  id: string;
  name: string;
  json: string;
};

export async function* translateAnthropicStream(
  request: AiExecutionRequest,
  events: AsyncIterable<AnthropicStreamEvent>,
): AsyncIterable<NormalizedAiStreamEvent> {
  const diagnosticId = `ai:${request.requestId}`;
  let sequence = 0;
  let finishReason: AiFinishReason = 'unknown';
  let inputTokens = 0;
  let outputTokens = 0;
  const tools = new Map<number, ToolAssembly>();
  const emitted = new Set<string>();

  try {
    for await (const event of events) {
      if (request.signal?.aborted === true) {
        yield { type: 'cancelled', sequence, diagnosticId };
        return;
      }

      if (event.type === 'message_start') {
        inputTokens = event.message?.usage?.input_tokens ?? inputTokens;
        continue;
      }

      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block?.type === 'tool_use') {
          tools.set(event.index ?? 0, {
            id: block.id?.trim() ?? '',
            name: block.name?.trim() ?? '',
            json: '',
          });
        }
        continue;
      }

      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text.length > 0) {
          yield {
            type: 'content',
            sequence: sequence++,
            part: Object.freeze({ type: 'text' as const, text: delta.text }),
          };
        }
        if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
          const index = event.index ?? 0;
          const current = tools.get(index) ?? { id: '', name: '', json: '' };
          current.json = `${current.json}${delta.partial_json}`;
          tools.set(index, current);
        }
        continue;
      }

      if (event.type === 'content_block_stop') {
        const index = event.index ?? 0;
        const assembly = tools.get(index);
        if (assembly !== undefined) {
          const complete = tryComplete(assembly);
          if (complete !== undefined && !emitted.has(complete.id)) {
            emitted.add(complete.id);
            yield { type: 'tool-call', sequence: sequence++, call: complete };
          }
        }
        continue;
      }

      if (event.type === 'message_delta') {
        finishReason = mapStopReason(event.delta?.stop_reason);
        outputTokens = event.usage?.output_tokens ?? outputTokens;
        continue;
      }

      if (event.type === 'message_stop') {
        if (request.streaming?.includeUsage === true) {
          yield {
            type: 'usage',
            sequence: sequence++,
            usage: Object.freeze({
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
            }),
          };
        }
        yield { type: 'completed', sequence: sequence++, finishReason, diagnosticId };
        return;
      }

      // Remaining discriminated union member is stream error.
      const message =
        typeof event.error?.message === 'string' ? event.error.message : 'Anthropic stream error';
      throw new ProviderAdapterError('unavailable', message, true);
    }

    yield { type: 'completed', sequence: sequence++, finishReason, diagnosticId };
  } catch (error) {
    if (error instanceof ProviderAdapterError) {
      yield {
        type: 'failed',
        sequence,
        code: mapCode(error.kind),
        message: error.message,
        diagnosticId,
        retryable: error.retryable,
      };
      return;
    }
    throw error;
  }
}

function tryComplete(assembly: ToolAssembly):
  | { readonly id: string; readonly name: string; readonly arguments: Readonly<Record<string, unknown>> }
  | undefined {
  if (assembly.id === '' || assembly.name === '') return undefined;
  let parsed: unknown;
  try {
    parsed = assembly.json.trim() === '' ? {} : JSON.parse(assembly.json);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  return Object.freeze({
    id: assembly.id,
    name: assembly.name,
    arguments: Object.freeze({ ...(parsed as Record<string, unknown>) }),
  });
}

function mapStopReason(reason: string | null | undefined): AiFinishReason {
  switch (reason) {
    case 'end_turn':
      return 'completed';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool-calls';
    case 'stop_sequence':
      return 'stopped';
    default:
      return 'unknown';
  }
}

function mapCode(
  kind: ProviderAdapterError['kind'],
): 'AI_AUTHENTICATION' | 'AI_RATE_LIMITED' | 'AI_CONTEXT_LIMIT' | 'AI_INVALID_REQUEST' | 'AI_UNAVAILABLE' | 'AI_PROVIDER_TIMEOUT' | 'AI_UNKNOWN' {
  switch (kind) {
    case 'authentication':
      return 'AI_AUTHENTICATION';
    case 'rate-limit':
      return 'AI_RATE_LIMITED';
    case 'context-limit':
      return 'AI_CONTEXT_LIMIT';
    case 'invalid-request':
      return 'AI_INVALID_REQUEST';
    case 'unavailable':
      return 'AI_UNAVAILABLE';
    case 'timeout':
      return 'AI_PROVIDER_TIMEOUT';
    default:
      return 'AI_UNKNOWN';
  }
}
