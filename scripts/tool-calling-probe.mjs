#!/usr/bin/env node
/**
 * Deterministic tool-calling probe (reference AI + reference.echo, no secrets).
 * Usage: node scripts/tool-calling-probe.mjs
 */
import { bootstrapLocalReferenceHost } from '../apps/platform-host/dist/bootstrap-local.js';

const authHeader = 'LocalReference principalId=local-user;tenantId=local-tenant';

const host = await bootstrapLocalReferenceHost({
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

try {
  const address = host.server.address();
  if (address === null || typeof address === 'string') throw new TypeError('Server address unavailable');
  const baseUrl = `http://127.0.0.1:${String(address.port)}`;
  const response = await fetch(`${baseUrl}/v1/agents/reference-agent/invoke`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objective: 'USE_TOOL_ECHO: probe-hello' }),
  });
  if (response.status !== 200) {
    throw new Error(`expected 200, got ${String(response.status)}: ${await response.text()}`);
  }
  const body = await response.json();
  if (body.status !== 'success') throw new Error(`expected success, got ${String(body.status)}`);
  if (body.result?.text !== 'Tool returned: probe-hello') {
    throw new Error(`unexpected text: ${String(body.result?.text)}`);
  }
  process.stdout.write('tool-calling-probe: ok\n');
} finally {
  await host.stop();
}
