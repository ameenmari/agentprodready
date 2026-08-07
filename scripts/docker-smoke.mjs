#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.argv[2];
if (baseUrl === undefined || baseUrl.trim() === '') {
  process.stderr.write('Usage: node scripts/docker-smoke.mjs <baseUrl>\n');
  process.exit(1);
}

const authHeader = 'LocalReference principalId=local-user;tenantId=local-tenant';
const requiredChecks = Object.freeze([
  'composition',
  'security',
  'runtime',
  'agent-registry',
  'event-bus',
  'audit',
  'reference-agent',
]);

async function fetchJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = (await response.json());
  return { status: response.status, body };
}

async function waitForReady(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const ready = await fetchJson('/ready');
      if (ready.status === 200 && ready.body.ready === true) {
        return ready;
      }
    } catch {
      // retry until timeout
    }
    await delay(250);
  }
  throw new Error('Timed out waiting for /ready');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ready = await waitForReady();
assert(Array.isArray(ready.body.checks), 'ready.checks must be an array');
for (const name of requiredChecks) {
  assert(
    ready.body.checks.some((check) => check.name === name && check.status === 'healthy'),
    `Missing healthy readiness check: ${name}`,
  );
}

const health = await fetchJson('/health');
assert(health.status === 200, `Health status ${String(health.status)}`);
assert(health.body.status === 'ok', 'health.status must be ok');
assert(health.body.service === 'agentforge-local-reference', 'unexpected health.service');
assert(health.body.version === '0.6.0', 'unexpected health.version');

const readyAgain = await fetchJson('/ready');
assert(readyAgain.status === 200 && readyAgain.body.ready === true, 'Readiness check failed');

const invoke = await fetchJson('/v1/agents/reference-agent/invoke', {
  method: 'POST',
  headers: {
    Authorization: authHeader,
    'Content-Type': 'application/json; charset=utf-8',
  },
  body: JSON.stringify({ objective: 'docker-smoke' }),
});
assert(invoke.status === 200, `Invoke failed with status ${String(invoke.status)}`);
assert(invoke.body.status === 'success', 'invoke.status must be success');
assert(invoke.body.result?.text === 'docker-smoke', 'Deterministic echo failed');
assert(invoke.body.evidence?.adapterId === 'reference-ai', 'Expected adapterId reference-ai');

process.stdout.write('docker-smoke: ok\n');
