export const OPENAI_AI_ID = 'openai-ai';
/** Distinct Capability Resolution / adapter identity for OpenAI-compatible endpoints. */
export const OPENAI_COMPATIBLE_AI_ID = 'openai-compatible-ai';
export const DEFAULT_OPENAI_MODEL = 'gpt-5';

/**
 * Non-secret placeholder passed to the OpenAI SDK when authMode is `none`.
 * Never log or expose as a real credential.
 */
export const OPENAI_NO_AUTH_API_KEY_PLACEHOLDER = 'agentprodready-no-auth';

export type OpenAiAuthMode = 'api-key' | 'none';

export interface OpenAiProviderConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly project?: string;
  /** Capability implementation id reported by the adapter. Defaults to openai-ai. */
  readonly implementationId?: string;
  /** Defaults to api-key. When none, apiKey may be the internal no-auth placeholder. */
  readonly authMode?: OpenAiAuthMode;
}

export function validateOpenAiBaseUrl(
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

export function loadOpenAiCompatibleProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiProviderConfig {
  const baseUrl = validateOpenAiBaseUrl(env['OPENAI_COMPATIBLE_BASE_URL'] ?? '', {
    envName: 'OPENAI_COMPATIBLE_BASE_URL',
    env,
  });
  const model = (env['OPENAI_COMPATIBLE_MODEL'] ?? DEFAULT_OPENAI_MODEL).trim();
  if (model === '') {
    throw new Error('OPENAI_COMPATIBLE_MODEL must be a non-empty string when set');
  }

  const authRaw = (env['OPENAI_COMPATIBLE_AUTH'] ?? 'api-key').trim().toLowerCase();
  if (authRaw !== 'api-key' && authRaw !== 'none') {
    throw new Error('OPENAI_COMPATIBLE_AUTH must be api-key or none');
  }
  const authMode: OpenAiAuthMode = authRaw;

  let apiKey = '';
  if (authMode === 'none') {
    apiKey = OPENAI_NO_AUTH_API_KEY_PLACEHOLDER;
  } else {
    apiKey = env['OPENAI_COMPATIBLE_API_KEY']?.trim() ?? '';
    if (apiKey === '') {
      throw new Error(
        'OPENAI_COMPATIBLE_API_KEY is required when AI_PROVIDER=openai-compatible and auth is api-key (OPENAI_API_KEY is never used for compatible endpoints)',
      );
    }
  }

  const organization = env['OPENAI_COMPATIBLE_ORGANIZATION']?.trim();
  const project = env['OPENAI_COMPATIBLE_PROJECT']?.trim();

  return Object.freeze({
    apiKey,
    model,
    baseUrl,
    implementationId: OPENAI_COMPATIBLE_AI_ID,
    authMode,
    ...(organization !== undefined && organization !== '' ? { organization } : {}),
    ...(project !== undefined && project !== '' ? { project } : {}),
  });
}

export function loadOpenAiProviderConfig(env: NodeJS.ProcessEnv = process.env): OpenAiProviderConfig {
  const apiKey = env['OPENAI_API_KEY']?.trim() ?? '';
  if (apiKey === '') {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  const model = (env['OPENAI_MODEL'] ?? DEFAULT_OPENAI_MODEL).trim();
  if (model === '') {
    throw new Error('OPENAI_MODEL must be a non-empty string when set');
  }

  const baseUrlRaw = env['OPENAI_BASE_URL']?.trim();
  const baseUrl =
    baseUrlRaw !== undefined && baseUrlRaw !== ''
      ? validateOpenAiBaseUrl(baseUrlRaw, { envName: 'OPENAI_BASE_URL', env })
      : undefined;

  const organization = env['OPENAI_ORGANIZATION']?.trim();
  const project = env['OPENAI_PROJECT']?.trim();

  return Object.freeze({
    apiKey,
    model,
    ...(baseUrl !== undefined && baseUrl !== '' ? { baseUrl } : {}),
    ...(organization !== undefined && organization !== '' ? { organization } : {}),
    ...(project !== undefined && project !== '' ? { project } : {}),
  });
}

function isBlockedBaseUrlHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/gu, '');
  // Production SHOULD reject link-local / cloud-metadata destinations (SSRF hardening).
  // Do not blanket-block RFC1918 — enterprise OpenAI-compatible endpoints may use private networks.
  if (host === 'localhost' || host === 'metadata' || host === 'metadata.google.internal') return true;
  if (host.endsWith('.metadata.google.internal')) return true;
  if (host === '169.254.169.254' || host.startsWith('169.254.')) return true;
  if (host === '0.0.0.0' || host === '::1') return true;
  if (host.startsWith('127.')) return true;
  return false;
}
