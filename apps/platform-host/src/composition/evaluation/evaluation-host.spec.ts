import { describe, expect, it } from 'vitest';
import {
  DeterministicComparativeEvaluator,
  ExternalEvaluationError,
  WeightedCompositeEvaluator,
} from '@agentprodready/evaluation';
import { buildLocalReferenceComposition } from '../local-reference-composition.js';
import { loadLocalReferenceConfig } from '../../config/local-reference-config.js';
import {
  buildLocalEvaluationRequest,
  localAiRequirement,
  localCompositeRequirement,
  localDeterministicRequirement,
  localHeuristicRequirement,
  localHumanRequirement,
  binarySchema,
} from './local-reference-evaluation-policy.js';

function enabledEnv(
  overrides: Record<string, string> = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    EVALUATION_ENABLED: 'true',
    EVALUATION_RESULT_STORE: 'in-memory',
    PERSISTENCE_PROVIDER: 'in-memory',
    MEMORY_PROVIDER: 'in-memory',
    RUNTIME_RECOVERY_ENABLED: 'false',
    AI_PROVIDER: 'reference',
    REFERENCE_AGENT_ENABLED: 'true',
    ...overrides,
  };
}

const security = Object.freeze({
  tenantId: 'local-tenant',
  workspaceId: 'local-workspace',
  decisionId: 'decision-eval',
  labels: Object.freeze(['public']),
});

describe('Host Evaluation productization', () => {
  it('rejects invalid evaluation configuration fail-closed', () => {
    expect(() =>
      loadLocalReferenceConfig({ ...process.env, EVALUATION_ENABLED: 'maybe' }),
    ).toThrow(/EVALUATION_ENABLED/);
    expect(() =>
      loadLocalReferenceConfig({
        ...process.env,
        EVALUATION_ENABLED: 'true',
        EVALUATION_RESULT_STORE: 'postgres',
      }),
    ).toThrow(/EVALUATION_RESULT_STORE/);
  });

  it('keeps evaluation inactive when disabled', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig({ ...process.env, EVALUATION_ENABLED: 'false' }),
    );
    expect(composition.evaluation).toBeUndefined();
    await composition.dispose();
  });

  it('proves deterministic, heuristic, AI, human, and composite evaluators', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig(enabledEnv()),
    );
    await composition.seed();
    const evaluation = composition.evaluation;
    if (evaluation === undefined) throw new Error('expected evaluation');

    const deterministic = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'det-1',
        artifact: { answer: 42 },
        expected: { answer: 42 },
        security,
        executionId: 'exec-det',
        correlationId: 'corr-det',
        requirement: localDeterministicRequirement(),
      }),
    );
    expect(deterministic).toMatchObject({
      status: 'complete',
      descriptive: true,
      aggregate: { assessment: 'passed', score: 1 },
    });
    expect(deterministic.criterionResults[0]?.score?.schema).toBe('unit-interval');
    expect(deterministic.aggregate.contributors).toHaveLength(1);
    expect(Object.isFrozen(deterministic)).toBe(true);

    const heuristic = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'heu-1',
        artifact: { answer: 1 },
        expected: { answer: 1 },
        security,
        executionId: 'exec-heu',
        correlationId: 'corr-heu',
        requirement: localHeuristicRequirement(),
      }),
    );
    expect(heuristic.criterionResults[0]?.evaluator.id).toBe('exact-heuristic');

    const ai = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'ai-1',
        artifact: { answer: 'ok' },
        expected: { answer: 'ok' },
        security,
        executionId: 'exec-ai',
        correlationId: 'corr-ai',
        requirement: localAiRequirement(),
      }),
    );
    expect(ai.status).toBe('complete');
    expect(ai.criterionResults[0]?.limitations).toContain('probabilistic-judge');
    const aiMeta = ai.criterionResults[0];
    expect(JSON.stringify(ai)).toMatch(/binding:|prompt:|ai-result|diagnostic/i);

    const waiting = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'human-1',
        artifact: { answer: 'review' },
        expected: { answer: 'review' },
        security,
        executionId: 'exec-human',
        correlationId: 'corr-human',
        requirement: localHumanRequirement(),
      }),
    );
    expect(waiting.status).toBe('waiting');
    const reviewId = evaluation.human.pending()[0];
    if (reviewId === undefined) throw new Error('missing human review');
    evaluation.human.resume(reviewId, {
      reviewId,
      outcome: 'passed',
      score: { value: 1, confidence: 1, schema: binarySchema, semantics: 'human' },
      evidence: [
        {
          id: 'evidence-human',
          type: 'human-review',
          summary: 'approved',
          references: ['artifact:human-1'],
          provenance: ['evaluation:local'],
          security,
          version: '1',
        },
      ],
      reviewerReference: 'reviewer:local',
    });
    const resumed = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'human-1',
        artifact: { answer: 'review' },
        expected: { answer: 'review' },
        security,
        executionId: 'exec-human',
        correlationId: 'corr-human',
        requirement: localHumanRequirement(),
      }),
    );
    expect(resumed.status).toBe('complete');

    const composite = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'comp-1',
        artifact: { answer: 7 },
        expected: { answer: 7 },
        security,
        executionId: 'exec-comp',
        correlationId: 'corr-comp',
        requirement: localCompositeRequirement(),
      }),
    );
    expect(composite.aggregate.assessment).toBe('passed');

    const weighted = new WeightedCompositeEvaluator();
    expect(() =>
      weighted.combine(
        {
          requestId: 'x',
          target: {
            reference: 't',
            type: 'ai-result',
            version: '1',
            artifact: {},
            provenance: [],
            security,
          },
          criterion: {
            id: 'c',
            name: 'c',
            description: 'c',
            category: 'correctness',
            weight: 1,
            threshold: 0.5,
            severity: 'low',
            evidenceRequired: true,
            evaluatorRequirementId: 'req-composite',
            scoreSchema: binarySchema,
            version: '1',
          },
          security,
          correlation: { executionId: 'e', correlationId: 'c' },
          policyVersion: 'p',
        },
        [
          {
            criterionId: 'c',
            evaluatorId: 'a',
            evaluatorVersion: '1',
            outcome: 'scored',
            score: { value: 1, confidence: 1, schema: binarySchema, semantics: 'a' },
            evidence: [],
            explanation: 'a',
            limitations: [],
            metadata: {},
          },
          {
            criterionId: 'c',
            evaluatorId: 'b',
            evaluatorVersion: '1',
            outcome: 'scored',
            score: {
              value: 50,
              confidence: 1,
              schema: { ...binarySchema, id: 'percent', maximum: 100 },
              semantics: 'b',
            },
            evidence: [],
            explanation: 'b',
            limitations: [],
            metadata: {},
          },
        ],
      ),
    ).toThrow(ExternalEvaluationError);

    const comparison = new DeterministicComparativeEvaluator().compare(
      ['b', 'a'],
      { a: 0.9, b: 0.2 },
      [],
    );
    expect(comparison).toMatchObject({
      preferredTarget: 'a',
      outcome: 'preferred',
      rankedTargets: ['a', 'b'],
    });
    expect(
      new DeterministicComparativeEvaluator().compare(['a', 'b'], { a: 0.5, b: 0.5 }, []).outcome,
    ).toBe('tie');

    expect(evaluation.events.facts.some((fact) => fact.type === 'evaluation.completed')).toBe(true);
    expect(evaluation.audit.records.length).toBeGreaterThan(0);
    expect(aiMeta).toBeDefined();

    const health = await composition.healthService.check();
    expect(health.some((item) => item.name === 'evaluation' && item.status === 'healthy')).toBe(true);

    await composition.dispose();
  });

  it('preserves empty/waiting/partial/inconclusive semantics and security rejection', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig(enabledEnv()),
    );
    await composition.seed();
    const evaluation = composition.evaluation;
    if (evaluation === undefined) throw new Error('expected evaluation');

    const empty = await evaluation.framework.evaluate({
      ...buildLocalEvaluationRequest({
        requestId: 'empty',
        artifact: {},
        security,
        executionId: 'e',
        correlationId: 'c',
        requirement: localDeterministicRequirement(),
      }),
      criteria: [],
      requirements: [],
    });
    expect(empty.status).toBe('empty');

    const mismatched = buildLocalEvaluationRequest({
      requestId: 'bad-scope',
      artifact: { answer: 1 },
      expected: { answer: 1 },
      security,
      executionId: 'e',
      correlationId: 'c',
      requirement: localDeterministicRequirement(),
    });
    await expect(
      evaluation.framework.evaluate({
        ...mismatched,
        target: {
          ...mismatched.target,
          security: { ...security, tenantId: 'other-tenant' },
        },
      }),
    ).rejects.toMatchObject({ code: 'EVALUATION_SECURITY_SCOPE' });

    await composition.dispose();
  });

  it('stores results through in-memory result store when enabled', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig(enabledEnv()),
    );
    await composition.seed();
    const evaluation = composition.evaluation;
    if (evaluation === undefined) throw new Error('expected evaluation');
    const result = await evaluation.framework.evaluate(
      buildLocalEvaluationRequest({
        requestId: 'store-1',
        artifact: { answer: 9 },
        expected: { answer: 9 },
        security,
        executionId: 'e-store',
        correlationId: 'c-store',
        requirement: localDeterministicRequirement(),
      }),
    );
    const store = evaluation.store as { results?: readonly { id: string }[] };
    expect(store.results?.some((item) => item.id === result.id)).toBe(true);
    await composition.dispose();
  });
});
