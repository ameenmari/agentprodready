import {
  PersistenceError,
  freeze,
  type EntityDelete,
  type EntityWrite,
  type IsolationLevel,
  type PersistenceTransaction,
  type ProviderCapabilities,
  type TransactionCommitResult,
  type TransactionOperation,
  type TransactionRequest,
  type TransactionRollbackResult,
} from '@agentforge/persistence';
import { withPostgresErrors, translatePostgresError } from './postgres-error-translation.js';
import type { PostgresPool, PostgresPoolClient } from './pool.js';
import { newVersionToken, scopeKey, toJson } from './serialize.js';

const isolationSql: Readonly<Record<Exclude<IsolationLevel, 'snapshot'>, string>> = {
  'read-committed': 'READ COMMITTED',
  'repeatable-read': 'REPEATABLE READ',
  serializable: 'SERIALIZABLE',
};

export class PostgresPersistenceTransaction implements PersistenceTransaction {
  public state: PersistenceTransaction['state'] = 'active';
  readonly #operations: TransactionOperation[] = [];
  public readonly isolation: IsolationLevel;
  #released = false;

  public constructor(
    private readonly client: PostgresPoolClient,
    private readonly request: TransactionRequest,
    private readonly capabilities: ProviderCapabilities,
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
    if (this.state !== 'active') {
      throw new PersistenceError(
        'TRANSACTION_STATE_INVALID',
        'Transaction is not active',
        `persistence:transaction:${this.id}`,
      );
    }
    const repository =
      operation.type === 'save' ? operation.write.repository : operation.deletion.repository;
    if (!this.request.repositoryNames.includes(repository)) {
      throw new PersistenceError(
        'CROSS_PROVIDER_TRANSACTION',
        'Repository is not enlisted',
        `persistence:transaction:${this.id}`,
      );
    }
    this.#operations.push(freeze(JSON.parse(JSON.stringify(operation)) as TransactionOperation));
  }

  public async commit(at: string): Promise<TransactionCommitResult> {
    return withPostgresErrors(`persistence:transaction:${this.id}`, async () => {
      if (this.state !== 'active') {
        throw new PersistenceError(
          'TRANSACTION_STATE_INVALID',
          'Transaction is not active',
          `persistence:transaction:${this.id}`,
        );
      }
      try {
        for (const operation of this.#operations) {
          if (operation.type === 'save') await applySave(this.client, operation.write);
          else await applyDelete(this.client, operation.deletion);
        }
        await this.client.query('COMMIT');
        this.state = 'committed';
        return freeze({
          transactionId: this.id,
          outcome: 'committed' as const,
          operationCount: this.#operations.length,
          isolation: this.isolation,
          durability: this.capabilities.durability,
          providerBoundaryId: this.boundaryId,
          atomic: true as const,
          partialCommit: false as const,
          committedAt: at,
        });
      } catch (error) {
        this.state = 'failed';
        try {
          await this.client.query('ROLLBACK');
        } catch {
          // ignore rollback errors after primary failure
        }
        throw translatePostgresError(error, `persistence:transaction:${this.id}`);
      } finally {
        await this.release();
      }
    });
  }

  public async rollback(at: string): Promise<TransactionRollbackResult> {
    return withPostgresErrors(`persistence:transaction:${this.id}`, async () => {
      if (this.state !== 'active' && this.state !== 'failed') {
        throw new PersistenceError(
          'TRANSACTION_STATE_INVALID',
          'Transaction cannot roll back',
          `persistence:transaction:${this.id}`,
        );
      }
      try {
        if (this.state === 'active') await this.client.query('ROLLBACK');
      } finally {
        this.state = 'rolled-back';
        await this.release();
      }
      return freeze({
        transactionId: this.id,
        outcome: 'rolled-back' as const,
        operationCount: this.#operations.length,
        providerBoundaryId: this.boundaryId,
        partialCommit: false as const,
        rolledBackAt: at,
      });
    });
  }

  private async release(): Promise<void> {
    if (this.#released) return;
    this.#released = true;
    this.client.release();
  }
}

export async function beginPostgresTransaction(
  pool: PostgresPool,
  request: TransactionRequest,
  capabilities: ProviderCapabilities,
): Promise<PostgresPersistenceTransaction> {
  if (request.isolation === 'snapshot') {
    throw new PersistenceError(
      'UNSUPPORTED_CAPABILITY',
      'Requested isolation unavailable',
      `persistence:transaction:${request.id}`,
    );
  }
  const sqlLevel = isolationSql[request.isolation];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${sqlLevel}`);
    return new PostgresPersistenceTransaction(client, request, capabilities);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    client.release();
    throw translatePostgresError(error, `persistence:transaction:${request.id}`);
  }
}

async function applySave(client: PostgresPoolClient, write: EntityWrite): Promise<void> {
  const key = scopeKey(write.scope);
  const diagnosticId = `persistence:entity:${write.id}`;
  const existing = await client.query(
    `SELECT revision, version_token FROM persistence_entities
     WHERE repository = $1 AND scope_key = $2 AND id = $3
     FOR UPDATE`,
    [write.repository, key, write.id],
  );
  const row = existing.rows[0] as { revision: string | number; version_token: string } | undefined;
  if (row === undefined) {
    if (write.expectedRevision !== undefined || write.expectedVersionToken !== undefined) {
      throw new PersistenceError(
        'OPTIMISTIC_LOCK_FAILED',
        'Entity does not match expected version',
        diagnosticId,
      );
    }
    const token = newVersionToken();
    try {
      await client.query(
        `INSERT INTO persistence_entities (
           repository, scope_key, id, tenant_id, workspace_id, data, revision, version_token, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,1,$7,$8::timestamptz,$8::timestamptz)`,
        [
          write.repository,
          key,
          write.id,
          write.scope.tenantId,
          write.scope.workspaceId ?? null,
          toJson(write.data, diagnosticId),
          token,
          write.occurredAt,
        ],
      );
    } catch (error) {
      const translated = translatePostgresError(error, diagnosticId);
      if (translated.code === 'DUPLICATE_ENTITY') throw translated;
      throw translated;
    }
    return;
  }
  if (
    write.expectedRevision !== Number(row.revision) ||
    write.expectedVersionToken !== row.version_token
  ) {
    throw new PersistenceError('OPTIMISTIC_LOCK_FAILED', 'Stale entity write rejected', diagnosticId);
  }
  const token = newVersionToken();
  const updated = await client.query(
    `UPDATE persistence_entities
     SET data = $1::jsonb,
         revision = revision + 1,
         version_token = $2,
         updated_at = $3::timestamptz
     WHERE repository = $4 AND scope_key = $5 AND id = $6
       AND revision = $7 AND version_token = $8`,
    [
      toJson(write.data, diagnosticId),
      token,
      write.occurredAt,
      write.repository,
      key,
      write.id,
      write.expectedRevision,
      write.expectedVersionToken,
    ],
  );
  if ((updated.rowCount ?? 0) === 0) {
    throw new PersistenceError('OPTIMISTIC_LOCK_FAILED', 'Stale entity write rejected', diagnosticId);
  }
}

async function applyDelete(client: PostgresPoolClient, deletion: EntityDelete): Promise<void> {
  const diagnosticId = `persistence:entity:${deletion.id}`;
  const key = scopeKey(deletion.scope);
  const existing = await client.query(
    `SELECT revision, version_token FROM persistence_entities
     WHERE repository = $1 AND scope_key = $2 AND id = $3
     FOR UPDATE`,
    [deletion.repository, key, deletion.id],
  );
  const row = existing.rows[0] as { revision: string | number; version_token: string } | undefined;
  if (row === undefined) {
    throw new PersistenceError('ENTITY_NOT_FOUND', 'Entity not found', diagnosticId);
  }
  if (
    deletion.expectedRevision !== Number(row.revision) ||
    deletion.expectedVersionToken !== row.version_token
  ) {
    throw new PersistenceError('OPTIMISTIC_LOCK_FAILED', 'Stale entity delete rejected', diagnosticId);
  }
  const deleted = await client.query(
    `DELETE FROM persistence_entities
     WHERE repository = $1 AND scope_key = $2 AND id = $3
       AND revision = $4 AND version_token = $5`,
    [
      deletion.repository,
      key,
      deletion.id,
      deletion.expectedRevision,
      deletion.expectedVersionToken,
    ],
  );
  if ((deleted.rowCount ?? 0) === 0) {
    throw new PersistenceError('OPTIMISTIC_LOCK_FAILED', 'Stale entity delete rejected', diagnosticId);
  }
}
