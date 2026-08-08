export const ANTHROPIC_AI_ID = 'anthropic-ai';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

export interface AnthropicProviderConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly implementationId?: string;
  /** Anthropic Messages API requires max_tokens. Default 4096 when request omits it. */
  readonly defaultMaxTokens?: number;
}

export function loadAnthropicProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): AnthropicProviderConfig {
  const apiKey = env['ANTHROPIC_API_KEY']?.trim() ?? '';
  if (apiKey === '') {
    throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic');
  }

  const model = (env['ANTHROPIC_MODEL'] ?? DEFAULT_ANTHROPIC_MODEL).trim();
  if (model === '') {
    throw new Error('ANTHROPIC_MODEL must be a non-empty string when set');
  }

  const baseUrlRaw = env['ANTHROPIC_BASE_URL']?.trim();
  const baseUrl =
    baseUrlRaw !== undefined && baseUrlRaw !== ''
      ? validateAnthropicBaseUrl(baseUrlRaw, { envName: 'ANTHROPIC_BASE_URL', env })
      : undefined;

  return Object.freeze({
    apiKey,
    model,
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    implementationId: ANTHROPIC_AI_ID,
  });
}

export function validateAnthropicBaseUrl(
  baseUrl: string,
  options?: {
    readonly production?: boolean;
    readonly envName?: string;
    readonly env?: NodeJS.ProcessEnv;
  },
): string {
  const trimmed = baseUrl.trim();
  const envName = options?.envName ?? 'baseUrl';
  if (trimmed === '') {
    throw new Error(`${envName} must be a non-empty absolute http(s) URL`);
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${envName} must be an absolute http(s) URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${envName} must be an absolute http(s) URL`);
  }
  const env = options?.env ?? process.env;
  const production =
    options?.production ?? (env['NODE_ENV'] ?? '').trim() === 'production';
  if (production && isBlockedBaseUrlHost(url.hostname)) {
    throw new Error(`${envName} host is not permitted in production`);
  }
  return trimmed;
}

function isBlockedBaseUrlHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/gu, '');
  if (host === 'localhost' || host === 'metadata' || host === 'metadata.google.internal') return true;
  if (host.endsWith('.metadata.google.internal')) return true;
  if (host === '169.254.169.254' || host.startsWith('169.254.')) return true;
  if (host === '0.0.0.0' || host === '::1') return true;
  if (host.startsWith('127.')) return true;
  return false;
}
