import {
  ProviderAdapterError,
  type AiExecutionRequest,
  type AiMessage,
  type NormalizedToolCall,
} from '@agentprodready/ai-provider';
import type { AnthropicProviderConfig } from './config.js';

export type AnthropicContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'tool_use';
      readonly id: string;
      readonly name: string;
      readonly input: Readonly<Record<string, unknown>>;
    }
  | {
      readonly type: 'tool_result';
      readonly tool_use_id: string;
      readonly content: string;
      readonly is_error?: boolean;
    };

export interface AnthropicMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string | readonly AnthropicContentBlock[];
}

export interface AnthropicToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Readonly<Record<string, unknown>>;
}

export interface AnthropicMessagesRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly messages: readonly AnthropicMessage[];
  readonly system?: string;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly stop_sequences?: readonly string[];
  readonly tools?: readonly AnthropicToolDefinition[];
  readonly stream?: boolean;
}

export function translateRequest(
  request: AiExecutionRequest,
  config: AnthropicProviderConfig,
): AnthropicMessagesRequest {
  const { system, messages } = splitSystemAndMessages(request.messages);
  const tools =
    request.tools === undefined || request.tools.length === 0
      ? undefined
      : request.tools.map((tool) =>
          Object.freeze({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
          }),
        );

  const maxTokens =
    request.generation.maximumOutputTokens ?? config.defaultMaxTokens ?? 4096;

  return Object.freeze({
    model: config.model,
    max_tokens: maxTokens,
    messages: Object.freeze(messages),
    ...(system === undefined ? {} : { system }),
    ...(request.generation.temperature === undefined
      ? {}
      : { temperature: request.generation.temperature }),
    ...(request.generation.topP === undefined ? {} : { top_p: request.generation.topP }),
    ...(request.generation.stop === undefined
      ? {}
      : { stop_sequences: request.generation.stop }),
    ...(tools === undefined ? {} : { tools: Object.freeze(tools) }),
  });
}

function splitSystemAndMessages(messages: readonly AiMessage[]): {
  readonly system?: string;
  readonly messages: readonly AnthropicMessage[];
} {
  const systemParts: string[] = [];
  let index = 0;
  while (index < messages.length) {
    const current = messages[index];
    if (current === undefined || current.role !== 'system') break;
    systemParts.push(textOf(current));
    index += 1;
  }

  const rest = messages.slice(index);
  const out: AnthropicMessage[] = [];

  for (const message of rest) {
    if (message.role === 'system') {
      throw new ProviderAdapterError(
        'invalid-request',
        'anthropic-ai only supports leading system messages (converted to system)',
        false,
      );
    }
    if (message.role === 'tool') {
      out.push(toToolResultMessage(message));
      continue;
    }
    if (message.role === 'assistant') {
      out.push(toAssistantMessage(message));
      continue;
    }
    out.push(
      Object.freeze({
        role: 'user' as const,
        content: textOf(message),
      }),
    );
  }

  if (out.length === 0) {
    throw new ProviderAdapterError('invalid-request', 'anthropic-ai requires at least one non-system message', false);
  }

  const system = systemParts.length === 0 ? undefined : systemParts.join('\n\n');
  return {
    ...(system === undefined ? {} : { system }),
    messages: Object.freeze(out),
  };
}

function toAssistantMessage(message: AiMessage): AnthropicMessage {
  const text = textOf(message);
  const toolCalls = message.toolCalls ?? [];
  if (toolCalls.length === 0) {
    return Object.freeze({ role: 'assistant', content: text });
  }
  const blocks: AnthropicContentBlock[] = [];
  if (text.trim() !== '') {
    blocks.push(Object.freeze({ type: 'text' as const, text }));
  }
  for (const call of toolCalls) {
    blocks.push(toToolUseBlock(call));
  }
  return Object.freeze({ role: 'assistant', content: Object.freeze(blocks) });
}

function toToolResultMessage(message: AiMessage): AnthropicMessage {
  const toolUseId = message.toolCallId?.trim() ?? '';
  if (toolUseId === '') {
    throw new ProviderAdapterError('invalid-request', 'Tool messages require toolCallId', false);
  }
  return Object.freeze({
    role: 'user',
    content: Object.freeze([
      Object.freeze({
        type: 'tool_result' as const,
        tool_use_id: toolUseId,
        content: textOf(message),
      }),
    ]),
  });
}

function toToolUseBlock(call: NormalizedToolCall): AnthropicContentBlock {
  return Object.freeze({
    type: 'tool_use' as const,
    id: call.id,
    name: call.name,
    input: call.arguments,
  });
}

function textOf(message: AiMessage): string {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}
