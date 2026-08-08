# `@agentprodready/scheduler`

**Scheduler & background job contracts for deferred and recurring host work.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/scheduler` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your platform schedules work outside a single HTTP request.

**Prefer not to start here** if request/response `invoke` covers your use case.

---

## Install

```bash
npm install @agentprodready/scheduler
```

---

## Sample

```ts
import type { Scheduler } from '@agentprodready/scheduler';

declare const scheduler: Scheduler;
await scheduler.enqueue(/* JobEnqueueRequest */);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Job/scheduler contracts | Runtime execution of the job body; queue vendor lock-in as ownership |

---

## Documentation

- [Blueprint 25](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/25-scheduler-and-background-jobs.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
