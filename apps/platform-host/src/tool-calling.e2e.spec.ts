import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootstrapLocalReferenceHost } from './bootstrap-local.js';
import type { LocalReferenceHost } from './bootstrap-local.js';

const authHeader = 'LocalReference principalId=local-user;tenantId=local-tenant';

describe('v0.9 tool calling e2e', () => {
  let host: LocalReferenceHost;
  let baseUrl: string;

  beforeAll(async () => {
    host = await bootstrapLocalReferenceHost({
      host: '127.0.0.1',
      port: 0,
      logLevel: 'error',
      referenceAgentEnabled: true,
      aiProvider: 'reference',
      persistenceProvider: 'in-memory',
      runtimeRecoveryEnabled: false,
      memoryProvider: 'in-memory',
      evaluationEnabled: false,
      evaluationResultStore: 'in-memory',
      vectorSearchEnabled: false,
      vectorStoreProvider: 'none',
      embeddingProvider: 'none',
      embeddingModel: '',
      embeddingDimensions: 0,
      vectorIndexProfile: 'none',
      streamingHeartbeatIntervalMs: 0,
      streamingMaxDrainWaitMs: 30_000,
      toolsEnabled: true,
      toolMaxCallsPerInvocation: 8,
      toolMaxTurns: 4,
      toolMaxArgumentBytes: 16_384,
      toolMaxResultBytes: 65_536,
    });
    const address = host.server.address();
    if (address === null || typeof address === 'string') throw new TypeError('Server address unavailable');
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  }, 30_000);

  afterAll(async () => {
    await host.stop();
  });

  it('runs reference.echo through agent invoke', async () => {
    const response = await fetch(`${baseUrl}/v1/agents/reference-agent/invoke`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ objective: 'USE_TOOL_ECHO: hello' }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      result?: { text?: string };
    };
    expect(body.status).toBe('success');
    expect(body.result?.text).toBe('Tool returned: hello');
  });

  it('streams tool lifecycle safely then final text', async () => {
    const response = await fetch(`${baseUrl}/v1/agents/reference-agent/invoke/stream`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ objective: 'USE_TOOL_ECHO: stream-hi' }),
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('event: tool_call');
    expect(text).toContain('"status":"executing"');
    expect(text).toContain('event: tool_result');
    expect(text).toContain('event: complete');
    expect(text).not.toMatch(/"message"\s*:\s*"stream-hi"/u);
  });
});
