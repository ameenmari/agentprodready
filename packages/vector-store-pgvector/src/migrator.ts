import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VectorStoreError } from '@agentforge/vector-store';
import {
  loadVectorIndexProfile,
  loadVectorPostgresConfig,
  redactConnectionString,
  type VectorIndexProfile,
  type VectorPostgresConfig,
} from './config.js';
import { translatePgvectorError } from './pgvector-error-translation.js';
import { closePostgresPool, createPostgresPool, type PostgresPool } from './pool.js';

export interface MigrationStatusEntry {
  readonly id: string;
  readonly profileId: VectorIndexProfile;
  readonly applied: boolean;
  readonly appliedAt?: string;
}

function migrationsRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', 'migrations', 'profiles');
}

function profileMigrationsDirectory(profile: VectorIndexProfile): string {
  return join(migrationsRoot(), profile);
}

async function listForwardMigrations(profile: VectorIndexProfile): Promise<readonly string[]> {
  const entries = await readdir(profileMigrationsDirectory(profile));
  return entries
    .filter((name) => /^\d+_[\w-]+\.sql$/u.test(name) && !name.endsWith('.down.sql'))
    .sort((a, b) => a.localeCompare(b));
}

function migrationIdFromFilename(profile: VectorIndexProfile, filename: string): string {
  return `${profile}/${filename.replace(/\.sql$/u, '')}`;
}

async function ensureSchemaMigrationsTable(pool: PostgresPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vector_schema_migrations (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL
    )
  `);
}

async function listPending(
  pool: PostgresPool,
  profile: VectorIndexProfile,
): Promise<readonly string[]> {
  const files = await listForwardMigrations(profile);
  const applied = await pool.query(
    `SELECT id FROM vector_schema_migrations WHERE profile_id = $1`,
    [profile],
  );
  const appliedIds = new Set(
    (applied.rows as readonly { id: string }[]).map((row) => row.id),
  );
  return files
    .map((file) => migrationIdFromFilename(profile, file))
    .filter((id) => !appliedIds.has(id));
}

export async function requiredMigrationsApplied(
  pool: PostgresPool,
  profile: VectorIndexProfile,
): Promise<boolean> {
  await ensureSchemaMigrationsTable(pool);
  const pending = await listPending(pool, profile);
  return pending.length === 0;
}

export async function migrationStatus(
  config: VectorPostgresConfig = loadVectorPostgresConfig(),
  profile: VectorIndexProfile = loadVectorIndexProfile(),
): Promise<readonly MigrationStatusEntry[]> {
  const pool = createPostgresPool(config);
  try {
    await ensureSchemaMigrationsTable(pool);
    const files = await listForwardMigrations(profile);
    const applied = await pool.query(
      `SELECT id, applied_at FROM vector_schema_migrations WHERE profile_id = $1`,
      [profile],
    );
    const appliedMap = new Map(
      (applied.rows as readonly { id: string; applied_at: Date }[]).map((row) => [
        row.id,
        row.applied_at instanceof Date ? row.applied_at.toISOString() : String(row.applied_at),
      ]),
    );
    return files.map((file) => {
      const id = migrationIdFromFilename(profile, file);
      const appliedAt = appliedMap.get(id);
      return appliedAt === undefined
        ? { id, profileId: profile, applied: false }
        : { id, profileId: profile, applied: true, appliedAt };
    });
  } catch (error) {
    throw translatePgvectorError(error, 'vector-store:pgvector:migrate:status');
  } finally {
    await closePostgresPool(pool);
  }
}

export async function applyMigrations(
  config: VectorPostgresConfig = loadVectorPostgresConfig(),
  profile: VectorIndexProfile = loadVectorIndexProfile(),
): Promise<readonly string[]> {
  const pool = createPostgresPool(config);
  const appliedNow: string[] = [];
  try {
    await ensureSchemaMigrationsTable(pool);
    const files = await listForwardMigrations(profile);
    for (const file of files) {
      const id = migrationIdFromFilename(profile, file);
      const existing = await pool.query(
        `SELECT 1 FROM vector_schema_migrations WHERE id = $1`,
        [id],
      );
      if ((existing.rowCount ?? 0) > 0) continue;
      const sql = await readFile(join(profileMigrationsDirectory(profile), file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO vector_schema_migrations (id, profile_id, applied_at) VALUES ($1, $2, NOW())`,
          [id, profile],
        );
        await client.query('COMMIT');
        appliedNow.push(id);
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore
        }
        throw new VectorStoreError(
          'VECTOR_UNKNOWN',
          `Failed to apply vector migration ${id}`,
          `vector-store:pgvector:migrate:${id}`,
          { cause: error instanceof Error ? error : undefined },
        );
      } finally {
        client.release();
      }
    }
    return appliedNow;
  } catch (error) {
    if (error instanceof VectorStoreError) throw error;
    throw translatePgvectorError(error, 'vector-store:pgvector:migrate');
  } finally {
    await closePostgresPool(pool);
  }
}

export async function rollbackLastMigration(
  config: VectorPostgresConfig = loadVectorPostgresConfig(),
  profile: VectorIndexProfile = loadVectorIndexProfile(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | undefined> {
  if (env['VECTOR_ALLOW_RESET'] !== '1' && env['PERSISTENCE_ALLOW_RESET'] !== '1') {
    throw new Error(
      'Destructive vector migration rollback requires VECTOR_ALLOW_RESET=1 (or PERSISTENCE_ALLOW_RESET=1)',
    );
  }
  const pool = createPostgresPool(config);
  try {
    await ensureSchemaMigrationsTable(pool);
    const applied = await pool.query(
      `SELECT id FROM vector_schema_migrations WHERE profile_id = $1 ORDER BY applied_at DESC, id DESC LIMIT 1`,
      [profile],
    );
    const row = applied.rows[0] as { id: string } | undefined;
    if (row === undefined) return undefined;
    const filename = row.id.slice(profile.length + 1);
    const downFile = `${filename}.down.sql`;
    const sql = await readFile(join(profileMigrationsDirectory(profile), downFile), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`DELETE FROM vector_schema_migrations WHERE id = $1`, [row.id]);
      await client.query('COMMIT');
      return row.id;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw new VectorStoreError(
        'VECTOR_UNKNOWN',
        `Failed to roll back vector migration ${row.id}`,
        `vector-store:pgvector:migrate:${row.id}`,
        { cause: error instanceof Error ? error : undefined },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof VectorStoreError || error instanceof Error) throw error;
    throw translatePgvectorError(error, 'vector-store:pgvector:migrate:down');
  } finally {
    await closePostgresPool(pool);
  }
}

export function describeMigratorTarget(config: VectorPostgresConfig): string {
  return redactConnectionString(config.connectionString);
}
