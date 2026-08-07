import {
  VectorStoreError,
  type VectorDistanceMetric,
  type VectorIndexIdentity,
  type VectorMatch,
  type VectorQueryRequest,
  type VectorStorePort,
  type VectorUpsertRequest,
} from '@agentforge/vector-store';
import type { VectorPostgresConfig } from './config.js';
import { translatePgvectorError, withPgvectorErrors } from './pgvector-error-translation.js';
import { closePostgresPool, createPostgresPool, type PostgresPool } from './pool.js';

export interface PgvectorVectorStoreOptions {
  readonly config: VectorPostgresConfig;
  readonly dimensions: number;
  readonly embeddingModelId: string;
  readonly metric?: VectorDistanceMetric;
  readonly id?: string;
  readonly pool?: PostgresPool;
}

type HealthResult = Awaited<ReturnType<VectorStorePort['health']>>;

interface ContractRow {
  readonly embedding_model_id: string;
  readonly dimensions: number;
  readonly metric: string;
  readonly profile_id: string;
}

interface QueryRow {
  readonly memory_id: string;
  readonly tenant_id: string;
  readonly embedding_model: string;
  readonly content_version: string;
  readonly lifecycle_version: number;
  readonly distance: number;
}

function formatVectorLiteral(vector: readonly number[]): string {
  return `[${vector.map((v) => String(v)).join(',')}]`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * pgvector cosine distance (`<=>` / vector_cosine_ops) is `1 - cosineSimilarity`.
 * Map to similarity score in [0,1]: score = clamp(1 - distance, 0, 1).
 */
function cosineDistanceToScore(distance: number): number {
  return clamp01(1 - distance);
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

export class PgvectorVectorStore implements VectorStorePort {
  public readonly id: string;
  public readonly metric: VectorDistanceMetric;
  public readonly dimensions: number;
  public readonly embeddingModelId: string;
  readonly #pool: PostgresPool;
  readonly #ownsPool: boolean;

  public constructor(options: PgvectorVectorStoreOptions) {
    if (!Number.isInteger(options.dimensions) || options.dimensions < 1) {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'dimensions must be a positive integer',
        'vector-store:pgvector:construct',
      );
    }
    if (options.embeddingModelId.trim() === '') {
      throw new VectorStoreError(
        'VECTOR_INVALID_REQUEST',
        'embeddingModelId is required',
        'vector-store:pgvector:construct',
      );
    }
    const metric = options.metric ?? 'cosine';
    if (metric !== 'cosine') {
      throw new VectorStoreError(
        'VECTOR_METRIC_MISMATCH',
        'PgvectorVectorStore v0.7 supports cosine metric only',
        'vector-store:pgvector:construct',
      );
    }
    this.id = options.id ?? VECTOR_STORE_DEFAULT_ID;
    this.metric = metric;
    this.dimensions = options.dimensions;
    this.embeddingModelId = options.embeddingModelId;
    this.#ownsPool = options.pool === undefined;
    this.#pool = options.pool ?? createPostgresPool(options.config);
  }

  public get pool(): PostgresPool {
    return this.#pool;
  }

  public async assertReady(): Promise<void> {
    await withPgvectorErrors('vector-store:pgvector:ready', async () => {
      await this.#pool.query('SELECT 1');
      const result = await this.#pool.query(
        `SELECT profile_id, embedding_model_id, dimensions, metric
         FROM memory_vector_schema_contract
         ORDER BY applied_at DESC
         LIMIT 1`,
      );
      const row = result.rows[0] as ContractRow | undefined;
      if (row === undefined) {
        throw new VectorStoreError(
          'VECTOR_UNAVAILABLE',
          'Vector schema contract is not migrated',
          'vector-store:pgvector:ready',
        );
      }
      if (row.dimensions !== this.dimensions) {
        throw new VectorStoreError(
          'VECTOR_DIMENSION_MISMATCH',
          'Store dimensions do not match migrated vector schema contract',
          'vector-store:pgvector:ready',
        );
      }
      if (row.embedding_model_id !== this.embeddingModelId) {
        throw new VectorStoreError(
          'VECTOR_MODEL_MISMATCH',
          'Store embedding model does not match migrated vector schema contract',
          'vector-store:pgvector:ready',
        );
      }
      if (row.metric !== this.metric) {
        throw new VectorStoreError(
          'VECTOR_METRIC_MISMATCH',
          'Store metric does not match migrated vector schema contract',
          'vector-store:pgvector:ready',
        );
      }
    });
  }

  public async upsert(request: VectorUpsertRequest): Promise<void> {
    const record = request.record;
    const diagnosticId = `vector-store:pgvector:upsert:${record.tenantId}:${record.memoryId}`;
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

    await withPgvectorErrors(diagnosticId, async () => {
      await this.#pool.query(
        `INSERT INTO memory_vector_index (
           memory_id, tenant_id, embedding, embedding_model, embedding_model_ver,
           dimensions, content_version, lifecycle_version, created_at, updated_at, metadata
         ) VALUES (
           $1, $2, $3::vector, $4, $5,
           $6, $7, $8, $9::timestamptz, $10::timestamptz, $11::jsonb
         )
         ON CONFLICT (tenant_id, memory_id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           embedding_model = EXCLUDED.embedding_model,
           embedding_model_ver = EXCLUDED.embedding_model_ver,
           dimensions = EXCLUDED.dimensions,
           content_version = EXCLUDED.content_version,
           lifecycle_version = EXCLUDED.lifecycle_version,
           updated_at = EXCLUDED.updated_at,
           metadata = EXCLUDED.metadata`,
        [
          record.memoryId,
          record.tenantId,
          formatVectorLiteral(record.vector),
          record.embeddingModelId,
          record.embeddingModelVersion ?? null,
          record.dimensions,
          record.contentVersion,
          record.lifecycleVersion,
          record.createdAt,
          record.updatedAt,
          JSON.stringify(record.metadata),
        ],
      );
    });
  }

  public async remove(identity: VectorIndexIdentity): Promise<void> {
    const diagnosticId = `vector-store:pgvector:remove:${identity.tenantId}:${identity.memoryId}`;
    await withPgvectorErrors(diagnosticId, async () => {
      await this.#pool.query(
        `DELETE FROM memory_vector_index WHERE tenant_id = $1 AND memory_id = $2`,
        [identity.tenantId, identity.memoryId],
      );
    });
  }

  public async query(request: VectorQueryRequest): Promise<readonly VectorMatch[]> {
    const diagnosticId = `vector-store:pgvector:query:${request.tenantId}`;
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

    return await withPgvectorErrors(diagnosticId, async () => {
      const result = await this.#pool.query(
        `SELECT memory_id, tenant_id, embedding_model, content_version, lifecycle_version,
                (embedding <=> $3::vector) AS distance
         FROM memory_vector_index
         WHERE tenant_id = $1 AND embedding_model = $2
         ORDER BY embedding <=> $3::vector ASC, memory_id ASC
         LIMIT $4`,
        [
          request.tenantId,
          request.embeddingModelId,
          formatVectorLiteral(request.vector),
          request.limit,
        ],
      );
      const rows = result.rows as readonly QueryRow[];
      return Object.freeze(
        rows.map((row) =>
          Object.freeze({
            memoryId: row.memory_id,
            tenantId: row.tenant_id,
            score: cosineDistanceToScore(row.distance),
            embeddingModelId: row.embedding_model,
            contentVersion: row.content_version,
            lifecycleVersion: row.lifecycle_version,
          }),
        ),
      );
    });
  }

  public async health(): Promise<HealthResult> {
    try {
      await this.#pool.query('SELECT 1');
      return Object.freeze({ name: this.id, status: 'healthy' as const });
    } catch (error) {
      const translated = translatePgvectorError(error, 'vector-store:pgvector:health');
      return Object.freeze({
        name: this.id,
        status: 'unhealthy' as const,
        details: { code: translated.code },
      });
    }
  }

  public async close(): Promise<void> {
    if (this.#ownsPool) {
      await closePostgresPool(this.#pool);
    }
  }
}

const VECTOR_STORE_DEFAULT_ID = 'pgvector-vector-store';
