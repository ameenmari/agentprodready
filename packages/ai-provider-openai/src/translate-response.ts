import type { AiExecutionRequest, AiFinishReason, NormalizedAiResult } from '@agentforge/ai-provider';
import type { OpenAiProviderConfig } from './config.js';
import { ProviderAdapterError } from '@agentforge/ai-provider';

export interface OpenAiChatCompletionResponse {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: readonly {
    readonly finish_reason?: string | null;
    readonly message?: {
      readonly content?: string | null;
      readonly role?: string;
    };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

export function translateResponse(
  request: AiExecutionRequest,
  config: OpenAiProviderConfig,
  response: OpenAiChatCompletionResponse,
): NormalizedAiResult {
  const choice = response.choices?.[0];
  if (choice === undefined) {
    throw new ProviderAdapterError('invalid-request', 'OpenAI response contained no choices', false);
  }

  const text = choice.message?.content ?? '';
  const finishReason = mapFinishReason(choice.finish_reason);
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const totalTokens = response.usage?.total_tokens ?? inputTokens + outputTokens;

  let structuredOutput: unknown;
  if (request.structuredOutput !== undefined) {
    try {
      structuredOutput = JSON.parse(text) as unknown;
    } catch {
      throw new ProviderAdapterError('invalid-request', 'OpenAI structured output was not valid JSON', false);
    }
  }

  return Object.freeze({
    requestId: request.requestId,
    content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
    usage: Object.freeze({
      inputTokens,
      outputTokens,
      totalTokens,
    }),
    model: Object.freeze({
      id: response.model ?? config.model,
      capabilities: Object.freeze([request.binding.capability]),
    }),
    finishReason,
    ...(structuredOutput === undefined ? {} : { structuredOutput }),
    toolCalls: Object.freeze([]),
    diagnosticId: `ai:${request.requestId}`,
    metadata: Object.freeze({ adapter: 'openai-ai' }),
  });
}

function mapFinishReason(reason: string | null | undefined): AiFinishReason {
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
      return 'stopped';
  }
}
