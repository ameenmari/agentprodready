export type IsolationLevel = 'read-committed' | 'repeatable-read' | 'snapshot' | 'serializable';
export type DurabilityLevel = 'non-durable' | 'process-durable' | 'durable';
export interface PersistenceScope {
  readonly tenantId: string;
  readonly workspaceId?: string;
}
export interface PersistedEntity<T = unknown> {
  readonly id: string;
  readonly scope: PersistenceScope;
  readonly data: T;
  readonly revision: number;
  readonly versionToken: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface EntityWrite<T = unknown> {
  readonly repository: string;
  readonly id: string;
  readonly scope: PersistenceScope;
  readonly data: T;
  readonly expectedRevision?: number;
  readonly expectedVersionToken?: string;
  readonly occurredAt: string;
}
export interface EntityDelete {
  readonly repository: string;
  readonly id: string;
  readonly scope: PersistenceScope;
  readonly expectedRevision: number;
  readonly expectedVersionToken: string;
}
export type TransactionOperation =
  | { readonly type: 'save'; readonly write: EntityWrite }
  | { readonly type: 'delete'; readonly deletion: EntityDelete };
export interface QueryFilter {
  readonly field: string;
  readonly operator:
    | 'equals'
    | 'not-equals'
    | 'less-than'
    | 'less-than-or-equal'
    | 'greater-than'
    | 'greater-than-or-equal'
    | 'includes'
    | 'exists';
  readonly value?: unknown;
}
export interface RepositoryQuery {
  readonly id: string;
  readonly scope: PersistenceScope;
  readonly filters: readonly QueryFilter[];
  readonly sort: readonly Readonly<{ field: string; direction: 'ascending' | 'descending' }>[];
  readonly projection: readonly string[];
  readonly offset: number;
  readonly limit: number;
  readonly aggregate: 'none' | 'count';
}
export interface QueryResult<T = unknown> {
  readonly queryId: string;
  readonly entities: readonly PersistedEntity<T>[];
  readonly total: number;
  readonly aggregate?: Readonly<{ count: number }>;
  readonly consistency: 'transaction-snapshot' | 'provider-snapshot';
  readonly providerBoundaryId: string;
}
export interface Repository<T = unknown> {
  readonly name: string;
  readonly providerBoundaryId: string;
  find(id: string, scope: PersistenceScope): PersistedEntity<T> | undefined;
  exists(id: string, scope: PersistenceScope): boolean;
  count(scope: PersistenceScope): number;
  query(request: RepositoryQuery): QueryResult<T>;
}
export interface ProviderCapabilities {
  readonly providerId: string;
  readonly boundaryId: string;
  readonly isolationLevels: readonly IsolationLevel[];
  readonly defaultIsolation: IsolationLevel;
  readonly atomicTransactions: boolean;
  readonly rollback: boolean;
  readonly durability: DurabilityLevel;
  readonly snapshots: boolean;
  readonly migrations: boolean;
  readonly maximumRepositoriesPerTransaction: number;
  readonly crossProviderAtomicity: false;
}
export interface TransactionRequest {
  readonly id: string;
  readonly boundaryId: string;
  readonly repositoryNames: readonly string[];
  readonly isolation: IsolationLevel;
  readonly mandatoryDurability: DurabilityLevel;
  readonly atomicityRequired: true;
  readonly approvedIsolationFallback?: Readonly<{
    from: IsolationLevel;
    to: IsolationLevel;
    approvalReference: string;
  }>;
  readonly authorization: PersistenceAuthorization;
  readonly correlationId: string;
  readonly startedAt: string;
}
export interface TransactionCommitResult {
  readonly transactionId: string;
  readonly outcome: 'committed';
  readonly operationCount: number;
  readonly isolation: IsolationLevel;
  readonly durability: DurabilityLevel;
  readonly providerBoundaryId: string;
  readonly atomic: true;
  readonly partialCommit: false;
  readonly committedAt: string;
}
export interface TransactionRollbackResult {
  readonly transactionId: string;
  readonly outcome: 'rolled-back';
  readonly operationCount: number;
  readonly providerBoundaryId: string;
  readonly partialCommit: false;
  readonly rolledBackAt: string;
}
export interface PersistenceTransaction {
  readonly id: string;
  readonly boundaryId: string;
  readonly isolation: IsolationLevel;
  readonly state: 'active' | 'committed' | 'rolled-back' | 'failed';
  stage(operation: TransactionOperation): void;
  commit(at: string): Promise<TransactionCommitResult>;
  rollback(at: string): Promise<TransactionRollbackResult>;
}
export interface UnitOfWork {
  begin(request: TransactionRequest): PersistenceTransaction;
}
export interface PersistenceProvider {
  readonly capabilities: ProviderCapabilities;
  repository<T = unknown>(name: string): Repository<T>;
  unitOfWork(): UnitOfWork;
}
export interface PersistenceAuthorization {
  readonly decisionId: string;
  readonly principalId: string;
  readonly operation: 'read' | 'write' | 'delete' | 'transaction' | 'snapshot' | 'migrate';
  readonly authorized: boolean;
  readonly state: 'active' | 'expired' | 'revoked' | 'superseded';
  readonly scope: PersistenceScope;
  readonly policyVersion: string;
}
export interface PersistenceSnapshot<T = unknown> {
  readonly id: string;
  readonly repository: string;
  readonly providerBoundaryId: string;
  readonly scope: PersistenceScope;
  readonly entities: readonly PersistedEntity<T>[];
  readonly createdAt: string;
  readonly sourceRevisionDigest: string;
  readonly immutable: true;
  readonly auditHistory: false;
}
export interface SnapshotStore {
  save(value: PersistenceSnapshot): void;
  get(id: string): PersistenceSnapshot | undefined;
}
export interface MigrationPlan {
  readonly id: string;
  readonly version: string;
  readonly providerBoundaryId: string;
  readonly fromSchemaVersion: string;
  readonly toSchemaVersion: string;
  readonly steps: readonly Readonly<{
    id: string;
    description: string;
    operationReference: string;
  }>[];
  readonly rollbackPlanReference: string;
  readonly compatibility: Readonly<{ minimumReaderVersion: string; minimumWriterVersion: string }>;
  readonly authorization: PersistenceAuthorization;
  readonly createdAt: string;
}
export interface MigrationResult {
  readonly planId: string;
  readonly version: string;
  readonly outcome: 'applied' | 'already-applied' | 'rolled-back';
  readonly providerBoundaryId: string;
  readonly appliedAt: string;
  readonly rollbackAvailable: true;
}
export interface MigrationProvider {
  apply(plan: MigrationPlan): Promise<MigrationResult>;
  rollback(plan: MigrationPlan, at: string): Promise<MigrationResult>;
}
export interface PersistenceFact {
  readonly type:
    | 'persistence.entity-persisted'
    | 'persistence.entity-updated'
    | 'persistence.entity-deleted'
    | 'persistence.transaction-committed'
    | 'persistence.transaction-rolled-back'
    | 'persistence.migration-applied';
  readonly operationId: string;
  readonly repository?: string;
  readonly entityId?: string;
  readonly providerBoundaryId: string;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly outcome: 'completed' | 'failed';
  readonly diagnosticsReference: string;
}
export interface PersistenceEvents {
  publish(value: PersistenceFact): Promise<void>;
}
export interface PersistenceAudit {
  record(
    value: Readonly<{
      type:
        | 'persistence.migration'
        | 'persistence.manual-correction'
        | 'persistence.destructive-operation';
      operationId: string;
      providerBoundaryId: string;
      principalId: string;
      authorizationDecisionId: string;
      correlationId: string;
    }>,
  ): Promise<void>;
}
export interface PersistenceDiagnostics {
  record(
    value: Readonly<{
      id: string;
      phase: string;
      outcome: 'completed' | 'failed' | 'rolled-back';
      providerId: string;
      boundaryId: string;
      operationCount: number;
      isolation?: IsolationLevel;
      durability: DurabilityLevel;
      errorCode?: PersistenceErrorCode;
    }>,
  ): void;
  list(): readonly unknown[];
}
export type PersistenceErrorCode =
  | 'TRANSACTION_FAILED'
  | 'OPTIMISTIC_LOCK_FAILED'
  | 'ENTITY_NOT_FOUND'
  | 'DUPLICATE_ENTITY'
  | 'MIGRATION_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONSTRAINT_VIOLATION'
  | 'PERSISTENCE_TIMEOUT'
  | 'PERSISTENCE_UNAUTHORIZED'
  | 'PERSISTENCE_SCOPE_VIOLATION'
  | 'UNSUPPORTED_CAPABILITY'
  | 'CROSS_PROVIDER_TRANSACTION'
  | 'TRANSACTION_STATE_INVALID';
export class PersistenceError extends Error {
  public constructor(
    public readonly code: PersistenceErrorCode,
    message: string,
    public readonly diagnosticId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PersistenceError';
  }
}

export class PersistenceFramework {
  public constructor(
    private readonly provider: PersistenceProvider,
    private readonly snapshots: SnapshotStore,
    private readonly migrations: MigrationProvider,
    private readonly events: PersistenceEvents,
    private readonly audit: PersistenceAudit,
    private readonly diagnostics: PersistenceDiagnostics,
  ) {}
  public repository<T = unknown>(
    name: string,
    authorization: PersistenceAuthorization,
  ): Repository<T> {
    enforce(authorization, 'read', authorization.scope, `persistence:repository:${name}`);
    return this.provider.repository<T>(name);
  }
  public begin(request: TransactionRequest): PersistenceTransaction {
    enforce(
      request.authorization,
      'transaction',
      request.authorization.scope,
      `persistence:transaction:${request.id}`,
    );
    const isolation = negotiate(this.provider.capabilities, request);
    const inner = this.provider.unitOfWork().begin({ ...request, isolation });
    return new AccountableTransaction(
      inner,
      request,
      this.provider.capabilities,
      this.events,
      this.diagnostics,
    );
  }
  public snapshot<T = unknown>(
    id: string,
    repository: string,
    scope: PersistenceScope,
    authorization: PersistenceAuthorization,
    at: string,
  ): PersistenceSnapshot<T> {
    enforce(authorization, 'snapshot', scope, `persistence:snapshot:${id}`);
    if (!this.provider.capabilities.snapshots)
      throw new PersistenceError(
        'UNSUPPORTED_CAPABILITY',
        'Provider does not support snapshots',
        `persistence:snapshot:${id}`,
      );
    const entities = this.provider.repository<T>(repository).query({
        id: `snapshot:${id}`,
        scope,
        filters: [],
        sort: [{ field: 'id', direction: 'ascending' }],
        projection: [],
        offset: 0,
        limit: 100000,
        aggregate: 'none',
      }).entities,
      value = freeze({
        id,
        repository,
        providerBoundaryId: this.provider.capabilities.boundaryId,
        scope: copy(scope),
        entities: entities.map(copy),
        createdAt: at,
        sourceRevisionDigest: digest(
          entities
            .map((item) => `${item.id}:${String(item.revision)}:${item.versionToken}`)
            .join('|'),
        ),
        immutable: true as const,
        auditHistory: false as const,
      });
    this.snapshots.save(value);
    return value;
  }
  public async migrate(plan: MigrationPlan, correlationId: string): Promise<MigrationResult> {
    enforce(
      plan.authorization,
      'migrate',
      plan.authorization.scope,
      `persistence:migration:${plan.id}`,
    );
    if (plan.providerBoundaryId !== this.provider.capabilities.boundaryId)
      throw new PersistenceError(
        'CROSS_PROVIDER_TRANSACTION',
        'Migration provider boundary mismatch',
        `persistence:migration:${plan.id}`,
      );
    if (!this.provider.capabilities.migrations)
      throw new PersistenceError(
        'UNSUPPORTED_CAPABILITY',
        'Provider does not support migrations',
        `persistence:migration:${plan.id}`,
      );
    const result = await this.migrations.apply(plan);
    await this.events.publish({
      type: 'persistence.migration-applied',
      operationId: plan.id,
      providerBoundaryId: plan.providerBoundaryId,
      tenantId: plan.authorization.scope.tenantId,
      correlationId,
      outcome: 'completed',
      diagnosticsReference: `persistence:migration:${plan.id}`,
    });
    await this.audit.record({
      type: 'persistence.migration',
      operationId: plan.id,
      providerBoundaryId: plan.providerBoundaryId,
      principalId: plan.authorization.principalId,
      authorizationDecisionId: plan.authorization.decisionId,
      correlationId,
    });
    return result;
  }
}
class AccountableTransaction implements PersistenceTransaction {
  public constructor(
    private readonly inner: PersistenceTransaction,
    private readonly request: TransactionRequest,
    private readonly capabilities: ProviderCapabilities,
    private readonly events: PersistenceEvents,
    private readonly diagnostics: PersistenceDiagnostics,
  ) {}
  public get id(): string {
    return this.inner.id;
  }
  public get boundaryId(): string {
    return this.inner.boundaryId;
  }
  public get isolation(): IsolationLevel {
    return this.inner.isolation;
  }
  public get state(): PersistenceTransaction['state'] {
    return this.inner.state;
  }
  public stage(operation: TransactionOperation): void {
    this.inner.stage(operation);
  }
  public async commit(at: string): Promise<TransactionCommitResult> {
    try {
      const result = await this.inner.commit(at);
      await this.events.publish({
        type: 'persistence.transaction-committed',
        operationId: this.id,
        providerBoundaryId: this.boundaryId,
        tenantId: this.request.authorization.scope.tenantId,
        correlationId: this.request.correlationId,
        outcome: 'completed',
        diagnosticsReference: `persistence:transaction:${this.id}`,
      });
      this.diagnostics.record({
        id: `persistence:transaction:${this.id}`,
        phase: 'commit',
        outcome: 'completed',
        providerId: this.capabilities.providerId,
        boundaryId: this.boundaryId,
        operationCount: result.operationCount,
        isolation: result.isolation,
        durability: result.durability,
      });
      return result;
    } catch (error) {
      this.diagnostics.record({
        id: `persistence:transaction:${this.id}`,
        phase: 'commit',
        outcome: 'failed',
        providerId: this.capabilities.providerId,
        boundaryId: this.boundaryId,
        operationCount: 0,
        isolation: this.isolation,
        durability: this.capabilities.durability,
        errorCode: error instanceof PersistenceError ? error.code : 'TRANSACTION_FAILED',
      });
      throw error instanceof PersistenceError
        ? error
        : new PersistenceError(
            'TRANSACTION_FAILED',
            'Transaction failed',
            `persistence:transaction:${this.id}`,
            { cause: error },
          );
    }
  }
  public async rollback(at: string): Promise<TransactionRollbackResult> {
    const result = await this.inner.rollback(at);
    await this.events.publish({
      type: 'persistence.transaction-rolled-back',
      operationId: this.id,
      providerBoundaryId: this.boundaryId,
      tenantId: this.request.authorization.scope.tenantId,
      correlationId: this.request.correlationId,
      outcome: 'completed',
      diagnosticsReference: `persistence:transaction:${this.id}`,
    });
    this.diagnostics.record({
      id: `persistence:transaction:${this.id}`,
      phase: 'rollback',
      outcome: 'rolled-back',
      providerId: this.capabilities.providerId,
      boundaryId: this.boundaryId,
      operationCount: result.operationCount,
      isolation: this.isolation,
      durability: this.capabilities.durability,
    });
    return result;
  }
}

function negotiate(
  capabilities: ProviderCapabilities,
  request: TransactionRequest,
): IsolationLevel {
  if (request.boundaryId !== capabilities.boundaryId)
    throw new PersistenceError(
      'CROSS_PROVIDER_TRANSACTION',
      'Transaction boundary is incompatible',
      `persistence:transaction:${request.id}`,
    );
  if (
    !capabilities.atomicTransactions ||
    !capabilities.rollback ||
    request.repositoryNames.length > capabilities.maximumRepositoriesPerTransaction
  )
    throw new PersistenceError(
      'UNSUPPORTED_CAPABILITY',
      'Mandatory transaction capability unavailable',
      `persistence:transaction:${request.id}`,
    );
  if (durabilityRank(capabilities.durability) < durabilityRank(request.mandatoryDurability))
    throw new PersistenceError(
      'UNSUPPORTED_CAPABILITY',
      'Mandatory durability unavailable',
      `persistence:transaction:${request.id}`,
    );
  if (capabilities.isolationLevels.includes(request.isolation)) return request.isolation;
  const fallback = request.approvedIsolationFallback;
  if (
    fallback !== undefined &&
    fallback.from === request.isolation &&
    capabilities.isolationLevels.includes(fallback.to) &&
    isolationRank(fallback.to) >= isolationRank('read-committed') &&
    fallback.approvalReference.trim() !== ''
  )
    return fallback.to;
  throw new PersistenceError(
    'UNSUPPORTED_CAPABILITY',
    'Requested isolation unavailable',
    `persistence:transaction:${request.id}`,
  );
}
function enforce(
  value: PersistenceAuthorization,
  operation: PersistenceAuthorization['operation'],
  scope: PersistenceScope,
  id: string,
): void {
  if (!value.authorized || value.state !== 'active' || value.operation !== operation)
    throw new PersistenceError(
      'PERSISTENCE_UNAUTHORIZED',
      'Persistence operation is unauthorized',
      id,
    );
  if (
    value.scope.tenantId !== scope.tenantId ||
    (scope.workspaceId !== undefined && value.scope.workspaceId !== scope.workspaceId)
  )
    throw new PersistenceError(
      'PERSISTENCE_SCOPE_VIOLATION',
      'Persistence scope is unauthorized',
      id,
    );
}
function isolationRank(value: IsolationLevel): number {
  return ['read-committed', 'repeatable-read', 'snapshot', 'serializable'].indexOf(value);
}
function durabilityRank(value: DurabilityLevel): number {
  return ['non-durable', 'process-durable', 'durable'].indexOf(value);
}
function digest(value: string): string {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
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
