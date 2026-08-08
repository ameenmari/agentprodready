import type { AgentAuthorizationOutcome, AgentScope } from '../index.js';
import { freeze } from '../index.js';
import {
  BasicSecurityPolicyEvaluator,
  ExplicitDenyConflictResolver,
  InMemoryAuthorizationDecisionCache,
  InMemoryDelegationStore,
  InMemoryRevocationStore,
  InMemorySecurityAudit,
  InMemorySecurityDiagnostics,
  InMemorySecurityEvents,
  NoopSecurityTelemetry,
  SecurityPlatform,
  StaticPolicyResolver,
  type AuthorizationDecision,
  type AuthorityState,
  type Principal,
  type SecurityContext,
  type SecurityPolicy,
} from '@agentprodready/security';

export const EMBEDDED_TENANT = 'tenant-embedded';
export const EMBEDDED_WORKSPACE = 'workspace-embedded';
export const EMBEDDED_PROJECT = 'project-embedded';
export const EMBEDDED_USER = 'principal:embedded-app';
export const EMBEDDED_POLICY_VERSION = 'embedded-1';

export class EmbeddedSecurity {
  readonly contexts = new Map<string, SecurityContext>();
  readonly decisions = new Map<string, AuthorizationDecision>();
  readonly platform: SecurityPlatform;

  public constructor() {
    this.platform = new SecurityPlatform(
      new StaticPolicyResolver(embeddedSecurityPolicies()),
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
  }

  /** Application-local synthetic outcome for register / lifecycle (not HTTP auth). */
  public lifecycleAuthorization(
    operation: 'register' | 'lifecycle',
    scope: AgentScope,
    agentPrincipalId: string,
  ): AgentAuthorizationOutcome {
    return freeze({
      decisionId: `decision:embedded:${operation}:${crypto.randomUUID()}`,
      authorized: true,
      state: 'active',
      operation,
      principalId: EMBEDDED_USER,
      agentPrincipalId,
      scope: freeze({ ...scope }),
      allowedCapabilities: Object.freeze(['text-generation']),
      allowedTools: Object.freeze([]),
      allowedKnowledgeScopes: Object.freeze([]),
      allowedMemoryScopes: Object.freeze([]),
      restrictions: Object.freeze(['application-local']),
      obligations: Object.freeze(['audit']),
      policyVersion: EMBEDDED_POLICY_VERSION,
    });
  }

  public async authorizeInvoke(params: {
    readonly scope: AgentScope;
    readonly agentId: string;
    readonly agentPrincipalId: string;
    readonly correlationId: string;
  }): Promise<{
    readonly authorization: AgentAuthorizationOutcome;
    readonly securityContextReference: string;
  }> {
    const at = new Date().toISOString();
    const principal = embeddedPrincipal(at);
    const request = freeze({
      requestId: `authz:${crypto.randomUUID()}`,
      requestVersion: '1',
      principal,
      action: 'invoke' as const,
      resource: freeze({
        id: params.agentId,
        type: 'agent' as const,
        tenantId: params.scope.tenantId,
        workspaceId: params.scope.workspaceId ?? EMBEDDED_WORKSPACE,
        projectId: params.scope.projectId ?? EMBEDDED_PROJECT,
        classification: 'internal' as const,
        securityLabels: Object.freeze(['operations']),
        ownerPrincipalId: params.agentPrincipalId,
        version: '1',
        metadata: Object.freeze({}),
      }),
      scope: freeze({
        tenantId: params.scope.tenantId,
        workspaceId: params.scope.workspaceId ?? EMBEDDED_WORKSPACE,
        projectId: params.scope.projectId ?? EMBEDDED_PROJECT,
      }),
      execution: freeze({
        executionId: `pre-invoke:${crypto.randomUUID()}`,
        correlationId: params.correlationId,
      }),
      delegationIds: Object.freeze([]),
      capabilityRequirements: Object.freeze(['text-generation']),
      toolPermissions: Object.freeze([]),
      pluginPermissions: Object.freeze([]),
      environmental: freeze({ network: 'local' }),
      policyContext: freeze({
        activePolicySet: 'embedded-simple',
        configurationVersion: 'config:embedded:1',
      }),
      occurredAt: at,
    });

    const decision = await this.platform.authorize(request);
    if (!decision.authorized) {
      throw new Error('Embedded Security denied invoke');
    }
    this.decisions.set(decision.id, decision);
    const context = this.platform.createSecurityContext(request, decision, '1');
    this.contexts.set(context.id, context);

    const authorization = freeze({
      decisionId: decision.id,
      authorized: true,
      state: 'active' as const,
      operation: 'invoke' as const,
      principalId: EMBEDDED_USER,
      agentPrincipalId: params.agentPrincipalId,
      scope: freeze({ ...params.scope }),
      allowedCapabilities: Object.freeze(['text-generation']),
      allowedTools: Object.freeze([]),
      allowedKnowledgeScopes: Object.freeze([]),
      allowedMemoryScopes: Object.freeze([]),
      restrictions: Object.freeze(['application-local']),
      obligations: Object.freeze(['audit']),
      policyVersion: EMBEDDED_POLICY_VERSION,
    });

    return Object.freeze({
      authorization,
      securityContextReference: context.id,
    });
  }

  public validityFor(decisionId: string): AuthorityState {
    const decision = this.decisions.get(decisionId);
    if (decision === undefined) return 'revoked';
    return this.platform.validity(decision).state;
  }
}

function embeddedPrincipal(at: string): Principal {
  return freeze({
    id: EMBEDDED_USER,
    type: 'human',
    identitySource: 'issuer:embedded-createAgent',
    tenantId: EMBEDDED_TENANT,
    workspaceIds: Object.freeze([EMBEDDED_WORKSPACE]),
    projectIds: Object.freeze([EMBEDDED_PROJECT]),
    roles: Object.freeze(['embedded-developer']),
    claims: freeze({
      tenantId: EMBEDDED_TENANT,
      workspaceId: EMBEDDED_WORKSPACE,
      projectId: EMBEDDED_PROJECT,
      permissions: Object.freeze(['invoke']),
      principalType: 'human',
    }),
    permissions: Object.freeze(['invoke']),
    securityLabels: Object.freeze(['operations']),
    authenticationStrength: 'single-factor',
    sessionReference: `session:embedded:${at}`,
    evidenceId: `evidence:embedded:${at}`,
    modelVersion: '1',
  });
}

function embeddedSecurityPolicies(): readonly SecurityPolicy[] {
  return Object.freeze([
    Object.freeze({
      id: 'policy:embedded-simple-permit',
      version: EMBEDDED_POLICY_VERSION,
      schemaVersion: '1',
      source: 'platform' as const,
      priority: 1,
      mandatory: true,
      active: true,
      effect: 'permit' as const,
      principalTypes: Object.freeze(['human' as const]),
      requiredRoles: Object.freeze([]),
      actions: Object.freeze([
        'invoke' as const,
        'install' as const,
        'activate' as const,
        'read' as const,
        'execute' as const,
      ]),
      resourceTypes: Object.freeze([
        'agent' as const,
        'capability' as const,
        'api-operation' as const,
        'tool' as const,
      ]),
      tenantIds: Object.freeze([EMBEDDED_TENANT]),
      workspaceIds: Object.freeze([EMBEDDED_WORKSPACE]),
      projectIds: Object.freeze([EMBEDDED_PROJECT]),
      requiredLabels: Object.freeze([]),
      conditions: Object.freeze([]),
      restrictions: Object.freeze([]),
      obligations: Object.freeze([]),
      metadata: Object.freeze({ profile: 'embedded-simple-v1.1', applicationLocal: 'true' }),
    }),
  ]);
}
