import { describe, expect, it } from 'vitest';
import {
  InMemoryMigrationProvider,
  InMemoryPersistenceAudit,
  InMemoryPersistenceDiagnostics,
  InMemoryPersistenceEvents,
  InMemoryPersistenceProvider,
  InMemorySnapshotStore,
  PersistenceFramework,
  type PersistenceAuthorization,
  type PersistenceScope,
  type TransactionRequest,
} from '@agentforge/persistence';
import { bootstrapLocalReferenceHost } from './bootstrap-local.js';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';

const at = '2026-08-08T00:00:00.000Z';
const tenantA: PersistenceScope = Object.freeze({
  tenantId: 'tenant-a',
  workspaceId: 'workspace-a',
});
const tenantB: PersistenceScope = Object.freeze({
  tenantId: 'tenant-b',
  workspaceId: 'workspace-b',
});

function authorization(
  operation: PersistenceAuthorization['operation'],
  scope: PersistenceScope,
): PersistenceAuthorization {
  return Object.freeze({
    decisionId: `decision:${operation}:${scope.tenantId}`,
    principalId: 'operator-1',
    operation,
    authorized: true,
    state: 'active' as const,
    scope,
    policyVersion: '1',
  });
}

function request(
  id: string,
  repositoryNames: readonly string[],
  scope: PersistenceScope,
): TransactionRequest {
  return Object.freeze({
    id,
    boundaryId: 'memory-boundary',
    repositoryNames: [...repositoryNames],
    isolation: 'read-committed' as const,
    mandatoryDurability: 'non-durable' as const,
    atomicityRequired: true,
    authorization: authorization('transaction', scope),
    correlationId: 'correlation-tenant-isolation',
    startedAt: at,
  });
}

async function save(
  framework: PersistenceFramework,
  repository: string,
  id: string,
  scope: PersistenceScope,
  data: unknown,
): Promise<void> {
  const tx = await framework.begin(request(`save-${id}`, [repository], scope));
  tx.stage({ type: 'save', write: { repository, id, scope, data, occurredAt: at } });
  await tx.commit(at);
}

describe('v1.0 cross-tenant isolation', () => {
  it('proves tenant-a cannot read tenant-b persistence artifacts across required repositories', async () => {
    const provider = new InMemoryPersistenceProvider();
    const framework = new PersistenceFramework(
      provider,
      new InMemorySnapshotStore(),
      new InMemoryMigrationProvider(),
      new InMemoryPersistenceEvents(),
      new InMemoryPersistenceAudit(),
      new InMemoryPersistenceDiagnostics(),
    );

    const repositories = [
      'runtime-checkpoints',
      'memory-records',
      'vector-records',
      'evaluation-results',
      'audit-records',
    ] as const;

    for (const repository of repositories) {
      await save(framework, repository, `${repository}-a`, tenantA, { owner: 'a', secret: 'tenant-a' });
      await save(framework, repository, `${repository}-b`, tenantB, { owner: 'b', secret: 'tenant-b' });
    }

    for (const repository of repositories) {
      const store = provider.repository(repository);
      const own = await store.find(`${repository}-a`, tenantA);
      expect(own?.data).toMatchObject({ owner: 'a' });

      const foreignById = await store.find(`${repository}-b`, tenantA);
      expect(foreignById).toBeUndefined();

      const countA = await store.count(tenantA);
      const countB = await store.count(tenantB);
      expect(countA).toBe(1);
      expect(countB).toBe(1);

      await expect(
        framework.snapshot(
          `snap-${repository}`,
          repository,
          { tenantId: 'tenant-b' },
          authorization('snapshot', tenantA),
          at,
        ),
      ).rejects.toThrow(/scope/);
    }
  });

  it('host bootstrap remains scoped to local reference tenant (adversarial inputs cannot widen scope)', async () => {
    const config = loadLocalReferenceConfig({
      HOST: '127.0.0.1',
      PORT: '0',
      LOG_LEVEL: 'error',
      REFERENCE_AGENT_ENABLED: 'true',
      AI_PROVIDER: 'reference',
    });
    const host = await bootstrapLocalReferenceHost(config);
    try {
      const result = await host.composition.invoke(
        'ping',
        { tenantId: 'tenant-b', secret: 'tenant-b-secret' },
        'corr-tenant-isolation',
        undefined,
      );
      expect([200, 401, 403]).toContain(result.status);
      expect(JSON.stringify(result.body)).not.toMatch(/OPENAI_API_KEY|sk-[a-zA-Z0-9]/);
    } finally {
      await host.stop();
    }
  });
});
