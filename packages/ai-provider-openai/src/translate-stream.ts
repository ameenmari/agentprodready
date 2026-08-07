import type { AiExecutionRequest, AiFinishReason, NormalizedAiStreamEvent, NormalizedToolCall } from '@agentprodready/ai-provider';
import { ProviderAdapterError } from '@agentprodready/ai-provider';

/** Internal vendor chunk shape — never exported from package index. */
export interface OpenAiChatCompletionChunk {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: readonly {
    readonly finish_reason?: string | null;
    readonly delta?: {
      readonly content?: string | null;
      readonly tool_calls?: readonly {
        readonly index?: number;
        readonly id?: string;
        readonly type?: string;
        readonly function?: { readonly name?: string; readonly arguments?: string };
      }[];
    };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

export function mapOpenAiStreamFinishReason(reason: string | null | undefined): AiFinishReason {
  switch (reason) {
    case 'stop':
      return 'completed';
    case 'length':
      return 'length';
    case 'tool_calls':
    case 'function_call':
      return 'tool-calls';
    case 'content_filter':
      return 'content-filtered';
    case null:
    case undefined:
      return 'unknown';
    default:
      return 'unknown';
  }
}

type AssembledCall = {
  id: string;
  name: string;
  arguments: string;
};

/**
 * Translate a vendor stream into normalized AI stream events.
 * Contiguous sequences from 0; exactly one terminal.
 * Tool-call fragments are assembled; only complete NormalizedToolCall crosses the boundary.
 */
export async function* translateOpenAiStream(
  request: AiExecutionRequest,
  chunks: AsyncIterable<OpenAiChatCompletionChunk>,
): AsyncIterable<NormalizedAiStreamEvent> {
  const diagnosticId = `ai:${request.requestId}`;
  let sequence = 0;
  let finishReason: AiFinishReason = 'unknown';
  const assemblies = new Map<number, AssembledCall>();
  const emitted = new Set<string>();
  let failed = false;

  try {
    for await (const chunk of chunks) {
      if (request.signal?.aborted === true) {
        yield { type: 'cancelled', sequence, diagnosticId };
        return;
      }

      const choice = chunk.choices?.[0];
      const delta = choice?.delta;

      if (delta?.tool_calls !== undefined) {
        for (const fragment of delta.tool_calls) {
          const index = fragment.index ?? 0;
          const current = assemblies.get(index) ?? { id: '', name: '', arguments: '' };
          if (typeof fragment.id === 'string' && fragment.id.length > 0) current.id = fragment.id;
          if (typeof fragment.function?.name === 'string' && fragment.function.name.length > 0) {
            current.name = `${current.name}${fragment.function.name}`;
          }
          if (typeof fragment.function?.arguments === 'string') {
            current.arguments = `${current.arguments}${fragment.function.arguments}`;
          }
          assemblies.set(index, current);

          const complete = tryComplete(current, false);
          if (complete !== undefined && !emitted.has(complete.id)) {
            emitted.add(complete.id);
            yield { type: 'tool-call', sequence: sequence++, call: complete };
          }
        }
      }

      const text = delta?.content;
      if (typeof text === 'string' && text.length > 0) {
        yield { type: 'content', sequence: sequence++, part: { type: 'text', text } };
      }

      if (choice?.finish_reason !== undefined && choice.finish_reason !== null) {
        finishReason = mapOpenAiStreamFinishReason(choice.finish_reason);
      }

      if (chunk.usage !== undefined && request.streaming?.includeUsage === true) {
        const inputTokens = chunk.usage.prompt_tokens ?? 0;
        const outputTokens = chunk.usage.completion_tokens ?? 0;
        const totalTokens = chunk.usage.total_tokens ?? inputTokens + outputTokens;
        yield {
          type: 'usage',
          sequence: sequence++,
          usage: { inputTokens, outputTokens, totalTokens },
        };
      }
    }

    if (request.signal?.aborted === true) {
      yield { type: 'cancelled', sequence, diagnosticId };
      return;
    }

    if (finishReason === 'tool-calls') {
      for (const [, current] of [...assemblies.entries()].sort((a, b) => a[0] - b[0])) {
        if (emitted.has(current.id)) continue;
        const complete = tryComplete(current, true);
        if (complete === undefined) {
          failed = true;
          yield {
            type: 'failed',
            sequence,
            code: 'AI_INVALID_REQUEST',
            message: 'Incomplete streamed tool call at terminal',
            diagnosticId,
            retryable: false,
          };
          return;
        }
        emitted.add(complete.id);
        yield { type: 'tool-call', sequence: sequence++, call: complete };
      }
      if (emitted.size === 0) {
        failed = true;
        yield {
          type: 'failed',
          sequence,
          code: 'AI_INVALID_REQUEST',
          message: 'tool-calls finish without complete tool calls',
          diagnosticId,
          retryable: false,
        };
        return;
      }
    }

    yield {
      type: 'completed',
      sequence,
      finishReason,
      diagnosticId,
    };
  } catch (error) {
    if (failed) throw error;
    if (error instanceof ProviderAdapterError) {
      yield {
        type: 'failed',
        sequence,
        code: 'AI_INVALID_REQUEST',
        message: error.message,
        diagnosticId,
        retryable: false,
      };
      return;
    }
    throw error;
  }
}

function tryComplete(current: AssembledCall, allowEmptyArguments: boolean): NormalizedToolCall | undefined {
  if (current.id.trim() === '' || current.name.trim() === '') return undefined;
  if (current.arguments.trim() === '') {
    if (!allowEmptyArguments) return undefined;
    return Object.freeze({
      id: current.id,
      name: current.name,
      arguments: Object.freeze({}),
    });
  }
  try {
    const parsed: unknown = JSON.parse(current.arguments);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
    return Object.freeze({
      id: current.id,
      name: current.name,
      arguments: Object.freeze({ ...(parsed as Record<string, unknown>) }),
    });
  } catch {
    return undefined;
  }
}
