import {
  ProviderAdapterError,
  type AiExecutionRequest,
  type AiProviderAdapter,
  type NormalizedAiResult,
  type NormalizedAiStreamEvent,
} from '@agentforge/ai-provider';
import type { HealthResult } from '@agentforge/foundation';
import OpenAI from 'openai';
import type { OpenAiProviderConfig } from './config.js';
import { OPENAI_AI_ID } from './config.js';
import { translateError } from './translate-error.js';
import { translateRequest, type OpenAiChatCompletionRequest, type OpenAiChatMessage } from './translate-request.js';
import { translateResponse, type OpenAiChatCompletionResponse } from './translate-response.js';

/** Test seam: OpenAI chat.completions.create surface only. */
export interface OpenAiChatClient {
  chat: {
    completions: {
      create(body: OpenAiChatCompletionRequest): Promise<OpenAiChatCompletionResponse>;
    };
  };
}

export class OpenAiProviderAdapter implements AiProviderAdapter {
  public readonly id = OPENAI_AI_ID;
  readonly #config: OpenAiProviderConfig;
  readonly #client: OpenAiChatClient;

  public constructor(config: OpenAiProviderConfig, client?: OpenAiChatClient) {
    this.#config = config;
    this.#client = client ?? createSdkClient(config);
  }

  public async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
    try {
      const vendorRequest = translateRequest(request, this.#config);
      const response = await this.#client.chat.completions.create(vendorRequest);
      return translateResponse(request, this.#config, response);
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public stream(_request: AiExecutionRequest): AsyncIterable<NormalizedAiStreamEvent> {
    return {
      [Symbol.asyncIterator](): AsyncIterator<NormalizedAiStreamEvent> {
        return {
          next: async (): Promise<IteratorResult<NormalizedAiStreamEvent>> => {
            throw new ProviderAdapterError('invalid-request', 'Streaming is not supported by openai-ai in v0.2', false);
          },
        };
      },
    };
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

function toSdkMessage(message: OpenAiChatMessage): {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
} {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content,
      tool_call_id: message.tool_call_id ?? '',
    };
  }
  if (message.role === 'system') {
    return {
      role: 'system',
      content: message.content,
      ...(message.name === undefined ? {} : { name: message.name }),
    };
  }
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content,
      ...(message.name === undefined ? {} : { name: message.name }),
    };
  }
  return {
    role: 'user',
    content: message.content,
    ...(message.name === undefined ? {} : { name: message.name }),
  };
}

function createSdkClient(config: OpenAiProviderConfig): OpenAiChatClient {
  const sdk = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl === undefined ? {} : { baseURL: config.baseUrl }),
    ...(config.organization === undefined ? {} : { organization: config.organization }),
    ...(config.project === undefined ? {} : { project: config.project }),
    maxRetries: 0,
  });

  return {
    chat: {
      completions: {
        async create(body: OpenAiChatCompletionRequest): Promise<OpenAiChatCompletionResponse> {
          /* Vendor boundary: OpenAI SDK message unions are incompatible with our normalized message DTO. */
          const response = await sdk.chat.completions.create({
            model: body.model,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- SDK discriminated unions
            messages: body.messages.map(toSdkMessage) as any,
            ...(body.max_completion_tokens === undefined ? {} : { max_completion_tokens: body.max_completion_tokens }),
            ...(body.temperature === undefined ? {} : { temperature: body.temperature }),
            ...(body.top_p === undefined ? {} : { top_p: body.top_p }),
            ...(body.stop === undefined
              ? {}
              : { stop: typeof body.stop === 'string' ? body.stop : Array.from(body.stop) }),
            ...(body.response_format === undefined ? {} : { response_format: body.response_format }),
          });
          return {
            id: response.id,
            model: response.model,
            choices: response.choices.map((choice) =>
              Object.freeze({
                finish_reason: choice.finish_reason,
                message: Object.freeze({
                  content: choice.message.content,
                  role: choice.message.role,
                }),
              }),
            ),
            ...(response.usage === undefined
              ? {}
              : {
                  usage: Object.freeze({
                    prompt_tokens: response.usage.prompt_tokens,
                    completion_tokens: response.usage.completion_tokens,
                    total_tokens: response.usage.total_tokens,
                  }),
                }),
          };
        },
      },
    },
  };
}
