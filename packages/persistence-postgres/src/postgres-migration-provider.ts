import {
  PersistenceError,
  freeze,
  type MigrationPlan,
  type MigrationProvider,
  type MigrationResult,
} from '@agentprodready/persistence';
import { withPostgresErrors } from './postgres-error-translation.js';
import type { PostgresPool } from './pool.js';
import { PERSISTENCE_POSTGRES_BOUNDARY_ID } from './config.js';

export class PostgresMigrationProvider implements MigrationProvider {
  public constructor(private readonly pool: PostgresPool) {}

  public async apply(plan: MigrationPlan): Promise<MigrationResult> {
    return withPostgresErrors(`persistence:migration:${plan.id}`, async () => {
      if (plan.providerBoundaryId !== PERSISTENCE_POSTGRES_BOUNDARY_ID) {
        throw new PersistenceError(
          'CROSS_PROVIDER_TRANSACTION',
          'Migration provider boundary mismatch',
          `persistence:migration:${plan.id}`,
        );
      }
      const existing = await this.pool.query(
        `SELECT outcome FROM persistence_migration_records WHERE plan_id = $1`,
        [plan.id],
      );
      const row = existing.rows[0] as { outcome: string } | undefined;
      if (row?.outcome === 'applied') {
        return freeze({
          planId: plan.id,
          version: plan.version,
          outcome: 'already-applied' as const,
          providerBoundaryId: plan.providerBoundaryId,
          appliedAt: plan.createdAt,
          rollbackAvailable: true as const,
        });
      }
      await this.pool.query(
        `INSERT INTO persistence_migration_records (
           plan_id, version, provider_boundary_id, outcome, applied_at, rollback_plan_reference
         ) VALUES ($1,$2,$3,'applied',$4::timestamptz,$5)
         ON CONFLICT (plan_id) DO UPDATE SET
           outcome = 'applied',
           version = EXCLUDED.version,
           applied_at = EXCLUDED.applied_at,
           rollback_plan_reference = EXCLUDED.rollback_plan_reference`,
        [
          plan.id,
          plan.version,
          plan.providerBoundaryId,
          plan.createdAt,
          plan.rollbackPlanReference,
        ],
      );
      return freeze({
        planId: plan.id,
        version: plan.version,
        outcome: 'applied' as const,
        providerBoundaryId: plan.providerBoundaryId,
        appliedAt: plan.createdAt,
        rollbackAvailable: true as const,
      });
    });
  }

  public async rollback(plan: MigrationPlan, at: string): Promise<MigrationResult> {
    return withPostgresErrors(`persistence:migration:${plan.id}`, async () => {
      await this.pool.query(
        `INSERT INTO persistence_migration_records (
           plan_id, version, provider_boundary_id, outcome, applied_at, rollback_plan_reference
         ) VALUES ($1,$2,$3,'rolled-back',$4::timestamptz,$5)
         ON CONFLICT (plan_id) DO UPDATE SET
           outcome = 'rolled-back',
           applied_at = EXCLUDED.applied_at`,
        [
          plan.id,
          plan.version,
          plan.providerBoundaryId,
          at,
          plan.rollbackPlanReference,
        ],
      );
      return freeze({
        planId: plan.id,
        version: plan.version,
        outcome: 'rolled-back' as const,
        providerBoundaryId: plan.providerBoundaryId,
        appliedAt: at,
        rollbackAvailable: true as const,
      });
    });
  }
}
