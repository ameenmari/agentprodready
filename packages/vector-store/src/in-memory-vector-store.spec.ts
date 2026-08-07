import { describe, expect, it } from 'vitest';
import type { VectorRecord } from './contracts.js';
import type { VectorStoreError } from './errors.js';
import { InMemoryVectorStore } from './in-memory-vector-store.js';

const dims = 4;
const model = 'reference-embedding-4';

function unit(vector: readonly number[]): readonly number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / norm);
}

function record(
  memoryId: string,
  tenantId: string,
  vector: readonly number[],
  overrides: Partial<VectorRecord> = {},
): VectorRecord {
  return {
    memoryId,
    tenantId,
    vector,
    dimensions: dims,
    embeddingModelId: model,
    contentVersion: '1',
    lifecycleVersion: 1,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    metadata: {},
    ...overrides,
  };
}

describe('InMemoryVectorStore', () => {
  it('upserts, queries by cosine score, and isolates tenants', async () => {
    const store = new InMemoryVectorStore({ dimensions: dims, embeddingModelId: model });
    const a = unit([1, 0, 0, 0]);
    const b = unit([0.9, 0.1, 0, 0]);
    const c = unit([0, 1, 0, 0]);

    await store.upsert({ record: record('m-a', 't1', a) });
    await store.upsert({ record: record('m-b', 't1', b) });
    await store.upsert({ record: record('m-c', 't1', c) });
    await store.upsert({ record: record('m-other', 't2', a) });

    const matches = await store.query({
      tenantId: 't1',
      vector: a,
      dimensions: dims,
      embeddingModelId: model,
      limit: 10,
      metric: 'cosine',
    });

    expect(matches.map((m) => m.memoryId)).toEqual(['m-a', 'm-b', 'm-c']);
    expect(matches[0]?.score).toBeCloseTo(1, 5);
    const mid = matches[1]?.score;
    const low = matches[2]?.score;
    expect(mid).toBeDefined();
    expect(low).toBeDefined();
    if (mid !== undefined && low !== undefined) expect(mid).toBeGreaterThan(low);
    expect(matches.every((m) => m.tenantId === 't1')).toBe(true);
    expect(matches.every((m) => m.score >= 0 && m.score <= 1)).toBe(true);
  });

  it('sorts equal scores by memoryId ascending', async () => {
    const store = new InMemoryVectorStore({ dimensions: dims, embeddingModelId: model });
    const v = unit([1, 0, 0, 0]);
    await store.upsert({ record: record('m-z', 't1', v) });
    await store.upsert({ record: record('m-a', 't1', v) });

    const matches = await store.query({
      tenantId: 't1',
      vector: v,
      dimensions: dims,
      embeddingModelId: model,
      limit: 10,
      metric: 'cosine',
    });
    expect(matches.map((m) => m.memoryId)).toEqual(['m-a', 'm-z']);
  });

  it('remove is idempotent', async () => {
    const store = new InMemoryVectorStore({ dimensions: dims, embeddingModelId: model });
    await store.upsert({ record: record('m1', 't1', unit([1, 0, 0, 0])) });
    await store.remove({ tenantId: 't1', memoryId: 'm1' });
    await store.remove({ tenantId: 't1', memoryId: 'm1' });
    const matches = await store.query({
      tenantId: 't1',
      vector: unit([1, 0, 0, 0]),
      dimensions: dims,
      embeddingModelId: model,
      limit: 5,
      metric: 'cosine',
    });
    expect(matches).toEqual([]);
  });

  it('rejects dimension, model, and metric mismatches', async () => {
    const store = new InMemoryVectorStore({ dimensions: dims, embeddingModelId: model });
    const v = unit([1, 0, 0, 0]);

    await expect(
      store.upsert({
        record: record('m1', 't1', [1, 0], { dimensions: 2 }),
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_DIMENSION_MISMATCH' } satisfies Partial<VectorStoreError>);

    await expect(
      store.upsert({
        record: record('m1', 't1', v, { embeddingModelId: 'other' }),
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_MODEL_MISMATCH' });

    await store.upsert({ record: record('m1', 't1', v) });

    await expect(
      store.query({
        tenantId: 't1',
        vector: v,
        dimensions: dims,
        embeddingModelId: model,
        limit: 1,
        metric: 'l2',
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_METRIC_MISMATCH' });

    await expect(
      store.query({
        tenantId: 't1',
        vector: [1, 0],
        dimensions: 2,
        embeddingModelId: model,
        limit: 1,
        metric: 'cosine',
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_DIMENSION_MISMATCH' });
  });

  it('rejects non-finite vector components', async () => {
    const store = new InMemoryVectorStore({ dimensions: dims, embeddingModelId: model });
    await expect(
      store.upsert({
        record: record('m1', 't1', [1, Number.NaN, 0, 0]),
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_INVALID_REQUEST' });
  });

  it('reports healthy', async () => {
    const store = new InMemoryVectorStore({ dimensions: dims, embeddingModelId: model });
    await expect(store.health()).resolves.toEqual({
      name: 'in-memory-vector-store',
      status: 'healthy',
    });
  });

  it('maps unit-vector cosine similarity with (dot+1)/2', async () => {
    const store = new InMemoryVectorStore({ dimensions: 2, embeddingModelId: model });
    const a = [1, 0] as const;
    const orthogonal = [0, 1] as const;
    await store.upsert({
      record: {
        ...record('m-orth', 't1', orthogonal, { dimensions: 2 }),
        dimensions: 2,
      },
    });
    const matches = await store.query({
      tenantId: 't1',
      vector: a,
      dimensions: 2,
      embeddingModelId: model,
      limit: 1,
      metric: 'cosine',
    });
    expect(matches[0]?.score).toBeCloseTo(0.5, 5);
  });
});
