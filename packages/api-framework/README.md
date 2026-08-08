# `@agentprodready/api-framework`

**HTTP API framework contracts for exposing AgentProdReady hosts over the network.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/api-framework` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You build an operator/public HTTP surface on top of the platform.

**Prefer not to start here** if you embed `createAgent` inside your existing Node service (no platform HTTP required).

---

## Install

```bash
npm install @agentprodready/api-framework
```

---

## Sample

```ts
import type { ApiRouter } from '@agentprodready/api-framework';

declare const router: ApiRouter;
// Register routes that delegate to Agent Framework / Runtime — your auth stays yours.
router;
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| API routing/diagnostics contracts | Application authentication; Runtime; browser SDKs |

---

## Documentation

- [Blueprint 26](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/26-api-framework.md)
- [Embed deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/embed-agent-deployment.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
