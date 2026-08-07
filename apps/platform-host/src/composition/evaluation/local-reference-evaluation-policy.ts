import type {
  EvaluationCriterion,
  EvaluationPolicy,
  EvaluationRequest,
  EvaluationSecurityScope,
  EvaluatorRequirement,
  ScoreSchema,
} from '@agentforge/evaluation';
import { PRODUCT_VERSION } from '../../config/local-reference-config.js';

export const LOCAL_EVALUATION_POLICY_ID = 'evaluation-policy:local';
export const LOCAL_EVALUATION_REFERENCE = 'evaluation:local';

const binarySchema: ScoreSchema = Object.freeze({
  id: 'binary',
  minimum: 0,
  maximum: 1,
  direction: 'higher-is-better',
  version: '1',
});

export function localEvaluationPolicy(): EvaluationPolicy {
  return Object.freeze({
    version: LOCAL_EVALUATION_POLICY_ID,
    schemaVersion: 'evaluation-result-1',
    normalizationVersion: 'unit-1',
    aggregationVersion: 'weighted-1',
    strategy: 'weighted',
    executionMode: 'sequential',
    aggregation: 'weighted-average',
    passThreshold: 0.8,
    allowPartial: true,
  });
}

export function localDeterministicRequirement(): EvaluatorRequirement {
  return Object.freeze({
    id: 'req-deterministic',
    category: 'deterministic',
    capability: 'evaluation.correctness',
    deterministic: true,
    evidenceRequired: true,
    constraints: Object.freeze({}),
    version: '1',
  });
}

export function localHeuristicRequirement(): EvaluatorRequirement {
  return Object.freeze({
    id: 'req-heuristic',
    category: 'heuristic',
    capability: 'evaluation.correctness',
    deterministic: false,
    evidenceRequired: true,
    constraints: Object.freeze({}),
    version: '1',
  });
}

export function localAiRequirement(): EvaluatorRequirement {
  return Object.freeze({
    id: 'req-ai',
    category: 'ai-assisted',
    capability: 'evaluation.judge',
    deterministic: false,
    evidenceRequired: true,
    constraints: Object.freeze({}),
    version: '1',
  });
}

export function localHumanRequirement(): EvaluatorRequirement {
  return Object.freeze({
    id: 'req-human',
    category: 'human',
    capability: 'evaluation.human',
    deterministic: false,
    evidenceRequired: false,
    constraints: Object.freeze({}),
    version: '1',
  });
}

export function localCompositeRequirement(): EvaluatorRequirement {
  return Object.freeze({
    id: 'req-composite',
    category: 'composite',
    capability: 'evaluation.composite',
    deterministic: true,
    evidenceRequired: true,
    constraints: Object.freeze({}),
    version: '1',
  });
}

export function localCorrectnessCriterion(
  requirementId: string,
  id = 'correctness',
): EvaluationCriterion {
  return Object.freeze({
    id,
    name: 'Correctness',
    description: 'Target matches expected outcome',
    category: 'correctness',
    weight: 1,
    threshold: 0.8,
    severity: 'high',
    evidenceRequired: requirementId !== 'req-human',
    evaluatorRequirementId: requirementId,
    scoreSchema: binarySchema,
    version: 'criterion-1',
  });
}

export function buildLocalEvaluationRequest(input: {
  readonly requestId: string;
  readonly artifact: unknown;
  readonly expected?: unknown;
  readonly security: EvaluationSecurityScope;
  readonly executionId: string;
  readonly correlationId: string;
  readonly requirement: EvaluatorRequirement;
  readonly criterion?: EvaluationCriterion;
  readonly policy?: EvaluationPolicy;
  readonly targetType?: EvaluationRequest['target']['type'];
  readonly targetReference?: string;
}): EvaluationRequest {
  const criterion =
    input.criterion ?? localCorrectnessCriterion(input.requirement.id);
  return Object.freeze({
    requestId: input.requestId,
    requestVersion: 'request-1',
    target: Object.freeze({
      reference: input.targetReference ?? `artifact:${input.requestId}`,
      type: input.targetType ?? 'ai-result',
      version: '1',
      artifact: input.artifact,
      provenance: Object.freeze([LOCAL_EVALUATION_REFERENCE]),
      security: input.security,
    }),
    ...(input.expected === undefined ? {} : { expected: input.expected }),
    criteria: Object.freeze([criterion]),
    requirements: Object.freeze([input.requirement]),
    policy: input.policy ?? localEvaluationPolicy(),
    security: input.security,
    correlation: Object.freeze({
      executionId: input.executionId,
      correlationId: input.correlationId,
    }),
    platformVersion: PRODUCT_VERSION,
    metadata: Object.freeze({
      policyReference: LOCAL_EVALUATION_POLICY_ID,
      evaluationReference: LOCAL_EVALUATION_REFERENCE,
    }),
  });
}

export { binarySchema };
