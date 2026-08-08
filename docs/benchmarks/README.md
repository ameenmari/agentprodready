# Benchmarks

Local, reproducible performance baselines for AgentProdReady.

> **Local baseline — not an SLA.**

Do not treat numbers from a laptop or CI VM as production capacity planning.

---

## Driver

```bash
pnpm build
pnpm production-baseline
```

Script: [`scripts/production-baseline.mjs`](../../scripts/production-baseline.mjs)

Uses the **deterministic reference** provider and local reference host. No OpenAI key required.

---

## What it records

The script prints JSON including:

- invoke latency percentiles (p50 / p95 / p99)
- throughput (requests/sec for the configured batch)
- stream TTFB percentiles
- process RSS
- event-loop delay mean / p99

---

## When publishing a result

Only commit measured runs. Include:

| Field | Example source |
|---|---|
| Date (UTC) | wall clock |
| Node version | `node -v` |
| OS | `win32` / `linux` / `darwin` + version |
| CPU / RAM | machine specs |
| Provider mode | `reference` |
| Concurrency / request count | from script constants |
| Full JSON output | script stdout |

Optional storage path for future measured artifacts:

`docs/benchmarks/results/YYYY-MM-DD-<machine>.json`

**No fabricated results.** If a run was not executed, do not invent numbers.

---

## Related

- CI verification (functional): [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- Public DX pack test: `pnpm test:public-dx`
