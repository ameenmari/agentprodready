import { describe, expect, it } from 'vitest';
import {
  InMemoryMigrationProvider,
  InMemoryPersistenceAudit,
  InMemoryPersistenceDiagnostics,
  InMemoryPersistenceEvents,
  InMemoryPersistenceProvider,
  InMemorySnapshotStore,
  PersistenceError,
  PersistenceFramework,
  type PersistenceAuthorization,
  type PersistedEntity,
  type PersistenceScope,
  type TransactionRequest,
} from './index.js';

const scope: PersistenceScope = { tenantId: 'tenant-1', workspaceId: 'workspace-1' },
  at = '2026-08-06T00:00:00.000Z';
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
  id = 'transaction-1',
  overrides: Partial<TransactionRequest> = {},
): TransactionRequest {
  return {
    id,
    boundaryId: 'memory-boundary',
    repositoryNames: ['entities'],
    isolation: 'read-committed',
    mandatoryDurability: 'non-durable',
    atomicityRequired: true,
    authorization: authorization('transaction'),
    correlationId: 'correlation-1',
    startedAt: at,
    ...overrides,
  };
}
interface Fixture {
  readonly framework: PersistenceFramework;
  readonly provider: InMemoryPersistenceProvider;
  readonly snapshots: InMemorySnapshotStore;
  readonly migrations: InMemoryMigrationProvider;
  readonly events: InMemoryPersistenceEvents;
  readonly audit: InMemoryPersistenceAudit;
  readonly diagnostics: InMemoryPersistenceDiagnostics;
}
function fixture(provider = new InMemoryPersistenceProvider()): Fixture {
  const snapshots = new InMemorySnapshotStore(),
    migrations = new InMemoryMigrationProvider(),
    events = new InMemoryPersistenceEvents(),
    audit = new InMemoryPersistenceAudit(),
    diagnostics = new InMemoryPersistenceDiagnostics();
  return {
    framework: new PersistenceFramework(
      provider,
      snapshots,
      migrations,
      events,
      audit,
      diagnostics,
    ),
    provider,
    snapshots,
    migrations,
    events,
    audit,
    diagnostics,
  };
}
async function create(
  value: Fixture,
  id = 'entity-1',
  repository = 'entities',
  data: unknown = { name: 'first', score: 1 },
): Promise<PersistedEntity | undefined> {
  const transaction = await value.framework.begin(
    request(`create-${id}`, { repositoryNames: [repository] }),
  );
  transaction.stage({ type: 'save', write: { repository, id, scope, data, occurredAt: at } });
  await transaction.commit(at);
  return await value.provider.repository(repository).find(id, scope);
}

describe('async I/O contract amendment', () => {
  it('resolves in-memory repository and SnapshotStore methods as Promises', async () => {
    const value = fixture();
    await create(value);
    const repository = value.provider.repository('entities');
    const findPromise = repository.find('entity-1', scope);
    const existsPromise = repository.exists('entity-1', scope);
    const countPromise = repository.count(scope);
    expect(findPromise).toBeInstanceOf(Promise);
    expect(existsPromise).toBeInstanceOf(Promise);
    expect(countPromise).toBeInstanceOf(Promise);
    expect(await findPromise).toMatchObject({ id: 'entity-1', revision: 1 });
    expect(await existsPromise).toBe(true);
    expect(await countPromise).toBe(1);

    const snapshot = await value.framework.snapshot(
      'async-snapshot',
      'entities',
      scope,
      authorization('snapshot'),
      at,
    );
    const getPromise = value.snapshots.get('async-snapshot');
    expect(getPromise).toBeInstanceOf(Promise);
    expect(await getPromise).toEqual(snapshot);
  });

  it('requires awaiting UnitOfWork.begin and PersistenceFramework.begin', async () => {
    const value = fixture();
    const beginPromise = value.framework.begin(request('async-begin'));
    expect(beginPromise).toBeInstanceOf(Promise);
    const transaction = await beginPromise;
    expect(transaction.state).toBe('active');
    expect(typeof transaction.stage).toBe('function');
  });

  it('propagates rejected repository Promises as PersistenceError', async () => {
    const value = fixture();
    const repository = value.provider.repository('entities');
    await expect(
      repository.query({
        id: 'bad-query',
        scope,
        filters: [],
        sort: [],
        projection: [],
        offset: -1,
        limit: 1,
        aggregate: 'none',
      }),
    ).rejects.toMatchObject({ code: 'CONSTRAINT_VIOLATION' });
  });

  it('exposes no synchronous repository or snapshot compatibility path', async () => {
    const repository = fixture().provider.repository('entities');
    const findResult: unknown = repository.find('missing', scope);
    expect(findResult).toBeInstanceOf(Promise);
    expect(typeof (findResult as Promise<unknown>).then).toBe('function');
    await expect(findResult as Promise<unknown>).resolves.toBeUndefined();
  });
});

describe('repositories, transactions, atomicity, and concurrency', () => {
  it('standardizes CRUD through explicit transactions and repositories', async () => {
    const value = fixture(),
      created = await create(value);
    expect(created).toMatchObject({
      id: 'entity-1',
      revision: 1,
      data: { name: 'first', score: 1 },
    });
    if (created === undefined) throw new Error('Entity fixture was not created');
    const transaction = await value.framework.begin(request('update'));
    transaction.stage({
      type: 'save',
      write: {
        repository: 'entities',
        id: 'entity-1',
        scope,
        data: { name: 'updated', score: 2 },
        expectedRevision: created.revision,
        expectedVersionToken: created.versionToken,
        occurredAt: '2026-08-06T00:01:00.000Z',
      },
    });
    const committed = await transaction.commit(at);
    expect(committed).toMatchObject({
      outcome: 'committed',
      atomic: true,
      partialCommit: false,
      isolation: 'read-committed',
      durability: 'non-durable',
    });
    await expect(value.provider.repository('entities').exists('entity-1', scope)).resolves.toBe(true);
  });
  it('rolls back explicitly without persisting staged writes', async () => {
    const value = fixture(),
      transaction = await value.framework.begin(request('rollback'));
    transaction.stage({
      type: 'save',
      write: { repository: 'entities', id: 'entity-1', scope, data: { value: 1 }, occurredAt: at },
    });
    const result = await transaction.rollback(at);
    expect(result).toMatchObject({
      outcome: 'rolled-back',
      partialCommit: false,
      operationCount: 1,
    });
    await expect(value.provider.repository('entities').count(scope)).resolves.toBe(0);
  });
  it('prevents partial commit when any staged operation fails', async () => {
    const value = fixture(),
      transaction = await value.framework.begin(request('atomic'));
    transaction.stage({
      type: 'save',
      write: { repository: 'entities', id: 'valid', scope, data: { value: 1 }, occurredAt: at },
    });
    transaction.stage({
      type: 'delete',
      deletion: {
        repository: 'entities',
        id: 'missing',
        scope,
        expectedRevision: 1,
        expectedVersionToken: 'missing',
      },
    });
    await expect(transaction.commit(at)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    await expect(value.provider.repository('entities').exists('valid', scope)).resolves.toBe(false);
  });
  it('rejects stale concurrent updates with normalized optimistic locking', async () => {
    const value = fixture(),
      created = await create(value),
      first = await value.framework.begin(request('first')),
      second = await value.framework.begin(request('second'));
    if (created === undefined) throw new Error('Entity fixture was not created');
    for (const [transaction, name] of [
      [first, 'first'],
      [second, 'second'],
    ] as const)
      transaction.stage({
        type: 'save',
        write: {
          repository: 'entities',
          id: 'entity-1',
          scope,
          data: { name },
          expectedRevision: created.revision,
          expectedVersionToken: created.versionToken,
          occurredAt: '2026-08-06T00:01:00.000Z',
        },
      });
    await first.commit(at);
    await expect(second.commit(at)).rejects.toMatchObject({ code: 'OPTIMISTIC_LOCK_FAILED' });
    expect(await value.provider.repository('entities').find('entity-1', scope)).toMatchObject({
      data: { name: 'first' },
    });
  });
  it('supports atomic same-boundary cross-repository transactions', async () => {
    const value = fixture(),
      transaction = await value.framework.begin(
        request('multi', { repositoryNames: ['entities', 'metadata'] }),
      );
    transaction.stage({
      type: 'save',
      write: { repository: 'entities', id: 'e1', scope, data: { value: 1 }, occurredAt: at },
    });
    transaction.stage({
      type: 'save',
      write: { repository: 'metadata', id: 'm1', scope, data: { entity: 'e1' }, occurredAt: at },
    });
    await transaction.commit(at);
    await expect(value.provider.repository('entities').count(scope)).resolves.toBe(1);
    await expect(value.provider.repository('metadata').count(scope)).resolves.toBe(1);
  });
});

describe('capabilities, durability, isolation, snapshots, queries, and migrations', () => {
  it('declares non-durable reference behavior accurately', () => {
    const value = fixture();
    expect(value.provider.capabilities).toMatchObject({
      durability: 'non-durable',
      atomicTransactions: true,
      rollback: true,
      crossProviderAtomicity: false,
      defaultIsolation: 'read-committed',
    });
  });
  it('fails mandatory durability without silently weakening it', async () => {
    const value = fixture();
    await expect(
      value.framework.begin(request('durable', { mandatoryDurability: 'durable' })),
    ).rejects.toThrow(/durability/);
  });
  it('fails unsupported isolation unless an explicit approved fallback exists', async () => {
    const provider = new InMemoryPersistenceProvider({ isolationLevels: ['read-committed'] }),
      value = fixture(provider);
    await expect(
      value.framework.begin(request('strict', { isolation: 'serializable' })),
    ).rejects.toThrow(/isolation/);
    const transaction = await value.framework.begin(
      request('fallback', {
        isolation: 'serializable',
        approvedIsolationFallback: {
          from: 'serializable',
          to: 'read-committed',
          approvalReference: 'approval:1',
        },
      }),
    );
    expect(transaction.isolation).toBe('read-committed');
  });
  it('rejects implicit cross-provider transaction boundaries', async () => {
    const value = fixture();
    await expect(
      value.framework.begin(request('cross', { boundaryId: 'another-provider' })),
    ).rejects.toBeInstanceOf(PersistenceError);
  });
  it('creates deeply immutable point-in-time snapshots distinct from Audit history', async () => {
    const value = fixture();
    await create(value);
    const snapshot = await value.framework.snapshot(
      'snapshot-1',
      'entities',
      scope,
      authorization('snapshot'),
      at,
    );
    expect(snapshot).toMatchObject({
      immutable: true,
      auditHistory: false,
      providerBoundaryId: 'memory-boundary',
    });
    expect(Object.isFrozen(snapshot.entities[0])).toBe(true);
    await expect(value.snapshots.get('snapshot-1')).resolves.toEqual(snapshot);
  });
  it('provides deterministic filtered, sorted, paginated, and aggregated queries', async () => {
    const value = fixture();
    await create(value, 'one', 'entities', { score: 2, tags: ['a'] });
    await create(value, 'two', 'entities', { score: 1, tags: ['b'] });
    const repository = value.framework.repository<{ score: number }>(
        'entities',
        authorization('read'),
      ),
      result = await repository.query({
        id: 'query',
        scope,
        filters: [{ field: 'data.score', operator: 'greater-than', value: 0 }],
        sort: [{ field: 'data.score', direction: 'ascending' }],
        projection: ['id', 'data.score'],
        offset: 0,
        limit: 1,
        aggregate: 'count',
      });
    expect(result.entities[0]?.id).toBe('two');
    expect(result).toMatchObject({
      total: 2,
      aggregate: { count: 2 },
      consistency: 'provider-snapshot',
    });
  });
  it('applies explicit versioned migrations idempotently with Audit references', async () => {
    const value = fixture(),
      plan = {
        id: 'migration-1',
        version: '1.0.0',
        providerBoundaryId: 'memory-boundary',
        fromSchemaVersion: '1',
        toSchemaVersion: '2',
        steps: [
          {
            id: 'step-1',
            description: 'Add normalized field',
            operationReference: 'migration-operation:1',
          },
        ],
        rollbackPlanReference: 'rollback:1',
        compatibility: { minimumReaderVersion: '1', minimumWriterVersion: '2' },
        authorization: authorization('migrate'),
        createdAt: at,
      };
    expect(await value.framework.migrate(plan, 'correlation-1')).toMatchObject({
      outcome: 'applied',
      rollbackAvailable: true,
    });
    expect(await value.framework.migrate(plan, 'correlation-1')).toMatchObject({
      outcome: 'already-applied',
    });
    expect(value.audit.values).toHaveLength(2);
  });
});

describe('provider replacement, authorization, events, diagnostics, and Runtime independence', () => {
  it('supports replaceable providers with identical repository contracts', async () => {
    for (const value of [
      fixture(),
      fixture(new InMemoryPersistenceProvider({ providerId: 'alternate-memory' })),
    ]) {
      await create(value);
      expect(await value.provider.repository('entities').find('entity-1', scope)).toMatchObject({
        revision: 1,
      });
    }
  });
  it('enforces supplied Security decisions and tenant/workspace scope', async () => {
    const value = fixture();
    expect(() =>
      value.framework.repository('entities', authorization('read', { authorized: false })),
    ).toThrowError(/unauthorized/);
    await expect(
      value.framework.snapshot(
        's',
        'entities',
        { tenantId: 'other' },
        authorization('snapshot'),
        at,
      ),
    ).rejects.toThrow(/scope/);
  });
  it('publishes transaction facts and records diagnostics without owning Event transport', async () => {
    const value = fixture();
    await create(value);
    const transaction = await value.framework.begin(request('rollback-event'));
    await transaction.rollback(at);
    expect(value.events.values.map((item) => item.type)).toEqual([
      'persistence.transaction-committed',
      'persistence.transaction-rolled-back',
    ]);
    expect(value.diagnostics.list()).toHaveLength(2);
  });
  it('contains no domain lifecycle, business retry, Runtime, Workflow, Memory, or Knowledge semantics', () => {
    const capabilities = fixture().provider.capabilities;
    expect(capabilities).not.toHaveProperty('runtimeState');
    expect(capabilities).not.toHaveProperty('businessRetry');
    expect(capabilities).not.toHaveProperty('memoryLifecycle');
    expect(JSON.stringify(capabilities)).not.toMatch(/workflow|knowledge|agentLifecycle/i);
  });
});
