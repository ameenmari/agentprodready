# `@agentprodready/plugin-marketplace`

**Plugin marketplace / distribution contracts — discovery and integrity facts (not code execution).**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/plugin-marketplace` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You describe or host a plugin registry/distribution surface.

**Prefer not to start here** if local `tool()` definitions are enough.

---

## Install

```bash
npm install @agentprodready/plugin-marketplace
```

---

## Sample

```ts
import type { PluginRegistry } from '@agentprodready/plugin-marketplace';

declare const registry: PluginRegistry;
const hit = await registry.find('example-plugin');
console.log(hit);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Distribution/registry/integrity contracts | Loading plugin code; Runtime execution; npm itself |

---

## Documentation

- [Blueprint 21](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/21-plugin-marketplace-and-distribution.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
