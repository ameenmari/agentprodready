import { ProviderAdapterError } from '@agentprodready/ai-provider';

export interface OpenAiErrorLike {
  readonly status?: number;
  readonly code?: string | null;
  readonly type?: string;
  readonly message?: string;
  readonly error?: { readonly code?: string | null; readonly type?: string; readonly message?: string };
}

export function translateError(error: unknown): ProviderAdapterError {
  if (error instanceof ProviderAdapterError) {
    return error;
  }

  const like = asErrorLike(error);
  const status = like.status;
  const code = normalizeCode(like.code ?? like.error?.code);
  const type = normalizeCode(like.type ?? like.error?.type);
  const message = sanitizeMessage(like.message ?? like.error?.message ?? 'OpenAI provider interaction failed');
  const lowerMessage = message.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    code.includes('invalid_api_key') ||
    (type === 'invalid_request_error' && lowerMessage.includes('api key'))
  ) {
    return new ProviderAdapterError('authentication', message, false);
  }

  if (status === 429 || code.includes('rate_limit') || type.includes('rate_limit')) {
    const quota =
      code.includes('insufficient_quota') ||
      lowerMessage.includes('quota') ||
      lowerMessage.includes('credits remaining');
    return new ProviderAdapterError('rate-limit', message, !quota);
  }

  if (code.includes('context_length') || lowerMessage.includes('context length') || lowerMessage.includes('maximum context')) {
    return new ProviderAdapterError('context-limit', message, false);
  }

  if (status === 408 || code.includes('timeout') || lowerMessage.includes('timed out')) {
    return new ProviderAdapterError('timeout', message, true);
  }

  if (status === 404 || status === 400 || code.includes('model') || type === 'invalid_request_error') {
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

function asErrorLike(error: unknown): OpenAiErrorLike {
  if (typeof error !== 'object' || error === null) {
    return { message: String(error) };
  }
  return error;
}

function normalizeCode(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value.toLowerCase();
}

function sanitizeMessage(message: string): string {
  return message.replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]');
}

function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = String((error as { readonly code: unknown }).code);
  return ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code);
}
