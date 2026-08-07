import { ProviderAdapterError, type AiExecutionRequest, type AiMessage, type NormalizedToolCall } from '@agentprodready/ai-provider';
import type { OpenAiProviderConfig } from './config.js';

export interface OpenAiChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string | null;
  readonly name?: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly OpenAiToolCall[];
}

export interface OpenAiToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: Readonly<{ name: string; arguments: string }>;
}

export interface OpenAiToolDefinition {
  readonly type: 'function';
  readonly function: Readonly<{
    name: string;
    description: string;
    parameters: Readonly<Record<string, unknown>>;
  }>;
}

export interface OpenAiChatCompletionRequest {
  readonly model: string;
  readonly messages: readonly OpenAiChatMessage[];
  readonly max_completion_tokens?: number;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly stop?: string | readonly string[];
  readonly response_format?: { readonly type: 'json_object' };
  readonly tools?: readonly OpenAiToolDefinition[];
}

export function translateRequest(request: AiExecutionRequest, config: OpenAiProviderConfig): OpenAiChatCompletionRequest {
  const messages: OpenAiChatMessage[] = request.messages.map((message) => translateMessage(message));

  const tools =
    request.tools === undefined || request.tools.length === 0
      ? undefined
      : request.tools.map((tool) =>
          Object.freeze({
            type: 'function' as const,
            function: Object.freeze({
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema,
            }),
          }),
        );

  return Object.freeze({
    model: config.model,
    messages: Object.freeze(messages),
    ...(request.generation.maximumOutputTokens === undefined
      ? {}
      : { max_completion_tokens: request.generation.maximumOutputTokens }),
    ...(request.generation.temperature === undefined ? {} : { temperature: request.generation.temperature }),
    ...(request.generation.topP === undefined ? {} : { top_p: request.generation.topP }),
    ...(request.generation.stop === undefined ? {} : { stop: request.generation.stop }),
    ...(request.structuredOutput === undefined ? {} : { response_format: Object.freeze({ type: 'json_object' as const }) }),
    ...(tools === undefined ? {} : { tools: Object.freeze(tools) }),
  });
}

function translateMessage(message: AiMessage): OpenAiChatMessage {
  const text = message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

  if (message.role === 'tool') {
    if (message.toolCallId === undefined || message.toolCallId.trim() === '') {
      throw new ProviderAdapterError('invalid-request', 'Tool messages require toolCallId', false);
    }
    return Object.freeze({
      role: 'tool',
      content: text,
      tool_call_id: message.toolCallId,
      ...(message.name === undefined ? {} : { name: message.name }),
    });
  }

  if (message.role === 'assistant' && message.toolCalls !== undefined && message.toolCalls.length > 0) {
    return Object.freeze({
      role: 'assistant',
      content: text.trim() === '' ? null : text,
      tool_calls: Object.freeze(message.toolCalls.map(toOpenAiToolCall)),
      ...(message.name === undefined ? {} : { name: message.name }),
    });
  }

  if (text.trim() === '' && message.role !== 'assistant') {
    throw new ProviderAdapterError('invalid-request', 'openai-ai supports text message parts only', false);
  }

  return Object.freeze({
    role: message.role,
    content: text,
    ...(message.name === undefined ? {} : { name: message.name }),
    ...(message.toolCallId === undefined ? {} : { tool_call_id: message.toolCallId }),
  });
}

function toOpenAiToolCall(call: NormalizedToolCall): OpenAiToolCall {
  return Object.freeze({
    id: call.id,
    type: 'function' as const,
    function: Object.freeze({
      name: call.name,
      arguments: JSON.stringify(call.arguments),
    }),
  });
}
