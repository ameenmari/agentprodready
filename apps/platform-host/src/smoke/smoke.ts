import { setTimeout as delay } from 'node:timers/promises';
import { InMemoryMemoryProvider } from '@agentforge/memory';
import { InMemoryPersistenceProvider } from '@agentforge/persistence';
import { bootstrapLocalReferenceHost } from '../bootstrap-local.js';

const authHeader = 'LocalReference principalId=local-user;tenantId=local-tenant';

async function main(): Promise<void> {
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
  });

  const address = host.server.address();
  if (address === null || typeof address === 'string') throw new TypeError('Server address unavailable');
  const baseUrl = `http://127.0.0.1:${String(address.port)}`;

  async function fetchJson(path: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
    const response = await fetch(`${baseUrl}${path}`, init);
    const body = (await response.json()) as Record<string, unknown>;
    return { status: response.status, body };
  }

  const started = Date.now();
  while (Date.now() - started < 15_000) {
    try {
      const ready = await fetchJson('/ready');
      if (ready.status === 200 && ready.body['ready'] === true) break;
    } catch {
      await delay(100);
    }
  }

  const health = await fetchJson('/health');
  if (health.status !== 200 || health.body['status'] !== 'ok') throw new Error('Health check failed');

  const ready = await fetchJson('/ready');
  if (ready.status !== 200 || ready.body['ready'] !== true) throw new Error('Readiness check failed');

  const invoke = await fetchJson('/v1/agents/reference-agent/invoke', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ objective: 'smoke-test' }),
  });
  if (invoke.status !== 200) throw new Error(`Invoke failed with status ${String(invoke.status)}`);
  const result = invoke.body['result'] as Record<string, unknown> | undefined;
  if (result?.['text'] !== 'smoke-test') throw new Error('Deterministic echo failed');

  if (host.composition.agentFacts.length === 0) throw new Error('Expected agent facts');
  if ((await host.composition.auditPlatform.health()).records === 0) throw new Error('Expected audit records');
  if (host.composition.logs.values.length === 0) throw new Error('Expected observability logs');
  if (!(host.composition.memory instanceof InMemoryMemoryProvider)) {
    throw new Error('Expected in-memory memory provider');
  }
  if (host.composition.config.persistenceProvider === 'in-memory') {
    if (!(host.composition.persistence instanceof InMemoryPersistenceProvider)) {
      throw new Error('Expected in-memory persistence provider');
    }
  }

  await host.stop();
  process.stdout.write('smoke: ok\n');
}

await main();
