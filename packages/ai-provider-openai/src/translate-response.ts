import type { AiExecutionRequest, AiFinishReason, NormalizedAiResult, NormalizedToolCall } from '@agentforge/ai-provider';
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
      readonly tool_calls?: readonly {
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
  const toolCalls = normalizeToolCalls(choice.message?.tool_calls);
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
    toolCalls,
    diagnosticId: `ai:${request.requestId}`,
    metadata: Object.freeze({ adapter: 'openai-ai' }),
  });
}

export function normalizeToolCalls(
  raw: readonly {
    readonly id?: string;
    readonly type?: string;
    readonly function?: { readonly name?: string; readonly arguments?: string };
  }[] | undefined,
): readonly NormalizedToolCall[] {
  if (raw === undefined || raw.length === 0) return Object.freeze([]);
  const calls: NormalizedToolCall[] = [];
  for (const item of raw) {
    const id = item.id?.trim() ?? '';
    const name = item.function?.name?.trim() ?? '';
    const argsText = item.function?.arguments ?? '';
    if (id === '' || name === '') {
      throw new ProviderAdapterError('invalid-request', 'OpenAI tool call missing id or name', false);
    }
    let parsed: unknown;
    try {
      parsed = argsText.trim() === '' ? {} : JSON.parse(argsText);
    } catch {
      throw new ProviderAdapterError('invalid-request', 'OpenAI tool call arguments were not valid JSON', false);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ProviderAdapterError('invalid-request', 'OpenAI tool call arguments must be a JSON object', false);
    }
    calls.push(
      Object.freeze({
        id,
        name,
        arguments: Object.freeze({ ...(parsed as Record<string, unknown>) }),
      }),
    );
  }
  return Object.freeze(calls);
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
