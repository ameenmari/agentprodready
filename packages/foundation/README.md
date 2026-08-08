# `@agentprodready/foundation`

**Immutable foundation contracts and Application Host baseline for AgentProdReady.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/foundation` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You are building a host or platform package that needs shared identity, scope, and execution context types.

**Prefer not to start here** if you only need an embedded agent — use `@agentprodready/agent-framework` `createAgent` instead.

---

## Install

```bash
npm install @agentprodready/foundation
```

---

## Sample

```ts
import type { ExecutionContext } from '@agentprodready/foundation';

// Shared across Runtime, Security, and capabilities — do not invent parallel context shapes.
declare const context: ExecutionContext;
console.log(context.executionId, context.tenantId);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Foundational immutable contracts; Application Host baseline | Runtime execution; authorization decisions; AI vendor calls |

---

## Documentation

- [Blueprint 01 — Foundation](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/01-foundation.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## Related

- [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) — start here for apps
- [`@agentprodready/runtime`](https://www.npmjs.com/package/@agentprodready/runtime)

## License

MIT © 2026 ameenmari
