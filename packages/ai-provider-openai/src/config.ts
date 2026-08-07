export const OPENAI_AI_ID = 'openai-ai';
export const DEFAULT_OPENAI_MODEL = 'gpt-5';

export interface OpenAiProviderConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly project?: string;
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

  const baseUrl = env['OPENAI_BASE_URL']?.trim();
  if (baseUrl !== undefined && baseUrl !== '') {
    try {
      const url = new URL(baseUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
      if ((env['NODE_ENV'] ?? '').trim() === 'production' && isBlockedBaseUrlHost(url.hostname)) {
        throw new Error('OPENAI_BASE_URL host is not permitted in production');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not permitted')) throw error;
      throw new Error('OPENAI_BASE_URL must be an absolute http(s) URL when set');
    }
  }

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
