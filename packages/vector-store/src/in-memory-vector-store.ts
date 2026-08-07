import type { HealthResult } from '@agentprodready/foundation';
import type {
  VectorDistanceMetric,
  VectorIndexIdentity,
  VectorMatch,
  VectorQueryRequest,
  VectorRecord,
  VectorStorePort,
  VectorUpsertRequest,
} from './contracts.js';
import { VectorStoreError } from './errors.js';

export interface InMemoryVectorStoreOptions {
  readonly dimensions: number;
  readonly embeddingModelId: string;
  readonly metric?: VectorDistanceMetric;
  readonly id?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function assertFiniteVector(vector: readonly number[], diagnosticId: string): void {
  for (const component of vector) {
    if (!Number.isFinite(component)) {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'Vector components must be finite numbers',
        diagnosticId,
      );
    }
  }
}

function l2Norm(vector: readonly number[]): number {
  let sum = 0;
  for (const component of vector) sum += component * component;
  return Math.sqrt(sum);
}

function dotProduct(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += (a[i] as number) * (b[i] as number);
  }
  return sum;
}

/** Cosine similarity in [-1, 1]; for L2-normalized vectors equals the dot product. */
function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const denom = l2Norm(a) * l2Norm(b);
  if (denom === 0) return 0;
  return dotProduct(a, b) / denom;
}

/** Map cosine similarity [-1, 1] → similarity score [0, 1]. */
function cosineScore(a: readonly number[], b: readonly number[]): number {
  return clamp01((1 + cosineSimilarity(a, b)) / 2);
}

function freezeRecord(record: VectorRecord): VectorRecord {
  return Object.freeze({
    memoryId: record.memoryId,
    tenantId: record.tenantId,
    vector: Object.freeze([...record.vector]),
    dimensions: record.dimensions,
    embeddingModelId: record.embeddingModelId,
    ...(record.embeddingModelVersion !== undefined
      ? { embeddingModelVersion: record.embeddingModelVersion }
      : {}),
    contentVersion: record.contentVersion,
    lifecycleVersion: record.lifecycleVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    metadata: Object.freeze({ ...record.metadata }),
  });
}

export class InMemoryVectorStore implements VectorStorePort {
  public readonly id: string;
  public readonly metric: VectorDistanceMetric;
  public readonly dimensions: number;
  public readonly embeddingModelId: string;
  readonly #byTenant = new Map<string, Map<string, VectorRecord>>();

  public constructor(options: InMemoryVectorStoreOptions) {
    if (!Number.isInteger(options.dimensions) || options.dimensions < 1) {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'dimensions must be a positive integer',
        'vector-store:in-memory:construct',
      );
    }
    if (options.embeddingModelId.trim() === '') {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'embeddingModelId is required',
        'vector-store:in-memory:construct',
      );
    }
    this.id = options.id ?? 'in-memory-vector-store';
    this.metric = options.metric ?? 'cosine';
    this.dimensions = options.dimensions;
    this.embeddingModelId = options.embeddingModelId;
  }

  public async upsert(request: VectorUpsertRequest): Promise<void> {
    const record = request.record;
    const diagnosticId = `vector-store:in-memory:upsert:${record.tenantId}:${record.memoryId}`;
    if (record.memoryId.trim() === '' || record.tenantId.trim() === '') {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'memoryId and tenantId are required',
        diagnosticId,
      );
    }
    if (record.dimensions !== this.dimensions || record.vector.length !== this.dimensions) {
      throw new VectorStoreError(
        'VECTOR_DIMENSION_MISMATCH',
        'Vector dimensions do not match store contract',
        diagnosticId,
      );
    }
    if (record.embeddingModelId !== this.embeddingModelId) {
      throw new VectorStoreError(
        'VECTOR_MODEL_MISMATCH',
        'Embedding model does not match store contract',
        diagnosticId,
      );
    }
    assertFiniteVector(record.vector, diagnosticId);

    let tenantMap = this.#byTenant.get(record.tenantId);
    if (tenantMap === undefined) {
      tenantMap = new Map();
      this.#byTenant.set(record.tenantId, tenantMap);
    }
    tenantMap.set(record.memoryId, freezeRecord(record));
  }

  public async remove(identity: VectorIndexIdentity): Promise<void> {
    const tenantMap = this.#byTenant.get(identity.tenantId);
    if (tenantMap === undefined) return;
    tenantMap.delete(identity.memoryId);
    if (tenantMap.size === 0) this.#byTenant.delete(identity.tenantId);
  }

  public async query(request: VectorQueryRequest): Promise<readonly VectorMatch[]> {
    const diagnosticId = `vector-store:in-memory:query:${request.tenantId}`;
    if (request.tenantId.trim() === '') {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'tenantId is required',
        diagnosticId,
      );
    }
    if (!Number.isInteger(request.limit) || request.limit < 1) {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'limit must be a positive integer',
        diagnosticId,
      );
    }
    if (request.metric !== this.metric) {
      throw new VectorStoreError(
        'VECTOR_METRIC_MISMATCH',
        'Query metric does not match store contract',
        diagnosticId,
      );
    }
    if (request.dimensions !== this.dimensions || request.vector.length !== this.dimensions) {
      throw new VectorStoreError(
        'VECTOR_DIMENSION_MISMATCH',
        'Query vector dimensions do not match store contract',
        diagnosticId,
      );
    }
    if (request.embeddingModelId !== this.embeddingModelId) {
      throw new VectorStoreError(
        'VECTOR_MODEL_MISMATCH',
        'Query embedding model does not match store contract',
        diagnosticId,
      );
    }
    assertFiniteVector(request.vector, diagnosticId);

    if (this.metric !== 'cosine') {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        `InMemoryVectorStore v0.7 supports cosine metric only (configured=${this.metric})`,
        diagnosticId,
      );
    }

    const tenantMap = this.#byTenant.get(request.tenantId);
    if (tenantMap === undefined) return Object.freeze([]);

    const matches: VectorMatch[] = [];
    for (const record of tenantMap.values()) {
      matches.push(
        Object.freeze({
          memoryId: record.memoryId,
          tenantId: record.tenantId,
          score: cosineScore(request.vector, record.vector),
          embeddingModelId: record.embeddingModelId,
          contentVersion: record.contentVersion,
          lifecycleVersion: record.lifecycleVersion,
        }),
      );
    }
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.memoryId.localeCompare(b.memoryId);
    });
    return Object.freeze(matches.slice(0, request.limit));
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}
