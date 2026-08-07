import type {
  AiEmbeddingAdapterResolver,
  AiEmbeddingRequest,
} from '@agentforge/ai-provider';
import { ProviderAdapterError } from '@agentforge/ai-provider';
import type { CapabilityResolver } from '@agentforge/capability-resolution';
import type { HealthResult } from '@agentforge/foundation';
import type { VectorMatch, VectorStorePort } from '@agentforge/vector-store';
import { VectorStoreError } from '@agentforge/vector-store';
import { fuseHybridCandidates } from './hybrid-rrf.js';
import type {
  MemoryCandidate,
  MemoryRecord,
  MemoryRetrievalRequest,
  MemorySearchProvider,
  MemoryStorageProvider,
} from './index.js';

export interface VectorCapableMemorySearchProviderOptions {
  readonly keyword: MemorySearchProvider;
  readonly storage: MemoryStorageProvider;
  readonly vectors: VectorStorePort;
  readonly capabilityResolver: CapabilityResolver;
  readonly embeddingResolver: AiEmbeddingAdapterResolver;
  readonly embeddingModelId: string;
  readonly embeddingDimensions: number;
  readonly enabled: boolean;
  readonly now?: () => Date;
  readonly onStaleExcluded?: (count: number) => void;
}

export class VectorCapableMemorySearchProvider implements MemorySearchProvider {
  readonly #keyword: MemorySearchProvider;
  readonly #storage: MemoryStorageProvider;
  readonly #vectors: VectorStorePort;
  readonly #capabilities: CapabilityResolver;
  readonly #embeddings: AiEmbeddingAdapterResolver;
  readonly #modelId: string;
  readonly #dimensions: number;
  readonly #enabled: boolean;
  readonly #now: () => Date;
  readonly #onStaleExcluded?: (count: number) => void;

  public constructor(options: VectorCapableMemorySearchProviderOptions) {
    this.#keyword = options.keyword;
    this.#storage = options.storage;
    this.#vectors = options.vectors;
    this.#capabilities = options.capabilityResolver;
    this.#embeddings = options.embeddingResolver;
    this.#modelId = options.embeddingModelId;
    this.#dimensions = options.embeddingDimensions;
    this.#enabled = options.enabled;
    this.#now = options.now ?? ((): Date => new Date());
    if (options.onStaleExcluded !== undefined) {
      this.#onStaleExcluded = options.onStaleExcluded;
    }
  }

  public async search(
    request: MemoryRetrievalRequest,
  ): Promise<Readonly<{ candidates: readonly MemoryCandidate[]; partialReasons: readonly string[] }>> {
    if (request.strategy !== 'semantic' && request.strategy !== 'hybrid') {
      return this.#keyword.search(request);
    }

    if (!this.#enabled) {
      const keyword = await this.#keyword.search({ ...request, strategy: 'keyword' });
      return Object.freeze({
        candidates: Object.freeze(
          keyword.candidates.map((c) => Object.freeze({ ...c, searchStrategy: request.strategy })),
        ),
        partialReasons: Object.freeze(['semantic-unavailable', ...keyword.partialReasons]),
      });
    }

    if (request.strategy === 'semantic') {
      return this.#semanticSearch(request);
    }
    return this.#hybridSearch(request);
  }

  public async health(): Promise<HealthResult> {
    if (!this.#enabled) return this.#keyword.health();
    const [keyword, vectors] = await Promise.all([this.#keyword.health(), this.#vectors.health()]);
    if (keyword.status === 'unhealthy' || vectors.status === 'unhealthy') {
      return Object.freeze({ name: 'vector-capable-memory-search', status: 'unhealthy' as const });
    }
    if (keyword.status === 'degraded' || vectors.status === 'degraded') {
      return Object.freeze({ name: 'vector-capable-memory-search', status: 'degraded' as const });
    }
    return Object.freeze({ name: 'vector-capable-memory-search', status: 'healthy' as const });
  }

  async #semanticSearch(
    request: MemoryRetrievalRequest,
  ): Promise<Readonly<{ candidates: readonly MemoryCandidate[]; partialReasons: readonly string[] }>> {
    try {
      const matches = await this.#queryVectors(request);
      const { candidates, stale } = await this.#candidatesFromMatches(matches);
      if (stale > 0) this.#onStaleExcluded?.(stale);
      return Object.freeze({ candidates, partialReasons: Object.freeze([]) });
    } catch (error) {
      return this.#fallback(request, error);
    }
  }

  async #hybridSearch(
    request: MemoryRetrievalRequest,
  ): Promise<Readonly<{ candidates: readonly MemoryCandidate[]; partialReasons: readonly string[] }>> {
    const keyword = await this.#keyword.search({ ...request, strategy: 'keyword' });
    try {
      const matches = await this.#queryVectors(request);
      const { candidates: semantic, stale } = await this.#candidatesFromMatches(matches);
      if (stale > 0) this.#onStaleExcluded?.(stale);
      const fused = fuseHybridCandidates(keyword.candidates, semantic);
      return Object.freeze({
        candidates: fused,
        partialReasons: Object.freeze(['hybrid-fusion:rrf', ...keyword.partialReasons]),
      });
    } catch (error) {
      const reasons = fallbackReasons(error);
      return Object.freeze({
        candidates: Object.freeze(
          keyword.candidates.map((c) => Object.freeze({ ...c, searchStrategy: 'hybrid' as const })),
        ),
        partialReasons: Object.freeze([
          'semantic-unavailable',
          ...reasons,
          ...keyword.partialReasons,
        ]),
      });
    }
  }

  async #queryVectors(request: MemoryRetrievalRequest): Promise<readonly VectorMatch[]> {
    const tenantId = request.context.tenantId;
    if (tenantId === undefined || tenantId === '') {
      throw new VectorStoreError('VECTOR_INVALID_REQUEST', 'tenantId required', 'memory-search');
    }
    const binding = await this.#capabilities.resolve({
      requestId: `embed-query:${request.requestId}`,
      capability: 'embedding',
      context: request.context,
      node: {
        workflowId: 'memory',
        nodeId: 'embed-query',
        kind: 'capability',
        capability: 'embedding',
      },
      constraints: Object.freeze({}),
    });
    const adapter = await this.#embeddings.resolve(binding);
    const embedRequest: AiEmbeddingRequest = {
      requestId: `embed-query:${request.requestId}`,
      binding,
      context: request.context,
      inputs: Object.freeze([{ id: 'query', text: request.query }]),
      model: Object.freeze({ id: this.#modelId, dimensions: this.#dimensions }),
      metadata: Object.freeze({ operation: 'memory-semantic-query' }),
    };
    const result = await adapter.embed(embedRequest);
    const embedding = result.embeddings[0];
    if (embedding === undefined || embedding.dimensions !== this.#dimensions) {
      throw new ProviderAdapterError('invalid-request', 'Query embedding dimension mismatch', false);
    }
    return this.#vectors.query({
      tenantId,
      vector: embedding.vector,
      dimensions: this.#dimensions,
      embeddingModelId: this.#modelId,
      limit: Math.max(request.maximumResults * 4, request.maximumResults),
      metric: 'cosine',
    });
  }

  async #candidatesFromMatches(
    matches: readonly VectorMatch[],
  ): Promise<{ candidates: readonly MemoryCandidate[]; stale: number }> {
    const instant = this.#now();
    const candidates: MemoryCandidate[] = [];
    let stale = 0;
    for (const match of matches) {
      const record = await this.#storage.get(match.memoryId);
      if (!isCanonicalVectorMatchValid(record, match, this.#modelId, instant)) {
        stale += 1;
        continue;
      }
      candidates.push(
        Object.freeze({
          record: record as MemoryRecord,
          relevance: match.score,
          frequency: 1,
          searchStrategy: 'semantic' as const,
        }),
      );
    }
    return { candidates: Object.freeze(candidates), stale };
  }

  async #fallback(
    request: MemoryRetrievalRequest,
    error: unknown,
  ): Promise<Readonly<{ candidates: readonly MemoryCandidate[]; partialReasons: readonly string[] }>> {
    const keyword = await this.#keyword.search({ ...request, strategy: 'keyword' });
    const reasons = fallbackReasons(error);
    return Object.freeze({
      candidates: Object.freeze(
        keyword.candidates.map((c) => Object.freeze({ ...c, searchStrategy: request.strategy })),
      ),
      partialReasons: Object.freeze(['semantic-unavailable', ...reasons, ...keyword.partialReasons]),
    });
  }
}

/**
 * Canonical validation for vector matches.
 * - contentVersion must match (content identity).
 * - vector.lifecycleVersion > record.lifecycleVersion ⇒ orphan (upsert won, Memory OCC lost).
 * - vector.lifecycleVersion <= record.lifecycleVersion is OK (e.g. make-available advanced OCC).
 */
export function isCanonicalVectorMatchValid(
  record: MemoryRecord | undefined,
  match: VectorMatch,
  expectedModelId: string,
  now: Date,
): boolean {
  if (record === undefined) return false;
  if (record.ownership.tenantId !== match.tenantId) return false;
  if (record.state !== 'available') return false;
  if (isExpired(record, now)) return false;
  if (match.embeddingModelId !== expectedModelId) return false;
  if (record.version !== match.contentVersion) return false;
  if (match.lifecycleVersion > record.lifecycleVersion) return false;
  return true;
}

function isExpired(record: MemoryRecord, now: Date): boolean {
  const expiresAt = record.retention.expiresAt;
  if (expiresAt === undefined) return false;
  const deadline = Date.parse(expiresAt);
  return Number.isFinite(deadline) && now.getTime() >= deadline;
}

function fallbackReasons(error: unknown): readonly string[] {
  if (error instanceof ProviderAdapterError) return Object.freeze(['embedding-unavailable']);
  if (error instanceof VectorStoreError) return Object.freeze(['vector-store-unavailable']);
  return Object.freeze(['embedding-unavailable']);
}
