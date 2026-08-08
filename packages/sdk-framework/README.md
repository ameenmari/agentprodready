# `@agentprodready/sdk-framework`

**Client SDK framework contracts for typed consumers of an AgentProdReady API.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/sdk-framework` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You publish a typed client for your host API.

**Prefer not to start here** if in-process `createAgent` is your integration style.

---

## Install

```bash
npm install @agentprodready/sdk-framework
```

---

## Sample

```ts
import type { SdkClient } from '@agentprodready/sdk-framework';

declare const client: SdkClient;
// SDK calls your HTTP API — not a substitute for @agentprodready/agent-framework in-process.
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| SDK client contracts / client diagnostics | Server Runtime; Security policy engines |

---

## Documentation

- [Blueprint 27](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/27-sdk-framework.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
