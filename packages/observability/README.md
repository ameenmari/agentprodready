# `@agentprodready/observability`

**Logs, metrics, traces, diagnostics, and health contracts for platform hosts.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/observability` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You wire production telemetry into a composed host.

**Prefer not to start here** if you only need Simple `result.metadata` debugging — see the Simple Diagnostics guide.

---

## Install

```bash
npm install @agentprodready/observability
```

---

## Sample

```ts
import type { PlatformLogger } from '@agentprodready/observability';

declare const log: PlatformLogger;
log.info('host.ready', { service: 'my-agent-host' });
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Observability contracts (logs/metrics/traces/health) | Simple Agent facade metadata; vendor APM SDKs as ownership |

---

## Documentation

- [Blueprint 22](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/22-observability-and-diagnostics.md)
- [Simple Diagnostics](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-diagnostics.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
