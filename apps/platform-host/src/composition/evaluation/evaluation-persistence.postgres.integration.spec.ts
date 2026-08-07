import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EvaluationFramework,
  ExactMatchEvaluator,
  EvaluatorRegistry,
  InMemoryEvaluationDiagnostics,
  InMemoryEvaluationEvents,
  NoopEvaluationTelemetry,
  UnitIntervalScoreNormalizer,
} from '@agentprodready/evaluation';
import {
  loadPostgresPersistenceConfig,
  PostgresPersistenceProvider,
} from '@agentprodready/persistence-postgres';
import { HostEvaluationAudit } from './local-reference-evaluation-lifecycle.js';
import { LocalReferenceEvaluatorExecution } from './local-reference-evaluator-execution.js';
import {
  buildLocalEvaluationRequest,
  localDeterministicRequirement,
} from './local-reference-evaluation-policy.js';
import { PersistenceEvaluationResultStore } from './persistence-evaluation-result-store.js';

describe.skipIf(process.env['RUN_POSTGRES_TESTS'] !== '1')(
  'Evaluation result PostgreSQL durability',
  () => {
    let provider: PostgresPersistenceProvider;

    beforeAll(async () => {
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
    });

    afterAll(async () => {
      await provider.close();
    });

    it('persists EvaluationResult across provider recreation', async () => {
      const store = new PersistenceEvaluationResultStore(provider);
      const registry = new EvaluatorRegistry();
      registry.register(localDeterministicRequirement().id, new ExactMatchEvaluator('exact'));
      const framework = new EvaluationFramework(
        registry,
        new LocalReferenceEvaluatorExecution(),
        new UnitIntervalScoreNormalizer(),
        new InMemoryEvaluationDiagnostics(),
        new InMemoryEvaluationEvents(),
        new NoopEvaluationTelemetry(),
        new HostEvaluationAudit(),
        store,
      );
      const security = Object.freeze({
        tenantId: 'evaluation-pg-tenant',
        workspaceId: 'workspace-pg',
        decisionId: 'd-pg',
        labels: Object.freeze(['public']),
      });
      const result = await framework.evaluate(
        buildLocalEvaluationRequest({
          requestId: `eval-pg-${crypto.randomUUID()}`,
          artifact: { answer: 'durable' },
          expected: { answer: 'durable' },
          security,
          executionId: 'exec-pg',
          correlationId: 'corr-pg',
          requirement: localDeterministicRequirement(),
        }),
      );
      expect(result.descriptive).toBe(true);

      await provider.close();
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
      const reloadedStore = new PersistenceEvaluationResultStore(provider);
      const loaded = await reloadedStore.load(result.id, security.tenantId);
      expect(loaded?.id).toBe(result.id);
      expect(loaded?.status).toBe(result.status);
      expect(loaded?.aggregate.assessment).toBe(result.aggregate.assessment);
      expect(loaded?.descriptive).toBe(true);
      const entity = await provider.repository('evaluation-results').find(result.id, {
        tenantId: security.tenantId,
      });
      expect(entity?.scope).toEqual({ tenantId: security.tenantId });
    });
  },
);
