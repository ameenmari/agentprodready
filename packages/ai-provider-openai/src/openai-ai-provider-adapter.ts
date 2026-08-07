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
import { translateOpenAiStream, type OpenAiChatCompletionChunk } from './translate-stream.js';

export type OpenAiChatCreateBody = OpenAiChatCompletionRequest & {
  readonly stream?: boolean;
  readonly stream_options?: { readonly include_usage?: boolean };
};

/** Test seam: OpenAI chat.completions.create surface only. */
export interface OpenAiChatClient {
  chat: {
    completions: {
      create(
        body: OpenAiChatCreateBody,
        options?: { readonly signal?: AbortSignal },
      ): Promise<OpenAiChatCompletionResponse | AsyncIterable<OpenAiChatCompletionChunk>>;
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
      if (!isCompletionResponse(response)) {
        throw new ProviderAdapterError('invalid-request', 'OpenAI non-stream call returned a stream', false);
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
      const includeUsage = request.streaming.includeUsage;
      const body: OpenAiChatCreateBody = Object.freeze({
        ...vendorRequest,
        stream: true,
        ...(includeUsage ? { stream_options: Object.freeze({ include_usage: true }) } : {}),
      });
      const response = await this.#client.chat.completions.create(
        body,
        request.signal === undefined ? undefined : { signal: request.signal },
      );
      yield* translateOpenAiStream(request, requireStreamResponse(response));
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

function isCompletionResponse(value: unknown): value is OpenAiChatCompletionResponse {
  return typeof value === 'object' && value !== null && !(Symbol.asyncIterator in value);
}

function requireStreamResponse(value: unknown): AsyncIterable<OpenAiChatCompletionChunk> {
  if (typeof value === 'object' && value !== null && Symbol.asyncIterator in value) {
    return value as AsyncIterable<OpenAiChatCompletionChunk>;
  }
  throw new ProviderAdapterError('invalid-request', 'OpenAI stream call returned a non-stream response', false);
}

function toSdkMessage(message: OpenAiChatMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content ?? '',
      tool_call_id: message.tool_call_id ?? '',
    };
  }
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content,
      ...(message.name === undefined ? {} : { name: message.name }),
      ...(message.tool_calls === undefined ? {} : { tool_calls: message.tool_calls }),
    };
  }
  if (message.role === 'system') {
    return {
      role: 'system',
      content: message.content ?? '',
      ...(message.name === undefined ? {} : { name: message.name }),
    };
  }
  return {
    role: 'user',
    content: message.content ?? '',
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
        async create(
          body: OpenAiChatCreateBody,
          options?: { readonly signal?: AbortSignal },
        ): Promise<OpenAiChatCompletionResponse | AsyncIterable<OpenAiChatCompletionChunk>> {
          if (body.stream === true) {
            const stream = await sdk.chat.completions.create(
              {
                model: body.model,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- SDK discriminated unions
                messages: body.messages.map(toSdkMessage) as any,
                stream: true,
                ...(body.stream_options === undefined ? {} : { stream_options: body.stream_options }),
                ...(body.max_completion_tokens === undefined
                  ? {}
                  : { max_completion_tokens: body.max_completion_tokens }),
                ...(body.temperature === undefined ? {} : { temperature: body.temperature }),
                ...(body.top_p === undefined ? {} : { top_p: body.top_p }),
                ...(body.stop === undefined
                  ? {}
                  : { stop: typeof body.stop === 'string' ? body.stop : Array.from(body.stop) }),
                ...(body.response_format === undefined ? {} : { response_format: body.response_format }),
                ...(body.tools === undefined ? {} : { tools: [...body.tools] }),
              },
              options?.signal === undefined ? undefined : { signal: options.signal },
            );
            return mapSdkStream(stream as AsyncIterable<Record<string, unknown>>);
          }

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
            ...(body.tools === undefined ? {} : { tools: [...body.tools] }),
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
                  ...(choice.message.tool_calls === undefined
                    ? {}
                    : {
                        tool_calls: choice.message.tool_calls.map((call) => {
                          const fn =
                            'function' in call
                              ? (call as { function: { name: string; arguments: string } }).function
                              : { name: '', arguments: '{}' };
                          return Object.freeze({
                            id: call.id,
                            type: call.type,
                            function: Object.freeze({
                              name: fn.name,
                              arguments: fn.arguments,
                            }),
                          });
                        }),
                      }),
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

async function* mapSdkStream(stream: AsyncIterable<Record<string, unknown>>): AsyncIterable<OpenAiChatCompletionChunk> {
  for await (const chunk of stream) {
    const choicesRaw = Array.isArray(chunk['choices']) ? chunk['choices'] : [];
    const usageRaw = chunk['usage'];
    const mapped: OpenAiChatCompletionChunk = {
      ...(typeof chunk['id'] === 'string' ? { id: chunk['id'] } : {}),
      ...(typeof chunk['model'] === 'string' ? { model: chunk['model'] } : {}),
      choices: choicesRaw.map((choice) => {
        const item = choice as {
          finish_reason?: string | null;
          delta?: { content?: string | null; tool_calls?: readonly unknown[] };
        };
        return Object.freeze({
          ...(item.finish_reason === undefined ? {} : { finish_reason: item.finish_reason }),
          delta: Object.freeze({
            ...(item.delta?.content === undefined || item.delta.content === null
              ? {}
              : { content: item.delta.content }),
            ...(item.delta?.tool_calls === undefined
              ? {}
              : {
                  tool_calls: item.delta.tool_calls as readonly {
                    readonly index?: number;
                    readonly id?: string;
                    readonly type?: string;
                    readonly function?: { readonly name?: string; readonly arguments?: string };
                  }[],
                }),
          }),
        });
      }),
      ...(usageRaw !== undefined && usageRaw !== null && typeof usageRaw === 'object'
        ? {
            usage: Object.freeze({
              prompt_tokens: (usageRaw as { prompt_tokens?: number }).prompt_tokens ?? 0,
              completion_tokens: (usageRaw as { completion_tokens?: number }).completion_tokens ?? 0,
              total_tokens: (usageRaw as { total_tokens?: number }).total_tokens ?? 0,
            }),
          }
        : {}),
    };
    yield Object.freeze(mapped);
  }
}
