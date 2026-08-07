import { AgentFramework, buildAgentDefinition, DeterministicAgentValidator, InMemoryAgentAudit, InMemoryAgentDiagnostics, InMemoryAgentLifecycleStore, InMemoryAgentRegistry } from '@agentprodready/agent-framework';
import {
  AuditPlatform,
  InMemoryAuditArchive,
  InMemoryAuditDiagnostics,
  InMemoryAuditEvents,
  InMemoryAuditEvidenceStore,
  InMemoryAuditIndex,
  InMemoryAuditRecordStore,
  InMemoryAuditTelemetry,
  InMemoryAuditTombstones,
  InMemoryLegalHoldStore,
  DeterministicHashChainIntegrityProvider,
  DeterministicRetentionResolver,
} from '@agentprodready/audit';
import { AiProviderFramework, FactoryAiAdapterResolver, InMemoryAiDiagnostics, InMemoryAiEvents, NoopAiTelemetry, ReferenceAiProviderAdapter } from '@agentprodready/ai-provider';
import { OPENAI_AI_ID, OpenAiProviderAdapter } from '@agentprodready/ai-provider-openai';
import {
  CapabilityResolver,
  InMemoryResolutionDiagnostics,
  InMemoryResolutionEvents,
  NoopResolutionTelemetry,
  validateResolutionRouting,
} from '@agentprodready/capability-resolution';
import {
  AiToolCallHandoff,
  FactoryToolAdapterResolver,
  InMemoryToolDiagnostics,
  InMemoryToolEvents,
  NoopToolTelemetry,
  ReferenceCounterToolAdapter,
  ReferenceEchoToolAdapter,
  REFERENCE_COUNTER_TOOL_ID,
  REFERENCE_ECHO_TOOL_ID,
  ToolInvocationCoordinator,
  ToolRegistry,
  ToolValidator,
  referenceCounterContract,
  referenceEchoContract,
} from '@agentprodready/tool-framework';
import { CompositionRoot } from '@agentprodready/composition';
import {
  EventBus,
  createPlatformEvent,
  InMemoryDeadLetterStore,
  InMemoryDeliveryJournal,
  InMemoryEventBusDiagnostics,
  InMemoryEventBusTelemetry,
  InMemoryReplayAudit,
  InMemoryReplayStore,
  InMemorySubscriptionRegistry,
  DeterministicEventRouter,
  StaticVisibilityAuthorizer,
  InProcessEventTransport,
} from '@agentprodready/event-bus';
import { HealthService, ReadinessService } from '@agentprodready/foundation';
import {
  ConsoleLoggingProvider,
  InMemoryLoggingProvider,
  InMemoryMetricsProvider,
  InMemoryTracingProvider,
} from '@agentprodready/observability';
import {
  CatalogOrGeneratedWorkflowPlanner,
  DeduplicatingPlanOptimizer,
  InMemoryPlanningEventPublisher,
  ObjectiveGoalAnalyzer,
  ObjectiveIntentAnalyzer,
  PlanningEngine,
  RuntimePlanningAdapter,
  StrictPlanValidator,
  TaskCapabilityPlanner,
  TaskStrategySelector,
  NoopPlanningTelemetry,
} from '@agentprodready/planning';
import { InMemoryPersistenceProvider, type PersistenceProvider } from '@agentprodready/persistence';
import { PostgresPersistenceProvider } from '@agentprodready/persistence-postgres';
import {
  DEFAULT_RECOVERY_POLICY,
  InMemoryRuntimeEventPublisher,
  RuntimeOrchestrator,
  StaticRuntimePolicyProvider,
  type RuntimeStreamEvent,
} from '@agentprodready/runtime';
import {
  SecurityPlatform,
  SecurityRuntimeAdapter,
  BasicSecurityPolicyEvaluator,
  ExplicitDenyConflictResolver,
  InMemoryAuthorizationDecisionCache,
  InMemoryDelegationStore,
  InMemoryRevocationStore,
  InMemorySecurityAudit,
  InMemorySecurityDiagnostics,
  InMemorySecurityEvents,
  NoopSecurityTelemetry,
  StaticPolicyResolver,
} from '@agentprodready/security';
import type { AuthorizationDecision, SecurityContext } from '@agentprodready/security';
import type { EventVisibilityDecision } from '@agentprodready/event-bus';
import { InMemoryWorkflowFacts, InMemoryWorkflowSnapshots, NoopWorkflowTelemetry, RuntimeWorkflowAdapter, WorkflowEngine } from '@agentprodready/workflow';

import type { LocalReferenceConfig } from '../config/local-reference-config.js';
import { LOCAL_AGENT_PRINCIPAL, LOCAL_POLICY_VERSION, LOCAL_PROJECT, LOCAL_TENANT, LOCAL_USER, LOCAL_WORKSPACE, REFERENCE_AI_ID } from '../config/local-reference-config.js';
import type { AiProviderSelection } from '../config/local-reference-config.js';
import { referenceAgentManifest, referenceValidationCatalog } from '../seed/reference-agent.seed.js';
import {
  DeterministicResolutionPolicy,
  referenceResolutionConfiguration,
  seedReferenceCapabilities,
} from '../seed/reference-capabilities.seed.js';
import {
  LocalReferenceCapabilityExecution,
  type LocalCapabilityExecutionOutput,
} from './local-reference-capability-execution.js';
import {
  agentAuthorizationFromDecision,
  buildInvokeError,
  createHealthContributors,
  EventBusAgentEvents,
  ingestAgentAudit,
  mapInvokeResponse,
  seedAuthorization,
  validateInvokeRequest,
  writeOperationalLog,
  type InvokeErrorResponse,
  type InvokeSuccessResponse,
  type LocalReferenceComposition,
} from './local-reference-composition-helpers.js';
import {
  invokeAuthorizationRequest,
  localAuthenticationEvidence,
  localPrincipal,
  localReferenceSecurityPolicies,
  parseLocalReferenceAuth,
} from './local-reference-security.js';
import { LocalReferenceRuntimePort } from './local-reference-runtime-port.js';
import { PersistenceExecutionCheckpointStore } from './persistence-execution-checkpoint-store.js';
import { buildLocalReferenceEvaluation } from './evaluation/build-local-reference-evaluation.js';
import { buildLocalReferenceMemory } from './build-local-reference-memory.js';
import { ReferenceAgentTaskDecomposer } from './reference-task-decomposer.js';
import { ReferenceWorkflowCatalog } from './reference-workflow-catalog.js';

export async function buildLocalReferenceComposition(config: LocalReferenceConfig): Promise<LocalReferenceComposition> {
  const startedAt = Date.now();
  let ready = false;
  const securityContexts = new Map<string, SecurityContext>();

  const compositionRoot = new CompositionRoot();
  compositionRoot.build();

  const persistence: PersistenceProvider =
    config.persistenceProvider === 'postgres'
      ? new PostgresPersistenceProvider(
          config.postgres ??
            ((): never => {
              throw new Error('postgres config missing for PERSISTENCE_PROVIDER=postgres');
            })(),
        )
      : new InMemoryPersistenceProvider();
  const checkpointStore = new PersistenceExecutionCheckpointStore(
    persistence,
    Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE }),
  );

  const selectedImplementationId = selectedAiImplementationId(config.aiProvider);
  const orderedChatIds = Object.freeze([
    selectedImplementationId,
    ...config.aiFallbackProviders.map((item) => selectedAiImplementationId(item)),
  ]);
  const embeddingSelection =
    config.embeddingProvider !== 'none'
      ? config.embeddingProvider
      : config.aiProvider === 'openai'
        ? 'openai'
        : 'reference';
  const { capabilities, providers } = seedReferenceCapabilities();
  const resolutionDiagnostics = new InMemoryResolutionDiagnostics();
  const resolutionEvents = new InMemoryResolutionEvents();
  const chatRouting = Object.freeze({
    mode: config.aiRoutingMode,
    orderedImplementationIds: orderedChatIds,
  });
  validateResolutionRouting('text-generation', chatRouting, providers);
  const capabilityResolver = new CapabilityResolver(
    capabilities,
    providers,
    new DeterministicResolutionPolicy(),
    referenceResolutionConfiguration(selectedImplementationId, embeddingSelection, chatRouting),
    resolutionDiagnostics,
    resolutionEvents,
    new NoopResolutionTelemetry(),
  );

  const aiResolver = new FactoryAiAdapterResolver();
  aiResolver.bind(REFERENCE_AI_ID, async () => new ReferenceAiProviderAdapter());
  aiResolver.bind(`${REFERENCE_AI_ID}:evaluation.judge`, async () => new ReferenceAiProviderAdapter());
  const needsOpenAiAdapter =
    config.aiProvider === 'openai' || config.aiFallbackProviders.includes('openai');
  if (needsOpenAiAdapter) {
    if (config.openAi === undefined) {
      throw new Error('OpenAI configuration is required when OpenAI is in the AI routing list');
    }
    const openAiConfig = config.openAi;
    aiResolver.bind(OPENAI_AI_ID, async () => new OpenAiProviderAdapter(openAiConfig));
    aiResolver.bind(`${OPENAI_AI_ID}:evaluation.judge`, async () => new OpenAiProviderAdapter(openAiConfig));
  }
  const aiFramework = new AiProviderFramework(aiResolver, new InMemoryAiDiagnostics(), new InMemoryAiEvents(), new NoopAiTelemetry());

  const planningEvents = new InMemoryPlanningEventPublisher();
  const planningEngine = new PlanningEngine({
    goals: new ObjectiveGoalAnalyzer(),
    intents: new ObjectiveIntentAnalyzer(),
    tasks: new ReferenceAgentTaskDecomposer(),
    capabilities: new TaskCapabilityPlanner(),
    strategies: new TaskStrategySelector(),
    workflows: new CatalogOrGeneratedWorkflowPlanner(),
    catalog: new ReferenceWorkflowCatalog(),
    optimizer: new DeduplicatingPlanOptimizer(),
    validator: new StrictPlanValidator(),
    events: planningEvents,
    telemetry: new NoopPlanningTelemetry(),
  });

  const workflowAdapter = new RuntimeWorkflowAdapter(
    (graph, context) => new WorkflowEngine(graph, context, new InMemoryWorkflowFacts(), new NoopWorkflowTelemetry(), new InMemoryWorkflowSnapshots()),
  );

  const runtimeEvents = new InMemoryRuntimeEventPublisher();
  const authorizationDecisions = new Map<string, AuthorizationDecision>();
  const logs = new InMemoryLoggingProvider();
  const consoleLogs = new ConsoleLoggingProvider((line) => {
    process.stderr.write(`${line}\n`);
  });
  const metrics = new InMemoryMetricsProvider();
  const traces = new InMemoryTracingProvider();

  const securityPlatform = new SecurityPlatform(
    new StaticPolicyResolver(localReferenceSecurityPolicies()),
    new BasicSecurityPolicyEvaluator(),
    new ExplicitDenyConflictResolver(),
    new InMemoryDelegationStore(),
    new InMemoryRevocationStore(),
    new InMemoryAuthorizationDecisionCache(),
    new InMemorySecurityDiagnostics(),
    new InMemorySecurityEvents(),
    new NoopSecurityTelemetry(),
    new InMemorySecurityAudit(),
  );

  const toolRegistry = new ToolRegistry();
  toolRegistry.register(referenceEchoContract());
  toolRegistry.register(referenceCounterContract());
  const toolAdapterResolver = new FactoryToolAdapterResolver();
  const echoAdapter = new ReferenceEchoToolAdapter();
  const counterAdapter = new ReferenceCounterToolAdapter();
  toolAdapterResolver.bind(REFERENCE_ECHO_TOOL_ID, async () => echoAdapter);
  toolAdapterResolver.bind(REFERENCE_COUNTER_TOOL_ID, async () => counterAdapter);
  const toolEvents = new InMemoryToolEvents();
  const toolValidator = new ToolValidator();
  const toolCoordinator = new ToolInvocationCoordinator(
    toolRegistry,
    toolAdapterResolver,
    toolValidator,
    new InMemoryToolDiagnostics(),
    toolEvents,
    new NoopToolTelemetry(),
    config.toolMaxResultBytes,
  );
  const toolLoopDeps = config.toolsEnabled
    ? Object.freeze({
        ai: aiFramework,
        tools: toolRegistry,
        coordinator: toolCoordinator,
        validator: toolValidator,
        adapters: toolAdapterResolver,
        handoff: new AiToolCallHandoff(),
        events: toolEvents,
        security: securityPlatform,
        resolver: capabilityResolver,
        principal: localPrincipal(
          localAuthenticationEvidence({ principalId: LOCAL_USER, tenantId: LOCAL_TENANT }, new Date().toISOString()),
        ),
        limits: Object.freeze({
          enabled: true,
          maxCallsPerInvocation: config.toolMaxCallsPerInvocation,
          maxTurns: config.toolMaxTurns,
          maxArgumentBytes: config.toolMaxArgumentBytes,
          maxResultBytes: config.toolMaxResultBytes,
          agentMaxToolInvocations: 8,
        }),
        toolDefinitions: () =>
          Object.freeze(
            toolRegistry.list().map((contract) =>
              Object.freeze({
                name: contract.id,
                description: contract.metadata['description'] ?? contract.id,
                inputSchema: contract.inputSchema,
              }),
            ),
          ),
      })
    : undefined;

  const recordRoutingMetric = (
    name: string,
    correlationId: string,
    labels: Readonly<Record<string, string>>,
  ): void => {
    void metrics.record(
      Object.freeze({
        id: `metric:${name}:${correlationId}:${crypto.randomUUID()}`,
        name,
        kind: 'counter' as const,
        value: 1,
        unit: 'count',
        timestamp: new Date().toISOString(),
        component: 'ai-routing',
        correlation: Object.freeze({
          correlationId,
          causationId: null,
          tenantId: LOCAL_TENANT,
          workspaceId: LOCAL_WORKSPACE,
        }),
        labels,
        aggregatedObservation: true as const,
      }),
    );
  };
  const routingTelemetry = Object.freeze({
    selected: (implementationId: string): void => {
      recordRoutingMetric(
        'ai.routing.selected',
        implementationId,
        Object.freeze({ implementationId }),
      );
    },
    fallbackAttempted: (from: string, to: string, code: string): void => {
      recordRoutingMetric(
        'ai.routing.fallback_attempted',
        from,
        Object.freeze({ from, to, code }),
      );
    },
    fallbackSucceeded: (from: string, to: string): void => {
      recordRoutingMetric(
        'ai.routing.fallback_succeeded',
        from,
        Object.freeze({ from, to }),
      );
    },
    fallbackExhausted: (implementationId: string, code: string): void => {
      recordRoutingMetric(
        'ai.routing.fallback_exhausted',
        implementationId,
        Object.freeze({ implementationId, code }),
      );
    },
    streamFallbackPrevented: (implementationId: string, code: string): void => {
      recordRoutingMetric(
        'ai.routing.stream_fallback_prevented',
        implementationId,
        Object.freeze({ implementationId, code }),
      );
    },
    toolFallbackPrevented: (implementationId: string, code: string): void => {
      recordRoutingMetric(
        'ai.routing.tool_fallback_prevented',
        implementationId,
        Object.freeze({ implementationId, code }),
      );
    },
  });

  const capabilityExecution = new LocalReferenceCapabilityExecution(
    capabilityResolver,
    aiFramework,
    toolLoopDeps,
    Object.freeze({
      resolver: capabilityResolver,
      ai: aiFramework,
      mode: config.aiRoutingMode,
      telemetry: routingTelemetry,
    }),
  );

  const runtime = new RuntimeOrchestrator({
    scopes: compositionRoot,
    policies: new StaticRuntimePolicyProvider({
      timeoutMs: 30_000,
      maxAttempts: 1,
      maxConcurrency: 4,
      isRetryable: (): boolean => false,
      recovery: DEFAULT_RECOVERY_POLICY,
    }),
    planning: new RuntimePlanningAdapter(planningEngine),
    workflow: workflowAdapter,
    capabilities: capabilityExecution,
    security: new SecurityRuntimeAdapter(securityContexts, (decisionId) => {
      const decision = authorizationDecisions.get(decisionId);
      if (decision === undefined) return 'revoked' as const;
      return securityPlatform.validity(decision).state;
    }),
    events: runtimeEvents,
    telemetry: {
      transition: (): void => {},
      completed: (): void => {},
      failed: (): void => {},
      recovery: (kind, executionId): void => {
        const at = new Date().toISOString();
        void metrics.record(
          Object.freeze({
            id: `metric:runtime.recovery.${kind}:${executionId}:${at}`,
            name: `runtime.recovery.${kind}`,
            kind: 'counter' as const,
            value: 1,
            unit: 'count',
            timestamp: at,
            component: 'runtime',
            correlation: Object.freeze({
              correlationId: executionId,
              causationId: null,
              tenantId: LOCAL_TENANT,
              workspaceId: LOCAL_WORKSPACE,
              executionReference: executionId,
            }),
            labels: Object.freeze({ executionId }),
            aggregatedObservation: true as const,
          }),
        );
        void writeOperationalLog(logs, executionId, `runtime.recovery.${kind}`, {
          kind,
          executionId,
        });
      },
    },
    checkpoints: checkpointStore,
  });

  const runtimePort = new LocalReferenceRuntimePort(runtime, securityContexts);

  const registry = new InMemorySubscriptionRegistry();
  const visibilityDecisions = new Map<string, EventVisibilityDecision>([
    [
      'policy:local-reference-permit',
      Object.freeze({
        decisionId: 'policy:local-reference-permit',
        authorized: true,
        state: 'active' as const,
        tenantId: LOCAL_TENANT,
        workspaceIds: Object.freeze([LOCAL_WORKSPACE]),
        projectIds: Object.freeze([LOCAL_PROJECT]),
        maximumClassification: 'internal' as const,
        allowedLabels: Object.freeze(['operations']),
        policyVersion: LOCAL_POLICY_VERSION,
      }),
    ],
  ]);
  const eventBus = new EventBus({
    registry,
    router: new DeterministicEventRouter(),
    visibility: new StaticVisibilityAuthorizer(visibilityDecisions),
    replay: new InMemoryReplayStore(),
    deadLetters: new InMemoryDeadLetterStore(),
    journal: new InMemoryDeliveryJournal(),
    diagnostics: new InMemoryEventBusDiagnostics(),
    telemetry: new InMemoryEventBusTelemetry(),
    replayAudit: new InMemoryReplayAudit(),
  });

  const eventTransport = new InProcessEventTransport((event) => eventBus.publish(event));
  const agentEvents = new EventBusAgentEvents((event) => eventBus.publish(createPlatformEvent(event)));

  const agentRegistry = new InMemoryAgentRegistry();
  const agentFramework = new AgentFramework(
    agentRegistry,
    new InMemoryAgentLifecycleStore(),
    new DeterministicAgentValidator(),
    runtimePort,
    agentEvents,
    new InMemoryAgentAudit(),
    new InMemoryAgentDiagnostics(),
  );

  const auditPlatform = new AuditPlatform({
    records: new InMemoryAuditRecordStore(),
    index: new InMemoryAuditIndex(),
    archive: new InMemoryAuditArchive(),
    evidence: new InMemoryAuditEvidenceStore(),
    integrity: new DeterministicHashChainIntegrityProvider(),
    retention: new DeterministicRetentionResolver(),
    holds: new InMemoryLegalHoldStore(),
    tombstones: new InMemoryAuditTombstones(),
    events: new InMemoryAuditEvents(),
    diagnostics: new InMemoryAuditDiagnostics(),
    telemetry: new InMemoryAuditTelemetry(),
  });

  const memoryBundle = buildLocalReferenceMemory({
    config,
    persistence,
    capabilityResolver,
  });
  const memory = memoryBundle.keyword;

  const evaluation = buildLocalReferenceEvaluation({
    config,
    persistence,
    eventBus,
    metrics,
    capabilityResolver,
    aiFramework,
  });

  const healthService = new HealthService(
    createHealthContributors({
      compositionReady: () => ready,
      security: securityPlatform,
      runtime,
      agentRegistry,
      eventBus,
      audit: auditPlatform,
      referenceAgentEnabled: config.referenceAgentEnabled,
      ...(config.memoryProvider === 'persistent' ? { memory } : {}),
      ...(config.vectorSearchEnabled && memoryBundle.vectorHealth !== undefined
        ? {
            vectorStore: Object.freeze({
              health: memoryBundle.vectorHealth,
            }),
          }
        : {}),
      ...(evaluation === undefined
        ? {}
        : {
            evaluation: Object.freeze({
              health: async () => {
                if (
                  config.evaluationResultStore === 'persistent' &&
                  persistence instanceof PostgresPersistenceProvider
                ) {
                  try {
                    await persistence.assertReady();
                  } catch {
                    return Object.freeze({
                      name: 'evaluation',
                      status: 'unhealthy' as const,
                      details: Object.freeze({
                        resultStore: config.evaluationResultStore,
                        evaluators: String(evaluation.evaluatorCount),
                      }),
                    });
                  }
                }
                return Object.freeze({
                  name: 'evaluation',
                  status: 'healthy' as const,
                  details: Object.freeze({
                    resultStore: config.evaluationResultStore,
                    evaluators: String(evaluation.evaluatorCount),
                  }),
                });
              },
            }),
          }),
    }),
  );
  const readinessService = new ReadinessService(healthService);

  async function seed(): Promise<void> {
    // Readiness stays false until persistence (when required) and optional boot recovery finish.
    if (persistence instanceof PostgresPersistenceProvider) {
      try {
        await persistence.assertReady();
      } catch (error) {
        if (
          config.runtimeRecoveryEnabled ||
          config.memoryProvider === 'persistent' ||
          (config.evaluationEnabled && config.evaluationResultStore === 'persistent') ||
          (config.vectorSearchEnabled && config.vectorStoreProvider === 'pgvector')
        ) {
          const message = error instanceof Error ? error.message : 'persistence unavailable';
          const reason =
            config.memoryProvider === 'persistent'
              ? 'Persistent Memory selected but PostgreSQL is unavailable'
              : config.vectorSearchEnabled && config.vectorStoreProvider === 'pgvector'
                ? 'Vector search (pgvector) selected but PostgreSQL is unavailable'
              : config.evaluationEnabled && config.evaluationResultStore === 'persistent'
                ? 'Persistent Evaluation result store selected but PostgreSQL is unavailable'
                : 'Durable runtime recovery enabled but PostgreSQL is unavailable';
          throw new Error(`${reason}: ${message}`);
        }
        throw error;
      }
    }

    if (config.memoryProvider === 'persistent') {
      const memoryHealth = await memory.health();
      if (memoryHealth.status !== 'healthy') {
        throw new Error('Persistent Memory selected but Memory storage is unavailable');
      }
    }

    if (config.vectorSearchEnabled) {
      if (config.vectorStoreProvider === 'pgvector') {
        if (memoryBundle.vectorHealth === undefined) {
          throw new Error('Vector search enabled but vector store health is unavailable');
        }
        const vectorHealth = await memoryBundle.vectorHealth();
        if (vectorHealth.status !== 'healthy') {
          throw new Error('Vector search enabled with pgvector but vector store is not ready');
        }
      }
      const indexHealth = await memoryBundle.indexProvider.health();
      if (indexHealth.status === 'unhealthy') {
        throw new Error('Vector search enabled but Memory index provider is unhealthy');
      }
    }

    if (
      config.evaluationEnabled &&
      config.evaluationResultStore === 'persistent' &&
      persistence instanceof PostgresPersistenceProvider
    ) {
      try {
        await persistence.assertReady();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'persistence unavailable';
        throw new Error(`Persistent Evaluation result store selected but PostgreSQL is unavailable: ${message}`);
      }
    }

    if (config.referenceAgentEnabled) {
      const definition = buildAgentDefinition(referenceAgentManifest(), ['local-validation-1']);
      const validation = agentFramework.validate(definition, referenceValidationCatalog());
      await agentFramework.register(definition, validation, seedAuthorization('register'), LOCAL_USER, new Date().toISOString());
      await agentFramework.transition(definition.agentId, definition.version, definition.scope, 'approved', seedAuthorization('lifecycle'), 'approved', new Date().toISOString());
      await agentFramework.transition(definition.agentId, definition.version, definition.scope, 'active', seedAuthorization('lifecycle'), 'activated', new Date().toISOString(), {
        approvalReference: 'approval:local',
        evaluationReference: 'evaluation:local',
        compatibilityReference: 'compatibility:local',
      });
    }

    if (config.runtimeRecoveryEnabled) {
      try {
        const recovery = await runtime.recoverIncomplete();
        await writeOperationalLog(logs, 'boot-recovery', 'runtime.recoverIncomplete completed', {
          examined: recovery.examined,
          resumed: recovery.resumed,
          failed: recovery.failed,
          deferred: recovery.deferred,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'boot recovery failed';
        await writeOperationalLog(logs, 'boot-recovery', 'runtime.recoverIncomplete failed', {
          error: message,
        });
        if (config.persistenceProvider === 'postgres') {
          // Durable recovery explicitly enabled: do not become ready.
          throw new Error(`Runtime recovery initialization failed: ${message}`);
        }
        throw error;
      }
    }

    ready = true;
  }

  async function invoke(
    objective: string,
    inputs: Readonly<Record<string, string>>,
    correlationId: string,
    authHeader: string | undefined,
  ): Promise<
    | { readonly ok: true; readonly status: 200; readonly body: InvokeSuccessResponse; readonly correlationId: string }
    | { readonly ok: false; readonly status: number; readonly body: InvokeErrorResponse; readonly correlationId: string }
  > {
    if (!ready) {
      return buildInvokeError(correlationId, 503, 'INTERNAL_ERROR', 'Host is not ready');
    }
    if (!config.referenceAgentEnabled) {
      return buildInvokeError(correlationId, 404, 'RESOURCE_NOT_FOUND', 'Reference agent is disabled');
    }

    const identity = parseLocalReferenceAuth(authHeader);
    if (identity === null) {
      return buildInvokeError(correlationId, 401, 'AUTHENTICATION_FAILED', 'Local reference authentication failed');
    }

    const at = new Date().toISOString();
    const evidence = localAuthenticationEvidence(identity, at);
    const principal = localPrincipal(evidence);
    const executionId = `execution:${crypto.randomUUID()}`;
    const authRequest = invokeAuthorizationRequest(principal, correlationId, executionId, at);
    const decision = await securityPlatform.authorize(authRequest);
    authorizationDecisions.set(decision.id, decision);
    const validity = securityPlatform.validity(decision);
    if (!decision.authorized || validity.state !== 'active') {
      return buildInvokeError(correlationId, 403, 'AUTHORIZATION_DENIED', 'Local reference authorization denied');
    }

    const securityContext = securityPlatform.createSecurityContext(authRequest, decision, '1');
    securityContexts.set(securityContext.id, securityContext);

    const authorization = agentAuthorizationFromDecision(decision, validity);
    const invocationId = `invocation:${correlationId}`;
    const request = Object.freeze({
      id: invocationId,
      agentId: 'reference-agent',
      version: '1.0.0',
      objective,
      initiatingPrincipalId: LOCAL_USER,
      agentPrincipalId: LOCAL_AGENT_PRINCIPAL,
      scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
      inputs,
      constraints: Object.freeze({}),
      delegationReferences: Object.freeze([]),
      securityContextReference: securityContext.id,
      authorization,
      correlationId,
      causationId: null,
      requestedAt: at,
      versionPolicyVersion: LOCAL_POLICY_VERSION,
    });

    try {
      const acceptance = await agentFramework.invoke(request);
      const stored = runtimePort.getResult(acceptance.runtimeExecutionReference);
      if (stored === undefined) {
        return buildInvokeError(correlationId, 500, 'INTERNAL_ERROR', 'Runtime result unavailable');
      }
      await ingestAgentAudit(auditPlatform, request, decision.id, acceptance.runtimeExecutionReference);
      const logFields = {
        executionReference: acceptance.runtimeExecutionReference,
        adapterId: stored.runtime.output.bindings[0]?.implementationId ?? '',
      };
      await writeOperationalLog(logs, correlationId, 'reference-agent invocation completed', logFields);
      await writeOperationalLog(consoleLogs, correlationId, 'reference-agent invocation completed', logFields);
      await eventTransport.publish(
        createPlatformEvent({
          eventId: `invoke:${correlationId}`,
          type: 'local-reference.invocation.completed',
          contractVersion: '1',
          occurredAt: new Date().toISOString(),
          producer: 'platform-host',
          correlationId,
          scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
          security: Object.freeze({
            classification: 'internal',
            labels: Object.freeze(['operations']),
            authorizationReference: decision.id,
          }),
          payload: Object.freeze({ agentId: 'reference-agent', executionReference: acceptance.runtimeExecutionReference }),
          retention: Object.freeze({ category: 'operational', policyVersion: LOCAL_POLICY_VERSION }),
          chainDepth: 0,
        }),
      );
      return Object.freeze({
        ok: true as const,
        status: 200,
        correlationId,
        body: mapInvokeResponse(acceptance, stored, correlationId),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invocation failed';
      const status = message.includes('not active') ? 409 : 500;
      const code = status === 409 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR';
      return buildInvokeError(correlationId, status, code, message);
    }
  }

  async function beginStreamInvoke(
    objective: string,
    inputs: Readonly<Record<string, string>>,
    correlationId: string,
    authHeader: string | undefined,
  ): Promise<
    | {
        readonly ok: true;
        readonly executionReference: string;
        readonly correlationId: string;
        readonly stream: AsyncIterable<RuntimeStreamEvent<LocalCapabilityExecutionOutput>>;
        readonly cancel: () => void;
      }
    | { readonly ok: false; readonly status: number; readonly body: InvokeErrorResponse; readonly correlationId: string }
  > {
    if (!ready) {
      return buildInvokeError(correlationId, 503, 'INTERNAL_ERROR', 'Host is not ready');
    }
    if (!config.referenceAgentEnabled) {
      return buildInvokeError(correlationId, 404, 'RESOURCE_NOT_FOUND', 'Reference agent is disabled');
    }

    const identity = parseLocalReferenceAuth(authHeader);
    if (identity === null) {
      return buildInvokeError(correlationId, 401, 'AUTHENTICATION_FAILED', 'Local reference authentication failed');
    }

    const at = new Date().toISOString();
    const evidence = localAuthenticationEvidence(identity, at);
    const principal = localPrincipal(evidence);
    const executionId = `execution:${crypto.randomUUID()}`;
    const authRequest = invokeAuthorizationRequest(principal, correlationId, executionId, at);
    const decision = await securityPlatform.authorize(authRequest);
    authorizationDecisions.set(decision.id, decision);
    const validity = securityPlatform.validity(decision);
    if (!decision.authorized || validity.state !== 'active') {
      return buildInvokeError(correlationId, 403, 'AUTHORIZATION_DENIED', 'Local reference authorization denied');
    }

    const securityContext = securityPlatform.createSecurityContext(authRequest, decision, '1');
    securityContexts.set(securityContext.id, securityContext);

    const authorization = agentAuthorizationFromDecision(decision, validity);
    const invocationId = `invocation:${correlationId}`;
    const request = Object.freeze({
      id: invocationId,
      agentId: 'reference-agent',
      version: '1.0.0',
      objective,
      initiatingPrincipalId: LOCAL_USER,
      agentPrincipalId: LOCAL_AGENT_PRINCIPAL,
      scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
      inputs,
      constraints: Object.freeze({}),
      delegationReferences: Object.freeze([]),
      securityContextReference: securityContext.id,
      authorization,
      correlationId,
      causationId: null,
      requestedAt: at,
      versionPolicyVersion: LOCAL_POLICY_VERSION,
    });

    try {
      const acceptance = await agentFramework.invokeStream(request);
      const stream = runtimePort.getStream(acceptance.runtimeExecutionReference);
      if (stream === undefined) {
        return buildInvokeError(correlationId, 500, 'INTERNAL_ERROR', 'Runtime stream unavailable');
      }
      await ingestAgentAudit(auditPlatform, request, decision.id, acceptance.runtimeExecutionReference);
      const controller = runtimePort.getCancelController(acceptance.runtimeExecutionReference);
      return Object.freeze({
        ok: true as const,
        executionReference: acceptance.runtimeExecutionReference,
        correlationId,
        stream,
        cancel: (): void => {
          controller?.abort();
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invocation failed';
      const status = message.includes('not active') ? 409 : 500;
      const code = status === 409 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR';
      return buildInvokeError(correlationId, status, code, message);
    }
  }

  async function dispose(): Promise<void> {
    ready = false;
    runtimePort.clear();
    securityContexts.clear();
    await memoryBundle.dispose();
    if (persistence instanceof PostgresPersistenceProvider) {
      await persistence.close();
    }
    await compositionRoot.dispose();
  }

  return Object.freeze({
    config,
    healthService,
    readinessService,
    securityPlatform,
    eventBus,
    auditPlatform,
    agentFramework,
    agentRegistry,
    runtimePort,
    runtime,
    logs,
    metrics,
    traces,
    persistence,
    memory,
    memoryEngine: memoryBundle.engine,
    evaluation,
    agentFacts: agentEvents.facts,
    securityContexts,
    startedAt,
    seed,
    invoke,
    beginStreamInvoke,
    dispose,
  });
}

function selectedAiImplementationId(aiProvider: AiProviderSelection): string {
  return aiProvider === 'openai' ? OPENAI_AI_ID : REFERENCE_AI_ID;
}

export { validateInvokeRequest };
