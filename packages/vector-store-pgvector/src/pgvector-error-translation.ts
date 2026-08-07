import { VectorStoreError, type VectorStoreErrorCode } from '@agentprodready/vector-store';

interface PgLikeError {
  readonly code?: string;
  readonly message?: string;
}

function isPgLike(error: unknown): error is PgLikeError {
  return typeof error === 'object' && error !== null;
}

function codeForPg(code: string | undefined, message: string): VectorStoreErrorCode {
  switch (code) {
    case '28P01':
    case '28000':
    case '3D000':
    case '57P03':
    case '08001':
    case '08006':
    case '53300':
      return 'VECTOR_UNAVAILABLE';
    case '42P01':
    case '42704':
      return 'VECTOR_UNAVAILABLE';
    default:
      break;
  }
  const lower = message.toLowerCase();
  if (
    lower.includes('econnrefused') ||
    lower.includes('connection refused') ||
    lower.includes('getaddrinfo') ||
    lower.includes('password authentication failed') ||
    lower.includes('the database system is starting up') ||
    lower.includes('extension "vector"') ||
    lower.includes('type "vector"')
  ) {
    return 'VECTOR_UNAVAILABLE';
  }
  if (lower.includes('expected') && lower.includes('dimensions')) {
    return 'VECTOR_DIMENSION_MISMATCH';
  }
  return 'VECTOR_UNKNOWN';
}

function sanitizeMessage(message: string): string {
  // Never echo connection strings or credentials from driver messages.
  if (/postgres(ql)?:\/\//iu.test(message) || /password/iu.test(message)) {
    return 'PostgreSQL vector store operation failed';
  }
  return 'PostgreSQL vector store operation failed';
}

export function translatePgvectorError(error: unknown, diagnosticId: string): VectorStoreError {
  if (error instanceof VectorStoreError) return error;
  const rawMessage =
    isPgLike(error) && typeof error.message === 'string'
      ? error.message
      : 'PostgreSQL vector store operation failed';
  const pgCode = isPgLike(error) ? error.code : undefined;
  const code = codeForPg(pgCode, rawMessage);
  return new VectorStoreError(code, sanitizeMessage(rawMessage), diagnosticId, {
    cause: error instanceof Error ? error : undefined,
  });
}

export async function withPgvectorErrors<T>(
  diagnosticId: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw translatePgvectorError(error, diagnosticId);
  }
}
