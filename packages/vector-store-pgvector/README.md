# `@agentprodready/vector-store-pgvector`

**pgvector adapter** for `@agentprodready/vector-store` — durable semantic index for AgentProdReady Memory.

| | |
|---|---|
| **Status** | Production provider published (`1.0.x`) |
| **Install** | `npm install @agentprodready/vector-store-pgvector` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |

---

## When to use

You need Postgres + pgvector behind Memory semantic/hybrid search. Skip this for Simple ephemeral `memory: true`.

---

## Install

```bash
npm install @agentprodready/vector-store @agentprodready/vector-store-pgvector
```

Requires `DATABASE_URL` (same shape as `@agentprodready/persistence-postgres`).

---

## Sample

```ts
import { PgvectorVectorStore } from '@agentprodready/vector-store-pgvector';

const store = new PgvectorVectorStore({
  config,
  dimensions: 32,
  embeddingModelId: 'reference-embedding-32',
});
await store.assertReady();
```

```bash
VECTOR_INDEX_PROFILE=reference-32 pnpm db:migrate:vector
VECTOR_INDEX_PROFILE=reference-32 pnpm db:status:vector
```

| `VECTOR_INDEX_PROFILE` | Dimensions | Embedding model id |
|---|---|---|
| `reference-32` | 32 | `reference-embedding-32` |
| `openai-1536-small` | 1536 | `text-embedding-3-small` |

`assertReady` fails closed unless the migrated schema contract matches dimensions / model / metric.

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Derived `memory_vector_index` schema, HNSW cosine index, `PgvectorVectorStore` | Memory authorization; Persistence generic repos; embeddings |

---

## Docs

- [Vector search guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/vector-search.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)

## License

MIT © 2026 ameenmari
