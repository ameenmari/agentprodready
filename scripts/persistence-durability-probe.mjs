#!/usr/bin/env node
/**
 * Manual durability proof for AgentProdReady v0.3 PostgreSQL persistence.
 * Requires: pnpm build && pnpm db:migrate && DATABASE_URL=...
 * Does not exercise Runtime recovery.
 */
import {
  InMemoryPersistenceAudit,
  InMemoryPersistenceDiagnostics,
  InMemoryPersistenceEvents,
  PersistenceFramework,
} from '../packages/persistence/dist/index.js';
import {
  loadPostgresPersistenceConfig,
  PERSISTENCE_POSTGRES_BOUNDARY_ID,
  PostgresMigrationProvider,
  PostgresPersistenceProvider,
  PostgresSnapshotStore,
} from '../packages/persistence-postgres/dist/index.js';

const scope = { tenantId: 'durability-tenant', workspaceId: 'durability-workspace' };
const at = new Date().toISOString();
const entityId = process.env['PROBE_ENTITY_ID'] ?? 'durability-entity-1';
const snapshotId = process.env['PROBE_SNAPSHOT_ID'] ?? 'durability-snapshot-1';
const mode = process.argv[2] ?? 'write';

function authorization(operation) {
  return {
    decisionId: `decision:${operation}`,
    principalId: 'durability-probe',
    operation,
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
  };
}

async function withFramework(run) {
  const config = loadPostgresPersistenceConfig();
  const provider = new PostgresPersistenceProvider(config);
  const snapshots = new PostgresSnapshotStore(provider.pool);
  const migrations = new PostgresMigrationProvider(provider.pool);
  const framework = new PersistenceFramework(
    provider,
    snapshots,
    migrations,
    new InMemoryPersistenceEvents(),
    new InMemoryPersistenceAudit(),
    new InMemoryPersistenceDiagnostics(),
  );
  try {
    await provider.assertReady();
    return await run({ provider, framework, snapshots });
  } finally {
    await provider.close();
  }
}

if (mode === 'write') {
  await withFramework(async ({ framework, provider }) => {
    const existing = await provider.repository('entities').find(entityId, scope);
    if (existing !== undefined) {
      const del = await framework.begin({
        id: 'durability-clear',
        boundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
        repositoryNames: ['entities'],
        isolation: 'read-committed',
        mandatoryDurability: 'durable',
        atomicityRequired: true,
        authorization: authorization('transaction'),
        correlationId: 'durability-probe',
        startedAt: at,
      });
      del.stage({
        type: 'delete',
        deletion: {
          repository: 'entities',
          id: entityId,
          scope,
          expectedRevision: existing.revision,
          expectedVersionToken: existing.versionToken,
        },
      });
      await del.commit(at);
    }
    await provider.pool.query('DELETE FROM persistence_snapshots WHERE id = $1', [snapshotId]);

    const tx = await framework.begin({
      id: 'durability-write',
      boundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
      repositoryNames: ['entities'],
      isolation: 'read-committed',
      mandatoryDurability: 'durable',
      atomicityRequired: true,
      authorization: authorization('transaction'),
      correlationId: 'durability-probe',
      startedAt: at,
    });
    tx.stage({
      type: 'save',
      write: {
        repository: 'entities',
        id: entityId,
        scope,
        data: { probe: true, writtenAt: at },
        occurredAt: at,
      },
    });
    await tx.commit(at);
    await framework.snapshot(snapshotId, 'entities', scope, authorization('snapshot'), at);
    const found = await provider.repository('entities').find(entityId, scope);
    if (found === undefined) throw new Error('write probe failed to read entity back');
    process.stdout.write(`durability-probe write: ok entity=${entityId} snapshot=${snapshotId}\n`);
  });
} else if (mode === 'read') {
  await withFramework(async ({ provider, snapshots }) => {
    const found = await provider.repository('entities').find(entityId, scope);
    if (found === undefined) throw new Error(`durability-probe read: missing entity ${entityId}`);
    const snapshot = await snapshots.get(snapshotId);
    if (snapshot === undefined) throw new Error(`durability-probe read: missing snapshot ${snapshotId}`);
    process.stdout.write(
      `durability-probe read: ok entityRevision=${String(found.revision)} snapshotEntities=${String(snapshot.entities.length)}\n`,
    );
  });
} else {
  process.stderr.write('Usage: node scripts/persistence-durability-probe.mjs <write|read>\n');
  process.exit(1);
}
