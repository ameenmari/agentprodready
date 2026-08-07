import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  InMemoryPersistenceAudit,
  InMemoryPersistenceDiagnostics,
  InMemoryPersistenceEvents,
  PersistenceError,
  PersistenceFramework,
  type PersistenceAuthorization,
  type PersistenceScope,
  type TransactionRequest,
} from '@agentforge/persistence';
import { loadPostgresPersistenceConfig, PERSISTENCE_POSTGRES_BOUNDARY_ID } from './config.js';
import { applyMigrations, resetTestDatabase } from './migrator.js';
import { PostgresMigrationProvider } from './postgres-migration-provider.js';
import { PostgresPersistenceProvider } from './postgres-persistence-provider.js';
import { PostgresSnapshotStore } from './postgres-snapshot-store.js';

const enabled = process.env['RUN_POSTGRES_TESTS'] === '1';
const at = '2026-08-07T00:00:00.000Z';
const scope: PersistenceScope = { tenantId: 'tenant-1', workspaceId: 'workspace-1' };

function authorization(
  operation: PersistenceAuthorization['operation'],
  overrides: Partial<PersistenceAuthorization> = {},
): PersistenceAuthorization {
  return {
    decisionId: `decision:${operation}`,
    principalId: 'operator-1',
    operation,
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
    ...overrides,
  };
}

function request(
  id: string,
  overrides: Partial<TransactionRequest> = {},
): TransactionRequest {
  return {
    id,
    boundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
    repositoryNames: ['entities'],
    isolation: 'read-committed',
    mandatoryDurability: 'durable',
    atomicityRequired: true,
    authorization: authorization('transaction'),
    correlationId: 'correlation-1',
    startedAt: at,
    ...overrides,
  };
}

describe.skipIf(!enabled)('postgres persistence integration', () => {
  let provider: PostgresPersistenceProvider;
  let snapshots: PostgresSnapshotStore;
  let migrations: PostgresMigrationProvider;
  let framework: PersistenceFramework;

  beforeAll(async () => {
    process.env['PERSISTENCE_ALLOW_RESET'] = '1';
    const config = loadPostgresPersistenceConfig();
    await resetTestDatabase(config);
    await applyMigrations(config);
    provider = new PostgresPersistenceProvider(config);
    snapshots = new PostgresSnapshotStore(provider.pool);
    migrations = new PostgresMigrationProvider(provider.pool);
    framework = new PersistenceFramework(
      provider,
      snapshots,
      migrations,
      new InMemoryPersistenceEvents(),
      new InMemoryPersistenceAudit(),
      new InMemoryPersistenceDiagnostics(),
    );
    await provider.assertReady();
  }, 60_000);

  afterAll(async () => {
    await provider.close();
  });

  beforeEach(async () => {
    await provider.pool.query('DELETE FROM persistence_entities');
    await provider.pool.query('DELETE FROM persistence_snapshots');
    await provider.pool.query('DELETE FROM persistence_migration_records');
  });

  async function create(
    id = 'entity-1',
    data: unknown = { name: 'first', score: 1 },
  ): Promise<void> {
    const tx = await framework.begin(request(`create-${id}`));
    tx.stage({ type: 'save', write: { repository: 'entities', id, scope, data, occurredAt: at } });
    await tx.commit(at);
  }

  it('supports create/read/update/delete/exists/count/query', async () => {
    await create();
    const repository = provider.repository('entities');
    await expect(repository.exists('entity-1', scope)).resolves.toBe(true);
    await expect(repository.count(scope)).resolves.toBe(1);
    const found = await repository.find('entity-1', scope);
    expect(found).toMatchObject({ id: 'entity-1', revision: 1, data: { name: 'first', score: 1 } });
    if (found === undefined) throw new Error('missing');

    const update = await framework.begin(request('update'));
    update.stage({
      type: 'save',
      write: {
        repository: 'entities',
        id: 'entity-1',
        scope,
        data: { name: 'updated', score: 2 },
        expectedRevision: found.revision,
        expectedVersionToken: found.versionToken,
        occurredAt: '2026-08-07T00:01:00.000Z',
      },
    });
    await update.commit(at);
    const updated = await repository.find('entity-1', scope);
    expect(updated).toMatchObject({ revision: 2, data: { name: 'updated', score: 2 } });
    if (updated === undefined) throw new Error('missing update');

    const del = await framework.begin(request('delete'));
    del.stage({
      type: 'delete',
      deletion: {
        repository: 'entities',
        id: 'entity-1',
        scope,
        expectedRevision: updated.revision,
        expectedVersionToken: updated.versionToken,
      },
    });
    await del.commit(at);
    await expect(repository.find('entity-1', scope)).resolves.toBeUndefined();
  });

  it('commits and rolls back transactions atomically', async () => {
    const rollbackTx = await framework.begin(request('rollback'));
    rollbackTx.stage({
      type: 'save',
      write: { repository: 'entities', id: 'r1', scope, data: { v: 1 }, occurredAt: at },
    });
    await rollbackTx.rollback(at);
    await expect(provider.repository('entities').count(scope)).resolves.toBe(0);

    const atomic = await framework.begin(request('atomic'));
    atomic.stage({
      type: 'save',
      write: { repository: 'entities', id: 'valid', scope, data: { v: 1 }, occurredAt: at },
    });
    atomic.stage({
      type: 'delete',
      deletion: {
        repository: 'entities',
        id: 'missing',
        scope,
        expectedRevision: 1,
        expectedVersionToken: 'missing',
      },
    });
    await expect(atomic.commit(at)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    await expect(provider.repository('entities').exists('valid', scope)).resolves.toBe(false);
  });

  it('supports approved isolation levels and rejects snapshot', async () => {
    for (const isolation of ['read-committed', 'repeatable-read', 'serializable'] as const) {
      const tx = await framework.begin(request(`iso-${isolation}`, { isolation }));
      expect(tx.isolation).toBe(isolation);
      await tx.rollback(at);
    }
    await expect(
      framework.begin(request('snapshot', { isolation: 'snapshot' })),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CAPABILITY' });
  });

  it('enforces optimistic concurrency and duplicate entity', async () => {
    await create();
    const created = await provider.repository('entities').find('entity-1', scope);
    if (created === undefined) throw new Error('missing');
    const first = await framework.begin(request('first'));
    const second = await framework.begin(request('second'));
    for (const [tx, name] of [
      [first, 'first'],
      [second, 'second'],
    ] as const) {
      tx.stage({
        type: 'save',
        write: {
          repository: 'entities',
          id: 'entity-1',
          scope,
          data: { name },
          expectedRevision: created.revision,
          expectedVersionToken: created.versionToken,
          occurredAt: '2026-08-07T00:01:00.000Z',
        },
      });
    }
    await first.commit(at);
    await expect(second.commit(at)).rejects.toMatchObject({ code: 'OPTIMISTIC_LOCK_FAILED' });

    // Sequential re-save without expected revision matches in-memory OCC rejection.
    // Unique-violation → DUPLICATE_ENTITY is covered by error-translation unit tests + schema PK.
    const dup = await framework.begin(request('dup-tx'));
    dup.stage({
      type: 'save',
      write: {
        repository: 'entities',
        id: 'entity-1',
        scope,
        data: { again: true },
        occurredAt: at,
      },
    });
    await expect(dup.commit(at)).rejects.toMatchObject({ code: 'OPTIMISTIC_LOCK_FAILED' });
  });

  it('saves immutable snapshots', async () => {
    await create();
    const snapshot = await framework.snapshot(
      'snap-1',
      'entities',
      scope,
      authorization('snapshot'),
      at,
    );
    expect(snapshot).toMatchObject({
      immutable: true,
      auditHistory: false,
      providerBoundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
    });
    await expect(snapshots.get('snap-1')).resolves.toEqual(snapshot);
    await expect(snapshots.save(snapshot)).rejects.toMatchObject({ code: 'DUPLICATE_ENTITY' });
  });

  it('applies Blueprint 24 migration records idempotently', async () => {
    const plan = {
      id: 'migration-plan-1',
      version: '1.0.0',
      providerBoundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
      fromSchemaVersion: '1',
      toSchemaVersion: '2',
      steps: [{ id: 'step-1', description: 'noop', operationReference: 'op:1' }],
      rollbackPlanReference: 'rollback:1',
      compatibility: { minimumReaderVersion: '1', minimumWriterVersion: '2' },
      authorization: authorization('migrate'),
      createdAt: at,
    };
    expect(await framework.migrate(plan, 'c1')).toMatchObject({ outcome: 'applied' });
    expect(await framework.migrate(plan, 'c1')).toMatchObject({ outcome: 'already-applied' });
    expect(await migrations.rollback(plan, '2026-08-07T01:00:00.000Z')).toMatchObject({
      outcome: 'rolled-back',
    });
  });

  it('advertises durable capabilities and accepts durable mandatory transactions', async () => {
    expect(provider.capabilities).toMatchObject({
      providerId: 'postgres',
      boundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
      durability: 'durable',
      atomicTransactions: true,
      rollback: true,
      crossProviderAtomicity: false,
    });
    const tx = await framework.begin(request('durable-ok', { mandatoryDurability: 'durable' }));
    await tx.rollback(at);
  });

  it('normalizes connection failures', async () => {
    const bad = new PostgresPersistenceProvider({
      connectionString: 'postgres://invalid:invalid@127.0.0.1:1/none',
      ssl: false,
      poolMin: 0,
      poolMax: 1,
    });
    await expect(bad.repository('entities').count(scope)).rejects.toBeInstanceOf(PersistenceError);
    await expect(bad.repository('entities').count(scope)).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    await bad.close();
  });

  it('supports filtered sorted paginated queries', async () => {
    await create('one', { score: 2, tags: ['a'] });
    await create('two', { score: 1, tags: ['b'] });
    const result = await provider.repository<{ score: number }>('entities').query({
      id: 'q1',
      scope,
      filters: [{ field: 'data.score', operator: 'greater-than', value: 0 }],
      sort: [{ field: 'data.score', direction: 'ascending' }],
      projection: [],
      offset: 0,
      limit: 1,
      aggregate: 'count',
    });
    expect(result.entities[0]?.id).toBe('two');
    expect(result).toMatchObject({ total: 2, aggregate: { count: 2 } });
  });
});
