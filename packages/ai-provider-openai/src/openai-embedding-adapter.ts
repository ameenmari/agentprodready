import {
  ProviderAdapterError,
  type AiEmbeddingAdapter,
  type AiEmbeddingRequest,
  type NormalizedEmbedding,
  type NormalizedEmbeddingResult,
} from '@agentprodready/ai-provider';
import type { HealthResult } from '@agentprodready/foundation';
import OpenAI from 'openai';
import type { OpenAiProviderConfig } from './config.js';
import { translateError } from './translate-error.js';

export const OPENAI_EMBEDDING_ID = 'openai-embedding';
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const DEFAULT_OPENAI_EMBEDDING_DIMENSIONS = 1536;

export interface OpenAiEmbeddingCreateRequest {
  readonly model: string;
  readonly input: readonly string[];
  readonly dimensions?: number;
}

export interface OpenAiEmbeddingDataItem {
  readonly embedding: readonly number[];
  readonly index: number;
}

export interface OpenAiEmbeddingCreateResponse {
  readonly data: readonly OpenAiEmbeddingDataItem[];
  readonly model?: string;
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly total_tokens: number;
  };
}

/** Test seam: OpenAI embeddings.create surface only. */
export interface OpenAiEmbeddingClient {
  embeddings: {
    create(body: OpenAiEmbeddingCreateRequest): Promise<OpenAiEmbeddingCreateResponse>;
  };
}

export class OpenAiEmbeddingAdapter implements AiEmbeddingAdapter {
  public readonly id = OPENAI_EMBEDDING_ID;
  readonly #client: OpenAiEmbeddingClient;

  public constructor(config: OpenAiProviderConfig, client?: OpenAiEmbeddingClient) {
    this.#client = client ?? createEmbeddingSdkClient(config);
  }

  public async embed(request: AiEmbeddingRequest): Promise<NormalizedEmbeddingResult> {
    if (request.inputs.length === 0) {
      throw new ProviderAdapterError('invalid-request', 'Embedding inputs must not be empty', false);
    }
    for (const input of request.inputs) {
      if (input.text === '') {
        throw new ProviderAdapterError('invalid-request', `Embedding text must not be empty (id=${input.id})`, false);
      }
    }

    const modelId = request.model.id.trim() === '' ? DEFAULT_OPENAI_EMBEDDING_MODEL : request.model.id;
    const dimensions = request.model.dimensions ?? DEFAULT_OPENAI_EMBEDDING_DIMENSIONS;
    if (!Number.isInteger(dimensions) || dimensions <= 0) {
      throw new ProviderAdapterError('invalid-request', 'Embedding dimensions must be a positive integer', false);
    }

    try {
      const response = await this.#client.embeddings.create({
        model: modelId,
        input: request.inputs.map((input) => input.text),
        dimensions,
      });
      return normalizeEmbeddingResponse(request, modelId, dimensions, response, this.id);
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

function normalizeEmbeddingResponse(
  request: AiEmbeddingRequest,
  modelId: string,
  dimensions: number,
  response: OpenAiEmbeddingCreateResponse,
  adapterId: string,
): NormalizedEmbeddingResult {
  if (!Array.isArray(response.data) || response.data.length !== request.inputs.length) {
    throw new ProviderAdapterError(
      'invalid-request',
      'OpenAI embedding response length does not match request inputs',
      false,
    );
  }

  const byIndex = new Map<number, readonly number[]>();
  const rows: readonly OpenAiEmbeddingDataItem[] = response.data;
  for (const item of rows) {
    const index: number = item.index;
    const embedding: readonly number[] = item.embedding;
    if (!Number.isInteger(index) || embedding.length === 0) {
      throw new ProviderAdapterError('invalid-request', 'OpenAI embedding response item is malformed', false);
    }
    if (embedding.length !== dimensions) {
      throw new ProviderAdapterError(
        'invalid-request',
        `OpenAI embedding dimensions mismatch: expected ${String(dimensions)}, got ${String(embedding.length)}`,
        false,
      );
    }
    for (const value of embedding) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ProviderAdapterError('invalid-request', 'OpenAI embedding vector contains non-finite values', false);
      }
    }
    byIndex.set(index, embedding);
  }

  const embeddings: NormalizedEmbedding[] = request.inputs.map((input, index) => {
    const vector = byIndex.get(index);
    if (vector === undefined) {
      throw new ProviderAdapterError('invalid-request', `OpenAI embedding response missing index ${String(index)}`, false);
    }
    return Object.freeze({
      id: input.id,
      vector: Object.freeze([...vector]),
      dimensions,
    });
  });

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const totalTokens = response.usage?.total_tokens ?? inputTokens;

  return Object.freeze({
    requestId: request.requestId,
    embeddings: Object.freeze(embeddings),
    model: Object.freeze({
      id: response.model?.trim() ? response.model : modelId,
      capabilities: Object.freeze(['embedding']),
    }),
    usage: Object.freeze({ inputTokens, outputTokens: 0, totalTokens }),
    diagnosticId: `ai:${request.requestId}`,
    metadata: Object.freeze({ adapter: adapterId, ...request.metadata }),
  });
}

function createEmbeddingSdkClient(config: OpenAiProviderConfig): OpenAiEmbeddingClient {
  const sdk = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl === undefined ? {} : { baseURL: config.baseUrl }),
    ...(config.organization === undefined ? {} : { organization: config.organization }),
    ...(config.project === undefined ? {} : { project: config.project }),
    maxRetries: 0,
  });

  return {
    embeddings: {
      async create(body: OpenAiEmbeddingCreateRequest): Promise<OpenAiEmbeddingCreateResponse> {
        const response = await sdk.embeddings.create({
          model: body.model,
          input: [...body.input],
          ...(body.dimensions === undefined ? {} : { dimensions: body.dimensions }),
        });
        const data: readonly OpenAiEmbeddingDataItem[] = Object.freeze(
          response.data.map((item): OpenAiEmbeddingDataItem =>
            Object.freeze({
              embedding: Object.freeze([...item.embedding]),
              index: item.index,
            }),
          ),
        );
        return {
          data,
          model: response.model,
          usage: Object.freeze({
            prompt_tokens: response.usage.prompt_tokens,
            total_tokens: response.usage.total_tokens,
          }),
        };
      },
    },
  };
}
