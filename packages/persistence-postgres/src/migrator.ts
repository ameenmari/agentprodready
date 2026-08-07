import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PersistenceError } from '@agentprodready/persistence';
import type { PostgresPersistenceConfig } from './config.js';
import { loadPostgresPersistenceConfig, redactConnectionString } from './config.js';
import { translatePostgresError } from './postgres-error-translation.js';
import { closePostgresPool, createPostgresPool, type PostgresPool } from './pool.js';

export interface MigrationStatusEntry {
  readonly id: string;
  readonly applied: boolean;
  readonly appliedAt?: string;
}

function migrationsDirectory(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/ -> ../migrations ; src/ -> ../migrations
  return join(here, '..', 'migrations');
}

async function listForwardMigrations(): Promise<readonly string[]> {
  const entries = await readdir(migrationsDirectory());
  return entries
    .filter((name) => /^\d+_[\w-]+\.sql$/u.test(name) && !name.endsWith('.down.sql'))
    .sort((a, b) => a.localeCompare(b));
}

function migrationIdFromFilename(filename: string): string {
  return filename.replace(/\.sql$/u, '');
}

async function ensureSchemaMigrationsTable(pool: PostgresPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL
    )
  `);
}

export async function requiredMigrationsApplied(pool: PostgresPool): Promise<boolean> {
  await ensureSchemaMigrationsTable(pool);
  const pending = await listPending(pool);
  return pending.length === 0;
}

async function listPending(pool: PostgresPool): Promise<readonly string[]> {
  const files = await listForwardMigrations();
  const applied = await pool.query(`SELECT id FROM schema_migrations`);
  const appliedIds = new Set(
    (applied.rows as readonly { id: string }[]).map((row) => row.id),
  );
  return files
    .map(migrationIdFromFilename)
    .filter((id) => !appliedIds.has(id));
}

export async function migrationStatus(
  config: PostgresPersistenceConfig = loadPostgresPersistenceConfig(),
): Promise<readonly MigrationStatusEntry[]> {
  const pool = createPostgresPool(config);
  try {
    await ensureSchemaMigrationsTable(pool);
    const files = await listForwardMigrations();
    const applied = await pool.query(`SELECT id, applied_at FROM schema_migrations`);
    const appliedMap = new Map(
      (applied.rows as readonly { id: string; applied_at: Date }[]).map((row) => [
        row.id,
        row.applied_at instanceof Date ? row.applied_at.toISOString() : String(row.applied_at),
      ]),
    );
    return files.map((file) => {
      const id = migrationIdFromFilename(file);
      const appliedAt = appliedMap.get(id);
      return appliedAt === undefined
        ? { id, applied: false }
        : { id, applied: true, appliedAt };
    });
  } catch (error) {
    throw translatePostgresError(error, 'persistence:migrate:status');
  } finally {
    await closePostgresPool(pool);
  }
}

export async function applyMigrations(
  config: PostgresPersistenceConfig = loadPostgresPersistenceConfig(),
): Promise<readonly string[]> {
  const pool = createPostgresPool(config);
  const appliedNow: string[] = [];
  try {
    await ensureSchemaMigrationsTable(pool);
    const files = await listForwardMigrations();
    for (const file of files) {
      const id = migrationIdFromFilename(file);
      const existing = await pool.query(`SELECT 1 FROM schema_migrations WHERE id = $1`, [id]);
      if ((existing.rowCount ?? 0) > 0) continue;
      const sql = await readFile(join(migrationsDirectory(), file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW())`, [
          id,
        ]);
        await client.query('COMMIT');
        appliedNow.push(id);
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore
        }
        throw new PersistenceError(
          'MIGRATION_FAILED',
          `Failed to apply migration ${id}`,
          `persistence:migrate:${id}`,
          { cause: error instanceof Error ? error : undefined },
        );
      } finally {
        client.release();
      }
    }
    return appliedNow;
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw translatePostgresError(error, 'persistence:migrate');
  } finally {
    await closePostgresPool(pool);
  }
}

export async function rollbackLastMigration(
  config: PostgresPersistenceConfig = loadPostgresPersistenceConfig(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | undefined> {
  if (env['PERSISTENCE_ALLOW_RESET'] !== '1') {
    throw new Error('Destructive migration rollback requires PERSISTENCE_ALLOW_RESET=1');
  }
  const pool = createPostgresPool(config);
  try {
    await ensureSchemaMigrationsTable(pool);
    const applied = await pool.query(
      `SELECT id FROM schema_migrations ORDER BY applied_at DESC, id DESC LIMIT 1`,
    );
    const row = applied.rows[0] as { id: string } | undefined;
    if (row === undefined) return undefined;
    const downFile = `${row.id}.down.sql`;
    const sql = await readFile(join(migrationsDirectory(), downFile), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`DELETE FROM schema_migrations WHERE id = $1`, [row.id]);
      await client.query('COMMIT');
      return row.id;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw new PersistenceError(
        'MIGRATION_FAILED',
        `Failed to roll back migration ${row.id}`,
        `persistence:migrate:${row.id}`,
        { cause: error instanceof Error ? error : undefined },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof PersistenceError || error instanceof Error) throw error;
    throw translatePostgresError(error, 'persistence:migrate:down');
  } finally {
    await closePostgresPool(pool);
  }
}

export async function resetTestDatabase(
  config: PostgresPersistenceConfig = loadPostgresPersistenceConfig(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (env['PERSISTENCE_ALLOW_RESET'] !== '1') {
    throw new Error('pnpm db:reset:test requires PERSISTENCE_ALLOW_RESET=1');
  }
  // Roll back all known downs then re-apply
  for (;;) {
    const rolled = await rollbackLastMigration(config, env);
    if (rolled === undefined) break;
  }
  await applyMigrations(config);
}

export function describeMigratorTarget(config: PostgresPersistenceConfig): string {
  return redactConnectionString(config.connectionString);
}
