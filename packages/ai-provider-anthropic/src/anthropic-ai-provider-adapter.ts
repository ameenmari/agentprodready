import {
  ProviderAdapterError,
  type AiExecutionRequest,
  type AiProviderAdapter,
  type NormalizedAiResult,
  type NormalizedAiStreamEvent,
} from '@agentprodready/ai-provider';
import type { HealthResult } from '@agentprodready/foundation';
import Anthropic from '@anthropic-ai/sdk';
import type { AnthropicProviderConfig } from './config.js';
import { ANTHROPIC_AI_ID } from './config.js';
import { translateError } from './translate-error.js';
import { translateRequest, type AnthropicMessagesRequest } from './translate-request.js';
import { translateResponse, type AnthropicMessagesResponse } from './translate-response.js';
import { translateAnthropicStream, type AnthropicStreamEvent } from './translate-stream.js';

/** Test seam: Anthropic messages.create surface only. */
export interface AnthropicMessagesClient {
  messages: {
    create(
      body: AnthropicMessagesRequest,
      options?: { readonly signal?: AbortSignal },
    ): Promise<AnthropicMessagesResponse | AsyncIterable<AnthropicStreamEvent>>;
  };
}

export class AnthropicProviderAdapter implements AiProviderAdapter {
  public readonly id: string;
  readonly #config: AnthropicProviderConfig;
  readonly #client: AnthropicMessagesClient;

  public constructor(config: AnthropicProviderConfig, client?: AnthropicMessagesClient) {
    this.#config = config;
    this.id = config.implementationId?.trim() || ANTHROPIC_AI_ID;
    this.#client = client ?? createSdkClient(config);
  }

  public async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
    try {
      const vendorRequest = translateRequest(request, this.#config);
      const response = await this.#client.messages.create(vendorRequest);
      if (!isMessagesResponse(response)) {
        throw new ProviderAdapterError('invalid-request', 'Anthropic non-stream call returned a stream', false);
      }
      return translateResponse(request, this.#config, response);
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public async *stream(request: AiExecutionRequest): AsyncIterable<NormalizedAiStreamEvent> {
    if (request.streaming?.enabled !== true) {
      throw new ProviderAdapterError('invalid-request', 'Streaming must be explicitly enabled', false);
    }
    try {
      if (request.signal?.aborted) {
        yield { type: 'cancelled', sequence: 0, diagnosticId: `ai:${request.requestId}` };
        return;
      }
      const vendorRequest = translateRequest(request, this.#config);
      const body = Object.freeze({ ...vendorRequest, stream: true });
      const response = await this.#client.messages.create(
        body,
        request.signal === undefined ? undefined : { signal: request.signal },
      );
      yield* translateAnthropicStream(request, requireStreamResponse(response));
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

function isMessagesResponse(value: unknown): value is AnthropicMessagesResponse {
  return typeof value === 'object' && value !== null && !(Symbol.asyncIterator in value);
}

function requireStreamResponse(value: unknown): AsyncIterable<AnthropicStreamEvent> {
  if (typeof value === 'object' && value !== null && Symbol.asyncIterator in value) {
    return value as AsyncIterable<AnthropicStreamEvent>;
  }
  throw new ProviderAdapterError('invalid-request', 'Anthropic stream call returned a non-stream response', false);
}

function createSdkClient(config: AnthropicProviderConfig): AnthropicMessagesClient {
  const client = new Anthropic({
    apiKey: config.apiKey,
    maxRetries: 0,
    ...(config.baseUrl === undefined ? {} : { baseURL: config.baseUrl }),
  });

  return {
    messages: {
      async create(
        body: AnthropicMessagesRequest,
        options?: { readonly signal?: AbortSignal },
      ): Promise<AnthropicMessagesResponse | AsyncIterable<AnthropicStreamEvent>> {
        const params = toSdkParams(body);
        if (body.stream === true) {
          const stream = client.messages.stream(
            params,
            options?.signal === undefined ? undefined : { signal: options.signal },
          );
          return mapSdkStream(stream);
        }

        const response = await client.messages.create(
          { ...params, stream: false },
          options?.signal === undefined ? undefined : { signal: options.signal },
        );
        return toMessagesResponse(response);
      },
    },
  };
}

async function* mapSdkStream(
  stream: AsyncIterable<unknown>,
): AsyncIterable<AnthropicStreamEvent> {
  for await (const event of stream) {
    yield event as AnthropicStreamEvent;
  }
}

function toSdkParams(body: AnthropicMessagesRequest): Anthropic.MessageCreateParams {
  return {
    model: body.model,
    max_tokens: body.max_tokens,
    messages: body.messages as Anthropic.MessageCreateParams['messages'],
    ...(body.system === undefined ? {} : { system: body.system }),
    ...(body.temperature === undefined ? {} : { temperature: body.temperature }),
    ...(body.top_p === undefined ? {} : { top_p: body.top_p }),
    ...(body.stop_sequences === undefined ? {} : { stop_sequences: [...body.stop_sequences] }),
    ...(body.tools === undefined
      ? {}
      : {
          tools: body.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.input_schema as Anthropic.Tool.InputSchema,
          })),
        }),
  };
}

function toMessagesResponse(response: Anthropic.Message): AnthropicMessagesResponse {
  return {
    id: response.id,
    model: response.model,
    stop_reason: response.stop_reason,
    content: response.content.map((block) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text };
      }
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        };
      }
      return { type: block.type };
    }),
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
