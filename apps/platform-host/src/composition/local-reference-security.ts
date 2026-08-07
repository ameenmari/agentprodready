import type { AuthenticationEvidence, AuthorizationRequest, Principal, SecurityPolicy } from '@agentforge/security';
import {
  LOCAL_POLICY_VERSION,
  LOCAL_PROJECT,
  LOCAL_TENANT,
  LOCAL_USER,
  LOCAL_WORKSPACE,
  REFERENCE_AGENT_ID,
} from '../config/local-reference-config.js';

export interface LocalReferenceIdentity {
  readonly principalId: string;
  readonly tenantId: string;
}

export function parseLocalReferenceAuth(header: string | undefined): LocalReferenceIdentity | null {
  if (header === undefined || !header.startsWith('LocalReference ')) return null;
  const entries = header
    .slice('LocalReference '.length)
    .split(';')
    .map((part) => part.trim().split('='))
    .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined);
  const map = Object.fromEntries(entries);
  if (map['principalId'] !== LOCAL_USER || map['tenantId'] !== LOCAL_TENANT) return null;
  return { principalId: LOCAL_USER, tenantId: LOCAL_TENANT };
}

export function localReferenceSecurityPolicies(): readonly SecurityPolicy[] {
  return Object.freeze([
    Object.freeze({
      id: 'policy:local-reference-permit',
      version: LOCAL_POLICY_VERSION,
      schemaVersion: '1',
      source: 'platform' as const,
      priority: 1,
      mandatory: true,
      active: true,
      effect: 'permit' as const,
      principalTypes: Object.freeze(['human' as const]),
      requiredRoles: Object.freeze([]),
      actions: Object.freeze(['invoke' as const, 'install' as const, 'activate' as const, 'read' as const]),
      resourceTypes: Object.freeze(['agent' as const, 'capability' as const, 'api-operation' as const]),
      tenantIds: Object.freeze([LOCAL_TENANT]),
      workspaceIds: Object.freeze([LOCAL_WORKSPACE]),
      projectIds: Object.freeze([LOCAL_PROJECT]),
      requiredLabels: Object.freeze([]),
      conditions: Object.freeze([]),
      restrictions: Object.freeze([]),
      obligations: Object.freeze([]),
      metadata: Object.freeze({ referenceOnly: 'true', profile: 'local-reference-v0.1' }),
    }),
  ]);
}

export function localAuthenticationEvidence(identity: LocalReferenceIdentity, at: string): AuthenticationEvidence {
  return Object.freeze({
    evidenceId: `evidence:${identity.principalId}`,
    subject: identity.principalId,
    issuerReference: 'issuer:local-reference',
    method: 'local-reference-header',
    strength: 'single-factor' as const,
    authenticatedAt: at,
    expiresAt: new Date(Date.parse(at) + 3_600_000).toISOString(),
    sessionReference: `session:${identity.principalId}`,
    claims: Object.freeze({
      tenantId: identity.tenantId,
      workspaceId: LOCAL_WORKSPACE,
      projectId: LOCAL_PROJECT,
      permissions: Object.freeze(['invoke']),
      principalType: 'human',
    }),
    version: '1',
  });
}

export function localPrincipal(evidence: AuthenticationEvidence): Principal {
  return Object.freeze({
    id: LOCAL_USER,
    type: 'human' as const,
    identitySource: evidence.issuerReference,
    tenantId: LOCAL_TENANT,
    workspaceIds: Object.freeze([LOCAL_WORKSPACE]),
    projectIds: Object.freeze([LOCAL_PROJECT]),
    roles: Object.freeze(['local-developer']),
    claims: evidence.claims,
    permissions: Object.freeze(['invoke']),
    securityLabels: Object.freeze(['operations']),
    authenticationStrength: 'single-factor' as const,
    sessionReference: evidence.sessionReference,
    evidenceId: evidence.evidenceId,
    modelVersion: '1',
    agentAuthority: Object.freeze({
      initiatingPrincipalId: LOCAL_USER,
      allowedCapabilities: Object.freeze(['text-generation']),
      allowedTools: Object.freeze([]),
      executionRestrictions: Object.freeze([]),
      delegationIds: Object.freeze([]),
    }),
  });
}

export function invokeAuthorizationRequest(
  principal: Principal,
  correlationId: string,
  executionId: string,
  at: string,
): AuthorizationRequest {
  return Object.freeze({
    requestId: `auth:${correlationId}`,
    requestVersion: '1',
    principal,
    action: 'invoke',
    resource: Object.freeze({
      id: `agent:${REFERENCE_AGENT_ID}`,
      type: 'agent' as const,
      tenantId: LOCAL_TENANT,
      workspaceId: LOCAL_WORKSPACE,
      projectId: LOCAL_PROJECT,
      classification: 'internal' as const,
      securityLabels: Object.freeze(['operations']),
      version: '1',
      metadata: Object.freeze({ referenceOnly: 'true' }),
    }),
    scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
    execution: Object.freeze({ executionId, correlationId }),
    delegationIds: Object.freeze([]),
    capabilityRequirements: Object.freeze(['text-generation']),
    toolPermissions: Object.freeze([]),
    pluginPermissions: Object.freeze([]),
    environmental: Object.freeze({ profile: 'local-reference-v0.1' }),
    policyContext: Object.freeze({ activePolicySet: 'local-reference', configurationVersion: LOCAL_POLICY_VERSION }),
    occurredAt: at,
  });
}
