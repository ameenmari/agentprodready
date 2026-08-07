/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { HealthResult } from '@agentprodready/foundation';
import type {
  PersistenceAuthorization,
  PersistenceProvider,
  PersistenceScope,
  PersistedEntity,
} from '@agentprodready/persistence';
import { PersistenceError } from '@agentprodready/persistence';
import { ExternalMemoryError } from './memory-errors.js';
import type {
  MemoryCandidate,
  MemoryRecord,
  MemoryRetrievalRequest,
  MemorySearchProvider,
  MemoryStorageProvider,
} from './index.js';
import { parseCanonicalMemoryId } from './memory-id.js';

const REPOSITORY = 'memory-records';

export class PersistenceBackedMemoryProvider implements MemoryStorageProvider, MemorySearchProvider {
  public constructor(private readonly provider: PersistenceProvider) {}

  public async save(record: MemoryRecord): Promise<void> {
    const parsed = parseCanonicalMemoryId(record.id);
    if (parsed === undefined) {
      throw new ExternalMemoryError('serialization-failure', 'Memory id is not canonical');
    }
    if (
      parsed.tenantId !== record.ownership.tenantId ||
      parsed.sourceEventId !== record.sourceEventId
    ) {
      throw new ExternalMemoryError('serialization-failure', 'Memory id does not match ownership');
    }
    const scope = tenantScope(record.ownership.tenantId);
    let existing: PersistedEntity<MemoryRecord> | undefined;
    try {
      existing = await this.repository().find(record.id, scope);
    } catch (error) {
      throw mapPersistenceError(error);
    }
    if (existing !== undefined) {
      throw new ExternalMemoryError('duplicate', 'Memory already exists');
    }
    const at = record.occurredAt;
    await this.commitSave(record, scope, at, undefined);
  }

  public async get(id: string): Promise<MemoryRecord | undefined> {
    const parsed = parseCanonicalMemoryId(id);
    if (parsed === undefined) {
      throw new ExternalMemoryError('unavailable', 'Memory id is malformed or ambiguous');
    }
    try {
      const entity = await this.repository().find(id, tenantScope(parsed.tenantId));
      if (entity === undefined) return undefined;
      return hydrate(entity);
    } catch (error) {
      throw mapPersistenceError(error);
    }
  }

  public async replace(record: MemoryRecord, expectedLifecycleVersion: number): Promise<void> {
    const scope = tenantScope(record.ownership.tenantId);
    let existing: PersistedEntity<MemoryRecord> | undefined;
    try {
      existing = await this.repository().find(record.id, scope);
    } catch (error) {
      throw mapPersistenceError(error);
    }
    if (existing === undefined) {
      throw new ExternalMemoryError('unavailable', 'Memory not found');
    }
    const current = hydrate(existing);
    if (current.lifecycleVersion !== expectedLifecycleVersion) {
      throw new ExternalMemoryError('version-conflict', 'Memory version conflict');
    }
    const at = new Date().toISOString();
    await this.commitSave(record, scope, at, existing);
  }

  public async search(
    request: MemoryRetrievalRequest,
  ): Promise<Readonly<{ candidates: readonly MemoryCandidate[]; partialReasons: readonly string[] }>> {
    const tenantId = request.context.tenantId;
    if (tenantId === undefined || tenantId.trim() === '') {
      throw new ExternalMemoryError('retrieval-failure', 'Retrieval requires tenant scope');
    }
    const partialReasons: string[] = [];
    if (request.strategy === 'semantic') {
      partialReasons.push('semantic-unavailable');
    } else if (request.strategy === 'hybrid') {
      partialReasons.push('semantic-unavailable');
    } else if (request.strategy === 'relationship') {
      partialReasons.push('relationship-unavailable');
    }

    try {
      const filters = buildFilters(request);
      const result = await this.repository().query({
        id: `memory-search:${request.requestId}`,
        scope: tenantScope(tenantId),
        filters,
        sort: [{ field: 'data.occurredAt', direction: 'descending' }],
        projection: [],
        offset: 0,
        limit: Math.max(request.maximumResults * 4, 50),
        aggregate: 'none',
      });
      const terms = request.query.toLowerCase().split(/\s+/u).filter((term) => term.length > 0);
      const candidates = result.entities
        .map((entity) => {
          const record = hydrate(entity);
          const text = JSON.stringify(record.content).toLowerCase();
          const relevance =
            terms.length === 0
              ? 0
              : terms.filter((term) => text.includes(term)).length / terms.length;
          return Object.freeze({
            record,
            relevance,
            frequency: 1,
            searchStrategy: request.strategy,
          });
        })
        .filter((candidate) => {
          if (request.categories.length > 0 && !request.categories.includes(candidate.record.classification.category)) {
            return false;
          }
          for (const [key, value] of Object.entries(request.metadata)) {
            if (candidate.record.metadata[key] !== value) return false;
          }
          return true;
        });
      return Object.freeze({
        candidates: Object.freeze(candidates),
        partialReasons: Object.freeze(partialReasons),
      });
    } catch (error) {
      throw mapPersistenceError(error, 'retrieval-failure');
    }
  }

  public async health(): Promise<HealthResult> {
    try {
      await this.repository().count(tenantScope('health-probe'));
      return Object.freeze({
        name: 'persistence-backed-memory-provider',
        status: 'healthy',
        details: Object.freeze({
          providerId: this.provider.capabilities.providerId,
          durability: this.provider.capabilities.durability,
        }),
      });
    } catch {
      return Object.freeze({
        name: 'persistence-backed-memory-provider',
        status: 'unhealthy',
        details: Object.freeze({
          providerId: this.provider.capabilities.providerId,
        }),
      });
    }
  }

  private repository() {
    return this.provider.repository<MemoryRecord>(REPOSITORY);
  }

  private async commitSave(
    record: MemoryRecord,
    scope: PersistenceScope,
    at: string,
    existing: PersistedEntity<MemoryRecord> | undefined,
  ): Promise<void> {
    let data: MemoryRecord;
    try {
      data = JSON.parse(JSON.stringify(record)) as MemoryRecord;
    } catch (error) {
      throw new ExternalMemoryError('serialization-failure', 'Memory record is not JSON-serializable', {
        cause: error,
      });
    }
    const transaction = await this.provider.unitOfWork().begin({
      id: `memory:${record.id}:${at}`,
      boundaryId: this.provider.capabilities.boundaryId,
      repositoryNames: [REPOSITORY],
      isolation: 'read-committed',
      mandatoryDurability: this.provider.capabilities.durability,
      atomicityRequired: true,
      authorization: authorization(existing === undefined ? 'write' : 'write', scope),
      correlationId: record.execution.correlationId,
      startedAt: at,
    });
    try {
      transaction.stage({
        type: 'save',
        write: {
          repository: REPOSITORY,
          id: record.id,
          scope,
          data,
          ...(existing === undefined
            ? {}
            : {
                expectedRevision: existing.revision,
                expectedVersionToken: existing.versionToken,
              }),
          occurredAt: at,
        },
      });
      await transaction.commit(at);
    } catch (error) {
      try {
        await transaction.rollback(at);
      } catch {
        /* ignore */
      }
      throw mapPersistenceError(error);
    }
  }
}

function tenantScope(tenantId: string): PersistenceScope {
  return Object.freeze({ tenantId });
}

function authorization(
  operation: PersistenceAuthorization['operation'],
  scope: PersistenceScope,
): PersistenceAuthorization {
  return Object.freeze({
    decisionId: `memory-persistence:${operation}`,
    principalId: 'memory-persistence-adapter',
    operation,
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
  });
}

function hydrate(entity: PersistedEntity<MemoryRecord>): MemoryRecord {
  const data: unknown = entity.data;
  if (data === null || typeof data !== 'object') {
    throw new ExternalMemoryError('serialization-failure', 'Stored Memory payload is invalid');
  }
  try {
    return JSON.parse(JSON.stringify(data)) as MemoryRecord;
  } catch (error) {
    throw new ExternalMemoryError('serialization-failure', 'Stored Memory payload failed round-trip', {
      cause: error,
    });
  }
}

function buildFilters(request: MemoryRetrievalRequest) {
  const filters: {
    readonly field: string;
    readonly operator: 'equals' | 'greater-than-or-equal' | 'less-than-or-equal';
    readonly value?: unknown;
  }[] = [];
  if (request.from !== undefined) {
    filters.push({ field: 'data.occurredAt', operator: 'greater-than-or-equal', value: request.from });
  }
  if (request.to !== undefined) {
    filters.push({ field: 'data.occurredAt', operator: 'less-than-or-equal', value: request.to });
  }
  if (request.categories.length === 1) {
    filters.push({
      field: 'data.classification.category',
      operator: 'equals',
      value: request.categories[0],
    });
  }
  return Object.freeze(filters);
}

function mapPersistenceError(
  error: unknown,
  fallback: ExternalMemoryError['kind'] = 'storage-unavailable',
): ExternalMemoryError {
  if (error instanceof ExternalMemoryError) return error;
  if (error instanceof PersistenceError) {
    switch (error.code) {
      case 'DUPLICATE_ENTITY':
        return new ExternalMemoryError('duplicate', 'Memory already exists');
      case 'OPTIMISTIC_LOCK_FAILED':
        return new ExternalMemoryError('version-conflict', 'Memory version conflict');
      case 'ENTITY_NOT_FOUND':
        return new ExternalMemoryError('unavailable', 'Memory not found');
      case 'PROVIDER_UNAVAILABLE':
      case 'PERSISTENCE_TIMEOUT':
        return new ExternalMemoryError('storage-unavailable', 'Memory storage unavailable');
      case 'CONSTRAINT_VIOLATION':
        return new ExternalMemoryError('serialization-failure', 'Memory persistence constraint violated');
      default:
        return new ExternalMemoryError(fallback, 'Memory persistence operation failed');
    }
  }
  return new ExternalMemoryError(fallback, 'Memory persistence operation failed', { cause: error });
}
