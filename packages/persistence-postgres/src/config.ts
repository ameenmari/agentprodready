export const PERSISTENCE_POSTGRES_PROVIDER_ID = 'postgres';
export const PERSISTENCE_POSTGRES_BOUNDARY_ID = 'postgres-boundary';

export type PersistenceProviderSelection = 'in-memory' | 'postgres';

export interface PostgresPersistenceConfig {
  readonly connectionString: string;
  readonly ssl: boolean;
  readonly poolMin: number;
  readonly poolMax: number;
}

function parseBoolean(raw: string | undefined, name: string): boolean | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const value = raw.trim().toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`${name} must be true or false when set`);
}

function parseNonNegativeInt(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || String(value) !== raw.trim()) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function parsePositiveInt(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1 || String(value) !== raw.trim()) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function assertPostgresUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid postgres/postgresql URL');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres: or postgresql: scheme');
  }
  return value;
}

function buildConnectionStringFromDiscrete(env: NodeJS.ProcessEnv): string | undefined {
  const host = env['POSTGRES_HOST']?.trim();
  const database = env['POSTGRES_DATABASE']?.trim();
  const user = env['POSTGRES_USER']?.trim();
  if (host === undefined || host === '' || database === undefined || database === '' || user === undefined || user === '') {
    return undefined;
  }
  const portRaw = env['POSTGRES_PORT']?.trim() ?? '5432';
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error('POSTGRES_PORT must be a valid TCP port');
  }
  const password = env['POSTGRES_PASSWORD'] ?? '';
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const auth = password === '' ? encodedUser : `${encodedUser}:${encodedPassword}`;
  return `postgres://${auth}@${host}:${String(port)}/${encodeURIComponent(database)}`;
}

export function loadPersistenceProviderSelection(
  env: NodeJS.ProcessEnv = process.env,
): PersistenceProviderSelection {
  const raw = (env['PERSISTENCE_PROVIDER'] ?? 'in-memory').trim().toLowerCase();
  if (raw !== 'in-memory' && raw !== 'postgres') {
    throw new Error('PERSISTENCE_PROVIDER must be in-memory or postgres');
  }
  return raw;
}

export function loadPostgresPersistenceConfig(
  env: NodeJS.ProcessEnv = process.env,
): PostgresPersistenceConfig {
  const fromUrl = env['DATABASE_URL']?.trim();
  const connectionString =
    fromUrl !== undefined && fromUrl !== ''
      ? assertPostgresUrl(fromUrl)
      : buildConnectionStringFromDiscrete(env);
  if (connectionString === undefined) {
    throw new Error(
      'DATABASE_URL is required when PERSISTENCE_PROVIDER=postgres (or provide POSTGRES_HOST/POSTGRES_DATABASE/POSTGRES_USER)',
    );
  }

  const ssl = parseBoolean(env['POSTGRES_SSL'], 'POSTGRES_SSL') ?? false;
  const poolMin = parseNonNegativeInt(env['POSTGRES_POOL_MIN'], 'POSTGRES_POOL_MIN', 0);
  const poolMax = parsePositiveInt(env['POSTGRES_POOL_MAX'], 'POSTGRES_POOL_MAX', 10);
  if (poolMax < poolMin) {
    throw new Error('POSTGRES_POOL_MAX must be greater than or equal to POSTGRES_POOL_MIN');
  }

  return Object.freeze({
    connectionString,
    ssl,
    poolMin,
    poolMax,
  });
}

/** Redacts credentials from a connection string for diagnostics (never log secrets). */
export function redactConnectionString(value: string): string {
  try {
    const url = new URL(value);
    if (url.password !== '') url.password = '***';
    if (url.username !== '') url.username = url.username.length > 0 ? '***' : '';
    return url.toString();
  } catch {
    return 'postgres://***';
  }
}
