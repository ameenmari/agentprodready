import { describe, expect, it } from 'vitest';
import {
  assertProductionAuthPolicy,
  loadLocalReferenceConfig,
  type LocalReferenceConfig,
} from './config/local-reference-config.js';
import { RequestBodyTooLargeError, readJsonBody } from './http/local-reference-server.js';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';

function baseConfig(overrides: Partial<LocalReferenceConfig> = {}): LocalReferenceConfig {
  return loadLocalReferenceConfig({
    HOST: '127.0.0.1',
    PORT: '0',
    LOG_LEVEL: 'error',
    REFERENCE_AGENT_ENABLED: 'true',
    AI_PROVIDER: 'reference',
    AI_ROUTING_MODE: 'fixed',
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [
        key,
        typeof value === 'boolean' || typeof value === 'number' ? String(value) : value,
      ]),
    ),
  });
}

describe('v1.0 production hardening', () => {
  it('rejects production LocalReference auth without escape hatch', () => {
    const config = loadLocalReferenceConfig({
      AGENTFORGE_ALLOW_REFERENCE_AUTH: 'false',
    });
    expect(() => {
      assertProductionAuthPolicy(config, { NODE_ENV: 'production' });
    }).toThrow(/LocalReference authentication is not permitted/);
  });

  it('allows production demo auth only with AGENTFORGE_ALLOW_REFERENCE_AUTH=true', () => {
    const config = loadLocalReferenceConfig({
      AGENTFORGE_ALLOW_REFERENCE_AUTH: 'true',
    });
    expect(() => {
      assertProductionAuthPolicy(config, { NODE_ENV: 'production' });
    }).not.toThrow();
  });

  it('parses AI routing config strictly', () => {
    expect(() => loadLocalReferenceConfig({ AI_ROUTING_MODE: 'round-robin' })).toThrow(
      /AI_ROUTING_MODE/,
    );
    expect(() =>
      loadLocalReferenceConfig({ AI_ROUTING_MODE: 'fallback', AI_FALLBACK_PROVIDERS: '' }),
    ).toThrow(/AI_FALLBACK_PROVIDERS/);
    expect(() =>
      loadLocalReferenceConfig({
        AI_ROUTING_MODE: 'fallback',
        AI_PROVIDER: 'reference',
        AI_FALLBACK_PROVIDERS: 'reference',
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      loadLocalReferenceConfig({
        AI_ROUTING_MODE: 'fallback',
        AI_FALLBACK_PROVIDERS: 'openai,unknown',
      }),
    ).toThrow(/AI_FALLBACK_PROVIDERS/);
    const ok = loadLocalReferenceConfig({
      AI_ROUTING_MODE: 'fallback',
      AI_PROVIDER: 'reference',
      AI_FALLBACK_PROVIDERS: 'openai',
      OPENAI_API_KEY: 'sk-test',
    });
    expect(ok.aiRoutingMode).toBe('fallback');
    expect(ok.aiFallbackProviders).toEqual(['openai']);
  });

  it('accepts only strict booleans and integer forms', () => {
    expect(() => loadLocalReferenceConfig({ TOOLS_ENABLED: 'yes' })).toThrow(/true or false/);
    expect(() => loadLocalReferenceConfig({ TOOLS_ENABLED: '1' })).toThrow(/true or false/);
    expect(() => loadLocalReferenceConfig({ SHUTDOWN_TIMEOUT_MS: '8abc' })).toThrow(/integer/);
    expect(() => loadLocalReferenceConfig({ SHUTDOWN_TIMEOUT_MS: '1.2' })).toThrow(/integer/);
    expect(() => loadLocalReferenceConfig({ MAX_JSON_BODY_BYTES: '-1' })).toThrow();
    const ok = loadLocalReferenceConfig({
      SHUTDOWN_TIMEOUT_MS: '45000',
      MAX_JSON_BODY_BYTES: '1048576',
    });
    expect(ok.shutdownTimeoutMs).toBe(45_000);
    expect(ok.maxJsonBodyBytes).toBe(1_048_576);
  });

  it('rejects oversized JSON bodies deterministically', async () => {
    const payload = Buffer.alloc(64, 0x61);
    const request = Readable.from([payload]) as IncomingMessage;
    await expect(readJsonBody(request, 16)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it('defaults SHUTDOWN_TIMEOUT_MS to 30000', () => {
    const config = baseConfig();
    expect(config.shutdownTimeoutMs).toBe(30_000);
  });
});
