import type { AgentManifest, ValidationCatalog } from '@agentforge/agent-framework';
import { freeze } from '@agentforge/agent-framework';
import {
  LOCAL_AGENT_PRINCIPAL,
  LOCAL_PROJECT,
  LOCAL_TENANT,
  LOCAL_WORKSPACE,
  REFERENCE_AGENT_ID,
  REFERENCE_AGENT_VERSION,
} from '../config/local-reference-config.js';

export function referenceAgentManifest(): AgentManifest {
  return freeze({
    manifestId: 'manifest:reference-agent:1.0.0',
    schemaVersion: '1',
    agentId: REFERENCE_AGENT_ID,
    version: REFERENCE_AGENT_VERSION,
    name: 'Reference Agent',
    description: 'Deterministic local reference agent',
    purpose: 'Echo objectives through the full AgentForge execution chain',
    type: 'task',
    principalReference: LOCAL_AGENT_PRINCIPAL,
    scope: Object.freeze({
      tenantId: LOCAL_TENANT,
      workspaceId: LOCAL_WORKSPACE,
      projectId: LOCAL_PROJECT,
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
      policyReference: 'planning-policy:local',
    }),
    workflows: Object.freeze(['reference-workflow']),
    contextPolicyReferences: Object.freeze(['context-policy:local']),
    promptPolicyReferences: Object.freeze(['prompt-policy:local']),
    evaluationPolicyReferences: Object.freeze(['evaluation-policy:local']),
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
    policyReferences: Object.freeze(['agent-policy:local']),
    pluginDependencies: Object.freeze([]),
    compatibility: Object.freeze({
      platformRange: '^1.0.0',
      contractVersions: Object.freeze({ runtime: '1' }),
    }),
    governance: Object.freeze({
      owner: 'agentforge-local',
      reviewStatus: 'approved' as const,
      classification: 'internal' as const,
      policyVersion: 'local-1',
    }),
    publisherReference: 'publisher:agentforge-local',
    sourceConfigurationVersions: Object.freeze(['config:local:1']),
    createdAt: '2026-08-07T00:00:00.000Z',
    createdBy: 'local-seed',
    parentAgentReferences: Object.freeze([]),
    appliedOverrides: Object.freeze([]),
  });
}

export function referenceValidationCatalog(): ValidationCatalog {
  return Object.freeze({
    capabilities: new Map<string, readonly string[]>([['text-generation', Object.freeze(['1'])]]),
    plugins: new Map<string, string>(),
    workflows: new Set<string>(['reference-workflow']),
    policies: new Set<string>([
      'planning-policy:local',
      'context-policy:local',
      'prompt-policy:local',
      'evaluation-policy:local',
      'agent-policy:local',
    ]),
    packages: new Set<string>(),
    platformVersion: '1.0.0',
  });
}
