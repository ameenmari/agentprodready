import {
  PersistenceError,
  freeze,
  type PersistedEntity,
  type PersistenceScope,
  type QueryFilter,
  type QueryResult,
  type Repository,
  type RepositoryQuery,
} from '@agentforge/persistence';
import { withPostgresErrors } from './postgres-error-translation.js';
import type { PostgresPool, PostgresPoolClient } from './pool.js';
import { mapEntityRow, scopeKey } from './serialize.js';

type Queryable = Pick<PostgresPool, 'query'> | Pick<PostgresPoolClient, 'query'>;

export class PostgresRepository<T = unknown> implements Repository<T> {
  public constructor(
    public readonly name: string,
    public readonly providerBoundaryId: string,
    private readonly db: Queryable,
  ) {}

  public async find(id: string, scope: PersistenceScope): Promise<PersistedEntity<T> | undefined> {
    return withPostgresErrors(`persistence:entity:${id}`, async () => {
      const result = await this.db.query(
        `SELECT id, tenant_id, workspace_id, data, revision, version_token, created_at, updated_at
         FROM persistence_entities
         WHERE repository = $1 AND scope_key = $2 AND id = $3`,
        [this.name, scopeKey(scope), id],
      );
      const row = result.rows[0] as Parameters<typeof mapEntityRow>[0] | undefined;
      return row === undefined ? undefined : mapEntityRow<T>(row);
    });
  }

  public async exists(id: string, scope: PersistenceScope): Promise<boolean> {
    return withPostgresErrors(`persistence:entity:${id}`, async () => {
      const result = await this.db.query(
        `SELECT 1 FROM persistence_entities
         WHERE repository = $1 AND scope_key = $2 AND id = $3
         LIMIT 1`,
        [this.name, scopeKey(scope), id],
      );
      return (result.rowCount ?? 0) > 0;
    });
  }

  public async count(scope: PersistenceScope): Promise<number> {
    return withPostgresErrors(`persistence:repository:${this.name}`, async () => {
      const result = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM persistence_entities
         WHERE repository = $1 AND tenant_id = $2
           AND ($3::text IS NULL OR workspace_id IS NOT DISTINCT FROM $3::text)`,
        [this.name, scope.tenantId, scope.workspaceId ?? null],
      );
      const count = (result.rows[0] as { count: number | string }).count;
      return typeof count === 'number' ? count : Number(count);
    });
  }

  public async query(request: RepositoryQuery): Promise<QueryResult<T>> {
    return withPostgresErrors(`persistence:query:${request.id}`, async () => {
      if (request.limit < 1 || request.offset < 0) {
        throw new PersistenceError(
          'CONSTRAINT_VIOLATION',
          'Query pagination is invalid',
          `persistence:query:${request.id}`,
        );
      }
      const params: unknown[] = [this.name, request.scope.tenantId, request.scope.workspaceId ?? null];
      const where: string[] = [
        'repository = $1',
        'tenant_id = $2',
        '($3::text IS NULL OR workspace_id IS NOT DISTINCT FROM $3::text)',
      ];
      for (const filter of request.filters) {
        where.push(compileFilter(filter, params));
      }
      const order =
        request.sort.length === 0
          ? 'id ASC'
          : request.sort
              .map((item) => `${compileField(item.field)} ${item.direction === 'ascending' ? 'ASC' : 'DESC'}`)
              .join(', ');
      const whereSql = where.join(' AND ');
      const countResult = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM persistence_entities WHERE ${whereSql}`,
        params,
      );
      const countRaw = (countResult.rows[0] as { count: number | string }).count;
      const total = typeof countRaw === 'number' ? countRaw : Number(countRaw);
      const limitParam = params.length + 1;
      const offsetParam = params.length + 2;
      const pageParams = [...params, request.limit, request.offset];
      const rowsResult = await this.db.query(
        `SELECT id, tenant_id, workspace_id, data, revision, version_token, created_at, updated_at
         FROM persistence_entities
         WHERE ${whereSql}
         ORDER BY ${order}
         LIMIT $${String(limitParam)} OFFSET $${String(offsetParam)}`,
        pageParams,
      );
      const entities = (rowsResult.rows as Parameters<typeof mapEntityRow>[0][]).map((row) =>
        mapEntityRow<T>(row),
      );
      return freeze({
        queryId: request.id,
        entities,
        total,
        ...(request.aggregate === 'count' ? { aggregate: { count: total } } : {}),
        consistency: 'provider-snapshot' as const,
        providerBoundaryId: this.providerBoundaryId,
      });
    });
  }
}

function compileField(field: string): string {
  if (field === 'id') return 'id';
  if (field === 'revision') return 'revision';
  if (field === 'createdAt' || field === 'created_at') return 'created_at';
  if (field === 'updatedAt' || field === 'updated_at') return 'updated_at';
  if (field.startsWith('data.')) {
    const path = field
      .slice('data.'.length)
      .split('.')
      .map((part) => part.replace(/[^a-zA-Z0-9_]/gu, ''))
      .filter((part) => part.length > 0);
    if (path.length === 0) {
      throw new PersistenceError('CONSTRAINT_VIOLATION', 'Query field path is invalid', 'persistence:query');
    }
    return `data #>> '{${path.join(',')}}'`;
  }
  throw new PersistenceError('CONSTRAINT_VIOLATION', 'Query field is unsupported', 'persistence:query');
}

function compileFilter(filter: QueryFilter, params: unknown[]): string {
  const expr = compileField(filter.field);
  const push = (value: unknown): string => {
    params.push(value);
    return `$${String(params.length)}`;
  };
  const comparable =
    typeof filter.value === 'number' ? `(${expr})::numeric` : expr;
  switch (filter.operator) {
    case 'equals':
      return `${comparable} = ${push(filter.value)}`;
    case 'not-equals':
      return `${comparable} IS DISTINCT FROM ${push(filter.value)}`;
    case 'less-than':
      return `${comparable} < ${push(filter.value)}`;
    case 'less-than-or-equal':
      return `${comparable} <= ${push(filter.value)}`;
    case 'greater-than':
      return `${comparable} > ${push(filter.value)}`;
    case 'greater-than-or-equal':
      return `${comparable} >= ${push(filter.value)}`;
    case 'includes': {
      if (filter.field.startsWith('data.')) {
        const path = filter.field
          .slice('data.'.length)
          .split('.')
          .map((part) => part.replace(/[^a-zA-Z0-9_]/gu, ''))
          .filter((part) => part.length > 0);
        return `(data #> '{${path.join(',')}}') @> ${push(JSON.stringify(filter.value))}::jsonb`;
      }
      return `${expr} LIKE ${push(`%${String(filter.value)}%`)}`;
    }
    case 'exists':
      return filter.value === false ? `${expr} IS NULL` : `${expr} IS NOT NULL`;
    default:
      throw new PersistenceError('CONSTRAINT_VIOLATION', 'Query operator is unsupported', 'persistence:query');
  }
}
