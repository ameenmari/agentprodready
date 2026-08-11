import type { AiExecutionRequest, AiFinishReason, NormalizedAiResult, NormalizedToolCall } from '@agentprodready/ai-provider';
import { ProviderAdapterError } from '@agentprodready/ai-provider';
import type { GeminiProviderConfig } from './config.js';

export interface GeminiGenerateContentResponse {
  readonly model?: string;
  readonly candidates?: readonly {
    readonly finishReason?: string | null;
    readonly content?: {
      readonly parts?: readonly {
        readonly text?: string;
        readonly functionCall?: {
          readonly name?: string;
          readonly args?: unknown;
        };
      }[];
    };
  }[];
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
  };
}

export function translateResponse(
  request: AiExecutionRequest,
  config: GeminiProviderConfig,
  response: GeminiGenerateContentResponse,
): NormalizedAiResult {
  const candidate = response.candidates?.[0];
  if (candidate === undefined) {
    throw new ProviderAdapterError('invalid-request', 'Gemini response contained no candidates', false);
  }

  const parts = candidate.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? '')
    .filter((value) => value.length > 0)
    .join('');
  const toolCalls = normalizeToolCalls(parts);
  const finishReason = mapFinishReason(candidate.finishReason, toolCalls.length > 0);
  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

  let structuredOutput: unknown;
  if (request.structuredOutput !== undefined) {
    try {
      structuredOutput = JSON.parse(text) as unknown;
    } catch {
      throw new ProviderAdapterError('invalid-request', 'Gemini structured output was not valid JSON', false);
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
    metadata: Object.freeze({ adapter: 'gemini-ai' }),
  });
}

export function normalizeToolCalls(
  parts: readonly {
    readonly text?: string;
    readonly functionCall?: {
      readonly name?: string;
      readonly args?: unknown;
    };
  }[],
): readonly NormalizedToolCall[] {
  const calls: NormalizedToolCall[] = [];
  for (const part of parts) {
    const fn = part.functionCall;
    if (fn === undefined) continue;
    const name = fn.name?.trim() ?? '';
    if (name === '') {
      throw new ProviderAdapterError('invalid-request', 'Gemini functionCall missing name', false);
    }
    const args = fn.args;
    if (typeof args !== 'object' || args === null || Array.isArray(args)) {
      throw new ProviderAdapterError('invalid-request', 'Gemini functionCall args must be an object', false);
    }
    calls.push(
      Object.freeze({
        id: `gemini-${name}-${String(calls.length)}`,
        name,
        arguments: Object.freeze({ ...(args as Record<string, unknown>) }),
      }),
    );
  }
  return Object.freeze(calls);
}

function mapFinishReason(reason: string | null | undefined, hasTools: boolean): AiFinishReason {
  switch (reason) {
    case 'STOP':
      return hasTools ? 'tool-calls' : 'completed';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
      return 'content-filtered';
    case 'RECITATION':
    case 'STOP_SEQUENCE':
      return 'stopped';
    case 'MALFORMED_FUNCTION_CALL':
      return 'tool-calls';
    case null:
    case undefined:
      return hasTools ? 'tool-calls' : 'unknown';
    default:
      return hasTools ? 'tool-calls' : 'unknown';
  }
}
