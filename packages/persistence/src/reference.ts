import type {
  EntityDelete,
  EntityWrite,
  MigrationPlan,
  MigrationProvider,
  MigrationResult,
  PersistenceAudit,
  PersistenceDiagnostics,
  PersistenceEvents,
  PersistenceFact,
  PersistenceProvider,
  PersistenceScope,
  PersistenceSnapshot,
  PersistenceTransaction,
  ProviderCapabilities,
  QueryFilter,
  QueryResult,
  Repository,
  RepositoryQuery,
  SnapshotStore,
  TransactionCommitResult,
  TransactionOperation,
  TransactionRequest,
  TransactionRollbackResult,
  UnitOfWork,
  PersistedEntity,
} from './index.js';
import { freeze, PersistenceError } from './index.js';

type EntityMap = Map<string, PersistedEntity>;
export class InMemoryPersistenceProvider implements PersistenceProvider {
  public readonly capabilities: ProviderCapabilities;
  readonly #repositories = new Map<string, InMemoryRepository>();
  public constructor(options: Partial<ProviderCapabilities> = {}) {
    this.capabilities = freeze({
      providerId: 'in-memory',
      boundaryId: 'memory-boundary',
      isolationLevels: ['read-committed', 'repeatable-read', 'snapshot', 'serializable'],
      defaultIsolation: 'read-committed',
      atomicTransactions: true,
      rollback: true,
      durability: 'non-durable',
      snapshots: true,
      migrations: true,
      maximumRepositoriesPerTransaction: 32,
      crossProviderAtomicity: false,
      ...options,
    });
  }
  public repository<T = unknown>(name: string): Repository<T> {
    let value = this.#repositories.get(name);
    if (value === undefined) {
      value = new InMemoryRepository(name, this.capabilities.boundaryId);
      this.#repositories.set(name, value);
    }
    return value as Repository<T>;
  }
  public unitOfWork(): UnitOfWork {
    return {
      begin: async (request) => new InMemoryTransaction(request, this.capabilities, this.#repositories),
    };
  }
}
class InMemoryRepository<T = unknown> implements Repository<T> {
  readonly #values: EntityMap = new Map();
  public constructor(
    public readonly name: string,
    public readonly providerBoundaryId: string,
  ) {}
  public async find(id: string, scope: PersistenceScope): Promise<PersistedEntity<T> | undefined> {
    const value = this.#values.get(key(id, scope));
    return value === undefined ? undefined : (freeze(copy(value)) as PersistedEntity<T>);
  }
  public async exists(id: string, scope: PersistenceScope): Promise<boolean> {
    return this.#values.has(key(id, scope));
  }
  public async count(scope: PersistenceScope): Promise<number> {
    return [...this.#values.values()].filter((value) => sameScope(value.scope, scope)).length;
  }
  public async query(request: RepositoryQuery): Promise<QueryResult<T>> {
    if (request.limit < 1 || request.offset < 0)
      throw new PersistenceError(
        'CONSTRAINT_VIOLATION',
        'Query pagination is invalid',
        `persistence:query:${request.id}`,
      );
    const values = [...this.#values.values()]
        .filter(
          (value) =>
            sameScope(value.scope, request.scope) &&
            request.filters.every((filter) => matches(value, filter)),
        )
        .sort((a, b) => compareEntity(a, b, request.sort)),
      selected = values
        .slice(request.offset, request.offset + request.limit)
        .map(copy) as PersistedEntity<T>[];
    return freeze({
      queryId: request.id,
      entities: selected,
      total: values.length,
      ...(request.aggregate === 'count' ? { aggregate: { count: values.length } } : {}),
      consistency: 'provider-snapshot',
      providerBoundaryId: this.providerBoundaryId,
    });
  }
  cloneValues(): EntityMap {
    return new Map([...this.#values].map(([id, value]) => [id, copy(value)]));
  }
  replace(values: EntityMap): void {
    this.#values.clear();
    for (const [id, value] of values) this.#values.set(id, freeze(copy(value)));
  }
}
class InMemoryTransaction implements PersistenceTransaction {
  public state: PersistenceTransaction['state'] = 'active';
  readonly #operations: TransactionOperation[] = [];
  public readonly isolation: TransactionRequest['isolation'];
  public constructor(
    private readonly request: TransactionRequest,
    private readonly capabilities: ProviderCapabilities,
    private readonly repositories: Map<string, InMemoryRepository>,
  ) {
    this.isolation = request.isolation;
  }
  public get id(): string {
    return this.request.id;
  }
  public get boundaryId(): string {
    return this.request.boundaryId;
  }
  public stage(operation: TransactionOperation): void {
    if (this.state !== 'active')
      throw new PersistenceError(
        'TRANSACTION_STATE_INVALID',
        'Transaction is not active',
        `persistence:transaction:${this.id}`,
      );
    if (
      !this.request.repositoryNames.includes(
        operation.type === 'save' ? operation.write.repository : operation.deletion.repository,
      )
    )
      throw new PersistenceError(
        'CROSS_PROVIDER_TRANSACTION',
        'Repository is not enlisted',
        `persistence:transaction:${this.id}`,
      );
    this.#operations.push(freeze(copy(operation)));
  }
  public async commit(at: string): Promise<TransactionCommitResult> {
    if (this.state !== 'active')
      throw new PersistenceError(
        'TRANSACTION_STATE_INVALID',
        'Transaction is not active',
        `persistence:transaction:${this.id}`,
      );
    const shadows = new Map<string, EntityMap>();
    try {
      for (const name of this.request.repositoryNames) {
        const repository = this.repositories.get(name) ?? this.createRepository(name);
        if (repository.providerBoundaryId !== this.boundaryId)
          throw new PersistenceError(
            'CROSS_PROVIDER_TRANSACTION',
            'Repository boundary mismatch',
            `persistence:transaction:${this.id}`,
          );
        shadows.set(name, repository.cloneValues());
      }
      for (const operation of this.#operations) applyOperation(operation, shadows);
      for (const [name, shadow] of shadows) this.repositories.get(name)?.replace(shadow);
      this.state = 'committed';
      return freeze({
        transactionId: this.id,
        outcome: 'committed',
        operationCount: this.#operations.length,
        isolation: this.isolation,
        durability: this.capabilities.durability,
        providerBoundaryId: this.boundaryId,
        atomic: true,
        partialCommit: false,
        committedAt: at,
      });
    } catch (error) {
      this.state = 'failed';
      throw error;
    }
  }
  public async rollback(at: string): Promise<TransactionRollbackResult> {
    if (this.state !== 'active' && this.state !== 'failed')
      throw new PersistenceError(
        'TRANSACTION_STATE_INVALID',
        'Transaction cannot roll back',
        `persistence:transaction:${this.id}`,
      );
    this.state = 'rolled-back';
    return freeze({
      transactionId: this.id,
      outcome: 'rolled-back',
      operationCount: this.#operations.length,
      providerBoundaryId: this.boundaryId,
      partialCommit: false,
      rolledBackAt: at,
    });
  }
  private createRepository(name: string): InMemoryRepository {
    const value = new InMemoryRepository(name, this.boundaryId);
    this.repositories.set(name, value);
    return value;
  }
}
export class InMemorySnapshotStore implements SnapshotStore {
  readonly #values = new Map<string, PersistenceSnapshot>();
  public async save(value: PersistenceSnapshot): Promise<void> {
    this.#values.set(value.id, freeze(copy(value)));
  }
  public async get(id: string): Promise<PersistenceSnapshot | undefined> {
    const value = this.#values.get(id);
    return value === undefined ? undefined : freeze(copy(value));
  }
}
export class InMemoryMigrationProvider implements MigrationProvider {
  readonly #applied = new Set<string>();
  public async apply(plan: MigrationPlan): Promise<MigrationResult> {
    const existing = this.#applied.has(plan.id);
    this.#applied.add(plan.id);
    return freeze({
      planId: plan.id,
      version: plan.version,
      outcome: existing ? 'already-applied' : 'applied',
      providerBoundaryId: plan.providerBoundaryId,
      appliedAt: plan.createdAt,
      rollbackAvailable: true,
    });
  }
  public async rollback(plan: MigrationPlan, at: string): Promise<MigrationResult> {
    this.#applied.delete(plan.id);
    return freeze({
      planId: plan.id,
      version: plan.version,
      outcome: 'rolled-back',
      providerBoundaryId: plan.providerBoundaryId,
      appliedAt: at,
      rollbackAvailable: true,
    });
  }
}
export class InMemoryPersistenceEvents implements PersistenceEvents {
  public readonly values: PersistenceFact[] = [];
  public async publish(value: PersistenceFact): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryPersistenceAudit implements PersistenceAudit {
  public readonly values: unknown[] = [];
  public async record(value: Parameters<PersistenceAudit['record']>[0]): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryPersistenceDiagnostics implements PersistenceDiagnostics {
  readonly #values: unknown[] = [];
  public record(value: Parameters<PersistenceDiagnostics['record']>[0]): void {
    this.#values.push(freeze(copy(value)));
  }
  public list(): readonly unknown[] {
    return freeze(copy(this.#values));
  }
}

function applyOperation(operation: TransactionOperation, shadows: Map<string, EntityMap>): void {
  if (operation.type === 'save')
    save(operation.write, requiredShadow(operation.write.repository, shadows));
  else remove(operation.deletion, requiredShadow(operation.deletion.repository, shadows));
}
function save(write: EntityWrite, values: EntityMap): void {
  const entityKey = key(write.id, write.scope),
    current = values.get(entityKey);
  if (current === undefined) {
    if (write.expectedRevision !== undefined || write.expectedVersionToken !== undefined)
      throw new PersistenceError(
        'OPTIMISTIC_LOCK_FAILED',
        'Entity does not match expected version',
        `persistence:entity:${write.id}`,
      );
    values.set(
      entityKey,
      freeze({
        id: write.id,
        scope: copy(write.scope),
        data: copy(write.data),
        revision: 1,
        versionToken: token(write.id, 1, write.occurredAt),
        createdAt: write.occurredAt,
        updatedAt: write.occurredAt,
      }),
    );
    return;
  }
  if (
    write.expectedRevision !== current.revision ||
    write.expectedVersionToken !== current.versionToken
  )
    throw new PersistenceError(
      'OPTIMISTIC_LOCK_FAILED',
      'Stale entity write rejected',
      `persistence:entity:${write.id}`,
    );
  const revision = current.revision + 1;
  values.set(
    entityKey,
    freeze({
      ...current,
      data: copy(write.data),
      revision,
      versionToken: token(write.id, revision, write.occurredAt),
      updatedAt: write.occurredAt,
    }),
  );
}
function remove(deletion: EntityDelete, values: EntityMap): void {
  const entityKey = key(deletion.id, deletion.scope),
    current = values.get(entityKey);
  if (current === undefined)
    throw new PersistenceError(
      'ENTITY_NOT_FOUND',
      'Entity not found',
      `persistence:entity:${deletion.id}`,
    );
  if (
    deletion.expectedRevision !== current.revision ||
    deletion.expectedVersionToken !== current.versionToken
  )
    throw new PersistenceError(
      'OPTIMISTIC_LOCK_FAILED',
      'Stale entity delete rejected',
      `persistence:entity:${deletion.id}`,
    );
  values.delete(entityKey);
}
function requiredShadow(name: string, values: Map<string, EntityMap>): EntityMap {
  const value = values.get(name);
  if (value === undefined)
    throw new PersistenceError(
      'CROSS_PROVIDER_TRANSACTION',
      'Repository is outside transaction boundary',
      `persistence:repository:${name}`,
    );
  return value;
}
function matches(entity: PersistedEntity, filter: QueryFilter): boolean {
  const actual = get(entity, filter.field),
    expected = filter.value;
  switch (filter.operator) {
    case 'equals':
      return actual === expected;
    case 'not-equals':
      return actual !== expected;
    case 'less-than':
      return compare(actual, expected) < 0;
    case 'less-than-or-equal':
      return compare(actual, expected) <= 0;
    case 'greater-than':
      return compare(actual, expected) > 0;
    case 'greater-than-or-equal':
      return compare(actual, expected) >= 0;
    case 'includes':
      return Array.isArray(actual)
        ? actual.includes(expected)
        : typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
    case 'exists':
      return expected === false ? actual === undefined : actual !== undefined;
  }
}
function get(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, part) =>
        typeof current === 'object' && current !== null ? Reflect.get(current, part) : undefined,
      value,
    );
}
function compare(a: unknown, b: unknown): number {
  return typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b));
}
function compareEntity(
  a: PersistedEntity,
  b: PersistedEntity,
  sort: RepositoryQuery['sort'],
): number {
  for (const item of sort) {
    const result = compare(get(a, item.field), get(b, item.field));
    if (result !== 0) return item.direction === 'ascending' ? result : -result;
  }
  return a.id.localeCompare(b.id);
}
function key(id: string, scope: PersistenceScope): string {
  return `${scope.tenantId}:${scope.workspaceId ?? ''}:${id}`;
}
function sameScope(a: PersistenceScope, b: PersistenceScope): boolean {
  return (
    a.tenantId === b.tenantId && (b.workspaceId === undefined || a.workspaceId === b.workspaceId)
  );
}
function token(id: string, revision: number, at: string): string {
  return `${id}:${String(revision)}:${at}`;
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
