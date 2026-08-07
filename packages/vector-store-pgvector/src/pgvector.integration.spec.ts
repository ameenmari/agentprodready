import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { VectorRecord } from '@agentprodready/vector-store';
import {
  applyMigrations,
  loadVectorPostgresConfig,
  rollbackLastMigration,
} from './index.js';
import { PgvectorVectorStore } from './pgvector-vector-store.js';

const enabled = process.env['RUN_POSTGRES_TESTS'] === '1';
const profile = 'reference-32' as const;
const dimensions = 32;
const embeddingModelId = 'reference-embedding-32';

function unit32(seed: number): readonly number[] {
  const values = Array.from({ length: dimensions }, (_, i) => Math.sin(seed + i * 0.17));
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return values.map((v) => v / norm);
}

function record(
  memoryId: string,
  tenantId: string,
  vector: readonly number[],
): VectorRecord {
  return {
    memoryId,
    tenantId,
    vector,
    dimensions,
    embeddingModelId,
    contentVersion: '1',
    lifecycleVersion: 1,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    metadata: { kind: 'test' },
  };
}

describe.skipIf(!enabled)('pgvector vector store integration', () => {
  let store: PgvectorVectorStore;

  beforeAll(async () => {
    process.env['VECTOR_INDEX_PROFILE'] = profile;
    process.env['VECTOR_ALLOW_RESET'] = '1';
    const config = loadVectorPostgresConfig();
    // Ensure a clean profile surface for this suite.
    for (;;) {
      const rolled = await rollbackLastMigration(config, profile);
      if (rolled === undefined) break;
    }
    await applyMigrations(config, profile);
    store = new PgvectorVectorStore({
      config,
      dimensions,
      embeddingModelId,
    });
    await store.assertReady();
  }, 60_000);

  afterAll(async () => {
    await store.close();
  });

  beforeEach(async () => {
    await store.pool.query('DELETE FROM memory_vector_index');
  });

  it('upserts, queries nearest neighbors, and isolates tenants', async () => {
    const query = unit32(1);
    const near = unit32(1.05);
    const far = unit32(9);
    await store.upsert({ record: record('m-near', 't1', near) });
    await store.upsert({ record: record('m-far', 't1', far) });
    await store.upsert({ record: record('m-other', 't2', near) });

    const matches = await store.query({
      tenantId: 't1',
      vector: query,
      dimensions,
      embeddingModelId,
      limit: 10,
      metric: 'cosine',
    });

    expect(matches.map((m) => m.memoryId)).toEqual(['m-near', 'm-far']);
    expect((matches[0]?.score ?? 0) > (matches[1]?.score ?? 1)).toBe(true);
    expect(matches.every((m) => m.tenantId === 't1')).toBe(true);
    expect(matches.every((m) => m.score >= 0 && m.score <= 1)).toBe(true);
  });

  it('updates on conflict and removes idempotently', async () => {
    const v1 = unit32(2);
    const v2 = unit32(3);
    await store.upsert({ record: record('m1', 't1', v1) });
    await store.upsert({
      record: {
        ...record('m1', 't1', v2),
        contentVersion: '2',
        updatedAt: '2026-08-07T01:00:00.000Z',
      },
    });

    const afterUpdate = await store.query({
      tenantId: 't1',
      vector: v2,
      dimensions,
      embeddingModelId,
      limit: 1,
      metric: 'cosine',
    });
    expect(afterUpdate[0]?.memoryId).toBe('m1');
    expect(afterUpdate[0]?.score).toBeCloseTo(1, 5);

    await store.remove({ tenantId: 't1', memoryId: 'm1' });
    await store.remove({ tenantId: 't1', memoryId: 'm1' });
    const afterRemove = await store.query({
      tenantId: 't1',
      vector: v2,
      dimensions,
      embeddingModelId,
      limit: 5,
      metric: 'cosine',
    });
    expect(afterRemove).toEqual([]);
  });

  it('rejects dimension and model mismatches', async () => {
    await expect(
      store.upsert({
        record: {
          ...record('m1', 't1', unit32(1).slice(0, 8)),
          dimensions: 8,
          vector: unit32(1).slice(0, 8),
        },
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_DIMENSION_MISMATCH' });

    await expect(
      store.upsert({
        record: { ...record('m1', 't1', unit32(1)), embeddingModelId: 'other-model' },
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_MODEL_MISMATCH' });

    await expect(
      store.query({
        tenantId: 't1',
        vector: unit32(1),
        dimensions,
        embeddingModelId: 'other-model',
        limit: 1,
        metric: 'cosine',
      }),
    ).rejects.toMatchObject({ code: 'VECTOR_MODEL_MISMATCH' });
  });

  it('reports healthy when connected', async () => {
    await expect(store.health()).resolves.toEqual({
      name: 'pgvector-vector-store',
      status: 'healthy',
    });
  });
});
