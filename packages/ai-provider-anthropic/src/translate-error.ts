import { ProviderAdapterError } from '@agentprodready/ai-provider';

export interface AnthropicErrorLike {
  readonly status?: number;
  readonly statusCode?: number;
  readonly type?: string;
  readonly message?: string;
  readonly error?: { readonly type?: string; readonly message?: string };
}

export function translateError(error: unknown): ProviderAdapterError {
  if (error instanceof ProviderAdapterError) return error;

  const like = asErrorLike(error);
  const status = like.status ?? like.statusCode;
  const type = normalizeCode(like.type ?? like.error?.type);
  const message = sanitizeMessage(like.message ?? like.error?.message ?? 'Anthropic provider interaction failed');
  const lower = message.toLowerCase();

  if (status === 401 || status === 403 || type.includes('authentication') || lower.includes('api key')) {
    return new ProviderAdapterError('authentication', message, false);
  }
  if (status === 429 || type.includes('rate_limit')) {
    return new ProviderAdapterError('rate-limit', message, true);
  }
  if (lower.includes('context') || lower.includes('too many tokens') || type.includes('invalid_request_error')) {
    if (lower.includes('token') || lower.includes('context')) {
      return new ProviderAdapterError('context-limit', message, false);
    }
  }
  if (status === 408 || lower.includes('timed out') || type.includes('timeout')) {
    return new ProviderAdapterError('timeout', message, true);
  }
  if (status === 400 || status === 404 || type.includes('invalid_request')) {
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

function asErrorLike(error: unknown): AnthropicErrorLike {
  if (typeof error !== 'object' || error === null) return { message: String(error) };
  return error;
}

function normalizeCode(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value.toLowerCase();
}

function sanitizeMessage(message: string): string {
  return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[redacted]');
}

function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = String((error as { readonly code: unknown }).code);
  return ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code);
}
