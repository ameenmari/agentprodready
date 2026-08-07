import { ProviderAdapterError, type AiExecutionRequest } from '@agentforge/ai-provider';
import type { OpenAiProviderConfig } from './config.js';

export interface OpenAiChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly name?: string;
  readonly tool_call_id?: string;
}

export interface OpenAiChatCompletionRequest {
  readonly model: string;
  readonly messages: readonly OpenAiChatMessage[];
  readonly max_completion_tokens?: number;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly stop?: string | readonly string[];
  readonly response_format?: { readonly type: 'json_object' };
}

export function translateRequest(request: AiExecutionRequest, config: OpenAiProviderConfig): OpenAiChatCompletionRequest {
  if (request.tools !== undefined && request.tools.length > 0) {
    throw new ProviderAdapterError('invalid-request', 'Tool calling is not supported by openai-ai in v0.2', false);
  }

  const messages: OpenAiChatMessage[] = request.messages.map((message) => {
    const text = message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    if (text.trim() === '') {
      throw new ProviderAdapterError('invalid-request', 'openai-ai v0.2 supports text message parts only', false);
    }
    return Object.freeze({
      role: message.role,
      content: text,
      ...(message.name === undefined ? {} : { name: message.name }),
      ...(message.toolCallId === undefined ? {} : { tool_call_id: message.toolCallId }),
    });
  });

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
  });
}
