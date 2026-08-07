import type { AiProviderFramework } from '@agentforge/ai-provider';
import type { CapabilityResolver } from '@agentforge/capability-resolution';
import type { EventBus } from '@agentforge/event-bus';
import {
  EvaluationFramework,
  EvaluatorRegistry,
  ExactMatchEvaluator,
  InMemoryEvaluationDiagnostics,
  InMemoryEvaluationResultStore,
  InMemoryHumanEvaluator,
  NormalizedAiAssistedEvaluator,
  UnitIntervalScoreNormalizer,
  type EvaluationFramework as EvaluationFrameworkType,
  type EvaluationResultStore,
  type InMemoryHumanEvaluator as HumanEvaluatorType,
} from '@agentforge/evaluation';
import type { InMemoryMetricsProvider } from '@agentforge/observability';
import type { PersistenceProvider } from '@agentforge/persistence';
import type { LocalReferenceConfig } from '../../config/local-reference-config.js';
import { LocalReferenceAiEvaluationPort } from './local-reference-ai-evaluation-port.js';
import {
  EventBusEvaluationEvents,
  HostEvaluationAudit,
  ObservabilityEvaluationTelemetry,
} from './local-reference-evaluation-lifecycle.js';
import { LocalReferenceEvaluatorExecution } from './local-reference-evaluator-execution.js';
import { LocalCompositeEvaluator } from './local-composite-evaluator.js';
import { PersistenceEvaluationResultStore } from './persistence-evaluation-result-store.js';
import {
  localAiRequirement,
  localCompositeRequirement,
  localDeterministicRequirement,
  localHeuristicRequirement,
  localHumanRequirement,
} from './local-reference-evaluation-policy.js';

export interface LocalReferenceEvaluationBundle {
  readonly framework: EvaluationFrameworkType;
  readonly registry: EvaluatorRegistry;
  readonly execution: LocalReferenceEvaluatorExecution;
  readonly diagnostics: InMemoryEvaluationDiagnostics;
  readonly events: EventBusEvaluationEvents;
  readonly audit: HostEvaluationAudit;
  readonly store: EvaluationResultStore;
  readonly human: HumanEvaluatorType;
  readonly persistentStore?: PersistenceEvaluationResultStore;
  readonly evaluatorCount: number;
}

export function buildLocalReferenceEvaluation(deps: {
  readonly config: LocalReferenceConfig;
  readonly persistence: PersistenceProvider;
  readonly eventBus: EventBus;
  readonly metrics: InMemoryMetricsProvider;
  readonly capabilityResolver: CapabilityResolver;
  readonly aiFramework: AiProviderFramework;
}): LocalReferenceEvaluationBundle | undefined {
  if (!deps.config.evaluationEnabled) return undefined;

  const registry = new EvaluatorRegistry();
  const deterministic = new ExactMatchEvaluator('exact-deterministic', 'deterministic');
  const heuristic = new ExactMatchEvaluator('exact-heuristic', 'heuristic');
  const aiPort = new LocalReferenceAiEvaluationPort(deps.capabilityResolver, deps.aiFramework);
  const aiAssisted = new NormalizedAiAssistedEvaluator(
    'ai-judge',
    '1',
    aiPort,
    [
      'plan',
      'workflow-definition',
      'workflow-execution',
      'node-output',
      'knowledge-result',
      'memory-result',
      'context-package',
      'prompt-package',
      'ai-result',
      'tool-result',
      'execution-result',
      'comparative-set',
    ],
    [
      'correctness',
      'relevance',
      'completeness',
      'consistency',
      'safety',
      'groundedness',
      'instruction-adherence',
      'efficiency',
      'robustness',
      'user-outcome',
    ],
  );
  const human = new InMemoryHumanEvaluator();
  const composite = new LocalCompositeEvaluator();

  registry.register(localDeterministicRequirement().id, deterministic);
  registry.register(localHeuristicRequirement().id, heuristic);
  registry.register(localAiRequirement().id, aiAssisted);
  registry.register(localHumanRequirement().id, human);
  registry.register(localCompositeRequirement().id, composite);

  const execution = new LocalReferenceEvaluatorExecution();
  const diagnostics = new InMemoryEvaluationDiagnostics();
  const events = new EventBusEvaluationEvents(deps.eventBus);
  const audit = new HostEvaluationAudit();
  const telemetry = new ObservabilityEvaluationTelemetry(deps.metrics);

  let store: EvaluationResultStore;
  let persistentStore: PersistenceEvaluationResultStore | undefined;
  if (deps.config.evaluationResultStore === 'persistent') {
    persistentStore = new PersistenceEvaluationResultStore(deps.persistence);
    store = persistentStore;
  } else {
    store = new InMemoryEvaluationResultStore();
  }

  const framework = new EvaluationFramework(
    registry,
    execution,
    new UnitIntervalScoreNormalizer(),
    diagnostics,
    events,
    telemetry,
    audit,
    store,
  );

  return Object.freeze({
    framework,
    registry,
    execution,
    diagnostics,
    events,
    audit,
    store,
    human,
    ...(persistentStore === undefined ? {} : { persistentStore }),
    evaluatorCount: registry.size(),
  });
}
