import { ProviderAdapterError } from '@agentprodready/ai-provider';

export interface GeminiErrorLike {
  readonly status?: number;
  readonly statusCode?: number;
  readonly code?: string | number | null;
  readonly message?: string;
  readonly error?: {
    readonly code?: string | number | null;
    readonly message?: string;
    readonly status?: string;
  };
}

export function translateError(error: unknown): ProviderAdapterError {
  if (error instanceof ProviderAdapterError) return error;

  const like = asErrorLike(error);
  const status = like.status ?? like.statusCode;
  const code = normalizeCode(like.code ?? like.error?.code);
  const message = sanitizeMessage(like.message ?? like.error?.message ?? 'Gemini provider interaction failed');
  const lower = message.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    code.includes('unauthenticated') ||
    code.includes('permission_denied') ||
    lower.includes('api key') ||
    lower.includes('api_key')
  ) {
    return new ProviderAdapterError('authentication', message, false);
  }
  if (status === 429 || code.includes('resource_exhausted') || code.includes('rate') || lower.includes('quota')) {
    const quota = lower.includes('quota') || lower.includes('billing');
    return new ProviderAdapterError('rate-limit', message, !quota);
  }
  if (
    lower.includes('context') ||
    lower.includes('token') ||
    code.includes('invalid_argument') && (lower.includes('token') || lower.includes('length'))
  ) {
    if (lower.includes('token') || lower.includes('context') || lower.includes('length')) {
      return new ProviderAdapterError('context-limit', message, false);
    }
  }
  if (status === 408 || lower.includes('timed out') || code.includes('deadline_exceeded') || code.includes('timeout')) {
    return new ProviderAdapterError('timeout', message, true);
  }
  if (status === 400 || status === 404 || code.includes('invalid_argument') || code.includes('not_found')) {
    return new ProviderAdapterError('invalid-request', message, false);
  }
  if (status !== undefined && status >= 500) {
    return new ProviderAdapterError('unavailable', message, true);
  }
  if (isNetworkFailure(error)) {
    return new ProviderAdapterError('unavailable', message, true);
  }
  return new ProviderAdapterError('unknown', message, false);
}

function asErrorLike(error: unknown): GeminiErrorLike {
  if (typeof error !== 'object' || error === null) return { message: String(error) };
  return error;
}

function normalizeCode(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
}

function sanitizeMessage(message: string): string {
  return message.replace(/AIza[a-zA-Z0-9_-]{20,}/g, '[redacted]');
}

function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = String((error as { readonly code: unknown }).code);
  return ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code);
}
