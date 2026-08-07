import type {
  ExecutionCheckpoint,
  ExecutionCheckpointPort,
} from '@agentforge/runtime';
import { CheckpointConflictError, stripConcurrencyFields } from '@agentforge/runtime';
import type {
  PersistenceAuthorization,
  PersistenceProvider,
  PersistenceScope,
} from '@agentforge/persistence';
import { PersistenceError } from '@agentforge/persistence';

const REPOSITORY = 'runtime-executions';

/**
 * Host-owned adapter: Runtime ExecutionCheckpointPort → Blueprint 24 repository rows.
 * Runtime remains independent of @agentforge/persistence.
 */
export class PersistenceExecutionCheckpointStore implements ExecutionCheckpointPort {
  public constructor(
    private readonly provider: PersistenceProvider,
    private readonly defaultScope: PersistenceScope,
  ) {}

  public async store(checkpoint: ExecutionCheckpoint): Promise<void> {
    const scope = scopeOf(checkpoint);
    const repository = this.provider.repository<ExecutionCheckpoint>(REPOSITORY);
    const existing = await repository.find(checkpoint.executionId, scope);
    const data = stripConcurrencyFields(checkpoint) as ExecutionCheckpoint;
    const at = checkpoint.updatedAt;
    const transaction = await this.provider.unitOfWork().begin({
      id: `runtime-checkpoint:${checkpoint.executionId}:${at}`,
      boundaryId: this.provider.capabilities.boundaryId,
      repositoryNames: [REPOSITORY],
      isolation: 'read-committed',
      mandatoryDurability: this.provider.capabilities.durability,
      atomicityRequired: true,
      authorization: authorization('write', scope),
      correlationId: checkpoint.correlationId,
      startedAt: at,
    });
    try {
      if (existing !== undefined) {
        if (
          checkpoint.concurrencyRevision === undefined ||
          checkpoint.concurrencyToken === undefined ||
          checkpoint.concurrencyRevision !== existing.revision ||
          checkpoint.concurrencyToken !== existing.versionToken
        ) {
          throw new CheckpointConflictError(
            `Optimistic concurrency conflict for ${checkpoint.executionId}`,
          );
        }
      } else if (
        checkpoint.concurrencyRevision !== undefined ||
        checkpoint.concurrencyToken !== undefined
      ) {
        throw new CheckpointConflictError(
          `Optimistic concurrency conflict creating ${checkpoint.executionId}`,
        );
      }
      transaction.stage({
        type: 'save',
        write: {
          repository: REPOSITORY,
          id: checkpoint.executionId,
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
        /* ignore rollback failures after commit/lock errors */
      }
      if (error instanceof PersistenceError && error.code === 'OPTIMISTIC_LOCK_FAILED') {
        throw new CheckpointConflictError(
          `Optimistic concurrency conflict for ${checkpoint.executionId}`,
        );
      }
      throw error;
    }
  }

  public async load(executionId: string): Promise<ExecutionCheckpoint | undefined> {
    const entity = await this.provider
      .repository<ExecutionCheckpoint>(REPOSITORY)
      .find(executionId, this.defaultScope);
    if (entity === undefined) return undefined;
    return hydrate(entity.data, entity.revision, entity.versionToken);
  }

  public async listIncomplete(
    options: { readonly limit?: number } = {},
  ): Promise<readonly ExecutionCheckpoint[]> {
    const limit = options.limit ?? 1000;
    const result = await this.provider.repository<ExecutionCheckpoint>(REPOSITORY).query({
      id: `runtime-incomplete:${this.defaultScope.tenantId}`,
      scope: this.defaultScope,
      filters: [{ field: 'data.terminal', operator: 'equals', value: false }],
      sort: [{ field: 'updatedAt', direction: 'ascending' }],
      projection: [],
      offset: 0,
      limit,
      aggregate: 'none',
    });
    return Object.freeze(
      result.entities.map((entity) => hydrate(entity.data, entity.revision, entity.versionToken)),
    );
  }
}

function scopeOf(checkpoint: ExecutionCheckpoint): PersistenceScope {
  return Object.freeze({
    tenantId: checkpoint.tenantId,
    ...(checkpoint.workspaceId === undefined ? {} : { workspaceId: checkpoint.workspaceId }),
  });
}

function authorization(operation: PersistenceAuthorization['operation'], scope: PersistenceScope): PersistenceAuthorization {
  return Object.freeze({
    decisionId: `runtime-checkpoint:${operation}`,
    principalId: 'runtime-checkpoint-adapter',
    operation,
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
  });
}

function hydrate(
  data: ExecutionCheckpoint,
  revision: number,
  versionToken: string,
): ExecutionCheckpoint {
  return Object.freeze({
    ...data,
    concurrencyRevision: revision,
    concurrencyToken: versionToken,
  });
}
