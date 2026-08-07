# AgentProdReady v0.7 Vector Search & Semantic Memory

**Version:** 0.7.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentProdReady v0.7 introduces **production-capable vector search and semantic Memory retrieval** behind the existing `MemorySearchProvider` seam, while preserving:

- Memory Engine ownership of retrieval semantics, ranking, lifecycle eligibility, and normalized results
- AI Provider ownership of embedding generation (no OpenAI SDK in Memory)
- a provider-neutral **Vector Store** boundary (pgvector first; Qdrant / Pinecone / Weaviate later)
- Persistence ownership of ordinary durable bytes (not vector ranking)
- Context Assembly ownership of context composition from `MemoryRetrievalResult` only
- Security ownership of authorization
- Capability Resolution ownership of embedding implementation selection
- Composition ownership of instantiation
- deterministic default CI (no embeddings, no pgvector, no paid API calls)

This milestone must **not** hardcode pgvector into Memory Engine public behavior, and must **not** make Context Assembly or Persistence the vector search owner.

---

## Authority

| Document | Role |
|---|---|
| [Blueprint 11 — Memory Engine](../blueprints/11-memory-engine.md) | Memory ownership; index coordination; embedding via Cap → AI |
| [Blueprint 08 — AI Provider Framework](../blueprints/08-ai-provider-framework.md) | Embedding Generation capability category (aspirational → must become real) |
| [Blueprint 10 — Knowledge Engine](../blueprints/10-knowledge-engine.md) | Parallel knowledge retrieval; must not own Memory vectors |
| [Blueprint 12 — Context Assembly](../blueprints/12-context-assembly-engine.md) | Consumes `MemoryRetrievalResult` only |
| [Blueprint 24 + v0.3 PostgreSQL](./agentprodready-v0.3-postgresql-persistence.md) | Durable Persistence primitives |
| [v0.5 Persistent Memory](./agentprodready-v0.5-persistent-memory.md) | Durable Memory; semantic degrade path |
| ADR-002 / 003 / 004 / 005 / 006 / 007 / 008 / 009 / 011 / 012 | Ownership, contracts, providers, Cap, Security, facts, normalize, config |
| [Implementation Plan](../implementation/plans/agentprodready-v0.7-vector-search-semantic-memory-plan.md) | Approach (pending review) |
| [Implementation Specification](../implementation/specifications/agentprodready-v0.7-vector-search-semantic-memory-specification.md) | Exact decisions (pending review) |
| [08 embedding amendment](../implementation/amendments/08-ai-provider-embedding-contract-amendment.md) | Parallel AI embedding surface (In Review) |
| [11 index-provider amendment](../implementation/amendments/11-memory-index-provider-contract-amendment.md) | INDEX/REMOVE consistency (In Review) |

Blueprints and ADRs remain authoritative over this product design.

---

## Contract Inventory (Inspection Result)

| Concern | Exists today? | Location / notes |
|---|---|---|
| Embedding generation typed contracts | **No** | BP08 lists “Embedding Generation”; `@agentprodready/ai-provider` is chat-only (`AiExecutionRequest` / `NormalizedAiResult`) |
| Vector representation / store contracts | **No** | ADR-004 names Pinecone/Qdrant/pgvector as examples only |
| Memory semantic/hybrid strategy tags | **Yes** | `MemorySearchStrategy` includes `'semantic'` \| `'hybrid'` |
| `MemorySearchProvider.search → MemoryCandidate[]` | **Yes** | Sufficient public search seam |
| Keyword / metadata / temporal Memory search | **Yes** | `InMemoryMemoryProvider`, `PersistenceBackedMemoryProvider` |
| Honest semantic degrade | **Yes (persistent path)** | `partialReasons: ['semantic-unavailable']` |
| Knowledge `vector` / `hybrid` strategy tags | **Yes (tags only)** | Knowledge owns corpus retrieval separately; no Memory conflict |
| OpenAI embeddings adapter | **No** | OpenAI package is `chat.completions` only |
| pgvector / vector SQL | **No** | `postgres:16-alpine`; `001_init.sql` has no extensions |
| Embedding fields on `MemoryRecord` | **Must not add** | v0.5 explicit non-goal; vectors are derived artifacts |

### Contract sufficiency gate

| Surface | Verdict |
|---|---|
| `MemorySearchProvider` for semantic/hybrid retrieval | **Sufficient** — vector-capable implementation can return `MemoryCandidate[]` honestly |
| AI Provider embedding execution | **Missing** — **design stop**: smallest implementation-contract amendment required before Autonomous code |
| Memory Engine index coordination side effect | **Missing hook** — today `transition(index)` only flips state; additive Memory index-provider contract required for honest lifecycle indexing |
| Vector Store abstraction | **Missing** — greenfield provider contracts (new package), not a Memory search API rewrite |

**Do not invent a second Memory search API.**  
**Do not put OpenAI SDK or pgvector types on Context Assembly or Memory public results.**

---

## Product Boundary

```text
MemoryEngine.retrieve
  → MemorySearchProvider (vector-capable when enabled)
      → Capability Resolution (capability "embedding")
      → AiEmbeddingAdapter (provider-neutral AI boundary)
      → VectorStorePort
          ├── pgvector adapter (v0.7 first)
          └── future Qdrant / Pinecone / Weaviate / …

Consistency (no distributed transaction):

INDEX:   derived vector upsert FIRST → then storage.replace(state=indexed)
REMOVE:  storage.replace(deleted|expired|archived) FIRST → then best-effort vector remove

Context Assembly
  → MemoryRetrievalResult only
  ✗ no vectors, no pgvector, no embedding models
```

| Package / layer | Owns |
|---|---|
| `@agentprodready/memory` | Retrieval semantics, ranking fusion, lifecycle eligibility filters, `MemorySearchProvider` implementations |
| `@agentprodready/ai-provider` (+ amendment) | Provider-neutral embedding request/result/errors |
| `@agentprodready/ai-provider-openai` | OpenAI `embeddings.create` translation |
| `@agentprodready/vector-store` (new) | `VectorStorePort` contracts + reference in-memory store |
| `@agentprodready/vector-store-pgvector` (new) | pgvector schema, migrations, NN search |
| `@agentprodready/persistence` / `-postgres` | Ordinary Persistence; **not** vector ranking owner |
| `apps/platform-host` | Config, Composition wiring, capability seed for embeddings |

---

## Recommended Architecture (Summary)

**Selected: Option A — provider-neutral Vector Store + AI embedding amendment + vector-capable `MemorySearchProvider`.**

Rejected:

- **B.** Generalized RAG/Retrieval framework rewrite — Knowledge already owns corpus retrieval; Memory owns execution-derived recall
- **C.** Memory-specific hardwired pgvector — violates ADR-004 and blocks future stores

Default product behavior: **vector search disabled**. Keyword Memory and all v0.3–v0.6 durability paths remain unchanged.

---

## Configuration (Conceptual)

Exact names finalized in the specification after Configuration conventions inspection. Intent:

| Concern | Default |
|---|---|
| Memory provider | `in-memory` (unchanged) |
| Vector search | **disabled** |
| Vector store | unset / unused when disabled |
| Embedding provider | unset / unused when disabled |
| Live OpenAI embedding tests | opt-in only |

No API key required for default CI.

---

## Source-of-Truth Rule

`MemoryRecord` remains authoritative.

Vector index rows are **derived search artifacts**. They never authorize recall alone. Expired / deleted / non-`available` Memory must not be recallable even if a vector row still exists.

**INDEX rule:** derived artifact first → canonical `indexed` state second.  
**REMOVE rule:** canonical delete/expire/archive first → derived cleanup second (best-effort; never roll back canonical lifecycle).

Orphan/stale vectors (vector write succeeded but Memory OCC failed, or cleanup failed) are excluded by canonical validation (`contentVersion` / `lifecycleVersion` / state / expiry / tenant).

## pgvector Dimension Contract

A pgvector deployment freezes one active `(embeddingModelId, dimensions, metric)` contract via an explicit **deployment profile** migration (`pnpm db:migrate:vector`).  
`vector(N)` is not a runtime `.env` switch. Changing 32 → 1536 requires rebuild/recreate index → re-embed → reindex. No pad/truncate/silent cross-model compare/runtime DDL.

---

## Explicit Non-Goals

- Production Pinecone / Qdrant / Weaviate / Milvus adapters
- Multi-vector routing / automatic model benchmarking
- Knowledge-graph or broad RAG redesign
- Reranker models as a v0.7 hard dependency
- Distributed vector clusters / vector caching
- Streaming responses / tool calling / multi-provider AI routing
- Mandatory paid OpenAI calls in default CI
- Embedding columns or model ids on `MemoryRecord`
- Moving authorization into pgvector
- Making `@agentprodready/persistence-postgres` owner of semantic ranking

---

## Review Gate

This product doc, plan, specification, and the Review-Gated amendment texts (`08-ai-provider-embedding`, `11-memory-index-provider`) must be approved before production code.

With the corrected INDEX/REMOVE ordering and frozen dimension-profile migration rule, the design is **ready for Autonomous approval** (no Blueprint/ADR amendment; no contracts beyond the two named amendments + greenfield vector-store package).

No production code in this Review-Gated pass.
