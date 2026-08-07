# AgentProdReady v0.5 Persistent Memory — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.5.0  
**Plan Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Objective

Add **durable Memory persistence** by implementing a provider-independent `PersistenceBackedMemoryProvider` over existing Blueprint 24 repositories, selectable via host configuration, without changing Memory public contracts, without new PostgreSQL schema, and without vector search.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| AGENTS.md / docs/cursor-start-here.md | Yes |
| docs/implementation-guidelines.md / implementation-modes.md | Yes |
| docs/architecture/dependency-graph.md | Yes |
| Blueprint 11 Memory (+ report/spec/plan) | Yes |
| Blueprint 12 Context Assembly | Yes |
| Blueprint 15 / 17 / 22 / 24 / 04 | Yes |
| ADR-004, 005, 006, 008, 009, 011, 012 | Yes |
| `packages/memory` contracts + `InMemoryMemoryProvider` | Yes |
| `packages/persistence` + `persistence-postgres` (v0.3) | Yes |
| `packages/context-assembly` Memory boundary | Yes |
| platform-host Memory wiring (provider only) | Yes |
| v0.4 Runtime recovery pattern (host Persistence adapter) | Yes |

---

# Recommended Approach

**Selected: Persistence-backed Memory provider over Blueprint 24 repositories (no dedicated `memory-postgres` package).**

```text
MemoryEngine
  → MemoryStorageProvider + MemorySearchProvider
       ├── InMemoryMemoryProvider                 (default)
       └── PersistenceBackedMemoryProvider        (NEW)
             → PersistenceProvider.repository("memory-records")
                  ├── InMemoryPersistenceProvider
                  └── PostgresPersistenceProvider
```

| Option | Decision |
|---|---|
| **A. `PersistenceBackedMemoryProvider` in `@agentprodready/memory` using `@agentprodready/persistence`** | **Selected** — BP11 hard-depends on Persistence; keeps Memory semantics out of postgres package; zero Memory SQL |
| B. Dedicated `@agentprodready/memory-postgres` with `pg` | Rejected — duplicates Persistence provider; couples Memory to one DB |
| C. Host-only adapter (like Runtime checkpoints) | Viable fallback if Memory→Persistence dependency is rejected; inferior because BP11 already owns persistence-backed repositories |
| D. New Memory-specific SQL tables in persistence-postgres | Rejected for v0.5 — unnecessary; `persistence_entities` already stores typed `data` |

---

# Contract Sufficiency (Stop Condition Review)

### Status: **Cleared — no Memory public contract amendment required**

Inspected current contracts (`packages/memory/src/index.ts`):

| Surface | Already present | Promise-based? |
|---|---|---|
| `MemoryStorageProvider.save/get/replace/health` | Yes | Yes |
| `MemorySearchProvider.search/health` | Yes | Yes |
| `MemoryRecord` + ownership/classification/retention | Yes | N/A |
| Capture idempotency via `sourceEventId` → stable `id` | Yes | N/A |
| Lifecycle OCC via `lifecycleVersion` + `replace` | Yes | N/A |
| `MemoryErrorCode` / `ExternalMemoryError` normalization | Yes | N/A |
| Categories / lifetimes / states | Yes | N/A |

**Conclusion:** Existing contracts are sufficient for PostgreSQL-backed durability through Persistence. Do **not** silently change Memory public contracts.

### Allowed non-amendment implementation decisions

Documented in the specification (Memory ownership, not Persistence):

1. Optional injectable `now()` on `MemoryEngine` for deterministic expiry filtering at retrieve time.
2. Retrieve eligibility: `state === 'available'` **and** not past `retention.expiresAt` (logical expiry).
3. `PersistenceBackedMemoryProvider` keyword/metadata/temporal search only; `strategy: 'semantic' | 'hybrid'` may degrade to keyword + `partialReasons` (no embeddings).

These do not change exported Memory provider interfaces or capture/retrieval request shapes.

---

# Scope

## In Scope

- `PersistenceBackedMemoryProvider` implementing storage + search
- Repository mapping: `memory-records` / `PersistedEntity.data = MemoryRecord`
- Host config `MEMORY_PROVIDER=in-memory|persistent` (default `in-memory`)
- Wire Composition to select provider; widen host type from concrete `InMemoryMemoryProvider` where needed
- Logical expiry at retrieve (engine filter)
- Soft delete via lifecycle `delete` → state `deleted` (record may remain stored)
- Tenant partitioning via Persistence scope `{ tenantId }` only; workspace/user/agent isolation via Memory Engine + Security filters on `MemoryRecord.ownership`
- OCC: `lifecycleVersion` + Persistence `revision`/`versionToken`
- Unit/contract/integration/restart durability tests
- Package-level Context Assembly proof (Memory → `MemoryRetrievalResult` → assemble)
- Docs: `docs/guides/memory.md`, README pointers, `.env.example`
- Additive CI suite `pnpm test:memory-persistence` (Postgres)

## Out of Scope

- Vector search / embeddings / pgvector  
- Background TTL workers  
- Broad Memory REST API  
- Host product invoke path fully integrating MemoryEngine + Context Assembly (optional stretch; not required for milestone proof)  
- Encryption-at-rest / KMS  
- New PostgreSQL schema tables  
- Memory public contract redesign  
- Runtime owning Memory decisions  

---

# Durable Memory Fields

Persist the full existing `MemoryRecord` (no invented identity fields):

| Field | Source |
|---|---|
| `id` | `memory:{tenantId}:{sourceEventId}` |
| `sourceEventId`, `producer`, `execution` | Capture |
| `ownership` (tenant/workspace/user/agent) | Capture |
| `content`, `metadata`, `securityLabels` | Capture |
| `classification` (category/importance/lifetime/visibility) | Capture |
| `retention` (incl. optional `expiresAt`) | Capture |
| `version`, `occurredAt`, `state`, `lifecycleVersion` | Capture / lifecycle |

Persistence entity metadata (`revision`, `versionToken`, `createdAt`, `updatedAt`) supports OCC and diagnostics; Memory semantics remain in `data`.

---

# Category / Lifetime Guidance

Existing categories: `session | working | episodic | semantic | user | agent | organizational`  
Existing lifetimes: `temporary | session | persistent | permanent`

| Guidance | v0.5 |
|---|---|
| All categories **may** be stored when `MEMORY_PROVIDER=persistent` | Yes |
| Cross-restart usefulness | Prefer `lifetime: persistent \| permanent` + long-lived retention |
| `temporary` / `session` | Still stored if captured; no automatic GC worker in v0.5 |
| Semantic **category** ≠ vector semantic search | Category is classification only |

---

# Persistence Mapping

| Item | Decision |
|---|---|
| Repository name | `memory-records` |
| Entity id | `MemoryRecord.id` |
| Persistence scope | **`{ tenantId: ownership.tenantId }` only** — do **not** put `workspaceId` on PersistenceScope |
| Data payload | Full JSON-serializable `MemoryRecord` (includes ownership.workspaceId/userId/agentId) |
| New SQL tables | **None** |
| Migrations | **None** (reuse v0.3 schema) |
| SnapshotStore | Not used for mutable memory |

### Why tenant-only Persistence scope

Blueprint 24 behavior (in-memory and PostgreSQL):

| API | Omitted `workspaceId` means |
|---|---|
| `find` / `exists` | Exact “no workspace” key — **not** any workspace |
| `query` / `count` | Any workspace in that tenant |

A row stored with `{ tenantId, workspaceId }` **cannot** be retrieved by `find(id, { tenantId })`.  
`MemoryStorageProvider.get(id)` has no workspace argument, so workspace-scoped Persistence keys break durable `get`. Tenant-only storage matches Memory id identity (`tenantId` + `sourceEventId`) and keeps workspace authorization in Memory/Security.

### get(id) / replace notes

- **get:** strict fail-closed parse of canonical `memory:{tenantId}:{sourceEventId}` (see specification); then `find` with `{ tenantId }`. Unrestricted `:`-split parsing is **not** safe.
- **replace:** use `record.ownership.tenantId` for Persistence scope — no id parsing required.

---

# Capture / Lifecycle / Retrieval Flows

### Capture

```text
authorized caller
→ MemoryEngine.capture
→ validate + clone JSON content
→ stable id from tenant + sourceEventId
→ storage.save (duplicate → MEMORY_DUPLICATE)
→ facts/telemetry
```

Host must not write Persistence rows directly.

### Lifecycle

Caller-driven transitions (classify → … → make-available → archive/expire/delete) via `MemoryEngine.transition` + `storage.replace(expectedLifecycleVersion)`.

### Retrieval (no vectors)

```text
MemoryEngine.retrieve
→ search provider (keyword/metadata/temporal filters)
→ filter available + not expired + security/scope/category
→ dedupe → rank → limit
→ MemoryRetrievalResult
```

### Context Assembly

```text
MemoryRetrievalResult (normalized)
→ ContextAssemblyEngine.assemble
→ ExecutionContextPackage elements (source=memory)
```

No Persistence types in Context Assembly.

---

# Configuration

| Variable | Default | Meaning |
|---|---|---|
| `MEMORY_PROVIDER` | `in-memory` | `in-memory` \| `persistent` |
| `PERSISTENCE_PROVIDER` | `in-memory` | Selected Blueprint 24 provider |

| Combination | Behavior |
|---|---|
| memory=in-memory | Process-local Memory map (current default) |
| memory=persistent + persistence=in-memory | Persistence-shaped Memory; **not** cross-process durable |
| memory=persistent + persistence=postgres | Cross-process durable Memory |

Do not hardcode `MEMORY_PROVIDER=postgres`.

---

# Compose / CI

- Reuse existing postgres Compose profile — **no new DB container**
- Keep `verify` / `docker` database-optional
- Add `pnpm test:memory-persistence` + CI job (extend postgres job or dedicated `memory-persistence-postgres`)
- No production secrets

---

# Testing Strategy

| Layer | Coverage |
|---|---|
| Unit | Serialization, expiry filter, scope isolation helpers, OCC conflict mapping |
| Contract | Same MemoryEngine tests against InMemory + PersistenceBacked (in-memory Persistence) |
| Integration (Postgres) | capture → lifecycle to available → provider recreate → get/retrieve; delete; expire; tenant isolation; OCC |
| Context Assembly | Durable recall result assembled without Persistence leakage |
| Restart proof | capture (+ available) → close provider → new provider → retrieve same id/content |

Runtime recovery is **not** required for Memory durability.

---

# API Surface

**No broad Memory REST API in v0.5.** Framework/provider durability first. Local reference may expose Memory only through composition for tests/smoke health — not a commercial Memory API.

---

# Files to Create / Modify (Post-Approval)

### Create

- `packages/memory/src/persistence-backed-memory-provider.ts` (name finalized in spec)
- `packages/memory` tests for PersistenceBacked (+ postgres integration gated)
- `docs/guides/memory.md`
- `scripts/run-memory-persistence-tests.mjs` (+ vitest config if needed)
- implementation report + checklist (at completion)

### Modify

- `packages/memory/package.json` — add `@agentprodready/persistence` dependency; bump version toward `0.5.0`
- `packages/memory/src/index.ts` / `reference` exports; optional `now` on engine
- `apps/platform-host` config + composition Memory wiring
- `.env.example`, README.md, docs/README.md, docs/guides/persistence.md
- `.github/workflows/ci.yml`

### Do not modify

- Blueprint / ADR constitutional text  
- Persistence public contracts  
- PostgreSQL schema / migrations  
- Context Assembly public contracts (consume only)  

---

# Stop Conditions

Stop and report if:

- Memory public contracts must change for durability  
- Persistence public contracts must change  
- New PostgreSQL schema is required for Memory  
- Memory package must import `pg` / SQL  
- Persistence must own Memory ranking/authorization  
- Context Assembly must query Persistence  
- Vector/embedding infrastructure is required for the milestone claim  
- Default CI would require production DB secrets  

---

# Architectural Deviations

**None proposed.**

---

# Safe for Autonomous Implementation?

**Yes** — Persistence scope verification passed; documentation corrected to tenant-only storage. Implementers must:

1. store Memory rows with PersistenceScope `{ tenantId }` only,
2. not amend Memory/Persistence public contracts,
3. not add SQL schema,
4. not introduce vectors/embeddings,
5. keep default Memory path `in-memory`.

| Gate | Result |
|---|---|
| Contract amendment required | **No** |
| New stop condition | **No** |
| Autonomous safe | **Yes** |

---

# Review Gate

Design package ready for Autonomous implementation under the tenant-only Persistence scope correction.
