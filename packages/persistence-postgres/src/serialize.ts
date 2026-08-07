import { PersistenceError, freeze, type PersistedEntity, type PersistenceScope } from '@agentprodready/persistence';

/** Portable uniqueness key. Uses U+001F (not NUL) because PostgreSQL TEXT forbids 0x00. */
export function scopeKey(scope: PersistenceScope): string {
  return `${scope.tenantId}\u001f${scope.workspaceId ?? ''}`;
}

export function toJson(value: unknown, diagnosticId: string): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new PersistenceError(
      'CONSTRAINT_VIOLATION',
      'Persistence payload is not JSON-serializable',
      diagnosticId,
      { cause: error },
    );
  }
}

export function fromJson(value: unknown, diagnosticId: string): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new PersistenceError(
        'CONSTRAINT_VIOLATION',
        'Persistence payload JSON is invalid',
        diagnosticId,
        { cause: error },
      );
    }
  }
  return value;
}

export function mapEntityRow<T = unknown>(row: {
  readonly id: string;
  readonly tenant_id: string;
  readonly workspace_id: string | null;
  readonly data: unknown;
  readonly revision: string | number | bigint;
  readonly version_token: string;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}): PersistedEntity<T> {
  const diagnosticId = `persistence:entity:${row.id}`;
  const data = fromJson(row.data, diagnosticId) as T;
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  const updatedAt =
    row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString();
  return freeze({
    id: row.id,
    scope: freeze({
      tenantId: row.tenant_id,
      ...(row.workspace_id === null || row.workspace_id === ''
        ? {}
        : { workspaceId: row.workspace_id }),
    }),
    data,
    revision: Number(row.revision),
    versionToken: row.version_token,
    createdAt,
    updatedAt,
  });
}

export function newVersionToken(): string {
  return crypto.randomUUID();
}
