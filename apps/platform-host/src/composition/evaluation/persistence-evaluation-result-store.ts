import type { EvaluationResult, EvaluationResultStore } from '@agentforge/evaluation';
import { ExternalEvaluationError } from '@agentforge/evaluation';
import type {
  PersistenceAuthorization,
  PersistenceProvider,
  PersistenceScope,
} from '@agentforge/persistence';
import { PersistenceError } from '@agentforge/persistence';

const REPOSITORY = 'evaluation-results';

/**
 * Host-owned append-only EvaluationResultStore over Blueprint 24 repositories.
 * Tenant-only Persistence scope; Evaluation package never imports Persistence.
 */
export class PersistenceEvaluationResultStore implements EvaluationResultStore {
  public constructor(private readonly provider: PersistenceProvider) {}

  public async save(result: EvaluationResult): Promise<void> {
    const scope = tenantScope(result.security.tenantId);
    const repository = this.provider.repository<EvaluationResult>(REPOSITORY);
    let existing;
    try {
      existing = await repository.find(result.id, scope);
    } catch (error) {
      throw mapError(error);
    }
    if (existing !== undefined) {
      throw new ExternalEvaluationError('pipeline', 'Evaluation result already stored');
    }
    const at = new Date().toISOString();
    const data = JSON.parse(JSON.stringify(result)) as EvaluationResult;
    const transaction = await this.provider.unitOfWork().begin({
      id: `evaluation-result:${result.id}:${at}`,
      boundaryId: this.provider.capabilities.boundaryId,
      repositoryNames: [REPOSITORY],
      isolation: 'read-committed',
      mandatoryDurability: this.provider.capabilities.durability,
      atomicityRequired: true,
      authorization: authorization(scope),
      correlationId: result.requestId,
      startedAt: at,
    });
    try {
      transaction.stage({
        type: 'save',
        write: {
          repository: REPOSITORY,
          id: result.id,
          scope,
          data,
          occurredAt: at,
        },
      });
      await transaction.commit(at);
    } catch (error) {
      try {
        await transaction.rollback(at);
      } catch {
        /* ignore */
      }
      throw mapError(error);
    }
  }

  public async load(resultId: string, tenantId: string): Promise<EvaluationResult | undefined> {
    try {
      const entity = await this.provider
        .repository<EvaluationResult>(REPOSITORY)
        .find(resultId, tenantScope(tenantId));
      if (entity === undefined) return undefined;
      return JSON.parse(JSON.stringify(entity.data)) as EvaluationResult;
    } catch (error) {
      throw mapError(error);
    }
  }
}

function tenantScope(tenantId: string): PersistenceScope {
  return Object.freeze({ tenantId });
}

function authorization(scope: PersistenceScope): PersistenceAuthorization {
  return Object.freeze({
    decisionId: 'evaluation-persistence:write',
    principalId: 'evaluation-result-store',
    operation: 'write',
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
  });
}

function mapError(error: unknown): ExternalEvaluationError {
  if (error instanceof ExternalEvaluationError) return error;
  if (error instanceof PersistenceError) {
    if (error.code === 'DUPLICATE_ENTITY') {
      return new ExternalEvaluationError('pipeline', 'Evaluation result already stored');
    }
    if (error.code === 'PROVIDER_UNAVAILABLE' || error.code === 'PERSISTENCE_TIMEOUT') {
      return new ExternalEvaluationError('unavailable', 'Evaluation result store unavailable');
    }
  }
  return new ExternalEvaluationError(
    'pipeline',
    error instanceof Error ? error.message : 'Evaluation result store failed',
  );
}
