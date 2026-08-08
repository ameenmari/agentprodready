import type { AiExecutionRequest, AiFinishReason, NormalizedAiResult, NormalizedToolCall } from '@agentprodready/ai-provider';
import { ProviderAdapterError } from '@agentprodready/ai-provider';
import type { AnthropicProviderConfig } from './config.js';

export interface AnthropicMessagesResponse {
  readonly id?: string;
  readonly model?: string;
  readonly stop_reason?: string | null;
  readonly content?: readonly {
    readonly type?: string;
    readonly text?: string;
    readonly id?: string;
    readonly name?: string;
    readonly input?: unknown;
  }[];
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
  };
}

export function translateResponse(
  request: AiExecutionRequest,
  config: AnthropicProviderConfig,
  response: AnthropicMessagesResponse,
): NormalizedAiResult {
  const blocks = response.content ?? [];
  const text = blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
  const toolCalls = normalizeToolCalls(blocks);
  const finishReason = mapStopReason(response.stop_reason, toolCalls.length > 0);
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  let structuredOutput: unknown;
  if (request.structuredOutput !== undefined) {
    try {
      structuredOutput = JSON.parse(text) as unknown;
    } catch {
      throw new ProviderAdapterError('invalid-request', 'Anthropic structured output was not valid JSON', false);
    }
  }

  return Object.freeze({
    requestId: request.requestId,
    content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
    usage: Object.freeze({
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    }),
    model: Object.freeze({
      id: response.model ?? config.model,
      capabilities: Object.freeze([request.binding.capability]),
    }),
    finishReason,
    ...(structuredOutput === undefined ? {} : { structuredOutput }),
    toolCalls,
    diagnosticId: `ai:${request.requestId}`,
    metadata: Object.freeze({ adapter: 'anthropic-ai' }),
  });
}

export function normalizeToolCalls(
  blocks: readonly {
    readonly type?: string;
    readonly id?: string;
    readonly name?: string;
    readonly input?: unknown;
  }[],
): readonly NormalizedToolCall[] {
  const calls: NormalizedToolCall[] = [];
  for (const block of blocks) {
    if (block.type !== 'tool_use') continue;
    const id = block.id?.trim() ?? '';
    const name = block.name?.trim() ?? '';
    if (id === '' || name === '') {
      throw new ProviderAdapterError('invalid-request', 'Anthropic tool_use missing id or name', false);
    }
    const input = block.input;
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ProviderAdapterError('invalid-request', 'Anthropic tool_use input must be an object', false);
    }
    calls.push(
      Object.freeze({
        id,
        name,
        arguments: Object.freeze({ ...(input as Record<string, unknown>) }),
      }),
    );
  }
  return Object.freeze(calls);
}

function mapStopReason(reason: string | null | undefined, hasTools: boolean): AiFinishReason {
  switch (reason) {
    case 'end_turn':
      return 'completed';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool-calls';
    case 'stop_sequence':
      return 'stopped';
    case null:
    case undefined:
      return hasTools ? 'tool-calls' : 'unknown';
    default:
      return 'unknown';
  }
}
