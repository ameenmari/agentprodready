import type { AgentManifest, ValidationCatalog } from '../index.js';
import { freeze } from '../index.js';
import {
  EMBEDDED_PROJECT,
  EMBEDDED_TENANT,
  EMBEDDED_WORKSPACE,
} from './embedded-security.js';

export function buildEmbeddedManifest(params: {
  readonly agentId: string;
  readonly agentPrincipalId: string;
  readonly name: string;
  readonly description: string;
  readonly purpose: string;
}): AgentManifest {
  const createdAt = new Date().toISOString();
  return freeze({
    manifestId: `manifest:${params.agentId}:1.0.0`,
    schemaVersion: '1',
    agentId: params.agentId,
    version: '1.0.0',
    name: params.name,
    description: params.description,
    purpose: params.purpose,
    type: 'conversational',
    principalReference: params.agentPrincipalId,
    scope: Object.freeze({
      tenantId: EMBEDDED_TENANT,
      workspaceId: EMBEDDED_WORKSPACE,
      projectId: EMBEDDED_PROJECT,
    }),
    capabilities: Object.freeze([
      Object.freeze({
        capability: 'text-generation',
        contractVersion: '1',
        requirement: 'required' as const,
      }),
    ]),
    tools: Object.freeze([]),
    knowledge: Object.freeze([]),
    memory: Object.freeze([]),
    planning: Object.freeze({
      enabled: true,
      strategies: Object.freeze(['single-step']),
      policyReference: 'planning-policy:embedded',
    }),
    workflows: Object.freeze(['simple-workflow']),
    contextPolicyReferences: Object.freeze(['context-policy:embedded']),
    promptPolicyReferences: Object.freeze(['prompt-policy:embedded']),
    evaluationPolicyReferences: Object.freeze(['evaluation-policy:embedded']),
    securityPermissionDeclarations: Object.freeze(['invoke']),
    delegationRequirementReferences: Object.freeze([]),
    constraints: Object.freeze({
      maximumDurationMs: 30_000,
      maximumCost: 1,
      maximumToolInvocations: 0,
      maximumPlanningDepth: 1,
      maximumWorkflowIterations: 1,
      prohibitedOperations: Object.freeze([]),
      requiredApprovals: Object.freeze([]),
      dataResidencies: Object.freeze(['local']),
    }),
    configuration: Object.freeze({}),
    policyReferences: Object.freeze(['agent-policy:embedded']),
    pluginDependencies: Object.freeze([]),
    compatibility: Object.freeze({
      platformRange: '^1.0.0',
      contractVersions: Object.freeze({ runtime: '1' }),
    }),
    governance: Object.freeze({
      owner: 'embedded-createAgent',
      reviewStatus: 'approved' as const,
      classification: 'internal' as const,
      policyVersion: 'embedded-1',
    }),
    publisherReference: 'publisher:embedded-createAgent',
    sourceConfigurationVersions: Object.freeze(['config:embedded:1']),
    createdAt,
    createdBy: 'createAgent',
    parentAgentReferences: Object.freeze([]),
    appliedOverrides: Object.freeze([]),
  });
}

export function embeddedValidationCatalog(): ValidationCatalog {
  return Object.freeze({
    capabilities: new Map<string, readonly string[]>([['text-generation', Object.freeze(['1'])]]),
    plugins: new Map<string, string>(),
    workflows: new Set<string>(['simple-workflow']),
    policies: new Set<string>([
      'planning-policy:embedded',
      'context-policy:embedded',
      'prompt-policy:embedded',
      'evaluation-policy:embedded',
      'agent-policy:embedded',
    ]),
    packages: new Set<string>(),
    platformVersion: '1.0.0',
  });
}
