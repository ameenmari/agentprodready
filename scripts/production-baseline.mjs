#!/usr/bin/env node
/**
 * Deterministic local performance baseline (reference providers only).
 * Not an SLA — records local machine numbers for ops comparison.
 */
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 34567;
const BASE = `http://127.0.0.1:${String(PORT)}`;

async function waitReady(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/ready`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error('Host did not become ready');
}

async function timed(fn) {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

async function main() {
  const child = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['--filter', '@agentforge/platform-host', 'exec', 'node', 'dist/bootstrap-local.js'],
    {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(PORT),
        LOG_LEVEL: 'error',
        REFERENCE_AGENT_ENABLED: 'true',
        AI_PROVIDER: 'reference',
        AI_ROUTING_MODE: 'fixed',
        PERSISTENCE_PROVIDER: 'in-memory',
        TOOLS_ENABLED: 'false',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: process.platform === 'win32',
    },
  );

  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();

  try {
    await waitReady();
    const invokeLatencies = [];
    const concurrency = 8;
    const iterations = 24;
    const t0 = performance.now();
    for (let i = 0; i < iterations; i += concurrency) {
      const batch = [];
      for (let j = 0; j < concurrency && i + j < iterations; j += 1) {
        batch.push(
          timed(async () => {
            const res = await fetch(`${BASE}/v1/agents/reference-agent/invoke`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                authorization: 'LocalReference principalId=local-user;tenantId=local-tenant',
              },
              body: JSON.stringify({ objective: `baseline-${String(i + j)}`, inputs: {} }),
            });
            if (!res.ok) throw new Error(`invoke failed: ${String(res.status)}`);
          }),
        );
      }
      invokeLatencies.push(...(await Promise.all(batch)));
    }
    const elapsedSec = (performance.now() - t0) / 1000;

    const streamTtfb = [];
    for (let i = 0; i < 8; i += 1) {
      const start = performance.now();
      const res = await fetch(`${BASE}/v1/agents/reference-agent/invoke/stream`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'LocalReference principalId=local-user;tenantId=local-tenant',
        },
        body: JSON.stringify({ objective: `stream-${String(i)}`, inputs: {} }),
      });
      if (!res.ok || res.body === null) throw new Error(`stream failed: ${String(res.status)}`);
      const reader = res.body.getReader();
      await reader.read();
      streamTtfb.push(performance.now() - start);
      await reader.cancel();
    }

    const mem = process.memoryUsage();
    const report = {
      requestsPerSec: Number((iterations / elapsedSec).toFixed(2)),
      invokeMs: {
        p50: Number(percentile(invokeLatencies, 50).toFixed(2)),
        p95: Number(percentile(invokeLatencies, 95).toFixed(2)),
        p99: Number(percentile(invokeLatencies, 99).toFixed(2)),
      },
      streamTtfbMs: {
        p50: Number(percentile(streamTtfb, 50).toFixed(2)),
        p95: Number(percentile(streamTtfb, 95).toFixed(2)),
      },
      rssMb: Number((mem.rss / (1024 * 1024)).toFixed(1)),
      eventLoopDelayMs: {
        mean: Number((histogram.mean / 1e6).toFixed(2)),
        p99: Number((histogram.percentile(99) / 1e6).toFixed(2)),
      },
      note: 'Local baseline only — not a published SLA.',
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    histogram.disable();
    child.kill('SIGTERM');
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
