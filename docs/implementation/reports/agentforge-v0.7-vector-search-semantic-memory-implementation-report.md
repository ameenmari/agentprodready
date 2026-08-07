# AgentForge v0.7 Vector Search & Semantic Memory — Implementation Report

**Product Version:** 0.7.0  
**Platform Host:** `@agentforge/platform-host@0.7.0`  
**Packages:** `@agentforge/ai-provider@0.2.0`, `@agentforge/ai-provider-openai@0.3.0`, `@agentforge/memory@0.7.0`, `@agentforge/vector-store@0.1.0`, `@agentforge/vector-store-pgvector@0.1.0`  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07  
**Status:** Complete

---

## Summary

v0.7 adds provider-neutral semantic and hybrid Memory retrieval. Embeddings are a parallel AI Provider surface; vectors live behind `VectorStorePort` with pgvector as the first durable adapter. Default CI/local remains vector-disabled and secret-free. INDEX writes derived vectors before claiming `indexed`; REMOVE persists canonical lifecycle first.

---

## Amendments

| Amendment | Status |
|---|---|
| `08-ai-provider-embedding` | Implemented |
| `11-memory-index-provider` | Implemented |

No Blueprint/ADR constitutional changes. No Context Assembly / Runtime / Persistence public contract redesign.

---

## Embedding

- Parallel `AiEmbeddingAdapter` contracts (chat unchanged)
- `ReferenceEmbeddingAdapter` — deterministic 32-d, CI/test only
- `OpenAiEmbeddingAdapter` — `embeddings.create`, default `text-embedding-3-small` / 1536
- Capability `embedding` with `reference-ai:embedding` / `openai-ai:embedding`
- Chain: Memory → Cap → `AiEmbeddingAdapterResolver` → adapter

---

## Vector store

- `@agentforge/vector-store` contracts + `InMemoryVectorStore`
- `@agentforge/vector-store-pgvector` with profiles `reference-32` / `openai-1536-small`
- Table `memory_vector_index` + schema contract table; HNSW cosine
- `pnpm db:migrate:vector` (not run at host startup)
- Compose/CI image: `pgvector/pgvector:pg16`

---

## Memory

- `MemoryIndexProvider` + `NoopMemoryIndexProvider`
- INDEX: upsert then `storage.replace(indexed)`
- REMOVE: canonical then best-effort vector remove
- `VectorCapableMemorySearchProvider` + RRF hybrid (k=60)
- Stale/orphan exclusion via contentVersion + lifecycle orphan rule
- Fallback `partialReasons`: `semantic-unavailable`, `embedding-unavailable`, `vector-store-unavailable`

---

## Verification

| Gate | Result |
|---|---|
| `pnpm lint` / `typecheck` / `test` / `build` / `smoke` | Pass (`0.7.0`) |
| `pnpm test:postgres` | Pass |
| `pnpm test:runtime-recovery` | Pass |
| `pnpm test:memory-persistence` | Pass |
| `pnpm test:evaluation-persistence` | Pass |
| `pnpm test:vector-pgvector` | Pass |
| `pnpm test:vector-search` | Pass |
| Docker smoke (`0.7.0`) | Pass |
| `scripts/vector-search-probe.mjs` | Pass (`hit: true`) |
| Default `VECTOR_SEARCH_ENABLED=false` | Unchanged product path |

---

## Known limitations

1. No automatic cross-profile dimension migrator (operator rebuild/reindex)
2. No production Pinecone/Qdrant/Weaviate adapters
3. No Knowledge Engine vector path
4. No background reindex workers
5. Host allows `VECTOR_STORE_PROVIDER=memory` for process-local proofs (not cross-process durable)
6. Live OpenAI embeddings remain opt-in (`AI_LIVE_TESTS`)

---

## Architectural deviations

None vs approved v0.7 design. Intentional: `VectorMatch` includes `contentVersion` / `lifecycleVersion` for stale checks (greenfield additive).

---

## v0.8 readiness

v0.7 complete. Later milestones may add alternate vector stores or Knowledge vectors without changing Memory public retrieve contracts.
