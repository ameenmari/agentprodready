# `@agentprodready/context-assembly`

**Assemble execution context packages (memory, knowledge, constraints) for a turn.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/context-assembly` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your host customizes what context is injected before model/tool work.

**Prefer not to start here** if Simple `memory: true` on `createAgent` covers your weekend path.

---

## Install

```bash
npm install @agentprodready/context-assembly
```

---

## Sample

```ts
import type { ContextAssemblyEngine } from '@agentprodready/context-assembly';

declare const assembly: ContextAssemblyEngine;
const pack = await assembly.assemble(/* ContextAssemblyRequest */);
console.log(pack);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Context assembly contracts | Durable memory storage; vector indexes; authorization |

---

## Documentation

- [Blueprint 12](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/12-context-assembly-engine.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
