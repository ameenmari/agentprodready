import { AgentFramework, buildAgentDefinition, DeterministicAgentValidator, InMemoryAgentAudit, InMemoryAgentDiagnostics, InMemoryAgentLifecycleStore, InMemoryAgentRegistry } from '@agentforge/agent-framework';
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
} from '@agentforge/audit';
import { AiProviderFramework, FactoryAiAdapterResolver, InMemoryAiDiagnostics, InMemoryAiEvents, NoopAiTelemetry, ReferenceAiProviderAdapter } from '@agentforge/ai-provider';
import { OPENAI_AI_ID, OpenAiProviderAdapter } from '@agentforge/ai-provider-openai';
import { CapabilityResolver, InMemoryResolutionDiagnostics, InMemoryResolutionEvents, NoopResolutionTelemetry } from '@agentforge/capability-resolution';
import { CompositionRoot } from '@agentforge/composition';
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
} from '@agentforge/event-bus';
import { HealthService, ReadinessService } from '@agentforge/foundation';
import { InMemoryMemoryProvider } from '@agentforge/memory';
import {
  ConsoleLoggingProvider,
  InMemoryLoggingProvider,
  InMemoryMetricsProvider,
  InMemoryTracingProvider,
} from '@agentforge/observability';
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
} from '@agentforge/planning';
import { InMemoryPersistenceProvider, type PersistenceProvider } from '@agentforge/persistence';
import { PostgresPersistenceProvider } from '@agentforge/persistence-postgres';
import {
  InMemoryExecutionSnapshotPort,
  InMemoryRuntimeEventPublisher,
  RuntimeOrchestrator,
  StaticRuntimePolicyProvider,
} from '@agentforge/runtime';
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
} from '@agentforge/security';
import type { AuthorizationDecision, SecurityContext } from '@agentforge/security';
import type { EventVisibilityDecision } from '@agentforge/event-bus';
import { InMemoryWorkflowFacts, InMemoryWorkflowSnapshots, NoopWorkflowTelemetry, RuntimeWorkflowAdapter, WorkflowEngine } from '@agentforge/workflow';

import type { LocalReferenceConfig } from '../config/local-reference-config.js';
import { LOCAL_AGENT_PRINCIPAL, LOCAL_POLICY_VERSION, LOCAL_PROJECT, LOCAL_TENANT, LOCAL_USER, LOCAL_WORKSPACE, REFERENCE_AI_ID } from '../config/local-reference-config.js';
import type { AiProviderSelection } from '../config/local-reference-config.js';
import { referenceAgentManifest, referenceValidationCatalog } from '../seed/reference-agent.seed.js';
import {
  DeterministicResolutionPolicy,
  referenceResolutionConfiguration,
  seedReferenceCapabilities,
} from '../seed/reference-capabilities.seed.js';
import { LocalReferenceCapabilityExecution } from './local-reference-capability-execution.js';
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
import { ReferenceAgentTaskDecomposer } from './reference-task-decomposer.js';
import { ReferenceWorkflowCatalog } from './reference-workflow-catalog.js';

export async function buildLocalReferenceComposition(config: LocalReferenceConfig): Promise<LocalReferenceComposition> {
  const startedAt = Date.now();
  let ready = false;
  const securityContexts = new Map<string, SecurityContext>();

  const compositionRoot = new CompositionRoot();
  compositionRoot.build();

  const selectedImplementationId = selectedAiImplementationId(config.aiProvider);
  const { capabilities, providers } = seedReferenceCapabilities();
  const resolutionDiagnostics = new InMemoryResolutionDiagnostics();
  const resolutionEvents = new InMemoryResolutionEvents();
  const capabilityResolver = new CapabilityResolver(
    capabilities,
    providers,
    new DeterministicResolutionPolicy(),
    referenceResolutionConfiguration(selectedImplementationId),
    resolutionDiagnostics,
    resolutionEvents,
    new NoopResolutionTelemetry(),
  );

  const aiResolver = new FactoryAiAdapterResolver();
  aiResolver.bind(REFERENCE_AI_ID, async () => new ReferenceAiProviderAdapter());
  if (config.aiProvider === 'openai') {
    if (config.openAi === undefined) {
      throw new Error('OpenAI configuration is required when AI_PROVIDER=openai');
    }
    const openAiConfig = config.openAi;
    aiResolver.bind(OPENAI_AI_ID, async () => new OpenAiProviderAdapter(openAiConfig));
  }
  const aiFramework = new AiProviderFramework(aiResolver, new InMemoryAiDiagnostics(), new InMemoryAiEvents(), new NoopAiTelemetry());

  const capabilityExecution = new LocalReferenceCapabilityExecution(capabilityResolver, aiFramework);

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

  const runtime = new RuntimeOrchestrator({
    scopes: compositionRoot,
    policies: new StaticRuntimePolicyProvider({
      timeoutMs: 30_000,
      maxAttempts: 1,
      maxConcurrency: 4,
      isRetryable: (): boolean => false,
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
    },
    snapshots: new InMemoryExecutionSnapshotPort(),
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

  const logs = new InMemoryLoggingProvider();
  const consoleLogs = new ConsoleLoggingProvider((line) => {
    process.stderr.write(`${line}\n`);
  });
  const metrics = new InMemoryMetricsProvider();
  const traces = new InMemoryTracingProvider();
  const persistence: PersistenceProvider =
    config.persistenceProvider === 'postgres'
      ? new PostgresPersistenceProvider(
          config.postgres ??
            ((): never => {
              throw new Error('postgres config missing for PERSISTENCE_PROVIDER=postgres');
            })(),
        )
      : new InMemoryPersistenceProvider();
  const memory = new InMemoryMemoryProvider();
  const healthService = new HealthService(
    createHealthContributors({
      compositionReady: () => ready,
      security: securityPlatform,
      runtime,
      agentRegistry,
      eventBus,
      audit: auditPlatform,
      referenceAgentEnabled: config.referenceAgentEnabled,
    }),
  );
  const readinessService = new ReadinessService(healthService);

  async function seed(): Promise<void> {
    if (persistence instanceof PostgresPersistenceProvider) {
      await persistence.assertReady();
    }
    if (!config.referenceAgentEnabled) {
      ready = true;
      return;
    }
    const definition = buildAgentDefinition(referenceAgentManifest(), ['local-validation-1']);
    const validation = agentFramework.validate(definition, referenceValidationCatalog());
    await agentFramework.register(definition, validation, seedAuthorization('register'), LOCAL_USER, new Date().toISOString());
    await agentFramework.transition(definition.agentId, definition.version, definition.scope, 'approved', seedAuthorization('lifecycle'), 'approved', new Date().toISOString());
    await agentFramework.transition(definition.agentId, definition.version, definition.scope, 'active', seedAuthorization('lifecycle'), 'activated', new Date().toISOString(), {
      approvalReference: 'approval:local',
      evaluationReference: 'evaluation:local',
      compatibilityReference: 'compatibility:local',
    });
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

  async function dispose(): Promise<void> {
    ready = false;
    runtimePort.clear();
    securityContexts.clear();
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
    agentFacts: agentEvents.facts,
    securityContexts,
    startedAt,
    seed,
    invoke,
    dispose,
  });
}

function selectedAiImplementationId(aiProvider: AiProviderSelection): string {
  return aiProvider === 'openai' ? OPENAI_AI_ID : REFERENCE_AI_ID;
}

export { validateInvokeRequest };
