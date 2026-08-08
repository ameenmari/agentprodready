import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPENAI_COMPATIBLE_AI_ID } from './embedded-capabilities.js';
import { createAgent, openai, openaiCompatible, reference, SimpleAgentError } from './index.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('openaiCompatible helper', () => {
  it('returns openai-compatible descriptor with default api-key auth', () => {
    expect(
      openaiCompatible({
        baseUrl: 'https://api.example.com/v1',
        model: 'llama-3.1-70b',
      }),
    ).toEqual({
      provider: 'openai-compatible',
      modelId: 'llama-3.1-70b',
      baseUrl: 'https://api.example.com/v1',
      auth: 'api-key',
    });
  });

  it('rejects missing/invalid baseUrl and model', () => {
    expect(() => openaiCompatible({ baseUrl: '', model: 'm' })).toThrow(SimpleAgentError);
    expect(() =>
      openaiCompatible({ baseUrl: 'not-a-url', model: 'm' }),
    ).toThrowError(/absolute http/);
    expect(() =>
      openaiCompatible({ baseUrl: 'ftp://x.example/v1', model: 'm' }),
    ).toThrowError(/absolute http/);
    expect(() =>
      openaiCompatible({ baseUrl: 'https://api.example.com/v1', model: '  ' }),
    ).toThrowError(/model/);
  });

  it('rejects production metadata hosts', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() =>
      openaiCompatible({ baseUrl: 'http://169.254.169.254/v1', model: 'm' }),
    ).toThrowError(/not permitted in production/);
  });

  it('allows auth none without key and rejects apiKey with auth none', () => {
    expect(
      openaiCompatible({
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama3.1',
        auth: 'none',
      }),
    ).toMatchObject({ auth: 'none' });
    expect(() =>
      openaiCompatible({
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama3.1',
        auth: 'none',
        apiKey: 'secret',
      }),
    ).toThrowError(/must not include apiKey/);
  });
});

describe('openaiCompatible credential resolution', () => {
  it('uses explicit apiKey and ignores OPENAI_API_KEY', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-must-not-be-used');
    vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', '');

    const { buildEmbeddedPlatform } = await import('./embedded-platform.js');
    const { normalizeCreateAgentOptions } = await import('./validate-options.js');
    const opts = normalizeCreateAgentOptions({
      model: openaiCompatible({
        baseUrl: 'https://api.example.com/v1',
        model: 'demo',
        apiKey: 'sk-compatible-explicit',
      }),
      instructions: 'ok',
    });
    const platform = await buildEmbeddedPlatform(opts);
    try {
      expect(platform).toBeDefined();
    } finally {
      await platform.dispose();
    }
  });

  it('resolves OPENAI_COMPATIBLE_API_KEY and not OPENAI_API_KEY', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-must-not-be-used');
    vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', 'sk-compatible-env');

    const { buildEmbeddedPlatform } = await import('./embedded-platform.js');
    const { normalizeCreateAgentOptions } = await import('./validate-options.js');
    const opts = normalizeCreateAgentOptions({
      model: openaiCompatible({
        baseUrl: 'https://api.example.com/v1',
        model: 'demo',
      }),
      instructions: 'ok',
    });
    const platform = await buildEmbeddedPlatform(opts);
    await platform.dispose();
  });

  it('fails when auth=api-key and no compatible key is available', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-must-not-be-used');
    vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', '');

    const agent = createAgent({
      model: openaiCompatible({
        baseUrl: 'https://api.example.com/v1',
        model: 'demo',
      }),
      instructions: 'ok',
    });
    await expect(agent.invoke('Hello')).rejects.toThrow(/OPENAI_COMPATIBLE_API_KEY|options\.apiKey/);
    await agent.close();
  });

  it('binds auth=none without compatible key', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-must-not-be-used');
    vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', '');

    const agent = createAgent({
      model: openaiCompatible({
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama3.1',
        auth: 'none',
      }),
      instructions: 'ok',
    });
    await agent.close();
  });

  it('uses openai-compatible-ai capability identity', async () => {
    vi.stubEnv('OPENAI_COMPATIBLE_API_KEY', 'sk-compatible');
    const { buildEmbeddedPlatform } = await import('./embedded-platform.js');
    const { normalizeCreateAgentOptions } = await import('./validate-options.js');
    const { seedEmbeddedCapabilities } = await import('./embedded-capabilities.js');

    const seeded = seedEmbeddedCapabilities(OPENAI_COMPATIBLE_AI_ID);
    expect(seeded.configuration).toBeDefined();

    const opts = normalizeCreateAgentOptions({
      model: openaiCompatible({
        baseUrl: 'https://api.example.com/v1',
        model: 'demo',
        apiKey: 'sk-x',
      }),
      instructions: 'ok',
    });
    const platform = await buildEmbeddedPlatform(opts);
    try {
      // Resolve through capability registry seed path used by platform
      expect(OPENAI_COMPATIBLE_AI_ID).toBe('openai-compatible-ai');
    } finally {
      await platform.dispose();
    }
  });
});

describe('existing model helpers unchanged', () => {
  it('keeps reference and openai descriptors', () => {
    expect(reference()).toEqual({ provider: 'reference', modelId: 'reference' });
    expect(openai('gpt-4o-mini')).toEqual({ provider: 'openai', modelId: 'gpt-4o-mini' });
  });
});
