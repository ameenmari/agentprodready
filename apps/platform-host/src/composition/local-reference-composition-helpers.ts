import type { AgentAuthorizationOutcome, AgentEvents, AgentFact, AgentFramework, AgentInvocationAcceptance, AgentInvocationRequest, InMemoryAgentRegistry } from '@agentforge/agent-framework';
import type { AuditIngestionRequest, AuditPlatform } from '@agentforge/audit';
import type { HealthContributor, HealthService, ReadinessService } from '@agentforge/foundation';
import type { CreatePlatformEvent, EventBus } from '@agentforge/event-bus';
import type { MemoryEngine, MemorySearchProvider, MemoryStorageProvider } from '@agentforge/memory';
import type {
  InMemoryLoggingProvider,
  InMemoryMetricsProvider,
  InMemoryTracingProvider,
  LoggingProvider,
  OperationalLog,
} from '@agentforge/observability';
import type { PersistenceProvider } from '@agentforge/persistence';
import type { RuntimeOrchestrator } from '@agentforge/runtime';
import type { SecurityContext, SecurityPlatform } from '@agentforge/security';
import type { LocalReferenceConfig } from '../config/local-reference-config.js';
import type { LocalReferenceRuntimePort, StoredExecutionResult } from './local-reference-runtime-port.js';
import type { LocalReferenceEvaluationBundle } from './evaluation/build-local-reference-evaluation.js';
import {
  LOCAL_AGENT_PRINCIPAL,
  LOCAL_POLICY_VERSION,
  LOCAL_PROJECT,
  LOCAL_TENANT,
  LOCAL_USER,
  LOCAL_WORKSPACE,
  PRODUCT_VERSION,
  REFERENCE_AGENT_ID,
} from '../config/local-reference-config.js';
import {
  invokeAuthorizationRequest,
  localAuthenticationEvidence,
  localPrincipal,
  parseLocalReferenceAuth,
} from './local-reference-security.js';

export interface InvokeSuccessResponse {
  readonly status: 'success';
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly agent: Readonly<{ agentId: string; version: string; invocationId: string }>;
  readonly execution: Readonly<{ executionReference: string; state: 'completed'; attempts: number }>;
  readonly result: Readonly<{ kind: 'normalized-ai'; text: string; finishReason: string; diagnosticId: string }>;
  readonly evidence: Readonly<{
    planId: string;
    workflowId: string;
    capabilityBindingId: string;
    adapterId: string;
  }>;
  readonly diagnosticsReference: string;
}

export interface InvokeErrorResponse {
  readonly status: 'failed';
  readonly correlationId: string;
  readonly errors: readonly Readonly<{ code: string; message: string; retryable: boolean; details: Readonly<Record<string, never>> }>[];
  readonly diagnosticsReference: string;
}

export interface LocalReferenceComposition {
  readonly config: LocalReferenceConfig;
  readonly healthService: HealthService;
  readonly readinessService: ReadinessService;
  readonly securityPlatform: SecurityPlatform;
  readonly eventBus: EventBus;
  readonly auditPlatform: AuditPlatform;
  readonly agentFramework: AgentFramework;
  readonly agentRegistry: InMemoryAgentRegistry;
  readonly runtimePort: LocalReferenceRuntimePort;
  readonly runtime: RuntimeOrchestrator;
  readonly logs: InMemoryLoggingProvider;
  readonly metrics: InMemoryMetricsProvider;
  readonly traces: InMemoryTracingProvider;
  readonly persistence: PersistenceProvider;
  readonly memory: MemoryStorageProvider & MemorySearchProvider;
  readonly memoryEngine: MemoryEngine;
  readonly evaluation: LocalReferenceEvaluationBundle | undefined;
  readonly agentFacts: readonly AgentFact[];
  readonly securityContexts: Map<string, SecurityContext>;
  readonly startedAt: number;
  seed(): Promise<void>;
  invoke(objective: string, inputs: Readonly<Record<string, string>>, correlationId: string, authHeader: string | undefined): Promise<
    | { readonly ok: true; readonly status: 200; readonly body: InvokeSuccessResponse; readonly correlationId: string }
    | { readonly ok: false; readonly status: number; readonly body: InvokeErrorResponse; readonly correlationId: string }
  >;
  dispose(): Promise<void>;
}

export function createHealthContributors(deps: {
  readonly compositionReady: () => boolean;
  readonly security: SecurityPlatform;
  readonly runtime: RuntimeOrchestrator;
  readonly agentRegistry: InMemoryAgentRegistry;
  readonly eventBus: EventBus;
  readonly audit: AuditPlatform;
  readonly referenceAgentEnabled: boolean;
  readonly memory?: MemoryStorageProvider;
  readonly vectorStore?: HealthContributor;
  readonly evaluation?: HealthContributor;
}): readonly HealthContributor[] {
  const contributors: HealthContributor[] = [
    Object.freeze({
      health: async () =>
        Object.freeze({
          name: 'composition',
          status: deps.compositionReady() ? ('healthy' as const) : ('unhealthy' as const),
        }),
    }),
    Object.freeze({
      health: async () => {
        await deps.security.health();
        return Object.freeze({ name: 'security', status: 'healthy' as const });
      },
    }),
    Object.freeze({
      health: async () => {
        const result = await deps.runtime.health();
        return Object.freeze({ name: 'runtime', status: result.status });
      },
    }),
    Object.freeze({
      health: async () => {
        const definition = deps.agentRegistry.definition(REFERENCE_AGENT_ID, '1.0.0', {
          tenantId: LOCAL_TENANT,
          workspaceId: LOCAL_WORKSPACE,
          projectId: LOCAL_PROJECT,
        });
        return Object.freeze({
          name: 'agent-registry',
          status: definition === undefined ? ('unhealthy' as const) : ('healthy' as const),
        });
      },
    }),
    Object.freeze({
      health: async () => {
        const result = await deps.eventBus.health();
        return Object.freeze({ name: 'event-bus', status: result.status === 'healthy' ? ('healthy' as const) : ('degraded' as const) });
      },
    }),
    Object.freeze({
      health: async () => {
        const result = await deps.audit.health();
        return Object.freeze({ name: 'audit', status: result.status === 'healthy' ? ('healthy' as const) : ('degraded' as const) });
      },
    }),
    Object.freeze({
      health: async () => {
        if (!deps.referenceAgentEnabled) {
          return Object.freeze({ name: 'reference-agent', status: 'unhealthy' as const });
        }
        const registration = deps.agentRegistry.registration(REFERENCE_AGENT_ID, '1.0.0', {
          tenantId: LOCAL_TENANT,
          workspaceId: LOCAL_WORKSPACE,
          projectId: LOCAL_PROJECT,
        });
        return Object.freeze({
          name: 'reference-agent',
          status: registration === undefined ? ('unhealthy' as const) : ('healthy' as const),
        });
      },
    }),
  ];
  if (deps.memory !== undefined) {
    const memory = deps.memory;
    contributors.push(
      Object.freeze({
        health: async () => {
          const result = await memory.health();
          return Object.freeze({
            name: 'memory',
            status: result.status === 'healthy' ? ('healthy' as const) : ('unhealthy' as const),
            ...(result.details === undefined ? {} : { details: result.details }),
          });
        },
      }),
    );
  }
  if (deps.vectorStore !== undefined) {
    const vectorStore = deps.vectorStore;
    contributors.push(
      Object.freeze({
        health: async () => {
          const result = await vectorStore.health();
          return Object.freeze({
            name: 'vector-store',
            status: result.status,
            ...(result.details === undefined ? {} : { details: result.details }),
          });
        },
      }),
    );
  }
  if (deps.evaluation !== undefined) {
    contributors.push(deps.evaluation);
  }
  return Object.freeze(contributors);
}

export function mapInvokeResponse(
  acceptance: AgentInvocationAcceptance,
  stored: StoredExecutionResult,
  correlationId: string,
): InvokeSuccessResponse {
  const output = stored.runtime.output;
  const text = output.aiResult.content.find((part) => part.type === 'text')?.text ?? '';
  return Object.freeze({
    status: 'success',
    correlationId,
    causationId: stored.invocation.causationId,
    agent: Object.freeze({
      agentId: acceptance.agentId,
      version: acceptance.agentVersion,
      invocationId: acceptance.invocationId,
    }),
    execution: Object.freeze({
      executionReference: acceptance.runtimeExecutionReference,
      state: 'completed',
      attempts: stored.runtime.attempts,
    }),
    result: Object.freeze({
      kind: 'normalized-ai',
      text,
      finishReason: output.aiResult.finishReason,
      diagnosticId: output.aiResult.diagnosticId,
    }),
    evidence: Object.freeze({
      planId: output.planId,
      workflowId: output.workflowId,
      capabilityBindingId: output.bindings[0]?.bindingId ?? '',
      adapterId: output.bindings[0]?.implementationId ?? '',
    }),
    diagnosticsReference: `local-reference:invoke:${correlationId}`,
  });
}

export function agentAuthorizationFromDecision(
  decision: Awaited<ReturnType<SecurityPlatform['authorize']>>,
  validity: ReturnType<SecurityPlatform['validity']>,
): AgentAuthorizationOutcome {
  return Object.freeze({
    decisionId: decision.id,
    authorized: decision.authorized,
    state: validity.state,
    operation: 'invoke',
    principalId: LOCAL_USER,
    agentPrincipalId: LOCAL_AGENT_PRINCIPAL,
    scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
    allowedCapabilities: Object.freeze(['text-generation']),
    allowedTools: Object.freeze([]),
    allowedKnowledgeScopes: Object.freeze([]),
    allowedMemoryScopes: Object.freeze([]),
    restrictions: Object.freeze([...decision.restrictions]),
    obligations: Object.freeze([...decision.obligations]),
    policyVersion: LOCAL_POLICY_VERSION,
  });
}

export function seedAuthorization(operation: 'register' | 'lifecycle'): AgentAuthorizationOutcome {
  return Object.freeze({
    decisionId: `seed:${operation}`,
    authorized: true,
    state: 'active',
    operation,
    principalId: LOCAL_USER,
    scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
    allowedCapabilities: Object.freeze(['text-generation']),
    allowedTools: Object.freeze([]),
    allowedKnowledgeScopes: Object.freeze([]),
    allowedMemoryScopes: Object.freeze([]),
    restrictions: Object.freeze([]),
    obligations: Object.freeze([]),
    policyVersion: LOCAL_POLICY_VERSION,
  });
}

export async function writeOperationalLog(
  logs: LoggingProvider,
  correlationId: string,
  message: string,
  attributes: Readonly<Record<string, string | number | boolean>> = {},
): Promise<void> {
  const entry: OperationalLog = Object.freeze({
    id: `log:${correlationId}:${message}`,
    timestamp: new Date().toISOString(),
    severity: 'info',
    component: 'platform-host',
    message,
    correlation: Object.freeze({
      correlationId,
      causationId: null,
      tenantId: LOCAL_TENANT,
      workspaceId: LOCAL_WORKSPACE,
    }),
    classification: 'internal',
    attributes: Object.freeze({ service: 'agentforge-local-reference', version: PRODUCT_VERSION, ...attributes }),
    operationalOnly: true,
    systemOfRecord: false,
    auditRecord: false,
  });
  await logs.write(entry);
}

export class EventBusAgentEvents implements AgentEvents {
  public readonly facts: AgentFact[] = [];

  public constructor(private readonly publishPlatformEvent: (event: CreatePlatformEvent<AgentFact>) => Promise<unknown>) {}

  public async publish(value: AgentFact): Promise<void> {
    this.facts.push(value);
    await this.publishPlatformEvent(
      Object.freeze({
        eventId: `agent-fact:${value.operationId}`,
        type: value.type,
        contractVersion: '1',
        schemaVersion: '1',
        occurredAt: new Date().toISOString(),
        producer: 'agent-framework',
        correlationId: value.correlationId,
        causationId: null,
        scope: Object.freeze({ tenantId: value.tenantId, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
        security: Object.freeze({
          classification: 'internal' as const,
          labels: Object.freeze(['operations']),
          authorizationReference: 'policy:local-reference-permit',
        }),
        payload: Object.freeze({ ...value }),
        source: Object.freeze({ agentId: value.agentId, version: value.version }),
        provenance: Object.freeze(['agent-framework']),
        retention: Object.freeze({ category: 'operational' as const, policyVersion: 'local-1' }),
        chainDepth: value.chainDepth,
      }),
    );
  }
}

export async function ingestAgentAudit(
  audit: AuditPlatform,
  request: AgentInvocationRequest,
  decisionId: string,
  executionReference: string,
): Promise<void> {
  const ingestion: AuditIngestionRequest = Object.freeze({
    requestId: `audit:${request.id}`,
    source: Object.freeze({
      sourceType: 'agent-framework',
      sourceId: request.id,
      sourceSchemaVersion: '1',
      producer: 'agent-framework',
      derivationKey: request.id,
      derivationPolicyVersion: LOCAL_POLICY_VERSION,
    }),
    truthStatus: 'observed',
    occurredAt: request.requestedAt,
    principalId: request.initiatingPrincipalId,
    effectivePrincipalId: request.initiatingPrincipalId,
    action: 'invoke',
    resource: Object.freeze({ id: `agent:${request.agentId}`, type: 'agent', version: request.version ?? '1.0.0' }),
    outcome: 'succeeded',
    scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
    authorizationDecisionId: decisionId,
    policyReferences: Object.freeze([LOCAL_POLICY_VERSION]),
    evidenceReferences: Object.freeze([executionReference]),
    categories: Object.freeze(['agent' as const, 'operational' as const]),
    classification: 'internal',
    retentionRequirements: Object.freeze([
      Object.freeze({
        policyId: 'retention:local-reference',
        category: 'operational' as const,
        minimumDays: 1,
        mandatory: false,
        archivalEligible: false,
        deletionRestrictions: Object.freeze([]),
        policyVersion: LOCAL_POLICY_VERSION,
      }),
    ]),
    attributes: Object.freeze({ objective: request.objective.slice(0, 256) }),
    executionReference,
    correlationId: request.correlationId,
    causationId: request.causationId,
    siblingSourceIds: Object.freeze([]),
    schemaVersion: '1',
    ingestionPolicyVersion: LOCAL_POLICY_VERSION,
  });
  await audit.ingest(ingestion);
}

export function buildInvokeError(
  correlationId: string,
  status: number,
  code: string,
  message: string,
): { readonly ok: false; readonly status: number; readonly body: InvokeErrorResponse; readonly correlationId: string } {
  return Object.freeze({
    ok: false,
    status,
    correlationId,
    body: Object.freeze({
      status: 'failed',
      correlationId,
      errors: Object.freeze([
        Object.freeze({ code, message, retryable: false, details: Object.freeze({}) }),
      ]),
      diagnosticsReference: `local-reference:error:${correlationId}`,
    }),
  });
}

export function validateInvokeRequest(body: unknown):
  | { readonly ok: true; readonly objective: string; readonly inputs: Readonly<Record<string, string>> }
  | { readonly ok: false; readonly message: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, message: 'Request body must be JSON object' };
  const record = body as Record<string, unknown>;
  const objective = record['objective'];
  if (typeof objective !== 'string' || objective.trim() === '' || objective.length > 4096) {
    return { ok: false, message: 'Objective must be a non-empty string up to 4096 characters' };
  }
  let inputs: Readonly<Record<string, string>> = Object.freeze({});
  if (record['inputs'] !== undefined) {
    if (typeof record['inputs'] !== 'object' || record['inputs'] === null || Array.isArray(record['inputs'])) {
      return { ok: false, message: 'Inputs must be a string map' };
    }
    const entries = Object.entries(record['inputs'] as Record<string, unknown>);
    if (entries.length > 16) return { ok: false, message: 'Inputs may contain at most 16 keys' };
    if (entries.some(([, value]) => typeof value !== 'string')) {
      return { ok: false, message: 'Input values must be strings' };
    }
    inputs = Object.freeze(Object.fromEntries(entries) as Record<string, string>);
  }
  return Object.freeze({ ok: true, objective, inputs });
}

export { parseLocalReferenceAuth, localAuthenticationEvidence, localPrincipal, invokeAuthorizationRequest };
