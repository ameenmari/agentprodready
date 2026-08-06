export type ScopeLevel = 'platform' | 'tenant' | 'workspace' | 'project' | 'agent' | 'invocation';
export type ConfigurationScalar = string | number | boolean | null;
export interface SecretReference {
  readonly kind: 'secret-reference';
  readonly id: string;
  readonly providerReference: string;
  readonly version: string;
  readonly purpose: string;
  readonly authorizationReference: string;
}
export type ConfigurationValue =
  | ConfigurationScalar
  | SecretReference
  | readonly ConfigurationValue[]
  | Readonly<{ [key: string]: ConfigurationValue }>;
export interface ConfigurationScope {
  readonly level: ScopeLevel;
  readonly tenantId?: string;
  readonly workspaceId?: string;
  readonly projectId?: string;
  readonly agentId?: string;
  readonly invocationId?: string;
}
export interface ValueConstraint {
  readonly key: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'secret-reference';
  readonly required: boolean;
  readonly overrideAllowed: boolean;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly pattern?: string;
  readonly allowedValues?: readonly ConfigurationScalar[];
  readonly referenceRequired?: boolean;
}
export interface ConfigurationDefinition {
  readonly id: string;
  readonly version: string;
  readonly namespace: string;
  readonly scope: ConfigurationScope;
  readonly values: Readonly<Record<string, ConfigurationValue>>;
  readonly constraints: readonly ValueConstraint[];
  readonly compatibility: Readonly<{
    platformRange: string;
    consumerContractRanges: Readonly<Record<string, string>>;
  }>;
  readonly metadata: Readonly<Record<string, string>>;
  readonly governance: Readonly<{
    owner: string;
    policyVersion: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    deprecated: boolean;
  }>;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly immutable: true;
}
export interface PolicyCondition {
  readonly attribute: string;
  readonly operator: 'equals' | 'not-equals' | 'includes' | 'less-than' | 'greater-than' | 'exists';
  readonly value?: ConfigurationValue;
}
export interface PolicyClause {
  readonly id: string;
  readonly priority: number;
  readonly conditions: readonly PolicyCondition[];
  readonly effect: 'allow' | 'deny' | 'require' | 'limit' | 'select' | 'configure';
  readonly values: Readonly<Record<string, ConfigurationValue>>;
  readonly obligations: readonly string[];
  readonly reason: string;
}
export interface PolicyDefinition {
  readonly id: string;
  readonly version: string;
  readonly type:
    | 'security'
    | 'runtime'
    | 'agent'
    | 'workflow'
    | 'cost'
    | 'retry'
    | 'retention'
    | 'approval'
    | 'configuration'
    | 'custom';
  readonly scope: ConfigurationScope;
  readonly clauses: readonly PolicyClause[];
  readonly compatibility: Readonly<{
    platformRange: string;
    consumerContractRanges: Readonly<Record<string, string>>;
  }>;
  readonly governance: Readonly<{
    owner: string;
    policyVersion: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    deprecated: boolean;
  }>;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly declarative: true;
  readonly executable: false;
  readonly authorizationDecision: false;
  readonly runtimeAction: false;
  readonly immutable: true;
}
export interface ConfigurationAuthorization {
  readonly decisionId: string;
  readonly principalId: string;
  readonly operation:
    | 'create-configuration'
    | 'create-policy'
    | 'resolve-configuration'
    | 'resolve-policy'
    | 'deprecate';
  readonly authorized: boolean;
  readonly state: 'active' | 'expired' | 'revoked' | 'superseded';
  readonly tenantId: string;
  readonly workspaceIds: readonly string[];
  readonly policyVersion: string;
}
export interface ValidationFinding {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly blocking: boolean;
}
export interface ValidationResult {
  readonly id: string;
  readonly kind: 'configuration' | 'policy';
  readonly definitionId: string;
  readonly version: string;
  readonly valid: boolean;
  readonly findings: readonly ValidationFinding[];
  readonly validatorVersion: string;
  readonly diagnosticsReference: string;
}
export interface ResolutionContext {
  readonly tenantId: string;
  readonly workspaceId?: string;
  readonly projectId?: string;
  readonly agentId?: string;
  readonly invocationId?: string;
  readonly platformVersion: string;
  readonly consumerContractVersions: Readonly<Record<string, string>>;
  readonly executionReference?: string;
  readonly correlationId: string;
}
export interface ValueProvenance {
  readonly key: string;
  readonly definitionId: string;
  readonly version: string;
  readonly scope: ConfigurationScope;
  readonly overriddenDefinitionIds: readonly string[];
  readonly constraintReference: string;
}
export interface ConfigurationResolutionRequest {
  readonly id: string;
  readonly namespace: string;
  readonly context: ResolutionContext;
  readonly authorization: ConfigurationAuthorization;
  readonly pinnedVersions: Readonly<Record<string, string>>;
}
export interface EffectiveConfiguration {
  readonly id: string;
  readonly namespace: string;
  readonly values: Readonly<Record<string, ConfigurationValue>>;
  readonly provenance: Readonly<Record<string, ValueProvenance>>;
  readonly appliedDefinitions: readonly Readonly<{
    id: string;
    version: string;
    scope: ConfigurationScope;
  }>[];
  readonly compatibilityVersions: Readonly<{
    platform: string;
    consumers: Readonly<Record<string, string>>;
  }>;
  readonly generatedAt: string;
  readonly correlationId: string;
  readonly executionReference?: string;
  readonly immutableForExecution: true;
  readonly providerIndependent: true;
}
export interface PolicyResolutionRequest {
  readonly id: string;
  readonly types: readonly PolicyDefinition['type'][];
  readonly context: ResolutionContext;
  readonly authorization: ConfigurationAuthorization;
  readonly pinnedVersions: Readonly<Record<string, string>>;
}
export interface EffectivePolicy {
  readonly id: string;
  readonly clauses: readonly Readonly<{
    policyId: string;
    version: string;
    type: PolicyDefinition['type'];
    scope: ConfigurationScope;
    clause: PolicyClause;
  }>[];
  readonly appliedPolicies: readonly Readonly<{
    id: string;
    version: string;
    scope: ConfigurationScope;
  }>[];
  readonly generatedAt: string;
  readonly correlationId: string;
  readonly declarative: true;
  readonly executable: false;
  readonly authorizationDecision: false;
  readonly runtimeAction: false;
}
export interface ConfigurationStore {
  save(value: ConfigurationDefinition): void;
  get(id: string, version: string): ConfigurationDefinition | undefined;
  versions(id: string): readonly ConfigurationDefinition[];
  all(namespace: string): readonly ConfigurationDefinition[];
}
export interface PolicyStore {
  save(value: PolicyDefinition): void;
  get(id: string, version: string): PolicyDefinition | undefined;
  versions(id: string): readonly PolicyDefinition[];
  all(): readonly PolicyDefinition[];
}
export interface ConfigurationValidator {
  validate(value: ConfigurationDefinition): ValidationResult;
}
export interface PolicyValidator {
  validate(value: PolicyDefinition): ValidationResult;
}
export interface ConfigurationFact {
  readonly type:
    | 'configuration.created'
    | 'configuration.updated'
    | 'configuration.deprecated'
    | 'policy.created'
    | 'policy.updated'
    | 'effective-configuration.generated'
    | 'effective-policy.generated'
    | 'configuration.resolution-failed';
  readonly definitionId: string;
  readonly version: string;
  readonly operationId: string;
  readonly tenantId: string;
  readonly principalId: string;
  readonly correlationId: string;
  readonly outcome: 'completed' | 'failed';
  readonly diagnosticsReference: string;
}
export interface ConfigurationEvents {
  publish(value: ConfigurationFact): Promise<void>;
}
export interface ConfigurationAudit {
  record(
    value: Readonly<{
      type: string;
      definitionId: string;
      version: string;
      scope: ConfigurationScope;
      principalId: string;
      authorizationDecisionId: string;
      operationId: string;
      correlationId: string;
    }>,
  ): Promise<void>;
}
export interface ConfigurationDiagnostics {
  record(
    value: Readonly<{
      id: string;
      phase: string;
      outcome: 'completed' | 'failed';
      definitionIds: readonly string[];
      versions: readonly string[];
      policyVersions: readonly string[];
      errorCode?: ConfigurationErrorCode;
    }>,
  ): void;
  list(): readonly unknown[];
}
export type ConfigurationErrorCode =
  | 'CONFIGURATION_INVALID'
  | 'POLICY_INVALID'
  | 'RESOLUTION_FAILED'
  | 'SCOPE_CONFLICT'
  | 'COMPATIBILITY_FAILURE'
  | 'VERSION_NOT_FOUND'
  | 'CONSTRAINT_VIOLATION'
  | 'CONFIGURATION_UNAUTHORIZED'
  | 'CONFIGURATION_SCOPE_VIOLATION'
  | 'CONFIGURATION_DUPLICATE';
export class ConfigurationError extends Error {
  public constructor(
    public readonly code: ConfigurationErrorCode,
    message: string,
    public readonly diagnosticId: string,
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function buildConfigurationDefinition(
  value: Omit<ConfigurationDefinition, 'immutable'>,
): ConfigurationDefinition {
  validateDefinitionShape(value);
  return freeze({ ...copy(value), immutable: true });
}
export function buildPolicyDefinition(
  value: Omit<
    PolicyDefinition,
    'declarative' | 'executable' | 'authorizationDecision' | 'runtimeAction' | 'immutable'
  >,
): PolicyDefinition {
  if (
    blank(value.id) ||
    !semver(value.version) ||
    value.clauses.length === 0 ||
    value.clauses.some((clause) => blank(clause.id) || blank(clause.reason))
  )
    throw new ConfigurationError(
      'POLICY_INVALID',
      'Policy Definition is invalid',
      `configuration:policy:${value.id}`,
    );
  forbidden(value, `configuration:policy:${value.id}`);
  return freeze({
    ...copy(value),
    declarative: true,
    executable: false,
    authorizationDecision: false,
    runtimeAction: false,
    immutable: true,
  });
}
export class ConfigurationFramework {
  public constructor(
    private readonly configurations: ConfigurationStore,
    private readonly policies: PolicyStore,
    private readonly configurationValidator: ConfigurationValidator,
    private readonly policyValidator: PolicyValidator,
    private readonly events: ConfigurationEvents,
    private readonly audit: ConfigurationAudit,
    private readonly diagnostics: ConfigurationDiagnostics,
  ) {}
  public async createConfiguration(
    value: ConfigurationDefinition,
    authorization: ConfigurationAuthorization,
    correlationId: string,
  ): Promise<ValidationResult> {
    enforce(authorization, 'create-configuration', value.scope, `configuration:create:${value.id}`);
    const validation = this.configurationValidator.validate(value);
    if (!validation.valid)
      throw this.error('CONFIGURATION_INVALID', [value.id], [value.version], 'validation');
    const existing = this.configurations.get(value.id, value.version);
    if (existing !== undefined) return validation;
    const update = this.configurations.versions(value.id).length > 0;
    this.configurations.save(value);
    await this.fact(
      update ? 'configuration.updated' : 'configuration.created',
      value.id,
      value.version,
      value.scope,
      authorization,
      correlationId,
      value.id,
    );
    return validation;
  }
  public async createPolicy(
    value: PolicyDefinition,
    authorization: ConfigurationAuthorization,
    correlationId: string,
  ): Promise<ValidationResult> {
    enforce(authorization, 'create-policy', value.scope, `configuration:policy:${value.id}`);
    const validation = this.policyValidator.validate(value);
    if (!validation.valid)
      throw this.error('POLICY_INVALID', [value.id], [value.version], 'validation');
    if (this.policies.get(value.id, value.version) !== undefined) return validation;
    const update = this.policies.versions(value.id).length > 0;
    this.policies.save(value);
    await this.fact(
      update ? 'policy.updated' : 'policy.created',
      value.id,
      value.version,
      value.scope,
      authorization,
      correlationId,
      value.id,
    );
    return validation;
  }
  public async resolveConfiguration(
    request: ConfigurationResolutionRequest,
    at: string,
  ): Promise<EffectiveConfiguration> {
    enforce(
      request.authorization,
      'resolve-configuration',
      {
        level: 'tenant',
        tenantId: request.context.tenantId,
        ...optional('workspaceId', request.context.workspaceId),
      },
      `configuration:resolve:${request.id}`,
    );
    const candidates = this.configurations
      .all(request.namespace)
      .filter((value) => applies(value.scope, request.context))
      .map((value) =>
        this.selectConfiguration(value.id, request.pinnedVersions[value.id], request.context),
      )
      .filter(uniqueDefinition)
      .sort(
        (a, b) => scopeRank(a.scope.level) - scopeRank(b.scope.level) || a.id.localeCompare(b.id),
      );
    const values: Record<string, ConfigurationValue> = {},
      provenance: Record<string, ValueProvenance> = {},
      applied: EffectiveConfiguration['appliedDefinitions'][number][] = [];
    for (const definition of candidates) {
      const validation = this.configurationValidator.validate(definition);
      if (!validation.valid)
        throw this.error(
          'CONFIGURATION_INVALID',
          [definition.id],
          [definition.version],
          'resolution',
        );
      for (const [key, value] of Object.entries(definition.values)) {
        const constraint = definition.constraints.find((item) => item.key === key),
          previous = provenance[key];
        if (previous !== undefined) {
          const prior = this.configurations.get(previous.definitionId, previous.version),
            priorConstraint = prior?.constraints.find((item) => item.key === key);
          if (priorConstraint?.overrideAllowed !== true)
            throw this.error(
              'SCOPE_CONFLICT',
              [previous.definitionId, definition.id],
              [previous.version, definition.version],
              'conflict',
            );
        }
        values[key] = copy(value);
        provenance[key] = freeze({
          key,
          definitionId: definition.id,
          version: definition.version,
          scope: copy(definition.scope),
          overriddenDefinitionIds:
            previous === undefined
              ? []
              : [...previous.overriddenDefinitionIds, previous.definitionId],
          constraintReference: `${definition.id}:${constraint?.key ?? key}`,
        });
      }
      applied.push({
        id: definition.id,
        version: definition.version,
        scope: copy(definition.scope),
      });
    }
    const result = freeze({
      id: `effective-configuration:${request.id}`,
      namespace: request.namespace,
      values: freeze(values),
      provenance: freeze(provenance),
      appliedDefinitions: freeze(applied),
      compatibilityVersions: {
        platform: request.context.platformVersion,
        consumers: copy(request.context.consumerContractVersions),
      },
      generatedAt: at,
      correlationId: request.context.correlationId,
      ...optional('executionReference', request.context.executionReference),
      immutableForExecution: true as const,
      providerIndependent: true as const,
    });
    await this.fact(
      'effective-configuration.generated',
      result.id,
      '1',
      { level: 'invocation', tenantId: request.context.tenantId },
      request.authorization,
      request.context.correlationId,
      request.id,
    );
    return result;
  }
  public async resolvePolicy(
    request: PolicyResolutionRequest,
    at: string,
  ): Promise<EffectivePolicy> {
    enforce(
      request.authorization,
      'resolve-policy',
      {
        level: 'tenant',
        tenantId: request.context.tenantId,
        ...optional('workspaceId', request.context.workspaceId),
      },
      `configuration:policy-resolve:${request.id}`,
    );
    const selected = this.policies
      .all()
      .filter(
        (value) => request.types.includes(value.type) && applies(value.scope, request.context),
      )
      .map((value) =>
        this.selectPolicy(value.id, request.pinnedVersions[value.id], request.context),
      )
      .filter(uniquePolicy)
      .sort(
        (a, b) => scopeRank(a.scope.level) - scopeRank(b.scope.level) || a.id.localeCompare(b.id),
      );
    const clauses = selected
        .flatMap((policy) =>
          policy.clauses.map((clause) => ({
            policyId: policy.id,
            version: policy.version,
            type: policy.type,
            scope: copy(policy.scope),
            clause: copy(clause),
          })),
        )
        .sort(
          (a, b) =>
            b.clause.priority - a.clause.priority ||
            a.policyId.localeCompare(b.policyId) ||
            a.clause.id.localeCompare(b.clause.id),
        ),
      result = freeze({
        id: `effective-policy:${request.id}`,
        clauses,
        appliedPolicies: selected.map((value) => ({
          id: value.id,
          version: value.version,
          scope: copy(value.scope),
        })),
        generatedAt: at,
        correlationId: request.context.correlationId,
        declarative: true as const,
        executable: false as const,
        authorizationDecision: false as const,
        runtimeAction: false as const,
      });
    await this.fact(
      'effective-policy.generated',
      result.id,
      '1',
      { level: 'tenant', tenantId: request.context.tenantId },
      request.authorization,
      request.context.correlationId,
      request.id,
    );
    return result;
  }
  private selectConfiguration(
    id: string,
    pinned: string | undefined,
    context: ResolutionContext,
  ): ConfigurationDefinition {
    const values = this.configurations
      .versions(id)
      .filter((value) => compatible(value.compatibility, context));
    const selected =
      pinned === undefined
        ? values.sort((a, b) => compareVersions(b.version, a.version))[0]
        : values.find((value) => value.version === pinned);
    if (selected === undefined)
      throw this.error(
        pinned === undefined ? 'COMPATIBILITY_FAILURE' : 'VERSION_NOT_FOUND',
        [id],
        pinned === undefined ? [] : [pinned],
        'version',
      );
    return selected;
  }
  private selectPolicy(
    id: string,
    pinned: string | undefined,
    context: ResolutionContext,
  ): PolicyDefinition {
    const values = this.policies
      .versions(id)
      .filter((value) => compatible(value.compatibility, context));
    const selected =
      pinned === undefined
        ? values.sort((a, b) => compareVersions(b.version, a.version))[0]
        : values.find((value) => value.version === pinned);
    if (selected === undefined)
      throw this.error(
        pinned === undefined ? 'COMPATIBILITY_FAILURE' : 'VERSION_NOT_FOUND',
        [id],
        pinned === undefined ? [] : [pinned],
        'version',
      );
    return selected;
  }
  private error(
    code: ConfigurationErrorCode,
    ids: readonly string[],
    versions: readonly string[],
    phase: string,
  ): ConfigurationError {
    const id = `configuration:${phase}:${ids.join(',')}`;
    this.diagnostics.record({
      id,
      phase,
      outcome: 'failed',
      definitionIds: ids,
      versions,
      policyVersions: [],
      errorCode: code,
    });
    return new ConfigurationError(code, code.replaceAll('_', ' '), id);
  }
  private async fact(
    type: ConfigurationFact['type'],
    id: string,
    version: string,
    scope: ConfigurationScope,
    authorization: ConfigurationAuthorization,
    correlationId: string,
    operationId: string,
  ): Promise<void> {
    const diagnostic = `configuration:${operationId}`;
    await this.events.publish({
      type,
      definitionId: id,
      version,
      operationId,
      tenantId: authorization.tenantId,
      principalId: authorization.principalId,
      correlationId,
      outcome: 'completed',
      diagnosticsReference: diagnostic,
    });
    await this.audit.record({
      type,
      definitionId: id,
      version,
      scope: copy(scope),
      principalId: authorization.principalId,
      authorizationDecisionId: authorization.decisionId,
      operationId,
      correlationId,
    });
    this.diagnostics.record({
      id: diagnostic,
      phase: type,
      outcome: 'completed',
      definitionIds: [id],
      versions: [version],
      policyVersions: [authorization.policyVersion],
    });
  }
}

function validateDefinitionShape(value: Omit<ConfigurationDefinition, 'immutable'>): void {
  if (
    blank(value.id) ||
    blank(value.namespace) ||
    !semver(value.version) ||
    Object.keys(value.values).length === 0 ||
    value.constraints.some((item) => blank(item.key))
  )
    throw new ConfigurationError(
      'CONFIGURATION_INVALID',
      'Configuration Definition is invalid',
      `configuration:definition:${value.id}`,
    );
  forbidden(value, `configuration:definition:${value.id}`);
}
function forbidden(value: unknown, id: string): void {
  const serialized = JSON.stringify(value);
  if (
    /"(password|secretValue|accessToken|apiKey|privateKey|credential)"\s*:/i.test(serialized) ||
    /runtimeState|executionContext|currentWorkflowNode|retryState/i.test(serialized)
  )
    throw new ConfigurationError('CONFIGURATION_INVALID', 'Forbidden configuration content', id);
}
function enforce(
  value: ConfigurationAuthorization,
  operation: ConfigurationAuthorization['operation'],
  scope: ConfigurationScope,
  id: string,
): void {
  if (!value.authorized || value.state !== 'active' || value.operation !== operation)
    throw new ConfigurationError(
      'CONFIGURATION_UNAUTHORIZED',
      'Configuration operation is unauthorized',
      id,
    );
  if (
    (scope.tenantId !== undefined && value.tenantId !== scope.tenantId) ||
    (scope.workspaceId !== undefined && !value.workspaceIds.includes(scope.workspaceId))
  )
    throw new ConfigurationError(
      'CONFIGURATION_SCOPE_VIOLATION',
      'Configuration scope is unauthorized',
      id,
    );
}
function applies(scope: ConfigurationScope, context: ResolutionContext): boolean {
  return (
    (scope.tenantId === undefined || scope.tenantId === context.tenantId) &&
    (scope.workspaceId === undefined || scope.workspaceId === context.workspaceId) &&
    (scope.projectId === undefined || scope.projectId === context.projectId) &&
    (scope.agentId === undefined || scope.agentId === context.agentId) &&
    (scope.invocationId === undefined || scope.invocationId === context.invocationId)
  );
}
function compatible(
  value: ConfigurationDefinition['compatibility'],
  context: ResolutionContext,
): boolean {
  return (
    range(value.platformRange, context.platformVersion) &&
    Object.entries(value.consumerContractRanges).every(
      ([key, expected]) =>
        context.consumerContractVersions[key] !== undefined &&
        range(expected, context.consumerContractVersions[key]),
    )
  );
}
function range(expected: string, actual: string): boolean {
  return (
    expected === '*' ||
    expected === actual ||
    (expected.startsWith('^') && expected.slice(1).split('.')[0] === actual.split('.')[0])
  );
}
function scopeRank(value: ScopeLevel): number {
  return ['platform', 'tenant', 'workspace', 'project', 'agent', 'invocation'].indexOf(value);
}
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number),
    right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const result = (left[index] ?? 0) - (right[index] ?? 0);
    if (result !== 0) return result;
  }
  return 0;
}
function uniqueDefinition(
  value: ConfigurationDefinition,
  index: number,
  values: readonly ConfigurationDefinition[],
): boolean {
  return (
    values.findIndex((item) => item.id === value.id && item.scope.level === value.scope.level) ===
    index
  );
}
function uniquePolicy(
  value: PolicyDefinition,
  index: number,
  values: readonly PolicyDefinition[],
): boolean {
  return (
    values.findIndex((item) => item.id === value.id && item.scope.level === value.scope.level) ===
    index
  );
}
function semver(value: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}
function blank(value: string): boolean {
  return value.trim() === '';
}
function optional<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export * from './reference.js';
