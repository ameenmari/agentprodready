import type { HealthResult } from '@agentforge/foundation';
import type {
  AiEmbeddingAdapter,
  AiEmbeddingAdapterResolver,
  AiEmbeddingRequest,
  NormalizedEmbedding,
  NormalizedEmbeddingResult,
} from '../contracts/ai.js';
import { ProviderAdapterError } from '../errors/ai-error.js';

export const REFERENCE_EMBEDDING_ID = 'reference-embedding';
export const REFERENCE_EMBEDDING_MODEL_ID = 'reference-embedding-32';
export const REFERENCE_EMBEDDING_DIMENSIONS = 32;

/** Deterministic, network-free embedding adapter for CI and tests only. */
export class ReferenceEmbeddingAdapter implements AiEmbeddingAdapter {
  public readonly id = REFERENCE_EMBEDDING_ID;

  public async embed(request: AiEmbeddingRequest): Promise<NormalizedEmbeddingResult> {
    if (request.inputs.length === 0) {
      throw new ProviderAdapterError('invalid-request', 'Embedding inputs must not be empty', false);
    }
    for (const input of request.inputs) {
      if (input.text === '') {
        throw new ProviderAdapterError('invalid-request', `Embedding text must not be empty (id=${input.id})`, false);
      }
    }
    if (request.model.dimensions !== undefined && request.model.dimensions !== REFERENCE_EMBEDDING_DIMENSIONS) {
      throw new ProviderAdapterError(
        'invalid-request',
        `Reference embedding dimensions must be ${String(REFERENCE_EMBEDDING_DIMENSIONS)}`,
        false,
      );
    }

    const modelId = request.model.id === '' ? REFERENCE_EMBEDDING_MODEL_ID : request.model.id;
    const embeddings: NormalizedEmbedding[] = request.inputs.map((input) =>
      Object.freeze({
        id: input.id,
        vector: Object.freeze(deterministicEmbedding(input.text, modelId, REFERENCE_EMBEDDING_DIMENSIONS)),
        dimensions: REFERENCE_EMBEDDING_DIMENSIONS,
      }),
    );

    const inputTokens = request.inputs.reduce((sum, input) => sum + input.text.length, 0);
    return Object.freeze({
      requestId: request.requestId,
      embeddings: Object.freeze(embeddings),
      model: Object.freeze({ id: modelId, capabilities: Object.freeze(['embedding']) }),
      usage: Object.freeze({ inputTokens, outputTokens: 0, totalTokens: inputTokens }),
      diagnosticId: `ai:${request.requestId}`,
      metadata: Object.freeze({ adapter: this.id, ...request.metadata }),
    });
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

/** Composition-owned resolution boundary for embedding adapters. */
export class FactoryAiEmbeddingAdapterResolver implements AiEmbeddingAdapterResolver {
  readonly #factories = new Map<string, () => Promise<AiEmbeddingAdapter>>();

  public bind(implementationId: string, factory: () => Promise<AiEmbeddingAdapter>): void {
    this.#factories.set(implementationId, factory);
  }

  public async resolve(binding: AiEmbeddingRequest['binding']): Promise<AiEmbeddingAdapter> {
    const factory = this.#factories.get(binding.implementationId);
    if (factory === undefined) {
      throw new TypeError(`No Composition embedding adapter binding: ${binding.implementationId}`);
    }
    return await factory();
  }
}

function deterministicEmbedding(text: string, modelId: string, dimensions: number): number[] {
  const raw = Array.from({ length: dimensions }, (_, index) =>
    hashToUnit(`${modelId}\0${text}\0${String(index)}`),
  );
  let sumSquares = 0;
  for (const value of raw) {
    sumSquares += value * value;
  }
  const norm = Math.sqrt(sumSquares);
  if (!Number.isFinite(norm) || norm === 0) {
    const fallback = new Array<number>(dimensions).fill(0);
    fallback[0] = 1;
    return fallback;
  }
  return raw.map((value) => {
    const normalized = value / norm;
    return Number.isFinite(normalized) ? normalized : 0;
  });
}

/** FNV-1a style hash mapped to (-1, 1). */
function hashToUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) * 2 - 1;
}
