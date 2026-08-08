# `@agentprodready/planning`

**Planning engine contracts — turn objectives into executable plans for Runtime.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/planning` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You customize how hosts derive plans/workflows from agent objectives.

**Prefer not to start here** if Simple Agent API already embeds a reference planning path.

---

## Install

```bash
npm install @agentprodready/planning
```

---

## Sample

```ts
import type { PlanningEngine } from '@agentprodready/planning';

declare const planning: PlanningEngine;
// Hosts supply a planning adapter; Runtime consumes the resulting plan.
const plan = await planning.plan(/* PlanningRequest */);
console.log(plan);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Plan production contracts | Executing plans (Runtime); tool authorization (Security) |

---

## Documentation

- [Blueprint 05](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/05-planning-engine.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
