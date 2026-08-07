import {
  PersistenceError,
  freeze,
  type PersistenceProvider,
  type ProviderCapabilities,
  type Repository,
  type UnitOfWork,
} from '@agentprodready/persistence';
import {
  PERSISTENCE_POSTGRES_BOUNDARY_ID,
  PERSISTENCE_POSTGRES_PROVIDER_ID,
  type PostgresPersistenceConfig,
} from './config.js';
import { translatePostgresError } from './postgres-error-translation.js';
import { closePostgresPool, createPostgresPool, type PostgresPool } from './pool.js';
import { PostgresRepository } from './postgres-repository.js';
import { beginPostgresTransaction } from './postgres-transaction.js';
import { requiredMigrationsApplied } from './migrator.js';

export class PostgresPersistenceProvider implements PersistenceProvider {
  public readonly capabilities: ProviderCapabilities;
  readonly #pool: PostgresPool;

  public constructor(config: PostgresPersistenceConfig, pool?: PostgresPool) {
    this.capabilities = freeze({
      providerId: PERSISTENCE_POSTGRES_PROVIDER_ID,
      boundaryId: PERSISTENCE_POSTGRES_BOUNDARY_ID,
      isolationLevels: ['read-committed', 'repeatable-read', 'serializable'],
      defaultIsolation: 'read-committed',
      atomicTransactions: true,
      rollback: true,
      durability: 'durable',
      snapshots: true,
      migrations: true,
      maximumRepositoriesPerTransaction: 32,
      crossProviderAtomicity: false,
    });
    this.#pool = pool ?? createPostgresPool(config);
  }

  public get pool(): PostgresPool {
    return this.#pool;
  }

  public repository<T = unknown>(name: string): Repository<T> {
    return new PostgresRepository<T>(name, this.capabilities.boundaryId, this.#pool);
  }

  public unitOfWork(): UnitOfWork {
    return {
      begin: async (request) => beginPostgresTransaction(this.#pool, request, this.capabilities),
    };
  }

  public async assertReady(): Promise<void> {
    try {
      await this.#pool.query('SELECT 1');
      const ready = await requiredMigrationsApplied(this.#pool);
      if (!ready) {
        throw new PersistenceError(
          'MIGRATION_FAILED',
          'Required PostgreSQL persistence migrations are not applied',
          'persistence:postgres:ready',
        );
      }
    } catch (error) {
      throw translatePostgresError(error, 'persistence:postgres:ready');
    }
  }

  public async close(): Promise<void> {
    await closePostgresPool(this.#pool);
  }
}
