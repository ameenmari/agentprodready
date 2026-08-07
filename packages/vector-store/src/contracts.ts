import type { HealthResult } from '@agentprodready/foundation';

export type VectorDistanceMetric = 'cosine' | 'inner-product' | 'l2';

export interface VectorIndexIdentity {
  readonly memoryId: string;
  readonly tenantId: string;
}

export interface VectorRecord {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly vector: readonly number[];
  readonly dimensions: number;
  readonly embeddingModelId: string;
  readonly embeddingModelVersion?: string;
  readonly contentVersion: string;
  readonly lifecycleVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface VectorUpsertRequest {
  readonly record: VectorRecord;
}

export interface VectorQueryRequest {
  readonly tenantId: string;
  readonly vector: readonly number[];
  readonly dimensions: number;
  readonly embeddingModelId: string;
  readonly limit: number;
  readonly metric: VectorDistanceMetric;
}

export interface VectorMatch {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly score: number;
  readonly embeddingModelId: string;
  /** Derived artifact versions for stale checks against canonical MemoryRecord. */
  readonly contentVersion: string;
  readonly lifecycleVersion: number;
}

export interface VectorStorePort {
  readonly id: string;
  readonly metric: VectorDistanceMetric;
  readonly dimensions: number;
  readonly embeddingModelId: string;
  upsert(request: VectorUpsertRequest): Promise<void>;
  remove(identity: VectorIndexIdentity): Promise<void>;
  query(request: VectorQueryRequest): Promise<readonly VectorMatch[]>;
  health(): Promise<HealthResult>;
}
