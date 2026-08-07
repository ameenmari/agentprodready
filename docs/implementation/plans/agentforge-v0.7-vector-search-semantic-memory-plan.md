# AgentProdReady v0.7 Vector Search & Semantic Memory — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.7.0  
**Plan Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Objective

Add provider-independent semantic and hybrid Memory retrieval using a Vector Store abstraction (pgvector first) and AI Provider embeddings, without hardcoding vendor SDKs into Memory, without changing Context Assembly public contracts, and without requiring embeddings/pgvector for default local/CI execution.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| AGENTS.md / docs/cursor-start-here.md / implementation-modes.md | Yes |
| docs/implementation-guidelines.md | Yes |
| docs/architecture/dependency-graph.md (BP08, 10, 11, 12, 24) | Yes |
| Blueprint 08, 10, 11, 12, 15–17, 22–24 | Yes |
| ADR-002, 003, 004, 005, 006, 007, 008, 009, 011, 012 | Yes |
| `@agentprodready/memory` contracts + PersistenceBackedMemoryProvider | Yes |
| `@agentprodready/ai-provider` + `@agentprodready/ai-provider-openai` | Yes |
| `@agentprodready/knowledge` retrieval contracts (parallel domain) | Yes |
| `@agentprodready/persistence-postgres` migrations / compose / CI | Yes |
| v0.5 product/plan/spec/report (future vector path §21) | Yes |
| v0.2 / v0.3 / v0.6 reports (AI chat-only; no pgvector) | Yes |
| Host `local-reference-config` conventions | Yes |

---

# Recommended Approach

**Selected: Option A**

```text
MemorySearchProvider (vector-capable)
  → EmbeddingPort (AI Provider embedding surface via Cap)
  → VectorStorePort
      → pgvector adapter (first)
      → future Qdrant / Pinecone / Weaviate / Milvus

MemoryIndexProvider (additive)
  → embed Memory content → upsert/remove derived vector rows

MemoryRecord = source of truth
Vector rows = derived search artifacts
```

| Option | Decision |
|---|---|
| **A. SemanticMemorySearchProvider + EmbeddingPort + VectorStorePort + pgvector** | **Selected** — matches BP11/ADR-004 and v0.5 §21 |
| B. Generalized platform RAG framework replacing Memory/Knowledge | Rejected — ownership split already constitutional |
| C. Hardwire pgvector inside Memory / Persistence | Rejected — blocks replaceable stores; blurs Persistence ownership |

### Why future stores work without Memory public behavior change

Callers always see `MemoryEngine.retrieve → MemoryRetrievalResult`.  
Composition swaps `VectorStorePort` implementations. Distance/vendor types normalize at the vector-store boundary (ADR-011). Memory ranking continues to consume `MemoryCandidate.relevance` in `[0,1]`-compatible units.

---

# Contract Sufficiency (Stop Condition Review)

### Status: **Not cleared for Autonomous code yet — two smallest amendments required**

| Surface | Status | v0.7 action |
|---|---|---|
| `MemorySearchProvider.search` | Sufficient | Implement vector-capable provider; **no second search API** |
| AI embedding execution | **Missing** | Create amendment `08-ai-provider-embedding-contract-amendment.md` before code |
| Memory index coordination | **Missing side effect** | Additive `MemoryIndexProvider` + engine hook; **INDEX = vector then Memory; REMOVE = Memory then vector** |
| Vector Store contracts | Missing (greenfield) | New `@agentprodready/vector-store` package — authorized by this approved design |
| Context Assembly | Sufficient | Unchanged consumers of `MemoryRetrievalResult` |
| Persistence public contracts | Sufficient | Do not put NN search into generic Persistence repositories |
| Knowledge public contracts | Out of scope | Do not implement Knowledge vector path in v0.7 |

**Blueprint rewrite required?** No — BP08 already names Embedding Generation; BP11 already owns Memory indexing semantics and Cap→AI enrichment path.  
**ADR required?** No — ownership unchanged; this is implementation-contract + new provider package work.

If Autonomous implementation discovers a forced Blueprint/ADR rewrite or Context Assembly public change, **STOP and report**.

---

# Scope

## In Scope

1. AI Provider embedding implementation-contract amendment + reference deterministic embedding adapter + OpenAI embeddings adapter.
2. New `@agentprodready/vector-store` contracts (`VectorStorePort`, normalized query/write types, errors, health).
3. New `@agentprodready/vector-store-pgvector` (extension, table, HNSW/exact strategy, migrator).
4. Additive Memory `MemoryIndexProvider` + `MemoryEngine` coordination on index/delete/expire/archive transitions.
5. Vector-capable `MemorySearchProvider` (semantic + hybrid fusion) composing keyword provider + vector store.
6. Host config / Composition / capability seed (`embedding` capability).
7. Docker/CI pgvector-compatible Postgres image (without breaking non-vector jobs).
8. Deterministic embedding provider for CI; opt-in live OpenAI embedding tests.
9. Tests, probe, guides, version tags for touched packages only.

## Out of Scope

- Pinecone / Qdrant / Weaviate / Milvus production adapters  
- Knowledge Engine vector indexing  
- Broad RAG redesign / rerankers as hard dependency  
- Embedding fields on `MemoryRecord`  
- Mandatory paid embeddings in default CI  
- Evaluation gating of retrieval quality in the hot path  

---

# Ownership Model

| Concern | Owner |
|---|---|
| Query interpretation, filters, ranking, lifecycle eligibility, hybrid fusion | Memory Engine |
| Embedding text → vector, vendor translation, usage, embedding errors | AI Provider Framework |
| Vector persistence, NN search, index health, metric/dimension enforcement | Vector Store provider |
| Ordinary entity durability / Postgres pool for Persistence repos | Persistence |
| Cap selection for embedding capability | Capability Resolution |
| Instantiation | Composition |
| Authorization | Security |
| Context package composition | Context Assembly |
| Operational retry/timeout for long embedding calls (future) | Runtime (not a v0.7 Runtime contract change) |

Forbidden:

- Memory → OpenAI SDK  
- Context Assembly → pgvector / VectorStore types  
- Persistence generic repos owning semantic ranking  
- pgvector enforcing workspace/user/agent authorization  

---

# First Providers

| Role | First implementation | Package |
|---|---|---|
| Vector store | **pgvector** on existing Postgres infrastructure | `@agentprodready/vector-store-pgvector` |
| Embedding (tests/CI) | **Deterministic reference** fixed-dimension vectors | `@agentprodready/ai-provider` reference adapter |
| Embedding (optional live) | **OpenAI** `embeddings.create` | `@agentprodready/ai-provider-openai` |

pgvector does **not** live inside `@agentprodready/persistence-postgres` as a Persistence semantic feature. Persistence remains generic entity/snapshot I/O. Vector schema/migrations are owned by the vector-store-pgvector package (may share `DATABASE_URL`).

---

# Stages

### Stage 0 — Amendments (blocking until approved)

1. AI Provider embedding amendment (`08-…`, In Review — contents frozen).  
2. Memory index-provider amendment (`11-…`, In Review — INDEX/REMOVE ordering frozen).  
3. Vector Store public contracts frozen in specification (including Option C dimension profiles).

### Stage 1 — Contracts & reference adapters

1. Implement embedding contracts + deterministic embed adapter.  
2. Implement `@agentprodready/vector-store` + in-memory reference store.  
3. Wire MemoryIndexProvider + MemoryEngine hooks.  
4. Unit tests (no network, no Postgres).

### Stage 2 — pgvector provider

1. pgvector image / Compose impact.  
2. Migrations: profile-selected checked-in SQL (`vector(N)` frozen per profile) + `CREATE EXTENSION vector` + `memory_vector_index`.
3. Upsert / delete / NN query / dimension+model guards / tenant filter; runtime must match frozen profile contract.
4. Postgres integration suite.

### Stage 3 — Semantic / hybrid Memory search

1. Vector-capable `MemorySearchProvider`.  
2. Semantic flow + hybrid RRF/weighted fusion.  
3. Fallback `partialReasons` when disabled/unavailable.  
4. Lifecycle consistency (stale, delete, expire).  
5. Context Assembly proof (semantic recall → memory source elements).

### Stage 4 — OpenAI embeddings (optional path)

1. OpenAI embeddings adapter (chat path unchanged).  
2. Opt-in live tests only.  
3. Error normalization.

### Stage 5 — Host / CI / docs

1. Config flags; Composition wiring; health.  
2. CI job `vector-search-postgres`.  
3. Probe script.  
4. Guides + README + `.env.example`.  
5. Report + checklist; package versions only where modified.

---

# Indexing & Retrieval Flows (Plan-Level)

### Indexing consistency (caller-driven; no distributed transaction)

```text
INDEX (action=index):
  validate auth/lifecycle/OCC
  construct proposed MemoryRecord (state=indexed, lifecycleVersion+1)
  MemoryIndexProvider.index(proposed)   # embed → VectorStore.upsert FIRST
  storage.replace(proposed)             # canonical indexed ONLY after vector ok
  publish memory.indexed

  if vector/embed fails → do NOT persist indexed; remain organized
  if vector ok but OCC/storage fails → do NOT claim success; orphan vector excluded by SoT checks

REMOVE (delete|expire|archive):
  storage.replace(canonical terminal/non-recallable state) FIRST
  publish lifecycle fact
  MemoryIndexProvider.remove(...) best-effort
  vector cleanup failure does NOT roll back canonical state
```

v0.7 prefers this caller-driven path (existing lifecycle actions). No async worker framework. No distributed transactions across Persistence and VectorStore.

### Semantic retrieve

```text
strategy=semantic
  → embed(query)
  → VectorStore.query(tenant-scoped NN)
  → load MemoryRecords by id
  → MemoryCandidate[] (normalized relevance)
  → Engine: available + !expired + Security filters + ranking
```

### Hybrid retrieve

```text
keyword candidates + semantic candidates
  → score normalization
  → Reciprocal Rank Fusion (selected default)
  → dedupe by memory id
  → Engine filters + WeightedMemoryRanking + limit
```

### Fallback

When vector search disabled or unavailable for `semantic`/`hybrid`:

- Keep v0.5 honesty: keyword path + `partialReasons` including `semantic-unavailable` (and a more specific reason when known).
- Never claim semantic results when semantic search did not run.

---

# Configuration Modes (Intent)

| Mode | Behavior |
|---|---|
| Defaults | Vector off; keyword Memory; no API key |
| Persistent Memory only | Unchanged from v0.5 |
| Vector enabled + deterministic embed + pgvector | CI / local semantic proofs |
| Vector enabled + OpenAI embed + pgvector | Opt-in live path |

Exact env names in specification (aligned with `AI_PROVIDER`, `MEMORY_PROVIDER`, `PERSISTENCE_PROVIDER`).

---

# CI / Docker Strategy

- Default `verify` / `docker`: vector **disabled**; no secrets.  
- Additive job `vector-search-postgres`: Postgres image with pgvector; deterministic embeddings; no paid calls.  
- Live OpenAI embedding tests: opt-in via existing `AI_LIVE_TESTS` convention (or dedicated equivalent documented in spec).  
- Replace/extend Compose `postgres` image to a pgvector-compatible Postgres 16 image so existing persistence/recovery/memory/evaluation suites continue on the same DB service.

---

# Testing Strategy

| Layer | Proofs |
|---|---|
| Embedding | Deterministic vectors; dims; batch; invalid input; normalized errors |
| Vector store | Upsert/update/remove; NN; tenant isolation; dim/model mismatch; durability across provider recreate |
| Memory | Semantic; hybrid; keyword unchanged; lifecycle; expiry; delete; cross-tenant; fallback; dedupe; ranking |
| Context | Semantic `MemoryRetrievalResult` → Context Assembly memory sources |
| Regression | Existing suites green; OpenAI chat path unchanged |

Manual: `scripts/vector-search-probe.mjs` (safe ids/scores only).

---

# Versioning

| Artifact | Version |
|---|---|
| Product | **0.7.0** |
| `@agentprodready/memory` | bump (index provider + search impl) |
| `@agentprodready/ai-provider` | bump (embedding contracts) |
| `@agentprodready/ai-provider-openai` | bump (embeddings adapter) |
| `@agentprodready/vector-store` | **0.1.0** (new) |
| `@agentprodready/vector-store-pgvector` | **0.1.0** (new) |
| `@agentprodready/platform-host` | **0.7.0** |
| Unrelated packages | **no bump** |

---

# Documentation Plan

- `docs/guides/vector-search.md` (new)  
- Update `docs/guides/memory.md`, `persistence.md`, README, docs/README, `.env.example`  
- Provider READMEs for ai-provider, openai, vector-store, pgvector  

---

# Acceptance Criteria Mapping

| Criterion | Verification |
|---|---|
| Semantic retrieve via MemorySearchProvider | Memory + pgvector suite |
| Hybrid fusion deterministic | Unit tests with fixed ranks |
| No Memory → OpenAI SDK | Boundary test |
| No Context Assembly → vector types | Boundary test |
| Tenant isolation at vector query + Engine filters | Integration |
| Default CI secret-free / vector-off | CI + verify |
| Deterministic embed CI proofs | `vector-search-postgres` job |
| OpenAI chat unchanged | Existing openai package tests |
| Durability suites still green | postgres / recovery / memory / evaluation jobs |
| Keyword path preserved | Existing memory tests |

---

# Stop Conditions

STOP if design/implementation requires:

- Rewriting Blueprint 11 or Context Assembly public contracts  
- Memory importing OpenAI SDK / Context Assembly importing VectorStore  
- Generic Persistence owning vector ranking  
- Provider-specific vector types on public Memory results  
- Mandatory paid OpenAI in default CI  
- Destructive breaks to v0.3–v0.6 durability flows  
- Unsupported public contract changes beyond the two named amendments + new vector-store package  

---

# Architectural Deviations

None intended relative to ADRs/Blueprints.  
Deviations from naive “put vector column on `persistence_entities`”: **intentional** — derived `memory_vector_index` owned by vector-store-pgvector.

---

# Safe for Autonomous Implementation?

**PASS (pending human approval of this corrected Review-Gated design).**

After approval of:

1. This plan + product doc + specification (including INDEX/REMOVE ordering + dimension profiles)  
2. AI Provider embedding amendment (`08-…`, Status: In Review — not Implemented)  
3. Memory index-provider amendment (`11-…`, Status: In Review — not Implemented)

Autonomous mode may implement Stages 0–5 without redesigning ownership. No Blueprint/ADR amendment. No contracts beyond the two named amendments + greenfield `@agentprodready/vector-store`.
