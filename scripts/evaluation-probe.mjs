#!/usr/bin/env node
/**
 * Manual Evaluation probe for AgentForge v0.6.
 * Requires: pnpm build
 * Optional durable: PERSISTENCE_PROVIDER=postgres + DATABASE_URL + EVALUATION_RESULT_STORE=persistent
 */
import { buildLocalReferenceComposition } from '../apps/platform-host/dist/composition/local-reference-composition.js';
import { loadLocalReferenceConfig } from '../apps/platform-host/dist/config/local-reference-config.js';
import {
  buildLocalEvaluationRequest,
  localDeterministicRequirement,
} from '../apps/platform-host/dist/composition/evaluation/local-reference-evaluation-policy.js';

const env = {
  ...process.env,
  EVALUATION_ENABLED: 'true',
  EVALUATION_RESULT_STORE: process.env.EVALUATION_RESULT_STORE ?? 'in-memory',
  PERSISTENCE_PROVIDER: process.env.PERSISTENCE_PROVIDER ?? 'in-memory',
  MEMORY_PROVIDER: 'in-memory',
  RUNTIME_RECOVERY_ENABLED: 'false',
  AI_PROVIDER: 'reference',
};

async function main() {
  const config = loadLocalReferenceConfig(env);
  const composition = await buildLocalReferenceComposition(config);
  await composition.seed();
  const evaluation = composition.evaluation;
  if (evaluation === undefined) throw new Error('Evaluation not enabled');

  const security = Object.freeze({
    tenantId: 'probe-tenant',
    workspaceId: 'probe-workspace',
    decisionId: 'probe-decision',
    labels: Object.freeze(['public']),
  });
  const result = await evaluation.framework.evaluate(
    buildLocalEvaluationRequest({
      requestId: `probe-${Date.now()}`,
      artifact: { answer: 'evaluation-probe' },
      expected: { answer: 'evaluation-probe' },
      security,
      executionId: 'probe-exec',
      correlationId: 'probe-corr',
      requirement: localDeterministicRequirement(),
    }),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        resultId: result.id,
        status: result.status,
        assessment: result.aggregate.assessment,
        score: result.aggregate.score,
        descriptive: result.descriptive,
        resultStore: config.evaluationResultStore,
      },
      null,
      2,
    ),
  );

  if (config.evaluationResultStore === 'persistent' && evaluation.persistentStore !== undefined) {
    const loaded = await evaluation.persistentStore.load(result.id, security.tenantId);
    if (loaded?.id !== result.id) throw new Error('persistent reload failed');
    console.log('evaluation-probe: persistent reload ok');
  }

  await composition.dispose();
  console.log('evaluation-probe: ok');
}

main().catch((error) => {
  console.error('evaluation-probe: failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
