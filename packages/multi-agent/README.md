# `@agentprodready/multi-agent`

**Multi-agent coordination contracts — compose multiple agents under platform ownership rules.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/multi-agent` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You coordinate more than one agent identity in a host.

**Prefer not to start here** if a single `createAgent` instance solves your problem.

---

## Install

```bash
npm install @agentprodready/multi-agent
```

---

## Sample

```ts
import type { MultiAgentCoordinator } from '@agentprodready/multi-agent';

declare const coordinator: MultiAgentCoordinator;
console.log(coordinator);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Multi-agent coordination contracts | Single-agent Simple API; Runtime internals |

---

## Documentation

- [Blueprint 18](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/18-multi-agent-orchestration.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
