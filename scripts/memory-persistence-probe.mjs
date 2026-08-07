#!/usr/bin/env node
/**
 * Manual durability probe for AgentProdReady v0.5 Persistent Memory.
 *
 * Requires: pnpm build && pnpm db:up && pnpm db:migrate
 * Env: DATABASE_URL (optional if local defaults apply)
 *
 * Proves: capture → available → provider recreate → get/retrieve same Memory.
 */
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  MemoryEngine,
  NoopMemoryAiPort,
  PersistenceBackedMemoryProvider,
  WeightedMemoryRanking,
} from '../packages/memory/dist/index.js';
import {
  loadPostgresPersistenceConfig,
  PostgresPersistenceProvider,
} from '../packages/persistence-postgres/dist/index.js';

const tenantId = 'probe-tenant';
const sourceEventId = `probe-${Date.now()}`;

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

function makeEngine(memoryProvider) {
  return new MemoryEngine(
    memoryProvider,
    memoryProvider,
    new WeightedMemoryRanking(),
    new NoopMemoryAiPort(),
    new InMemoryMemoryDiagnostics(),
    new InMemoryMemoryEvents(),
    {
      captured() {},
      transitioned() {},
      retrieved() {},
      failed() {},
    },
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
  let provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
  await provider.assertReady();
  let memoryProvider = new PersistenceBackedMemoryProvider(provider);
  let engine = makeEngine(memoryProvider);

  let record = await engine.capture({
    requestId: 'probe-capture',
    sourceEventId,
    producer: 'probe',
    execution: { executionId: 'probe-exec', correlationId: 'probe-corr' },
    context,
    ownership: { tenantId, workspaceId: 'probe-workspace', userId: 'probe-user' },
    authorization,
    content: { observation: 'memory-persistence-probe' },
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

  const before = await engine.retrieve({
    requestId: 'probe-before',
    query: 'memory-persistence-probe',
    node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'answer' },
    context,
    authorization,
    categories: ['episodic'],
    strategy: 'keyword',
    ownership: { userId: 'probe-user' },
    maximumResults: 10,
    ranking: {
      relevanceWeight: 1,
      importanceWeight: 1,
      recencyWeight: 1,
      policyVersion: 'probe',
    },
    metadata: {},
  });
  if (!before.memories.some((item) => item.id === record.id)) {
    throw new Error('Memory not recallable before restart boundary');
  }

  await provider.close();
  provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
  await provider.assertReady();
  memoryProvider = new PersistenceBackedMemoryProvider(provider);
  engine = makeEngine(memoryProvider);

  const loaded = await memoryProvider.get(record.id);
  if (loaded?.content?.observation !== 'memory-persistence-probe') {
    throw new Error('Memory content mismatch after provider recreation');
  }
  if (
    loaded.classification.category !== record.classification.category ||
    loaded.ownership.tenantId !== record.ownership.tenantId
  ) {
    throw new Error('Memory classification/ownership mismatch after restart');
  }

  const after = await engine.retrieve({
    requestId: 'probe-after',
    query: 'memory-persistence-probe',
    node: { workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'answer' },
    context,
    authorization,
    categories: ['episodic'],
    strategy: 'keyword',
    ownership: { userId: 'probe-user' },
    maximumResults: 10,
    ranking: {
      relevanceWeight: 1,
      importanceWeight: 1,
      recencyWeight: 1,
      policyVersion: 'probe',
    },
    metadata: {},
  });
  if (!after.memories.some((item) => item.id === record.id)) {
    throw new Error('Memory not recallable after restart boundary');
  }

  await provider.close();
  console.log('memory-persistence-probe: ok', record.id);
}

main().catch((error) => {
  console.error('memory-persistence-probe: failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
