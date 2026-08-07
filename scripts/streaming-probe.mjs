#!/usr/bin/env node
/**
 * Deterministic streaming probe (reference AI, no secrets).
 * Usage: node scripts/streaming-probe.mjs
 */
import { bootstrapLocalReferenceHost } from '../apps/platform-host/dist/bootstrap-local.js';

const authHeader = 'LocalReference principalId=local-user;tenantId=local-tenant';

function parseSse(raw) {
  const events = [];
  const blocks = raw.split('\n\n').filter((block) => block.trim() !== '' && !block.startsWith(':'));
  for (const block of blocks) {
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (data !== '') events.push({ event, data: JSON.parse(data) });
  }
  return events;
}

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
  toolsEnabled: false,
  toolMaxCallsPerInvocation: 8,
  toolMaxTurns: 4,
  toolMaxArgumentBytes: 16_384,
  toolMaxResultBytes: 65_536,
});

try {
  const address = host.server.address();
  if (address === null || typeof address === 'string') throw new TypeError('Server address unavailable');
  const baseUrl = `http://127.0.0.1:${String(address.port)}`;
  const response = await fetch(`${baseUrl}/v1/agents/reference-agent/invoke/stream`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ objective: 'hello agentprodready' }),
  });
  if (response.status !== 200) {
    throw new Error(`expected 200, got ${String(response.status)}: ${await response.text()}`);
  }
  const raw = await response.text();
  const events = parseSse(raw);
  const types = events.map((item) => item.event);
  if (types[0] !== 'start') throw new Error(`expected start, got ${types.join(',')}`);
  if (!types.includes('delta')) throw new Error('missing delta');
  if (types.at(-1) !== 'complete') throw new Error(`expected complete terminal, got ${types.at(-1)}`);
  const text = events
    .filter((item) => item.event === 'delta')
    .map((item) => item.data.text)
    .join('');
  if (text !== 'hello agentprodready') throw new Error(`unexpected reconstructed text: ${text}`);
  const sequences = events.filter((item) => item.event === 'delta').map((item) => item.data.sequence);
  for (let i = 0; i < sequences.length; i++) {
    if (sequences[i] !== i) throw new Error(`non-contiguous delta sequence at ${String(i)}`);
  }
  const counts = host.composition.runtimePort.counts;
  if (counts.execute !== 0 || counts.executeStream !== 1 || counts.acceptStream !== 1 || counts.accept !== 0) {
    throw new Error(`handoff counts unexpected: ${JSON.stringify(counts)}`);
  }
  console.log('streaming-probe ok', { text, deltas: sequences.length, counts });
} finally {
  await host.stop();
}
