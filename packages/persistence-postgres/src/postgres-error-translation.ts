import { PersistenceError, type PersistenceErrorCode } from '@agentprodready/persistence';

interface PgLikeError {
  readonly code?: string;
  readonly message?: string;
}

function isPgLike(error: unknown): error is PgLikeError {
  return typeof error === 'object' && error !== null;
}

function codeForPg(code: string | undefined, message: string): PersistenceErrorCode {
  switch (code) {
    case '23505':
      return 'DUPLICATE_ENTITY';
    case '23503':
    case '23514':
    case '23502':
    case '22021':
      return 'CONSTRAINT_VIOLATION';
    case '40001':
    case '40P01':
      return 'TRANSACTION_FAILED';
    case '57014':
      return 'PERSISTENCE_TIMEOUT';
    case '28P01':
    case '28000':
    case '3D000':
    case '57P03':
    case '08001':
    case '08006':
    case '53300':
      return 'PROVIDER_UNAVAILABLE';
    default:
      break;
  }
  const lower = message.toLowerCase();
  if (lower.includes('timeout') || lower.includes('timed out')) return 'PERSISTENCE_TIMEOUT';
  if (
    lower.includes('econnrefused') ||
    lower.includes('connect econnrefused') ||
    lower.includes('connection refused') ||
    lower.includes('getaddrinfo') ||
    lower.includes('password authentication failed') ||
    lower.includes('the database system is starting up')
  ) {
    return 'PROVIDER_UNAVAILABLE';
  }
  return 'TRANSACTION_FAILED';
}

export function translatePostgresError(error: unknown, diagnosticId: string): PersistenceError {
  if (error instanceof PersistenceError) return error;
  const message = isPgLike(error) && typeof error.message === 'string' ? error.message : 'PostgreSQL provider failure';
  const pgCode = isPgLike(error) ? error.code : undefined;
  const code = codeForPg(pgCode, message);
  return new PersistenceError(code, 'PostgreSQL persistence operation failed', diagnosticId, {
    cause: error instanceof Error ? error : undefined,
  });
}

export async function withPostgresErrors<T>(
  diagnosticId: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw translatePostgresError(error, diagnosticId);
  }
}
