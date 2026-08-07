import type { AiExecutionRequest, AiFinishReason, NormalizedAiStreamEvent } from '@agentforge/ai-provider';
import { ProviderAdapterError } from '@agentforge/ai-provider';

/** Internal vendor chunk shape — never exported from package index. */
export interface OpenAiChatCompletionChunk {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: readonly {
    readonly finish_reason?: string | null;
    readonly delta?: {
      readonly content?: string | null;
      readonly tool_calls?: readonly unknown[];
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

/**
 * Translate a vendor stream into normalized AI stream events.
 * Contiguous sequences from 0; exactly one terminal.
 */
export async function* translateOpenAiStream(
  request: AiExecutionRequest,
  chunks: AsyncIterable<OpenAiChatCompletionChunk>,
): AsyncIterable<NormalizedAiStreamEvent> {
  const diagnosticId = `ai:${request.requestId}`;
  let sequence = 0;
  let finishReason: AiFinishReason = 'unknown';

  for await (const chunk of chunks) {
    if (request.signal?.aborted === true) {
      yield { type: 'cancelled', sequence, diagnosticId };
      return;
    }

    const choice = chunk.choices?.[0];
    const delta = choice?.delta;

    if (delta?.tool_calls !== undefined && delta.tool_calls.length > 0) {
      throw new ProviderAdapterError(
        'invalid-request',
        'Tool calling is not supported by openai-ai streaming in v0.8',
        false,
      );
    }

    const text = delta?.content;
    if (typeof text === 'string' && text.length > 0) {
      yield { type: 'content', sequence: sequence++, part: { type: 'text', text } };
    }

    if (choice?.finish_reason !== undefined && choice.finish_reason !== null) {
      finishReason = mapOpenAiStreamFinishReason(choice.finish_reason);
      if (finishReason === 'tool-calls') {
        throw new ProviderAdapterError(
          'invalid-request',
          'Tool calling is not supported by openai-ai streaming in v0.8',
          false,
        );
      }
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

  yield {
    type: 'completed',
    sequence,
    finishReason,
    diagnosticId,
  };
}
