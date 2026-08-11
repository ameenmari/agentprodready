# `@agentprodready/human-interaction`

**Human-in-the-loop interaction contracts — approvals and human tasks for hosts.**

| | |
|---|---|
| **Status** | Production contracts published (`1.1.x`) |
| **Install** | `npm install @agentprodready/human-interaction` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your host needs HITL approval flows beyond fail-closed Simple tools.

**Simple path (v1.6):** `createAgent` exposes `approve` / `reject` / `resume` on the embedded path — see [HITL Approval guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/hitl-approval.md).

Use this package directly when wiring Human Interaction into a custom Composition host.

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
// Host implements interaction store + completion callbacks.
console.log(hitl);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| HITL interaction contracts | Simple Agent UI; approval channel delivery |
| Amendment D wait/resume semantics (with Runtime) | Authorization allow/deny (Security) |

---

## Documentation

- [HITL Approval (Simple)](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/hitl-approval.md)
- [Blueprint 20](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/20-human-interaction-and-approval.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
