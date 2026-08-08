# `@agentprodready/human-interaction`

**Human-in-the-loop interaction contracts — approvals and human tasks for hosts.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/human-interaction` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your host needs HITL approval flows beyond fail-closed Simple tools.

**Prefer not to start here** if Simple tools with `approvalRequirement: "required"` (fail closed) are enough today.

---

## Install

```bash
npm install @agentprodready/human-interaction
```

---

## Sample

```ts
import type { HumanInteractionService } from '@agentprodready/human-interaction';

declare const hitl: HumanInteractionService;
// Durable wait/resume is demand-gated on the product roadmap — contracts exist for hosts.
console.log(hitl);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| HITL interaction contracts | Simple Agent fail-closed approvals; UI frameworks |

---

## Documentation

- [Blueprint 19](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/19-human-interaction.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
