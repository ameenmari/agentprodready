# Vector Search & Semantic Memory

**Version:** 0.7.0

AgentProdReady v0.7 adds provider-neutral semantic and hybrid Memory retrieval behind `MemorySearchProvider`. Default product behavior keeps vector search **disabled**.

## Ownership

| Concern | Owner |
|---|---|
| Retrieval semantics, ranking, hybrid fusion, lifecycle eligibility | Memory Engine |
| Embedding generation | AI Provider (`AiEmbeddingAdapter`) via Capability Resolution |
| Vector persistence / NN search | Vector Store (`VectorStorePort`) |
| Ordinary MemoryRecord durability | Persistence |
| Context composition | Context Assembly (`MemoryRetrievalResult` only) |

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `VECTOR_SEARCH_ENABLED` | `false` | Master switch |
| `VECTOR_STORE_PROVIDER` | `none` | `memory` (process-local) \| `pgvector` |
| `EMBEDDING_PROVIDER` | `none` | `reference` \| `openai` |
| `EMBEDDING_MODEL` | (profile) | Must match profile |
| `EMBEDDING_DIMENSIONS` | (profile) | Must match profile |
| `VECTOR_INDEX_PROFILE` | (migrate only / enabled) | `reference-32` \| `openai-1536-small` |

### Reference / CI profile

```bash
VECTOR_SEARCH_ENABLED=true
VECTOR_STORE_PROVIDER=pgvector
EMBEDDING_PROVIDER=reference
EMBEDDING_MODEL=reference-embedding-32
EMBEDDING_DIMENSIONS=32
VECTOR_INDEX_PROFILE=reference-32
```

### OpenAI profile (opt-in)

```bash
VECTOR_SEARCH_ENABLED=true
VECTOR_STORE_PROVIDER=pgvector
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
VECTOR_INDEX_PROFILE=openai-1536-small
# plus OPENAI_API_KEY / existing OpenAI config
```

Changing dimensions/model is **not** an `.env`-only switch. It requires rebuilding the vector schema for the new profile, re-embedding, and reindexing.

## Migrations

```bash
pnpm db:up
pnpm db:migrate
VECTOR_INDEX_PROFILE=reference-32 pnpm db:migrate:vector
```

Compose Postgres uses a pgvector-enabled PostgreSQL 16 image. Existing Persistence / recovery / Memory / Evaluation durability jobs share the same service.

## Consistency

- **INDEX:** embed + vector upsert **then** persist `state=indexed`
- **REMOVE (delete/expire/archive):** persist canonical state **then** best-effort vector remove
- `MemoryRecord` is authoritative; vectors are derived. Orphan/stale vectors are excluded by canonical validation.

## Search strategies

| Strategy | Behavior when enabled | When disabled / unavailable |
|---|---|---|
| `keyword` | Unchanged | Unchanged |
| `semantic` | Query embed → NN → validate → candidates | Keyword + `semantic-unavailable` |
| `hybrid` | RRF (k=60) over keyword + semantic | Keyword + `semantic-unavailable` |

## Privacy

Do not log Memory content, embedding vectors, or API keys. Sensitive-label Memory fails indexing closed (does not embed).

## Probe

```bash
node scripts/vector-search-probe.mjs
```

## CI

Additive job `vector-search-postgres` uses reference-32 + deterministic embeddings. Default `verify` / `docker` leave vector search off. Live OpenAI embeddings remain opt-in via `AI_LIVE_TESTS=1`.
