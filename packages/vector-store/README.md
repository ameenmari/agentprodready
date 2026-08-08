# `@agentprodready/vector-store`

**Provider-independent vector store contracts** (+ in-memory reference) for AgentProdReady semantic / hybrid memory search.

| | |
|---|---|
| **Status** | Production contracts published (`1.0.x`) |
| **Install** | `npm install @agentprodready/vector-store` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |

---

## When to use

Enable semantic search behind `@agentprodready/memory`. Prefer Simple `memory: true` first if you only need ephemeral wiring.

---

## Install

```bash
npm install @agentprodready/vector-store
# Durable pgvector provider (optional)
npm install @agentprodready/vector-store-pgvector
```

---

## Sample

```ts
import { InMemoryVectorStore } from '@agentprodready/vector-store';

const store = new InMemoryVectorStore({
  dimensions: 32,
  embeddingModelId: 'reference-embedding-32',
});

await store.upsert({
  id: 'mem-1',
  vector: new Array(32).fill(0.1),
  metadata: { tenantId: 't1' },
});
```

Composition selects the concrete adapter. Raw vendor distance types never escape the adapter boundary.

---

## Ownership

| Owns | Does **not** own |
|---|---|
| `VectorStorePort`, normalized scores, in-memory reference | Memory lifecycle / ranking / auth |
| Dimension / model / metric mismatch errors | Embedding generation (AI Provider) |
| | pgvector SQL (`@agentprodready/vector-store-pgvector`) |

---

## Docs

- [Vector search guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/vector-search.md)
- [Memory package](https://www.npmjs.com/package/@agentprodready/memory)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)

## License

MIT © 2026 ameenmari
