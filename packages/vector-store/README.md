# @agentforge/vector-store

Provider-independent Vector Store contracts and an in-memory reference implementation for AgentForge Memory semantic search (v0.7).

**Package version:** `0.1.0`

## Ownership

This package owns:

- `VectorStorePort` and related write/query types
- Normalized similarity scores in `[0,1]` (higher = better)
- Dimension / embedding-model / metric mismatch errors (fail closed)
- `InMemoryVectorStore` for unit tests and local deterministic paths

It does **not** own:

- Memory lifecycle, ranking, or authorization
- Embedding generation (AI Provider)
- pgvector SQL / migrations (`@agentforge/vector-store-pgvector`)
- Knowledge Engine corpus vectors

## Contracts

```ts
import type { VectorStorePort } from '@agentforge/vector-store';
import { InMemoryVectorStore } from '@agentforge/vector-store';

const store = new InMemoryVectorStore({
  dimensions: 32,
  embeddingModelId: 'reference-embedding-32',
});
```

Composition selects the concrete adapter. Raw vendor distance types never escape the adapter boundary.
