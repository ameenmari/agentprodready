/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { ExecutionContext } from '@agentforge/foundation';
import { InMemoryPersistenceProvider } from '@agentforge/persistence';
import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  InMemoryMemoryProvider,
  MemoryEngine,
  NoopMemoryAiPort,
  PersistenceBackedMemoryProvider,
  WeightedMemoryRanking,
  parseCanonicalMemoryId,
  type MemoryAuthorization,
  type MemoryCaptureRequest,
  type MemoryRetrievalRequest,
  type MemoryStorageProvider,
  type MemorySearchProvider,
  type MemoryTelemetry,
} from './index.js';

const context: ExecutionContext = Object.freeze({
  executionId: 'e',
  correlationId: 'c',
  tenantId: 'tenant',
  workspaceId: 'workspace',
  startedAt: '2026-08-07T00:00:00.000Z',
  configurationVersion: 'v',
  securityContextId: 's',
  attributes: Object.freeze({}),
});
const authorization: MemoryAuthorization = Object.freeze({
  authorized: true,
  decisionId: 'd',
  allowedLabels: Object.freeze(['public']),
  allowedVisibilities: Object.freeze(['private', 'user', 'workspace'] as const),
});

const capture = (
  event = 'event-1',
  overrides: Partial<MemoryCaptureRequest> = {},
): MemoryCaptureRequest => ({
  requestId: `capture-${event}`,
  sourceEventId: event,
  producer: 'runtime',
  execution: { executionId: 'e', correlationId: 'c' },
  context,
  ownership: { tenantId: 'tenant', workspaceId: 'workspace', userId: 'user' },
  authorization,
  content: { observation: `remember ${event}` },
  metadata: { topic: 'test' },
  securityLabels: ['public'],
  classification: {
    category: 'episodic',
    importance: 'normal',
    lifetime: 'persistent',
    visibility: 'user',
  },
  retention: { policyId: 'retain', category: 'time-based', expiresAt: '2027-01-01T00:00:00.000Z' },
  version: '1',
  occurredAt: '2026-08-05T00:00:00.000Z',
  semantics: { sideEffect: 'state-producing', idempotency: 'idempotent' },
  ...overrides,
});

function fixture(
  provider: MemoryStorageProvider & MemorySearchProvider = new PersistenceBackedMemoryProvider(
    new InMemoryPersistenceProvider(),
  ),
  now: () => Date = () => new Date('2026-08-07T12:00:00.000Z'),
) {
  const diagnostics = new InMemoryMemoryDiagnostics();
  const events = new InMemoryMemoryEvents();
  const telemetry: MemoryTelemetry = {
    captured: vi.fn(),
    transitioned: vi.fn(),
    retrieved: vi.fn(),
    failed: vi.fn(),
  };
  return {
    engine: new MemoryEngine(
      provider,
      provider,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      diagnostics,
      events,
      telemetry,
      now,
    ),
    provider,
    diagnostics,
    events,
    telemetry,
  };
}

async function available(
  f: ReturnType<typeof fixture>,
  request: MemoryCaptureRequest,
) {
  let record = await f.engine.capture(request);
  for (const action of ['classify', 'organize', 'index', 'make-available'] as const) {
    record = await f.engine.transition({
      requestId: `${request.requestId}-${action}`,
      memoryId: record.id,
      expectedLifecycleVersion: record.lifecycleVersion,
      action,
      authorization: request.authorization,
      context,
      semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
    });
  }
  return record;
}

const retrieval = (overrides: Partial<MemoryRetrievalRequest> = {}): MemoryRetrievalRequest => ({
  requestId: 'retrieve',
  query: 'remember',
  node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'memory.retrieve' },
  context,
  authorization,
  categories: ['episodic'],
  strategy: 'keyword',
  ownership: { userId: 'user' },
  maximumResults: 10,
  ranking: { relevanceWeight: 1, importanceWeight: 1, recencyWeight: 1, policyVersion: 'rank-1' },
  metadata: {},
  ...overrides,
});

describe('canonical Memory id parsing', () => {
  it('accepts unambiguous canonical ids and rejects ambiguous forms', () => {
    expect(parseCanonicalMemoryId('memory:tenant:event-1')).toEqual({
      tenantId: 'tenant',
      sourceEventId: 'event-1',
    });
    expect(parseCanonicalMemoryId('memory:a:b:c')).toBeUndefined();
    expect(parseCanonicalMemoryId('memory:tenant:')).toBeUndefined();
    expect(parseCanonicalMemoryId('not-memory')).toBeUndefined();
  });

  it('rejects capture when tenantId or sourceEventId contains ":"', async () => {
    const f = fixture();
    await expect(f.engine.capture(capture('bad', { sourceEventId: 'a:b' }))).rejects.toMatchObject({
      code: 'MEMORY_VALIDATION',
    });
  });
});

describe('PersistenceBackedMemoryProvider', () => {
  it('saves and loads under tenant-only Persistence scope', async () => {
    const persistence = new InMemoryPersistenceProvider();
    const provider = new PersistenceBackedMemoryProvider(persistence);
    const f = fixture(provider);
    const record = await f.engine.capture(capture());
    const loaded = await provider.get(record.id);
    expect(loaded).toMatchObject({ id: record.id, content: { observation: 'remember event-1' } });
    const entity = await persistence.repository('memory-records').find(record.id, { tenantId: 'tenant' });
    expect(entity?.scope).toEqual({ tenantId: 'tenant' });
    expect(entity?.scope).not.toHaveProperty('workspaceId');
    await expect(
      persistence.repository('memory-records').find(record.id, {
        tenantId: 'tenant',
        workspaceId: 'workspace',
      }),
    ).resolves.toBeUndefined();
  });

  it('maps duplicates and OCC conflicts', async () => {
    const f = fixture();
    const record = await f.engine.capture(capture());
    await expect(f.engine.capture(capture())).rejects.toMatchObject({ code: 'MEMORY_DUPLICATE' });
    await expect(
      f.engine.transition({
        requestId: 'stale',
        memoryId: record.id,
        expectedLifecycleVersion: 99,
        action: 'classify',
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      }),
    ).rejects.toMatchObject({ code: 'MEMORY_VERSION_CONFLICT' });
  });

  it('supports keyword search and semantic/hybrid partial reasons', async () => {
    const f = fixture();
    await available(f, capture('a'));
    const keyword = await f.engine.retrieve(retrieval());
    expect(keyword.status).toBe('complete');
    expect(keyword.memories).toHaveLength(1);
    const semantic = await f.engine.retrieve(retrieval({ requestId: 'sem', strategy: 'semantic' }));
    expect(semantic.partialReasons).toContain('semantic-unavailable');
    const hybrid = await f.engine.retrieve(retrieval({ requestId: 'hyb', strategy: 'hybrid' }));
    expect(hybrid.partialReasons).toContain('semantic-unavailable');
  });

  it('excludes expired and deleted memories from recall', async () => {
    const f = fixture(
      new PersistenceBackedMemoryProvider(new InMemoryPersistenceProvider()),
      () => new Date('2028-01-01T00:00:00.000Z'),
    );
    await available(f, capture('expired'));
    const expired = await f.engine.retrieve(retrieval({ requestId: 'exp' }));
    expect(expired.status).toBe('empty');

    const f2 = fixture();
    const live = await available(f2, capture('del'));
    await f2.engine.transition({
      requestId: 'delete',
      memoryId: live.id,
      expectedLifecycleVersion: live.lifecycleVersion,
      action: 'delete',
      authorization,
      context,
      semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
    });
    const deleted = await f2.engine.retrieve(retrieval({ requestId: 'del-r', query: 'del' }));
    expect(deleted.memories).toHaveLength(0);
  });

  it('enforces tenant isolation at MemoryEngine retrieve', async () => {
    const f = fixture();
    await available(f, capture('iso'));
    const foreign = await f.engine.retrieve(
      retrieval({
        requestId: 'foreign',
        context: { ...context, tenantId: 'other-tenant' },
      }),
    );
    expect(foreign.memories).toHaveLength(0);
  });

  it('fails closed on malformed get ids', async () => {
    const provider = new PersistenceBackedMemoryProvider(new InMemoryPersistenceProvider());
    await expect(provider.get('memory:a:b:c')).rejects.toMatchObject({ kind: 'unavailable' });
  });
});

describe('Memory provider contract substitution', () => {
  it('shares capture/retrieve behavior across InMemory and PersistenceBacked', async () => {
    for (const provider of [
      new InMemoryMemoryProvider(),
      new PersistenceBackedMemoryProvider(new InMemoryPersistenceProvider()),
    ]) {
      const f = fixture(provider);
      await available(f, capture(`shared-${provider.constructor.name}`));
      const result = await f.engine.retrieve(
        retrieval({
          requestId: `r-${provider.constructor.name}`,
          query: 'shared',
        }),
      );
      expect(result.memories.length).toBeGreaterThan(0);
    }
  });
});
