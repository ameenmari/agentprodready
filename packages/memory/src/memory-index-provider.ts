import type { ExecutionContext, HealthResult } from '@agentprodready/foundation';

export type MemoryIndexRemoveReason = 'deleted' | 'expired' | 'archived' | 'reindex';

/** Structural record shape for indexing — satisfied by MemoryRecord. */
export interface IndexableMemoryRecord {
  readonly id: string;
  readonly ownership: { readonly tenantId: string };
  readonly securityLabels: readonly string[];
  readonly content: unknown;
  readonly version: string;
  readonly lifecycleVersion: number;
  readonly state: string;
}

/** Write-side derived index coordination — not a second search API. */
export interface MemoryIndexProvider {
  index(record: IndexableMemoryRecord, context: ExecutionContext): Promise<void>;
  remove(
    memoryId: string,
    tenantId: string,
    context: ExecutionContext,
    reason: MemoryIndexRemoveReason,
  ): Promise<void>;
  health(): Promise<HealthResult>;
}

export class NoopMemoryIndexProvider implements MemoryIndexProvider {
  public async index(_record: IndexableMemoryRecord, _context: ExecutionContext): Promise<void> {}

  public async remove(
    _memoryId: string,
    _tenantId: string,
    _context: ExecutionContext,
    _reason: MemoryIndexRemoveReason,
  ): Promise<void> {}

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: 'noop-memory-index', status: 'healthy' as const });
  }
}
