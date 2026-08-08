# `@agentprodready/workflow`

**Workflow / node execution contracts used by Runtime capability invocations.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/workflow` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You need typed workflow node contracts in a host or capability port.

**Prefer not to start here** if you only need `createAgent().invoke()` — start with agent-framework.

---

## Install

```bash
npm install @agentprodready/workflow
```

---

## Sample

```ts
import type { NodeExecutionContract } from '@agentprodready/workflow';

const node: NodeExecutionContract = Object.freeze({
  workflowId: 'workflow:demo',
  nodeId: 'node:1',
  kind: 'capability',
  capability: 'demo-capability',
});
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Workflow node contracts | Runtime scheduling; Security authorization; AI provider I/O |

---

## Documentation

- [Blueprint 06](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/06-workflow-engine.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
