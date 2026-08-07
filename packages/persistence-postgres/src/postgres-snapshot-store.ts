import {
  PersistenceError,
  freeze,
  type PersistenceSnapshot,
  type SnapshotStore,
} from '@agentforge/persistence';
import { withPostgresErrors, translatePostgresError } from './postgres-error-translation.js';
import type { PostgresPool } from './pool.js';
import { fromJson, mapEntityRow, toJson } from './serialize.js';

export class PostgresSnapshotStore implements SnapshotStore {
  public constructor(private readonly pool: PostgresPool) {}

  public async save(value: PersistenceSnapshot): Promise<void> {
    await withPostgresErrors(`persistence:snapshot:${value.id}`, async () => {
      try {
        await this.pool.query(
          `INSERT INTO persistence_snapshots (
             id, repository, tenant_id, workspace_id, provider_boundary_id,
             entities, source_revision_digest, created_at, immutable
           ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::timestamptz,TRUE)`,
          [
            value.id,
            value.repository,
            value.scope.tenantId,
            value.scope.workspaceId ?? null,
            value.providerBoundaryId,
            toJson(value.entities, `persistence:snapshot:${value.id}`),
            value.sourceRevisionDigest,
            value.createdAt,
          ],
        );
      } catch (error) {
        throw translatePostgresError(error, `persistence:snapshot:${value.id}`);
      }
    });
  }

  public async get(id: string): Promise<PersistenceSnapshot | undefined> {
    return withPostgresErrors(`persistence:snapshot:${id}`, async () => {
      const result = await this.pool.query(
        `SELECT id, repository, tenant_id, workspace_id, provider_boundary_id,
                entities, source_revision_digest, created_at, immutable
         FROM persistence_snapshots WHERE id = $1`,
        [id],
      );
      const row = result.rows[0] as
        | {
            id: string;
            repository: string;
            tenant_id: string;
            workspace_id: string | null;
            provider_boundary_id: string;
            entities: unknown;
            source_revision_digest: string;
            created_at: Date | string;
            immutable: boolean;
          }
        | undefined;
      if (row === undefined) return undefined;
      if (!row.immutable) {
        throw new PersistenceError(
          'CONSTRAINT_VIOLATION',
          'Snapshot immutability violated',
          `persistence:snapshot:${id}`,
        );
      }
      const entitiesRaw = fromJson(row.entities, `persistence:snapshot:${id}`) as readonly {
        id: string;
        tenant_id?: string;
        workspace_id?: string | null;
        scope?: { tenantId: string; workspaceId?: string };
        data: unknown;
        revision: number;
        versionToken?: string;
        version_token?: string;
        createdAt?: string;
        created_at?: string;
        updatedAt?: string;
        updated_at?: string;
      }[];
      const entities = entitiesRaw.map((entity) => {
        if (entity.scope !== undefined) {
          return freeze({
            id: entity.id,
            scope: freeze({
              tenantId: entity.scope.tenantId,
              ...(entity.scope.workspaceId === undefined ? {} : { workspaceId: entity.scope.workspaceId }),
            }),
            data: entity.data,
            revision: entity.revision,
            versionToken: entity.versionToken ?? entity.version_token ?? '',
            createdAt: entity.createdAt ?? entity.created_at ?? '',
            updatedAt: entity.updatedAt ?? entity.updated_at ?? '',
          });
        }
        return mapEntityRow({
          id: entity.id,
          tenant_id: entity.tenant_id ?? '',
          workspace_id: entity.workspace_id ?? null,
          data: entity.data,
          revision: entity.revision,
          version_token: entity.version_token ?? '',
          created_at: entity.created_at ?? new Date().toISOString(),
          updated_at: entity.updated_at ?? new Date().toISOString(),
        });
      });
      const createdAt =
        row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
      return freeze({
        id: row.id,
        repository: row.repository,
        providerBoundaryId: row.provider_boundary_id,
        scope: freeze({
          tenantId: row.tenant_id,
          ...(row.workspace_id === null || row.workspace_id === ''
            ? {}
            : { workspaceId: row.workspace_id }),
        }),
        entities,
        createdAt,
        sourceRevisionDigest: row.source_revision_digest,
        immutable: true as const,
        auditHistory: false as const,
      });
    });
  }
}
