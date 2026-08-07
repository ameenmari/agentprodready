#!/usr/bin/env node
/**
 * Manual probe for AgentProdReady v0.7 vector search.
 *
 * Requires: pnpm build && pnpm db:up && pnpm db:migrate
 *   && VECTOR_INDEX_PROFILE=reference-32 pnpm db:migrate:vector
 *
 * Env:
 *   DATABASE_URL (optional if local defaults apply)
 *   VECTOR_SEARCH_ENABLED=true
 *   VECTOR_STORE_PROVIDER=pgvector
 *   EMBEDDING_PROVIDER=reference
 *
 * Prints safe ids/scores/strategy/partialReasons only (no vectors/content).
 */
import {
  FactoryAiEmbeddingAdapterResolver,
  ReferenceEmbeddingAdapter,
  REFERENCE_EMBEDDING_DIMENSIONS,
  REFERENCE_EMBEDDING_MODEL_ID,
} from '../packages/ai-provider/dist/index.js';
import {
  CapabilityRegistry,
  CapabilityResolver,
  DeterministicResolutionPolicy,
  InMemoryResolutionDiagnostics,
  InMemoryResolutionEvents,
  NoopResolutionTelemetry,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '../packages/capability-resolution/dist/index.js';
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  MemoryEngine,
  NoopMemoryAiPort,
  PersistenceBackedMemoryProvider,
  VectorCapableMemorySearchProvider,
  VectorMemoryIndexProvider,
  WeightedMemoryRanking,
} from '../packages/memory/dist/index.js';
import {
  loadPostgresPersistenceConfig,
  PostgresPersistenceProvider,
} from '../packages/persistence-postgres/dist/index.js';
import {
  loadVectorPostgresConfig,
  PgvectorVectorStore,
} from '../packages/vector-store-pgvector/dist/index.js';

const EMBEDDING_IMPL = 'reference-ai:embedding';
const tenantId = 'probe-tenant';
const sourceEventId = `vector-probe-${Date.now()}`;

const context = Object.freeze({
  executionId: 'probe-exec',
  correlationId: 'probe-corr',
  tenantId,
  workspaceId: 'probe-workspace',
  startedAt: new Date().toISOString(),
  configurationVersion: 'probe',
  securityContextId: 'probe-sec',
  attributes: Object.freeze({}),
});
const authorization = Object.freeze({
  authorized: true,
  decisionId: 'probe-decision',
  allowedLabels: Object.freeze(['public']),
  allowedVisibilities: Object.freeze(['user', 'workspace']),
});

function seedResolver() {
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
      providerId: 'agentprodready-local',
      pluginId: 'local-reference',
      contributionId: 'contribution:reference-embedding',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy',
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

function makeEngine(storage, search, indexProvider) {
  return new MemoryEngine(
    storage,
    search,
    new WeightedMemoryRanking(),
    new NoopMemoryAiPort(),
    new InMemoryMemoryDiagnostics(),
    new InMemoryMemoryEvents(),
    {
      captured() {},
      transitioned() {},
      retrieved() {},
      failed() {},
      indexCleanupFailed() {},
    },
    indexProvider,
  );
}

async function lifecycleToAvailable(engine, record) {
  let current = record;
  for (const action of ['classify', 'organize', 'index', 'make-available']) {
    current = await engine.transition({
      requestId: `probe-${action}`,
      memoryId: current.id,
      expectedLifecycleVersion: current.lifecycleVersion,
      action,
      authorization,
      context,
      semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
    });
  }
  return current;
}

async function main() {
  const persistence = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
  await persistence.assertReady();

  const vectors = new PgvectorVectorStore({
    config: loadVectorPostgresConfig(),
    dimensions: REFERENCE_EMBEDDING_DIMENSIONS,
    embeddingModelId: REFERENCE_EMBEDDING_MODEL_ID,
  });
  const vectorHealth = await vectors.health();
  if (vectorHealth.status !== 'healthy') {
    throw new Error(`Vector store not ready: ${vectorHealth.status}`);
  }

  const capabilityResolver = seedResolver();
  const embeddingResolver = new FactoryAiEmbeddingAdapterResolver();
  embeddingResolver.bind(EMBEDDING_IMPL, async () => new ReferenceEmbeddingAdapter());

  const storage = new PersistenceBackedMemoryProvider(persistence);
  const indexProvider = new VectorMemoryIndexProvider({
    vectors,
    capabilityResolver,
    embeddingResolver,
    embeddingModelId: REFERENCE_EMBEDDING_MODEL_ID,
    embeddingDimensions: REFERENCE_EMBEDDING_DIMENSIONS,
  });
  const search = new VectorCapableMemorySearchProvider({
    keyword: storage,
    storage,
    vectors,
    capabilityResolver,
    embeddingResolver,
    embeddingModelId: REFERENCE_EMBEDDING_MODEL_ID,
    embeddingDimensions: REFERENCE_EMBEDDING_DIMENSIONS,
    enabled: true,
  });

  let engine = makeEngine(storage, search, indexProvider);
  let record = await engine.capture({
    requestId: 'probe-capture',
    sourceEventId,
    producer: 'vector-probe',
    execution: { executionId: 'probe-exec', correlationId: 'probe-corr' },
    context,
    ownership: { tenantId, workspaceId: 'probe-workspace', userId: 'probe-user' },
    authorization,
    content: { observation: 'vector-search-probe semantic phrase' },
    metadata: { probe: 'true' },
    securityLabels: ['public'],
    classification: {
      category: 'episodic',
      importance: 'normal',
      lifetime: 'persistent',
      visibility: 'user',
    },
    retention: { policyId: 'probe', category: 'permanent' },
    version: '1',
    occurredAt: new Date().toISOString(),
    semantics: { sideEffect: 'state-producing', idempotency: 'idempotent' },
  });
  record = await lifecycleToAvailable(engine, record);

  await persistence.close();
  await vectors.close();

  const persistence2 = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
  await persistence2.assertReady();
  const vectors2 = new PgvectorVectorStore({
    config: loadVectorPostgresConfig(),
    dimensions: REFERENCE_EMBEDDING_DIMENSIONS,
    embeddingModelId: REFERENCE_EMBEDDING_MODEL_ID,
  });
  const storage2 = new PersistenceBackedMemoryProvider(persistence2);
  const index2 = new VectorMemoryIndexProvider({
    vectors: vectors2,
    capabilityResolver,
    embeddingResolver,
    embeddingModelId: REFERENCE_EMBEDDING_MODEL_ID,
    embeddingDimensions: REFERENCE_EMBEDDING_DIMENSIONS,
  });
  const search2 = new VectorCapableMemorySearchProvider({
    keyword: storage2,
    storage: storage2,
    vectors: vectors2,
    capabilityResolver,
    embeddingResolver,
    embeddingModelId: REFERENCE_EMBEDDING_MODEL_ID,
    embeddingDimensions: REFERENCE_EMBEDDING_DIMENSIONS,
    enabled: true,
  });
  engine = makeEngine(storage2, search2, index2);

  const result = await engine.retrieve({
    requestId: 'probe-retrieve',
    query: 'vector-search-probe semantic phrase',
    node: { workflowId: 'probe', nodeId: 'n', kind: 'capability', capability: 'memory.retrieve' },
    context,
    authorization,
    categories: ['episodic'],
    strategy: 'semantic',
    ownership: { userId: 'probe-user' },
    maximumResults: 5,
    ranking: {
      relevanceWeight: 1,
      importanceWeight: 1,
      recencyWeight: 1,
      policyVersion: 'probe-rank',
    },
    metadata: {},
  });

  process.stdout.write(
    JSON.stringify(
      {
        status: result.status,
        strategy: result.strategy,
        partialReasons: result.partialReasons,
        memories: result.memories.map((m) => ({
          id: m.id,
          score: m.score,
          rank: m.rank,
        })),
        expectedId: record.id,
        hit: result.memories.some((m) => m.id === record.id),
      },
      null,
      2,
    ) + '\n',
  );

  await vectors2.close();
  await persistence2.close();

  if (!result.memories.some((m) => m.id === record.id)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
