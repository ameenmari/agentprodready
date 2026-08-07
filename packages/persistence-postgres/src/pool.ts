import pg from 'pg';
import type { PostgresPersistenceConfig } from './config.js';

export type PostgresPool = pg.Pool;
export type PostgresPoolClient = pg.PoolClient;

export function createPostgresPool(config: PostgresPersistenceConfig): PostgresPool {
  return new pg.Pool({
    connectionString: config.connectionString,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    min: config.poolMin,
    max: config.poolMax,
  });
}

export async function closePostgresPool(pool: PostgresPool): Promise<void> {
  await pool.end();
}
