import { describe, expect, it } from 'vitest';
import { PersistenceError } from '@agentprodready/persistence';
import {
  loadPersistenceProviderSelection,
  loadPostgresPersistenceConfig,
  redactConnectionString,
} from './config.js';
import { translatePostgresError } from './postgres-error-translation.js';
import { fromJson, scopeKey, toJson } from './serialize.js';

describe('postgres persistence config', () => {
  it('defaults provider selection to in-memory', () => {
    expect(loadPersistenceProviderSelection({})).toBe('in-memory');
  });

  it('accepts postgres selection', () => {
    expect(loadPersistenceProviderSelection({ PERSISTENCE_PROVIDER: 'postgres' })).toBe('postgres');
  });

  it('rejects unknown provider selection', () => {
    expect(() => loadPersistenceProviderSelection({ PERSISTENCE_PROVIDER: 'mysql' })).toThrow(
      /in-memory or postgres/,
    );
  });

  it('requires DATABASE_URL or discrete host vars for postgres config', () => {
    expect(() => loadPostgresPersistenceConfig({})).toThrow(/DATABASE_URL/);
  });

  it('loads DATABASE_URL with pool and SSL defaults', () => {
    const config = loadPostgresPersistenceConfig({
      DATABASE_URL: 'postgres://agentprodready:secret@127.0.0.1:5432/agentprodready',
    });
    expect(config).toMatchObject({
      connectionString: 'postgres://agentprodready:secret@127.0.0.1:5432/agentprodready',
      ssl: false,
      poolMin: 0,
      poolMax: 10,
    });
  });

  it('validates SSL and pool bounds', () => {
    expect(() =>
      loadPostgresPersistenceConfig({
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
        POSTGRES_SSL: 'maybe',
      }),
    ).toThrow(/POSTGRES_SSL/);
    expect(() =>
      loadPostgresPersistenceConfig({
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
        POSTGRES_POOL_MIN: '5',
        POSTGRES_POOL_MAX: '2',
      }),
    ).toThrow(/POSTGRES_POOL_MAX/);
  });

  it('builds connection string from discrete variables', () => {
    const config = loadPostgresPersistenceConfig({
      POSTGRES_HOST: 'db.local',
      POSTGRES_PORT: '5433',
      POSTGRES_DATABASE: 'af',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pw',
    });
    expect(config.connectionString).toBe('postgres://user:pw@db.local:5433/af');
  });

  it('rejects non-postgres URL schemes', () => {
    expect(() =>
      loadPostgresPersistenceConfig({ DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow(/postgres/);
  });

  it('redacts credentials from connection strings', () => {
    expect(redactConnectionString('postgres://agentprodready:secret@127.0.0.1:5432/agentprodready')).toContain(
      '***',
    );
    expect(redactConnectionString('postgres://agentprodready:secret@127.0.0.1:5432/agentprodready')).not.toContain(
      'secret',
    );
  });
});

describe('serialize helpers', () => {
  it('builds portable scope keys', () => {
    expect(scopeKey({ tenantId: 't1' })).toBe('t1\u001f');
    expect(scopeKey({ tenantId: 't1', workspaceId: 'w1' })).toBe('t1\u001fw1');
  });

  it('round-trips JSON and rejects circular structures', () => {
    expect(fromJson(toJson({ a: 1 }, 'd'), 'd')).toEqual({ a: 1 });
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => toJson(circular, 'd')).toThrow(PersistenceError);
  });
});

describe('postgres error translation', () => {
  it('maps unique, constraint, timeout, and unavailable codes', () => {
    expect(translatePostgresError({ code: '23505', message: 'duplicate' }, 'd').code).toBe(
      'DUPLICATE_ENTITY',
    );
    expect(translatePostgresError({ code: '23503', message: 'fk' }, 'd').code).toBe(
      'CONSTRAINT_VIOLATION',
    );
    expect(translatePostgresError({ code: '40001', message: 'serialization' }, 'd').code).toBe(
      'TRANSACTION_FAILED',
    );
    expect(translatePostgresError({ code: '57014', message: 'cancel' }, 'd').code).toBe(
      'PERSISTENCE_TIMEOUT',
    );
    expect(translatePostgresError({ code: '28P01', message: 'auth' }, 'd').code).toBe(
      'PROVIDER_UNAVAILABLE',
    );
    expect(translatePostgresError(new Error('connect ECONNREFUSED'), 'd').code).toBe(
      'PROVIDER_UNAVAILABLE',
    );
  });

  it('does not leak raw driver messages into PersistenceError.message', () => {
    const error = translatePostgresError(
      { code: '28P01', message: 'password authentication failed for user "x"' },
      'd',
    );
    expect(error.message).toBe('PostgreSQL persistence operation failed');
    expect(error.message).not.toMatch(/password/);
  });
});
