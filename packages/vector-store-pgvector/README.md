# @agentprodready/vector-store-pgvector

pgvector adapter for `@agentprodready/vector-store` (AgentProdReady v0.7 Memory semantic search).

**Package version:** `0.1.0`

## Ownership

Owns derived `memory_vector_index` schema, profile migrations, HNSW cosine index, and `PgvectorVectorStore`.

Does **not** own Memory authorization, Persistence generic entity repositories, or embedding generation.

## Profiles (Option C)

| `VECTOR_INDEX_PROFILE` | Dimensions | Embedding model id |
|---|---|---|
| `reference-32` | 32 | `reference-embedding-32` |
| `openai-1536-small` | 1536 | `text-embedding-3-small` |

Checked-in SQL under `migrations/profiles/<profile>/` freezes `vector(N)`. Changing dimensions requires an explicit profile rebuild + re-embed + reindex — never runtime DDL.

## Migrations

```bash
VECTOR_INDEX_PROFILE=reference-32 pnpm db:migrate:vector
VECTOR_INDEX_PROFILE=reference-32 pnpm db:status:vector
```

Requires `DATABASE_URL` (same shape as `@agentprodready/persistence-postgres`). Not applied by default `pnpm db:migrate`.

## Runtime

```ts
import { PgvectorVectorStore } from '@agentprodready/vector-store-pgvector';

const store = new PgvectorVectorStore({
  config,
  dimensions: 32,
  embeddingModelId: 'reference-embedding-32',
});
await store.assertReady();
```

`assertReady` fails closed unless the migrated `memory_vector_schema_contract` matches constructor dimensions / model / metric.
