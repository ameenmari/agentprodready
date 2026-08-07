import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@agentprodready/foundation';
import {
  loadPostgresPersistenceConfig,
  PostgresPersistenceProvider,
} from '@agentprodready/persistence-postgres';
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  MemoryEngine,
  NoopMemoryAiPort,
  NoopMemoryIndexProvider,
  PersistenceBackedMemoryProvider,
  WeightedMemoryRanking,
  type MemoryAuthorization,
  type MemoryCaptureRequest,
  type MemoryTelemetry,
} from './index.js';

const scopeTenant = 'memory-pg-tenant';

describe.skipIf(process.env['RUN_POSTGRES_TESTS'] !== '1')(
  'Memory Persistence PostgreSQL durability',
  () => {
    let provider: PostgresPersistenceProvider;
    let memoryProvider: PersistenceBackedMemoryProvider;

    beforeAll(async () => {
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
      memoryProvider = new PersistenceBackedMemoryProvider(provider);
    });

    afterAll(async () => {
      await provider.close();
    });

    const context: ExecutionContext = Object.freeze({
      executionId: 'e-pg',
      correlationId: 'c-pg',
      tenantId: scopeTenant,
      workspaceId: 'workspace-pg',
      startedAt: '2026-08-07T00:00:00.000Z',
      configurationVersion: 'v',
      securityContextId: 's',
      attributes: Object.freeze({}),
    });
    const authorization: MemoryAuthorization = Object.freeze({
      authorized: true,
      decisionId: 'd',
      allowedLabels: Object.freeze(['public']),
      allowedVisibilities: Object.freeze(['user', 'workspace'] as const),
    });

    function engine(now: () => Date = () => new Date('2026-08-07T12:00:00.000Z')): MemoryEngine {
      const telemetry: MemoryTelemetry = {
        captured: vi.fn(),
        transitioned: vi.fn(),
        retrieved: vi.fn(),
        failed: vi.fn(),
      };
      return new MemoryEngine(
        memoryProvider,
        memoryProvider,
        new WeightedMemoryRanking(),
        new NoopMemoryAiPort(),
        new InMemoryMemoryDiagnostics(),
        new InMemoryMemoryEvents(),
        telemetry,
        new NoopMemoryIndexProvider(),
        now,
      );
    }

    async function captureAvailable(
      event: string,
    ): Promise<{ eng: MemoryEngine; record: Awaited<ReturnType<MemoryEngine['capture']>> }> {
      const eng = engine();
      const request: MemoryCaptureRequest = {
        requestId: `capture-${event}`,
        sourceEventId: event,
        producer: 'runtime',
        execution: { executionId: 'e-pg', correlationId: 'c-pg' },
        context,
        ownership: { tenantId: scopeTenant, workspaceId: 'workspace-pg', userId: 'user' },
        authorization,
        content: { observation: `durable ${event}` },
        metadata: { topic: 'pg' },
        securityLabels: ['public'],
        classification: {
          category: 'episodic',
          importance: 'normal',
          lifetime: 'persistent',
          visibility: 'user',
        },
        retention: {
          policyId: 'retain',
          category: 'time-based',
          expiresAt: '2027-01-01T00:00:00.000Z',
        },
        version: '1',
        occurredAt: '2026-08-05T00:00:00.000Z',
        semantics: { sideEffect: 'state-producing', idempotency: 'idempotent' },
      };
      let record = await eng.capture(request);
      for (const action of ['classify', 'organize', 'index', 'make-available'] as const) {
        record = await eng.transition({
          requestId: `${request.requestId}-${action}`,
          memoryId: record.id,
          expectedLifecycleVersion: record.lifecycleVersion,
          action,
          authorization,
          context,
          semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
        });
      }
      return { eng, record };
    }

    it('survives provider recreation with same id and content', async () => {
      const event = `evt-${crypto.randomUUID()}`;
      const { record } = await captureAvailable(event);
      expect(record.state).toBe('available');

      await provider.close();
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
      memoryProvider = new PersistenceBackedMemoryProvider(provider);

      const loaded = await memoryProvider.get(record.id);
      expect(loaded?.content).toEqual({ observation: `durable ${event}` });
      expect(loaded?.ownership.workspaceId).toBe('workspace-pg');
      const entity = await provider.repository('memory-records').find(record.id, {
        tenantId: scopeTenant,
      });
      expect(entity?.scope).toEqual({ tenantId: scopeTenant });

      const eng = engine();
      const recalled = await eng.retrieve({
        requestId: 'retrieve-pg',
        query: 'durable',
        node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'memory.retrieve' },
        context,
        authorization,
        categories: ['episodic'],
        strategy: 'keyword',
        ownership: { userId: 'user' },
        maximumResults: 10,
        ranking: {
          relevanceWeight: 1,
          importanceWeight: 1,
          recencyWeight: 1,
          policyVersion: 'rank-1',
        },
        metadata: {},
      });
      expect(recalled.memories.some((item) => item.id === record.id)).toBe(true);
    });

    it('keeps deleted state across restart and excludes expired from recall', async () => {
      const event = `del-${crypto.randomUUID()}`;
      const { eng, record } = await captureAvailable(event);
      await eng.transition({
        requestId: 'delete',
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action: 'delete',
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      });

      await provider.close();
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
      memoryProvider = new PersistenceBackedMemoryProvider(provider);

      const loaded = await memoryProvider.get(record.id);
      expect(loaded?.state).toBe('deleted');

      const expEvent = `exp-${crypto.randomUUID()}`;
      await captureAvailable(expEvent);
      const expiredEngine = engine(() => new Date('2028-01-01T00:00:00.000Z'));
      const expired = await expiredEngine.retrieve({
        requestId: 'expired',
        query: 'durable',
        node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'memory.retrieve' },
        context,
        authorization,
        categories: ['episodic'],
        strategy: 'keyword',
        ownership: { userId: 'user' },
        maximumResults: 50,
        ranking: {
          relevanceWeight: 1,
          importanceWeight: 1,
          recencyWeight: 1,
          policyVersion: 'rank-1',
        },
        metadata: {},
      });
      expect(expired.memories.some((item) => item.id.includes(expEvent))).toBe(false);
    });

    it('isolates tenants and maps OCC conflicts', async () => {
      const event = `occ-${crypto.randomUUID()}`;
      const { eng, record } = await captureAvailable(event);
      await expect(
        eng.transition({
          requestId: 'stale',
          memoryId: record.id,
          expectedLifecycleVersion: 0,
          action: 'archive',
          authorization,
          context,
          semantics: { sideEffect: 'mutating', idempotency: 'conditionally-idempotent' },
        }),
      ).rejects.toMatchObject({ code: 'MEMORY_VERSION_CONFLICT' });

      const foreign = await eng.retrieve({
        requestId: 'foreign',
        query: 'durable',
        node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'memory.retrieve' },
        context: { ...context, tenantId: 'other-tenant' },
        authorization,
        categories: ['episodic'],
        strategy: 'keyword',
        ownership: { userId: 'user' },
        maximumResults: 10,
        ranking: {
          relevanceWeight: 1,
          importanceWeight: 1,
          recencyWeight: 1,
          policyVersion: 'rank-1',
        },
        metadata: {},
      });
      expect(foreign.memories).toHaveLength(0);
    });
  },
);
