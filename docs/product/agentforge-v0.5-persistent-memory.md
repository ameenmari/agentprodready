# AgentForge v0.5 Persistent Memory

**Version:** 0.5.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentForge v0.5 makes **Memory records durable across process restarts** by backing the existing Memory storage/search provider contracts with Blueprint 24 Persistence repositories (optionally PostgreSQL), while preserving:

- Memory Engine ownership of capture, retrieval, lifecycle, and retention semantics
- Persistence provider independence
- Context Assembly ownership of context composition
- Runtime ownership of operational execution
- Security authorization boundaries
- deterministic in-memory default for local/CI

This milestone proves that memory can survive process restarts **without** turning Persistence into the Memory Engine, and **without** introducing vector search, embeddings, or a vector database.

---

## Authority

| Document | Role |
|---|---|
| [Blueprint 11 — Memory Engine](../blueprints/11-memory-engine.md) | Memory ownership |
| [Blueprint 12 — Context Assembly](../blueprints/12-context-assembly-engine.md) | Context composition ownership |
| [Blueprint 15 / ADR-008](../adrs/ADR-008%20%E2%80%94%20Security%20Owns%20Authorization.md) | Authorization |
| [Blueprint 17 / ADR-009](../adrs/ADR-009%20%E2%80%94%20Historical%20Facts%20Are%20Immutable.md) | Audit immutability |
| [Blueprint 22](../blueprints/22-observability-and-diagnostics.md) | Observability |
| [Blueprint 24 + v0.3 PostgreSQL](./agentforge-v0.3-postgresql-persistence.md) | Storage primitives / durability |
| [Blueprint 04 / ADR-006](../adrs/ADR-006%20%E2%80%94%20Runtime%20Owns%20Operational%20Execution.md) | Runtime does not own Memory |
| [ADR-004](../adrs/ADR-004%20%E2%80%94%20Provider%20Independence.md) / [ADR-005](../adrs/ADR-005%20%E2%80%94%20Composition%20Owns%20Instantiation.md) | Provider selection |
| [Implementation Plan](../implementation/plans/agentforge-v0.5-persistent-memory-plan.md) | Approach (pending review) |
| [Implementation Specification](../implementation/specifications/agentforge-v0.5-persistent-memory-specification.md) | Exact decisions (pending review) |

Blueprints and ADRs remain authoritative. **No Memory public contract amendment is required** for v0.5 (see plan/spec).

---

## Product Boundary

```text
apps/platform-host (Composition)
  ├── selects MEMORY_PROVIDER = in-memory | persistent
  ├── selects PERSISTENCE_PROVIDER = in-memory | postgres
  └── wires MemoryEngine with:
        ├── InMemoryMemoryProvider              (default)
        └── PersistenceBackedMemoryProvider     (additive)
              └── PersistenceProvider.repository("memory-records")
                    └── PersistenceScope = { tenantId } only

@agentforge/memory                 ← Memory Engine + provider contracts (ownership)
@agentforge/persistence            ← storage contracts only
@agentforge/persistence-postgres   ← durable PersistenceProvider (no Memory SQL)
@agentforge/context-assembly       ← consumes MemoryRetrievalResult only
```

Persistence stores opaque `MemoryRecord` bytes under **tenant-only** repository scope.  
`workspaceId` / `userId` / `agentId` remain inside `MemoryRecord.ownership` and are enforced by Memory Engine + Security — not by Persistence scope keys.

Persistence never classifies, ranks, authorizes, or composes context.

---

## What Exists Today

| Capability | Status |
|---|---|
| `MemoryEngine` capture / lifecycle / retrieve | Implemented |
| `MemoryStorageProvider` / `MemorySearchProvider` (Promise-based) | Implemented |
| `InMemoryMemoryProvider` (default host wiring) | Implemented |
| Durable Memory across process restart | **Missing** |
| Host invoke path → MemoryEngine → Context Assembly | **Not product-wired** (framework packages exist) |
| Vector / semantic embedding retrieval | Out of scope (strategy enum exists; no embeddings) |

v0.3 proved Blueprint 24 durability. v0.4 proved Runtime checkpoints. Memory durability was explicitly deferred.

---

## Ownership (Non-Negotiable)

| Concern | Owner |
|---|---|
| Memory record semantics, capture, retrieval, lifecycle, retention, deletion | **Memory Engine** |
| Memory provider normalization / filtering / ranking rules | **Memory Engine** |
| Storage primitives, transactions, durability, repositories | **Persistence** |
| How recalled memory enters an Execution Context Package | **Context Assembly** |
| Authorization decisions | **Security** |
| Retry/timeout/scheduling of lifecycle work | **Runtime** (caller-driven today) |

Runtime must not become the Memory Engine. Host code must not write `memory-records` rows bypassing `MemoryEngine`.

---

## Success Definition

v0.5 succeeds when:

1. Memory records captured through `MemoryEngine` can be stored via a Persistence-backed provider.
2. After process/provider recreation with PostgreSQL, the same memory id is loadable and recallable (when lifecycle-available and not expired).
3. Default `MEMORY_PROVIDER=in-memory` path remains deterministic and database-free.
4. Context Assembly continues to consume only `MemoryRetrievalResult` — no SQL/pg/Persistence types.
5. No pgvector, embeddings, or semantic similarity infrastructure is introduced.
6. No Memory public contract amendment is required.

---

## Explicit Non-Goals

- pgvector / Pinecone / Qdrant / Weaviate / embeddings / semantic similarity / RAG redesign  
- Redis / Kafka / background retention workers  
- Production encryption/KMS  
- UI / broad Memory REST API  
- Distributed Memory caching  
- Redesigning Context Assembly or Runtime for this slice  

---

## Persistence Scope Correction (Approved)

Verified against Blueprint 24 implementations: `Repository.find` / `exists` use **exact** tenant+workspace keys; omitted `workspaceId` means “no workspace,” not “any workspace.” Therefore Memory rows must **not** be stored with workspace in `PersistenceScope`, or `get(id)` (tenant-only lookup) cannot find them.

| Layer | Scope |
|---|---|
| Persistence repository key | `{ tenantId }` only |
| `MemoryRecord.ownership` | tenant + optional workspace/user/agent |
| Authorization | Memory Engine + Security |

---

## Review Gate

Documentation corrected for tenant-only Persistence scope. No production code until Autonomous implementation is authorized.
