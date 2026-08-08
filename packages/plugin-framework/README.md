# `@agentprodready/plugin-framework`

**Plugin load/activation contracts — extend a host without forking core packages.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/plugin-framework` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You define or host plugins against AgentProdReady plugin contracts.

**Prefer not to start here** if Simple `tool()` covers your extension needs.

---

## Install

```bash
npm install @agentprodready/plugin-framework
```

---

## Sample

```ts
import type { PluginManager } from '@agentprodready/plugin-framework';

declare const plugins: PluginManager;
await plugins.register(/* PluginRegistration */);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Plugin registration/activation contracts | Marketplace distribution; Capability Resolution selection |

---

## Documentation

- [Blueprint 20](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/20-plugin-framework.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
