/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  FactoryAiEmbeddingAdapterResolver,
  REFERENCE_EMBEDDING_DIMENSIONS,
  REFERENCE_EMBEDDING_MODEL_ID,
  ReferenceEmbeddingAdapter,
} from '@agentforge/ai-provider';
import {
  CapabilityRegistry,
  CapabilityResolver,
  DeterministicResolutionPolicy,
  InMemoryResolutionDiagnostics,
  InMemoryResolutionEvents,
  NoopResolutionTelemetry,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '@agentforge/capability-resolution';
import type { ExecutionContext } from '@agentforge/foundation';
import { InMemoryVectorStore } from '@agentforge/vector-store';
import { describe, expect, it, vi } from 'vitest';
import { fuseHybridCandidates } from './hybrid-rrf.js';
import {
  ExternalMemoryError,
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  InMemoryMemoryProvider,
  MemoryEngine,
  NoopMemoryAiPort,
  VectorCapableMemorySearchProvider,
  VectorMemoryIndexProvider,
  WeightedMemoryRanking,
  type MemoryAuthorization,
  type MemoryCandidate,
  type MemoryCaptureRequest,
  type MemoryIndexProvider,
  type MemoryRecord,
  type MemoryRetrievalRequest,
  type MemoryStorageProvider,
  type MemoryTelemetry,
} from './index.js';

const EMBEDDING_IMPL = 'reference-ai:embedding';
const MODEL = REFERENCE_EMBEDDING_MODEL_ID;
const DIMS = REFERENCE_EMBEDDING_DIMENSIONS;

const context: ExecutionContext = Object.freeze({
  executionId: 'e',
  correlationId: 'c',
  tenantId: 'tenant',
  workspaceId: 'workspace',
  startedAt: '2026-08-06T00:00:00.000Z',
  configurationVersion: 'v',
  securityContextId: 's',
  attributes: Object.freeze({}),
});

const authorization: MemoryAuthorization = Object.freeze<MemoryAuthorization>({
  authorized: true,
  decisionId: 'd',
  allowedLabels: Object.freeze(['public']),
  allowedVisibilities: Object.freeze(['private', 'user', 'workspace']),
});

function capture(
  event = 'event-1',
  overrides: Partial<MemoryCaptureRequest> = {},
): MemoryCaptureRequest {
  return {
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
  };
}

function retrieval(overrides: Partial<MemoryRetrievalRequest> = {}): MemoryRetrievalRequest {
  return {
    requestId: 'retrieve',
    query: 'remember',
    node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'memory.retrieve' },
    context,
    authorization,
    categories: ['episodic'],
    strategy: 'semantic',
    ownership: { userId: 'user' },
    maximumResults: 10,
    ranking: {
      relevanceWeight: 1,
      importanceWeight: 1,
      recencyWeight: 1,
      policyVersion: 'rank-1',
    },
    metadata: {},
    ...overrides,
  };
}

function seedEmbeddingResolver(): CapabilityResolver {
  const capabilities = new CapabilityRegistry();
  const providers = new ProviderRegistry();
  capabilities.register(
    Object.freeze({
      id: 'embedding',
      contractVersions: Object.freeze(['1']),
      defaultImplementationId: EMBEDDING_IMPL,
      metadata: Object.freeze({}),
    }),
  );
  providers.register(
    Object.freeze({
      id: EMBEDDING_IMPL,
      capabilityId: 'embedding',
      providerId: 'agentforge-local',
      pluginId: 'local-reference',
      contributionId: 'contribution:reference-embedding',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 0,
      attributes: Object.freeze({}),
    }),
  );
  return new CapabilityResolver(
    capabilities,
    providers,
    new DeterministicResolutionPolicy(),
    new StaticResolutionConfiguration(
      Object.freeze({ global: Object.freeze({ embedding: EMBEDDING_IMPL }) }),
    ),
    new InMemoryResolutionDiagnostics(),
    new InMemoryResolutionEvents(),
    new NoopResolutionTelemetry(),
  );
}

function vectorFixture(options: { enabled?: boolean } = {}) {
  const storage = new InMemoryMemoryProvider();
  const vectors = new InMemoryVectorStore({ dimensions: DIMS, embeddingModelId: MODEL });
  const capabilityResolver = seedEmbeddingResolver();
  const embeddingResolver = new FactoryAiEmbeddingAdapterResolver();
  embeddingResolver.bind(EMBEDDING_IMPL, async () => new ReferenceEmbeddingAdapter());
  const indexProvider = new VectorMemoryIndexProvider({
    vectors,
    capabilityResolver,
    embeddingResolver,
    embeddingModelId: MODEL,
    embeddingDimensions: DIMS,
  });
  const search = new VectorCapableMemorySearchProvider({
    keyword: storage,
    storage,
    vectors,
    capabilityResolver,
    embeddingResolver,
    embeddingModelId: MODEL,
    embeddingDimensions: DIMS,
    enabled: options.enabled ?? true,
  });
  const diagnostics = new InMemoryMemoryDiagnostics();
  const events = new InMemoryMemoryEvents();
  const telemetry: MemoryTelemetry = {
    captured: vi.fn(),
    transitioned: vi.fn(),
    retrieved: vi.fn(),
    failed: vi.fn(),
    indexCleanupFailed: vi.fn(),
  };
  const engine = new MemoryEngine(
    storage,
    search,
    new WeightedMemoryRanking(),
    new NoopMemoryAiPort(),
    diagnostics,
    events,
    telemetry,
    indexProvider,
  );
  return { engine, storage, vectors, search, indexProvider, diagnostics, telemetry };
}

async function toAvailable(
  engine: MemoryEngine,
  request: MemoryCaptureRequest,
): Promise<MemoryRecord> {
  let record = await engine.capture(request);
  for (const action of ['classify', 'organize', 'index', 'make-available'] as const) {
    record = await engine.transition({
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

function candidate(
  id: string,
  relevance: number,
  strategy: MemoryCandidate['searchStrategy'] = 'keyword',
): MemoryCandidate {
  return Object.freeze({
    record: Object.freeze({
      id,
      sourceEventId: id,
      producer: 't',
      execution: Object.freeze({ executionId: 'e', correlationId: 'c' }),
      ownership: Object.freeze({ tenantId: 'tenant' }),
      content: Object.freeze({}),
      metadata: Object.freeze({}),
      securityLabels: Object.freeze(['public']),
      classification: Object.freeze({
        category: 'episodic' as const,
        importance: 'normal' as const,
        lifetime: 'persistent' as const,
        visibility: 'user' as const,
      }),
      retention: Object.freeze({ policyId: 'r', category: 'permanent' as const }),
      version: '1',
      occurredAt: '2026-08-05T00:00:00.000Z',
      state: 'available' as const,
      lifecycleVersion: 4,
    }),
    relevance,
    frequency: 1,
    searchStrategy: strategy,
  });
}

describe('vector search / hybrid memory', () => {
  it('fuses hybrid candidates deterministically via RRF', () => {
    const keyword = [candidate('a', 0.9), candidate('b', 0.4)];
    const semantic = [candidate('b', 0.95, 'semantic'), candidate('c', 0.5, 'semantic')];
    const first = fuseHybridCandidates(keyword, semantic);
    const second = fuseHybridCandidates(keyword, semantic);
    expect(first).toEqual(second);
    expect(first.map((c) => c.record.id)).toEqual(['b', 'a', 'c']);
    expect(first.every((c) => c.searchStrategy === 'hybrid')).toBe(true);
  });

  it('keeps organized when INDEX provider fails', async () => {
    const storage = new InMemoryMemoryProvider();
    const failingIndex: MemoryIndexProvider = {
      index: async () => {
        throw new ExternalMemoryError('index-unavailable', 'embed failed');
      },
      remove: async () => {},
      health: async () => Object.freeze({ name: 'failing-index', status: 'unhealthy' as const }),
    };
    const engine = new MemoryEngine(
      storage,
      storage,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      new InMemoryMemoryDiagnostics(),
      new InMemoryMemoryEvents(),
      {
        captured: vi.fn(),
        transitioned: vi.fn(),
        retrieved: vi.fn(),
        failed: vi.fn(),
      },
      failingIndex,
    );
    let record = await engine.capture(capture('idx-fail'));
    for (const action of ['classify', 'organize'] as const) {
      record = await engine.transition({
        requestId: `t-${action}`,
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action,
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      });
    }
    expect(record.state).toBe('organized');
    await expect(
      engine.transition({
        requestId: 't-index',
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action: 'index',
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      }),
    ).rejects.toMatchObject({ code: 'MEMORY_INDEX_UNAVAILABLE' });
    const after = await storage.get(record.id);
    expect(after?.state).toBe('organized');
    expect(after?.lifecycleVersion).toBe(record.lifecycleVersion);
  });

  it('excludes orphan vectors when INDEX upsert succeeds but Memory OCC fails', async () => {
    const base = new InMemoryMemoryProvider();
    const vectors = new InMemoryVectorStore({ dimensions: DIMS, embeddingModelId: MODEL });
    const capabilityResolver = seedEmbeddingResolver();
    const embeddingResolver = new FactoryAiEmbeddingAdapterResolver();
    embeddingResolver.bind(EMBEDDING_IMPL, async () => new ReferenceEmbeddingAdapter());
    const indexProvider = new VectorMemoryIndexProvider({
      vectors,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: MODEL,
      embeddingDimensions: DIMS,
    });

    let failNextReplace = false;
    const storage: MemoryStorageProvider = {
      save: (r) => base.save(r),
      get: (id) => base.get(id),
      replace: async (r, expected) => {
        if (failNextReplace) {
          failNextReplace = false;
          throw new ExternalMemoryError('version-conflict', 'OCC lost');
        }
        return base.replace(r, expected);
      },
      health: () => base.health(),
    };

    const search = new VectorCapableMemorySearchProvider({
      keyword: base,
      storage,
      vectors,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: MODEL,
      embeddingDimensions: DIMS,
      enabled: true,
    });
    const engine = new MemoryEngine(
      storage,
      search,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      new InMemoryMemoryDiagnostics(),
      new InMemoryMemoryEvents(),
      {
        captured: vi.fn(),
        transitioned: vi.fn(),
        retrieved: vi.fn(),
        failed: vi.fn(),
      },
      indexProvider,
    );

    let record = await engine.capture(capture('orphan'));
    for (const action of ['classify', 'organize'] as const) {
      record = await engine.transition({
        requestId: `t-${action}`,
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action,
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      });
    }
    failNextReplace = true;
    await expect(
      engine.transition({
        requestId: 't-index',
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action: 'index',
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      }),
    ).rejects.toMatchObject({ code: 'MEMORY_VERSION_CONFLICT' });

    const orphanMatches = await vectors.query({
      tenantId: 'tenant',
      vector: Object.freeze(new Array(DIMS).fill(0).map((_, i) => (i === 0 ? 1 : 0))),
      dimensions: DIMS,
      embeddingModelId: MODEL,
      limit: 10,
      metric: 'cosine',
    });
    expect(orphanMatches.some((m) => m.memoryId === record.id)).toBe(true);
    expect((await storage.get(record.id))?.state).toBe('organized');

    // Force available so only orphan version checks exclude the candidate.
    const organized = await storage.get(record.id);
    if (organized === undefined) throw new Error('missing record');
    await base.replace(
      Object.freeze({ ...organized, state: 'available', lifecycleVersion: organized.lifecycleVersion }),
      organized.lifecycleVersion,
    );

    const result = await engine.retrieve(retrieval({ requestId: 'orphan-retrieve' }));
    expect(result.memories.map((m) => m.id)).not.toContain(record.id);
  });

  it('retrieves semantically with InMemoryVectorStore + ReferenceEmbeddingAdapter', async () => {
    const f = vectorFixture({ enabled: true });
    const hitContent = { observation: 'unique-vector-phrase alpha' };
    const record = await toAvailable(f.engine, capture('semantic-hit', {
      content: hitContent,
    }));
    await toAvailable(f.engine, capture('other', {
      content: { observation: 'completely unrelated beta' },
    }));

    // Index embeds JSON.stringify(content); query the same text for a stable NN hit.
    const result = await f.engine.retrieve(
      retrieval({
        requestId: 'sem',
        query: JSON.stringify(hitContent),
        strategy: 'semantic',
      }),
    );
    expect(result.partialReasons).toEqual([]);
    expect(result.status).toBe('complete');
    expect(result.strategy).toBe('semantic');
    expect(result.memories[0]?.id).toBe(record.id);
  });

  it('keeps deleted memory when vector remove fails and excludes from retrieve', async () => {
    const storage = new InMemoryMemoryProvider();
    const vectors = new InMemoryVectorStore({ dimensions: DIMS, embeddingModelId: MODEL });
    const capabilityResolver = seedEmbeddingResolver();
    const embeddingResolver = new FactoryAiEmbeddingAdapterResolver();
    embeddingResolver.bind(EMBEDDING_IMPL, async () => new ReferenceEmbeddingAdapter());
    const realIndex = new VectorMemoryIndexProvider({
      vectors,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: MODEL,
      embeddingDimensions: DIMS,
    });
    const indexProvider: MemoryIndexProvider = {
      index: (r, c) => realIndex.index(r, c),
      remove: async () => {
        throw new ExternalMemoryError('index-unavailable', 'remove failed');
      },
      health: () => realIndex.health(),
    };
    const search = new VectorCapableMemorySearchProvider({
      keyword: storage,
      storage,
      vectors,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: MODEL,
      embeddingDimensions: DIMS,
      enabled: true,
    });
    const diagnostics = new InMemoryMemoryDiagnostics();
    const telemetry: MemoryTelemetry = {
      captured: vi.fn(),
      transitioned: vi.fn(),
      retrieved: vi.fn(),
      failed: vi.fn(),
      indexCleanupFailed: vi.fn(),
    };
    const engine = new MemoryEngine(
      storage,
      search,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      diagnostics,
      new InMemoryMemoryEvents(),
      telemetry,
      indexProvider,
    );

    const record = await toAvailable(engine, capture('to-delete'));
    const deleted = await engine.transition({
      requestId: 'delete',
      memoryId: record.id,
      expectedLifecycleVersion: record.lifecycleVersion,
      action: 'delete',
      authorization,
      context,
      semantics: { sideEffect: 'mutating', idempotency: 'conditionally-idempotent' },
    });
    expect(deleted.state).toBe('deleted');
    expect(diagnostics.list().some((d) => d.errorCode === 'MEMORY_INDEX_UNAVAILABLE')).toBe(true);

    // Stale vector may remain; canonical deleted must not be recalled.
    const leftover = await vectors.query({
      tenantId: 'tenant',
      vector: Object.freeze(new Array(DIMS).fill(0).map((_, i) => (i === 0 ? 1 : 0))),
      dimensions: DIMS,
      embeddingModelId: MODEL,
      limit: 10,
      metric: 'cosine',
    });
    expect(leftover.some((m) => m.memoryId === record.id)).toBe(true);
    const result = await engine.retrieve(retrieval({ requestId: 'after-delete' }));
    expect(result.memories.map((m) => m.id)).not.toContain(record.id);
  });

  it('falls back with semantic-unavailable partialReasons when enabled=false', async () => {
    const f = vectorFixture({ enabled: false });
    await toAvailable(f.engine, capture('fallback'));
    const result = await f.engine.retrieve(
      retrieval({ requestId: 'disabled', strategy: 'semantic', query: 'remember' }),
    );
    expect(result.partialReasons).toContain('semantic-unavailable');
    expect(result.status).toBe('partial');
    expect(result.memories.length).toBeGreaterThan(0);
  });
});
