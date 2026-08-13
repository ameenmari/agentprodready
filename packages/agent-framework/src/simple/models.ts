import { SimpleAgentError } from './errors.js';
import { validateMaxOutputTokens } from './output-tokens.js';
import type { AgentModel, OpenAiCompatibleAuth, ProviderModelOptions } from './types.js';

function optionalMaxOutputTokens(value: unknown): { readonly maxOutputTokens?: number } {
  if (value === undefined) return {};
  return { maxOutputTokens: validateMaxOutputTokens(value) };
}

function modelIdFromOptions(options: ProviderModelOptions): string {
  if (typeof options.model !== 'string' || options.model.trim() === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'Provider model options require a non-empty model string.',
    );
  }
  return options.model.trim();
}

export function reference(maxOutputTokens?: number): AgentModel {
  return Object.freeze({
    provider: 'reference',
    modelId: 'reference',
    ...optionalMaxOutputTokens(maxOutputTokens),
  });
}

export function openai(modelOrOptions: string | ProviderModelOptions): AgentModel {
  if (typeof modelOrOptions === 'string') {
    const modelId = modelOrOptions.trim();
    if (modelId === '') {
      throw new SimpleAgentError(
        'AGENT_INVALID_MODEL',
        'openai(modelId) requires a non-empty model id string, for example openai("gpt-4o-mini").',
      );
    }
    return Object.freeze({ provider: 'openai', modelId });
  }
  const modelId = modelIdFromOptions(modelOrOptions);
  return Object.freeze({
    provider: 'openai',
    modelId,
    ...optionalMaxOutputTokens(modelOrOptions.maxOutputTokens),
  });
}

export function anthropic(modelOrOptions: string | ProviderModelOptions): AgentModel {
  if (typeof modelOrOptions === 'string') {
    const modelId = modelOrOptions.trim();
    if (modelId === '') {
      throw new SimpleAgentError(
        'AGENT_INVALID_MODEL',
        'anthropic(modelId) requires a non-empty model id string, for example anthropic("claude-sonnet-4-20250514").',
      );
    }
    return Object.freeze({ provider: 'anthropic', modelId });
  }
  const modelId = modelIdFromOptions(modelOrOptions);
  return Object.freeze({
    provider: 'anthropic',
    modelId,
    ...optionalMaxOutputTokens(modelOrOptions.maxOutputTokens),
  });
}

export function gemini(modelOrOptions: string | ProviderModelOptions): AgentModel {
  if (typeof modelOrOptions === 'string') {
    const modelId = modelOrOptions.trim();
    if (modelId === '') {
      throw new SimpleAgentError(
        'AGENT_INVALID_MODEL',
        'gemini(modelId) requires a non-empty model id string, for example gemini("gemini-2.0-flash").',
      );
    }
    return Object.freeze({ provider: 'gemini', modelId });
  }
  const modelId = modelIdFromOptions(modelOrOptions);
  return Object.freeze({
    provider: 'gemini',
    modelId,
    ...optionalMaxOutputTokens(modelOrOptions.maxOutputTokens),
  });
}

export interface OpenAiCompatibleOptions {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly auth?: OpenAiCompatibleAuth;
  readonly organization?: string;
  readonly project?: string;
  readonly maxOutputTokens?: number;
}

export function openaiCompatible(raw: OpenAiCompatibleOptions): AgentModel {
  const options = raw as unknown;
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'openaiCompatible({ baseUrl, model, ... }) requires an options object.',
    );
  }
  const record = options as OpenAiCompatibleOptions;

  const baseUrl = normalizeRequiredUrl(record.baseUrl, 'baseUrl');
  const modelId = typeof record.model === 'string' ? record.model.trim() : '';
  if (modelId === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'openaiCompatible requires a non-empty model string.',
    );
  }

  const auth = normalizeAuth(record.auth);
  const apiKey =
    record.apiKey === undefined
      ? undefined
      : typeof record.apiKey === 'string'
        ? record.apiKey.trim()
        : '';
  if (record.apiKey !== undefined && apiKey === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'openaiCompatible apiKey must be a non-empty string when provided.',
    );
  }
  if (auth === 'none' && apiKey !== undefined) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'openaiCompatible({ auth: "none" }) must not include apiKey.',
    );
  }

  const organization = optionalTrimmed(record.organization, 'organization');
  const project = optionalTrimmed(record.project, 'project');

  return Object.freeze({
    provider: 'openai-compatible' as const,
    modelId,
    baseUrl,
    auth,
    ...(apiKey === undefined ? {} : { apiKey }),
    ...(organization === undefined ? {} : { organization }),
    ...(project === undefined ? {} : { project }),
    ...optionalMaxOutputTokens(record.maxOutputTokens),
  });
}

export function isAgentModel(value: unknown): value is AgentModel {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as {
    provider?: unknown;
    modelId?: unknown;
    baseUrl?: unknown;
    auth?: unknown;
    maxOutputTokens?: unknown;
  };
  if (record.maxOutputTokens !== undefined) {
    try {
      validateMaxOutputTokens(record.maxOutputTokens);
    } catch {
      return false;
    }
  }
  if (record.provider === 'reference') return record.modelId === 'reference';
  if (record.provider === 'openai' || record.provider === 'anthropic' || record.provider === 'gemini') {
    return typeof record.modelId === 'string' && record.modelId.trim() !== '';
  }
  if (record.provider === 'openai-compatible') {
    return (
      typeof record.modelId === 'string' &&
      record.modelId.trim() !== '' &&
      typeof record.baseUrl === 'string' &&
      record.baseUrl.trim() !== '' &&
      (record.auth === 'api-key' || record.auth === 'none')
    );
  }
  return false;
}

function normalizeAuth(value: unknown): OpenAiCompatibleAuth {
  if (value === undefined) return 'api-key';
  if (value === 'api-key' || value === 'none') return value;
  throw new SimpleAgentError(
    'AGENT_INVALID_MODEL',
    'openaiCompatible auth must be "api-key" or "none".',
  );
}

function normalizeRequiredUrl(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      `openaiCompatible requires a non-empty ${field} http(s) URL.`,
    );
  }
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      `openaiCompatible ${field} must be an absolute http(s) URL.`,
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      `openaiCompatible ${field} must be an absolute http(s) URL.`,
    );
  }
  if ((process.env['NODE_ENV'] ?? '').trim() === 'production' && isBlockedBaseUrlHost(url.hostname)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      `openaiCompatible ${field} host is not permitted in production.`,
    );
  }
  return trimmed;
}

function optionalTrimmed(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      `openaiCompatible ${field} must be a non-empty string when provided.`,
    );
  }
  return value.trim();
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
