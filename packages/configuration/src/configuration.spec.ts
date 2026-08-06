import { describe, expect, it } from 'vitest';
import {
  buildConfigurationDefinition,
  buildPolicyDefinition,
  ConfigurationFramework,
  DeterministicConfigurationValidator,
  DeterministicPolicyValidator,
  InMemoryConfigurationAudit,
  InMemoryConfigurationDiagnostics,
  InMemoryConfigurationEvents,
  InMemoryConfigurationStore,
  InMemoryPolicyStore,
  type ConfigurationAuthorization,
  type ConfigurationDefinition,
  type ConfigurationScope,
  type PolicyDefinition,
  type ResolutionContext,
} from './index.js';

const at = '2026-08-06T00:00:00.000Z',
  context: ResolutionContext = {
    tenantId: 'tenant-1',
    workspaceId: 'workspace-1',
    projectId: 'project-1',
    agentId: 'agent-1',
    invocationId: 'invocation-1',
    platformVersion: '1.2.0',
    consumerContractVersions: { runtime: '1.0.0' },
    executionReference: 'execution-1',
    correlationId: 'correlation-1',
  };
function authorization(
  operation: ConfigurationAuthorization['operation'],
  overrides: Partial<ConfigurationAuthorization> = {},
): ConfigurationAuthorization {
  return {
    decisionId: `decision:${operation}`,
    principalId: 'admin-1',
    operation,
    authorized: true,
    state: 'active',
    tenantId: 'tenant-1',
    workspaceIds: ['workspace-1'],
    policyVersion: '1',
    ...overrides,
  };
}
function definition(
  id = 'platform-config',
  scope: ConfigurationScope = { level: 'platform' },
  values: ConfigurationDefinition['values'] = { timeout: 100, retries: 2 },
  version = '1.0.0',
  overrideAllowed = true,
): ConfigurationDefinition {
  return buildConfigurationDefinition({
    id,
    version,
    namespace: 'runtime',
    scope,
    values,
    constraints: Object.keys(values).map((key) => ({
      key,
      type:
        typeof values[key] === 'number'
          ? ('number' as const)
          : typeof values[key] === 'object' && values[key] !== null && 'kind' in values[key]
            ? ('secret-reference' as const)
            : ('string' as const),
      required: true,
      overrideAllowed,
      minimum: 0,
      maximum: 1000,
    })),
    compatibility: { platformRange: '^1.0.0', consumerContractRanges: { runtime: '^1.0.0' } },
    metadata: { source: 'normalized' },
    governance: {
      owner: 'platform',
      policyVersion: '1',
      classification: 'internal',
      deprecated: false,
    },
    createdAt: at,
    createdBy: 'admin-1',
  });
}
function policy(
  id = 'runtime-policy',
  scope: ConfigurationScope = { level: 'platform' },
  version = '1.0.0',
  type: PolicyDefinition['type'] = 'runtime',
): PolicyDefinition {
  return buildPolicyDefinition({
    id,
    version,
    type,
    scope,
    clauses: [
      {
        id: 'limit-cost',
        priority: 10,
        conditions: [{ attribute: 'environment', operator: 'equals', value: 'production' }],
        effect: 'limit',
        values: { maximumCost: 10 },
        obligations: ['record-usage'],
        reason: 'Bound production cost',
      },
    ],
    compatibility: { platformRange: '^1.0.0', consumerContractRanges: {} },
    governance: {
      owner: 'platform',
      policyVersion: '1',
      classification: 'internal',
      deprecated: false,
    },
    createdAt: at,
    createdBy: 'admin-1',
  });
}
interface Fixture {
  readonly framework: ConfigurationFramework;
  readonly configurations: InMemoryConfigurationStore;
  readonly policies: InMemoryPolicyStore;
  readonly events: InMemoryConfigurationEvents;
  readonly audit: InMemoryConfigurationAudit;
  readonly diagnostics: InMemoryConfigurationDiagnostics;
}
function fixture(): Fixture {
  const configurations = new InMemoryConfigurationStore(),
    policies = new InMemoryPolicyStore(),
    events = new InMemoryConfigurationEvents(),
    audit = new InMemoryConfigurationAudit(),
    diagnostics = new InMemoryConfigurationDiagnostics();
  return {
    framework: new ConfigurationFramework(
      configurations,
      policies,
      new DeterministicConfigurationValidator(),
      new DeterministicPolicyValidator(),
      events,
      audit,
      diagnostics,
    ),
    configurations,
    policies,
    events,
    audit,
    diagnostics,
  };
}

describe('immutable definitions and explicit validation', () => {
  it('builds deeply immutable normalized configurations without Runtime state', () => {
    const value = definition();
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.values)).toBe(true);
    expect(value.immutable).toBe(true);
    expect(JSON.stringify(value)).not.toMatch(/executionContext|retryState|currentWorkflowNode/);
  });
  it('allows opaque secret references but rejects raw secret-like content', () => {
    const reference = {
        kind: 'secret-reference' as const,
        id: 'secret:db',
        providerReference: 'secret-provider',
        version: '1',
        purpose: 'database',
        authorizationReference: 'decision:secret',
      },
      value = definition(
        'secret-config',
        { level: 'tenant', tenantId: 'tenant-1' },
        { databaseCredential: reference },
      );
    expect(value.values.databaseCredential).toEqual(reference);
    expect(() => definition('bad', { level: 'platform' }, { password: 'raw-value' })).toThrowError(
      /Forbidden/,
    );
  });
  it('validates configuration type, range, required, reference, and unknown values explicitly', () => {
    const validator = new DeterministicConfigurationValidator(),
      invalid = { ...definition(), values: { timeout: 5000, extra: true } };
    const result = validator.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(['RANGE', 'REQUIRED', 'UNKNOWN']),
    );
  });
  it('keeps policies immutable, declarative, and unable to authorize or execute', () => {
    const value = policy();
    expect(value).toMatchObject({
      declarative: true,
      executable: false,
      authorizationDecision: false,
      runtimeAction: false,
      immutable: true,
    });
    expect(Object.isFrozen(value.clauses[0])).toBe(true);
  });
  it('rejects policy clause conflicts and Security authorization effects', () => {
    const validator = new DeterministicPolicyValidator(),
      [baseClause] = policy().clauses;
    if (baseClause === undefined) throw new Error('Policy fixture requires a clause');
    const security = {
      ...policy('security-policy', { level: 'platform' }, '1.0.0', 'security'),
      clauses: [{ ...baseClause, effect: 'allow' as const }],
    };
    expect(validator.validate(security)).toMatchObject({ valid: false });
    const duplicate = { ...policy(), clauses: [baseClause, baseClause] };
    expect(validator.validate(duplicate).findings[0]?.code).toBe('DUPLICATE_CLAUSE');
  });
});

describe('centralized deterministic resolution and version history', () => {
  it('resolves platform-to-invocation hierarchy with explainable precedence', async () => {
    const value = fixture(),
      definitions = [
        definition(),
        definition('tenant-config', { level: 'tenant', tenantId: 'tenant-1' }, { timeout: 80 }),
        definition(
          'workspace-config',
          { level: 'workspace', tenantId: 'tenant-1', workspaceId: 'workspace-1' },
          { timeout: 60 },
        ),
        definition(
          'invocation-config',
          {
            level: 'invocation',
            tenantId: 'tenant-1',
            workspaceId: 'workspace-1',
            invocationId: 'invocation-1',
          },
          { timeout: 40 },
        ),
      ];
    for (const item of definitions)
      await value.framework.createConfiguration(item, authorization('create-configuration'), 'c');
    const effective = await value.framework.resolveConfiguration(
      {
        id: 'resolve',
        namespace: 'runtime',
        context,
        authorization: authorization('resolve-configuration'),
        pinnedVersions: {},
      },
      at,
    );
    expect(effective.values).toMatchObject({ timeout: 40, retries: 2 });
    expect(effective.provenance.timeout).toMatchObject({
      definitionId: 'invocation-config',
      overriddenDefinitionIds: ['platform-config', 'tenant-config', 'workspace-config'],
    });
    expect(effective).toMatchObject({
      immutableForExecution: true,
      providerIndependent: true,
      executionReference: 'execution-1',
    });
  });
  it('rejects higher-scope overrides of locked values', async () => {
    const value = fixture();
    await value.framework.createConfiguration(
      definition('platform-locked', { level: 'platform' }, { timeout: 100 }, '1.0.0', false),
      authorization('create-configuration'),
      'c',
    );
    await value.framework.createConfiguration(
      definition('tenant-config', { level: 'tenant', tenantId: 'tenant-1' }, { timeout: 50 }),
      authorization('create-configuration'),
      'c',
    );
    await expect(
      value.framework.resolveConfiguration(
        {
          id: 'conflict',
          namespace: 'runtime',
          context,
          authorization: authorization('resolve-configuration'),
          pinnedVersions: {},
        },
        at,
      ),
    ).rejects.toMatchObject({ code: 'SCOPE_CONFLICT' });
  });
  it('preserves immutable versions and resolves latest compatible or explicit pinned version', async () => {
    const value = fixture();
    for (const item of [
      definition('platform-config', { level: 'platform' }, { timeout: 100 }, '1.0.0'),
      definition('platform-config', { level: 'platform' }, { timeout: 90 }, '1.1.0'),
    ])
      await value.framework.createConfiguration(item, authorization('create-configuration'), 'c');
    const latest = await value.framework.resolveConfiguration(
        {
          id: 'latest',
          namespace: 'runtime',
          context,
          authorization: authorization('resolve-configuration'),
          pinnedVersions: {},
        },
        at,
      ),
      pinned = await value.framework.resolveConfiguration(
        {
          id: 'pinned',
          namespace: 'runtime',
          context,
          authorization: authorization('resolve-configuration'),
          pinnedVersions: { 'platform-config': '1.0.0' },
        },
        at,
      );
    expect(latest.appliedDefinitions[0]?.version).toBe('1.1.0');
    expect(pinned.values.timeout).toBe(100);
    expect(value.configurations.versions('platform-config')).toHaveLength(2);
  });
  it('fails explicitly for missing pinned or incompatible versions', async () => {
    const value = fixture();
    await value.framework.createConfiguration(
      definition(),
      authorization('create-configuration'),
      'c',
    );
    await expect(
      value.framework.resolveConfiguration(
        {
          id: 'missing',
          namespace: 'runtime',
          context,
          authorization: authorization('resolve-configuration'),
          pinnedVersions: { 'platform-config': '9.0.0' },
        },
        at,
      ),
    ).rejects.toMatchObject({ code: 'VERSION_NOT_FOUND' });
  });
  it('resolves declarative policies deterministically by scope and priority', async () => {
    const value = fixture();
    const [baseClause] = policy().clauses;
    if (baseClause === undefined) throw new Error('Policy fixture requires a clause');
    await value.framework.createPolicy(policy(), authorization('create-policy'), 'c');
    await value.framework.createPolicy(
      {
        ...policy('tenant-policy', { level: 'tenant', tenantId: 'tenant-1' }),
        clauses: [{ ...baseClause, id: 'tenant-limit', priority: 20 }],
      },
      authorization('create-policy'),
      'c',
    );
    const result = await value.framework.resolvePolicy(
      {
        id: 'policies',
        types: ['runtime'],
        context,
        authorization: authorization('resolve-policy'),
        pinnedVersions: {},
      },
      at,
    );
    expect(result.clauses.map((item) => item.clause.id)).toEqual(['tenant-limit', 'limit-cost']);
    expect(result).toMatchObject({
      declarative: true,
      executable: false,
      authorizationDecision: false,
      runtimeAction: false,
    });
  });
});

describe('authorization, providers, events, audit, and ownership boundaries', () => {
  it('enforces supplied Security authority and tenant/workspace scope', async () => {
    const value = fixture();
    await expect(
      value.framework.createConfiguration(
        definition('tenant', { level: 'tenant', tenantId: 'tenant-1' }),
        authorization('create-configuration', { authorized: false }),
        'c',
      ),
    ).rejects.toMatchObject({ code: 'CONFIGURATION_UNAUTHORIZED' });
    await expect(
      value.framework.createConfiguration(
        definition('workspace', { level: 'workspace', tenantId: 'tenant-1', workspaceId: 'other' }),
        authorization('create-configuration'),
        'c',
      ),
    ).rejects.toMatchObject({ code: 'CONFIGURATION_SCOPE_VIOLATION' });
  });
  it('supports replaceable stores without changing resolution semantics', async () => {
    const first = fixture(),
      second = fixture();
    for (const value of [first, second]) {
      await value.framework.createConfiguration(
        definition(),
        authorization('create-configuration'),
        'c',
      );
      const result = await value.framework.resolveConfiguration(
        {
          id: 'resolve',
          namespace: 'runtime',
          context,
          authorization: authorization('resolve-configuration'),
          pinnedVersions: {},
        },
        at,
      );
      expect(result.values.timeout).toBe(100);
    }
  });
  it('publishes configuration/policy/effective events and accountable audit references', async () => {
    const value = fixture();
    await value.framework.createConfiguration(
      definition(),
      authorization('create-configuration'),
      'c',
    );
    await value.framework.createPolicy(policy(), authorization('create-policy'), 'c');
    await value.framework.resolveConfiguration(
      {
        id: 'resolve',
        namespace: 'runtime',
        context,
        authorization: authorization('resolve-configuration'),
        pinnedVersions: {},
      },
      at,
    );
    expect(value.events.values.map((item) => item.type)).toEqual([
      'configuration.created',
      'policy.created',
      'effective-configuration.generated',
    ]);
    expect(value.audit.values).toHaveLength(3);
    expect(value.diagnostics.list()).not.toHaveLength(0);
  });
  it('contains no environment, file, provider selection, execution, or workflow behavior', () => {
    const value = definition();
    expect(value).not.toHaveProperty('execute');
    expect(value).not.toHaveProperty('providerSelection');
    expect(JSON.stringify(value)).not.toMatch(/process\.env|filesystem|workflowState/);
  });
});
