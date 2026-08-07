# AgentProdReady v0.7 Vector Search & Semantic Memory — Checklist

**Product Version:** 0.7.0  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

## Amendments / contracts

- [x] `08-ai-provider-embedding` Implemented (chat unchanged)
- [x] `11-memory-index-provider` Implemented (INDEX/REMOVE ordering)
- [x] No Blueprint/ADR rewrite
- [x] No second Memory search API
- [x] No Memory → OpenAI / pg imports

## Embeddings

- [x] Parallel `AiEmbeddingAdapter` contracts
- [x] `ReferenceEmbeddingAdapter` (32-d deterministic)
- [x] `OpenAiEmbeddingAdapter` + mocked unit tests
- [x] Capability `embedding` seeded
- [x] Live OpenAI embeddings opt-in only

## Vector store

- [x] `@agentprodready/vector-store@0.1.0` + InMemory
- [x] `@agentprodready/vector-store-pgvector@0.1.0`
- [x] Profiles `reference-32` / `openai-1536-small`
- [x] `pnpm db:migrate:vector` / no runtime DDL
- [x] Tenant-scoped NN + cosine score normalization
- [x] Dimension/model mismatch fail-closed

## Memory / retrieval

- [x] INDEX: vector then canonical
- [x] REMOVE: canonical then best-effort cleanup
- [x] Semantic + hybrid RRF
- [x] Fallback partialReasons
- [x] Stale/orphan exclusion
- [x] Context Assembly proof (no vector types)

## Host / CI / docs

- [x] Config fail-closed when enabled
- [x] Default vector disabled
- [x] CI job `vector-search-postgres`
- [x] Compose pgvector image; host `0.7.0`
- [x] Probe script
- [x] Guides + README + `.env.example`
- [x] Implementation report
- [x] Regression suites green

## Stop conditions

- [x] None triggered
