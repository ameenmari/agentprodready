# `@agentprodready/knowledge`

**Knowledge / RAG-oriented contracts — distinct from execution-derived Memory.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/knowledge` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You integrate curated knowledge retrieval into a host.

**Prefer not to start here** if you only need turn memory — see `@agentprodready/memory` or Simple `memory: true`.

---

## Install

```bash
npm install @agentprodready/knowledge
```

---

## Sample

```ts
import type { KnowledgeEngine } from '@agentprodready/knowledge';

declare const knowledge: KnowledgeEngine;
const hits = await knowledge.retrieve(/* KnowledgeRetrieveRequest */);
console.log(hits);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Knowledge retrieval contracts | Memory engine; vector store vendor drivers; Runtime |

---

## Documentation

- [Blueprint 11](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/11-knowledge-and-rag.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
