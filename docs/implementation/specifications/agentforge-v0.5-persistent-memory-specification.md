# AgentForge v0.5 Persistent Memory — Implementation Specification

**Document Version:** 1.0  
**Product Version:** 0.5.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Authority and Mode

```text
Implementation Mode: Review-Gated
```

This specification records exact design decisions for durable Memory. It does **not** authorize production code until approved.

Architectural authority order remains Foundation → ADRs → Blueprint 11 → dependencies → Governance → this specification → conforming code.

---

# 1. Ownership Confirmation

| Concern | Owner | Must not own |
|---|---|---|
| Memory record semantics | Memory Engine | Persistence, Runtime, Context Assembly |
| Capture / retrieval / lifecycle / retention / deletion semantics | Memory Engine | Persistence |
| Ranking / category filters / recall projection | Memory Engine | Persistence |
| Durable bytes / transactions / OCC tokens | Persistence provider | Memory business rules |
| Context composition from recalled memory | Context Assembly | Memory provider / Persistence |
| Authorization decisions | Security | Persistence / Memory provider |
| Scheduling retries/timeouts for lifecycle work | Runtime | Memory Engine autonomous workers |

**Rule:** Persistence stores; Memory decides. Context Assembly composes; Memory does not build prompts/context packages.

---

# 2. Existing Contract Inspection

## 2.1 Provider surfaces (current)

```ts
export interface MemoryStorageProvider {
  save(record: MemoryRecord): Promise<void>;
  get(id: string): Promise<MemoryRecord | undefined>;
  replace(record: MemoryRecord, expectedLifecycleVersion: number): Promise<void>;
  health(): Promise<HealthResult>;
}

export interface MemorySearchProvider {
  search(request: MemoryRetrievalRequest): Promise<Readonly<{
    candidates: readonly MemoryCandidate[];
    partialReasons: readonly string[];
  }>>;
  health(): Promise<HealthResult>;
}
```

Both are already **Promise-based** and sufficient for I/O-backed providers.

## 2.2 Key value types (current)

| Type | Role |
|---|---|
| `MemoryCategory` | `session \| working \| episodic \| semantic \| user \| agent \| organizational` |
| `MemoryLifetime` | `temporary \| session \| persistent \| permanent` |
| `MemoryState` | `captured → … → available → archived \| expired \| deleted` |
| `MemoryOwnership` | `tenantId` + optional workspace/user/agent |
| `MemoryRetention` | policy + optional `expiresAt` |
| `MemoryCaptureRequest` | includes `sourceEventId`, authorization, classification, retention, JSON `content` |
| `MemoryRecord` | immutable snapshot; `id = memory:{tenantId}:{sourceEventId}` |
| `MemoryLifecycleRequest` | OCC via `expectedLifecycleVersion` |
| `MemoryRetrievalRequest` | query, categories, strategy, time range, ranking, limits |
| `RecalledMemory` / `MemoryRetrievalResult` | public recall projection |
| `MemorySearchStrategy` | includes `semantic` / `hybrid` **as strategy tags** — not an embeddings subsystem |

## 2.3 Contract amendment required?

| Question | Answer |
|---|---|
| Public Memory contract amendment required for v0.5? | **No** |
| Persistence public contract change required? | **No** |
| New ADR / Blueprint constitutional rewrite? | **No** |

---

# 3. Provider Design

## 3.1 Selected design

```ts
class PersistenceBackedMemoryProvider
  implements MemoryStorageProvider, MemorySearchProvider
{
  constructor(
    private readonly provider: PersistenceProvider,
    // optional: default query scope helpers / auth for UoW
  ) {}
}
```

Package location: **`@agentforge/memory`** (new module under `packages/memory/src/`), depending on `@agentforge/persistence` only.

## 3.2 Rejected alternatives

| Alternative | Why rejected |
|---|---|
| `@agentforge/memory-postgres` + raw `pg` | Duplicates Persistence; Memory SQL forbidden |
| Memory logic inside `persistence-postgres` | Wrong ownership |
| Host-only adapter without Memory package support | Weaker reuse; BP11 already depends on Persistence |

## 3.3 Dedicated memory-postgres package needed?

**No.**

---

# 4. Persistence Mapping

| Item | Value |
|---|---|
| Repository | `memory-records` |
| Entity id | `MemoryRecord.id` |
| Persistence scope | **`{ tenantId: ownership.tenantId }` only** — **never** include `workspaceId` in PersistenceScope for Memory rows |
| `PersistedEntity.data` | Full `MemoryRecord` JSON (includes `ownership.workspaceId` / `userId` / `agentId`) |
| Optimistic concurrency | Persistence `revision` + `versionToken` on replace; Memory `lifecycleVersion` remains semantic OCC key |
| New PostgreSQL tables | **None** |
| Migrations | **None** |
| `SnapshotStore` | Unused for mutable memory |

### 4.0 Why tenant-only Persistence scope (verified)

Blueprint 24 in-memory and PostgreSQL providers:

| API | Semantics when `workspaceId` omitted |
|---|---|
| `Repository.find` / `exists` | Exact key with empty/null workspace — **does not** match workspace-scoped rows |
| `Repository.query` / `count` | Tenant match; omitted workspace ⇒ **any** workspace in that tenant |

Therefore a Memory row stored under `{ tenantId, workspaceId }` cannot be reliably loaded later by `get(id)` using only a tenant-derived Persistence scope. Tenant-only storage avoids that mismatch and aligns with Memory id identity (`tenantId` + `sourceEventId`, not workspace).

Tenant-only Persistence scope is **storage partitioning**, not authorization. Workspace/user/agent/visibility/label rules remain Memory Engine + Security responsibilities on `MemoryRecord.ownership`.

### 4.1 save

1. Scope = `{ tenantId: record.ownership.tenantId }` (no workspaceId)
2. `find(id, scope)` — if exists → `ExternalMemoryError('duplicate')`
3. UoW transaction `save` without expected revision
4. Map Persistence failures → Memory external kinds (`storage-unavailable`, `serialization-failure`, …)

### 4.2 get

`MemoryStorageProvider.get(id)` has no scope argument. Public signature **must not change**.

1. Resolve `tenantId` with a **strict fail-closed** parser of the canonical form  
   `memory:{tenantId}:{sourceEventId}`  
   - Accept only unambiguous canonical resolution (implementation: require exactly three `:`-separated segments after validating the `memory` prefix, or an equivalent fail-closed rule).  
   - **Do not** claim unrestricted split-on-`:` parsing is safe: current capture validation does **not** forbid `:` inside `tenantId` or `sourceEventId`.  
   - Malformed or ambiguous ids → normalized Memory validation/unavailable failure (no Persistence lookup).
2. `find(id, { tenantId })` under tenant-only Persistence scope.
3. Return `undefined` if missing (engine maps to unavailable); engine then enforces workspace/user/agent authorization on loaded records.

### 4.3 replace

`replace(record, expectedLifecycleVersion)` has sufficient scope information — **no id parsing required**.

1. Scope = `{ tenantId: record.ownership.tenantId }`
2. Load current entity via `find(record.id, scope)`
3. If missing → unavailable
4. If `data.lifecycleVersion !== expectedLifecycleVersion` → `version-conflict`
5. Save with `expectedRevision` + `expectedVersionToken`
6. Persistence `OPTIMISTIC_LOCK_FAILED` → `version-conflict`

### 4.4 search (deterministic, no vectors)

Load candidate set for request tenant via Persistence `query` with scope `{ tenantId: request.context.tenantId }` (workspace omitted on Persistence query is acceptable for candidate loading; engine still filters workspace/user/agent):

- Prefer filters: `data.state`, `data.classification.category`, `data.occurredAt` bounds, metadata equality when request.metadata non-empty
- Apply keyword relevance in provider by scanning JSON-serialized content (same spirit as `InMemoryMemoryProvider`)
- Strategies:
  - `keyword` / `metadata` / `temporal` / `relationship` (relationship may return empty + partial reason if unsupported)
  - `semantic` / `hybrid`: **degrade to keyword scoring** and include `partialReasons: ['semantic-unavailable']` (or hybrid note). **Never call embedding APIs.**

Candidates remain internal; engine continues to authorize/filter/rank.

---

# 5. Durable Scope (What Survives Restart)

All `MemoryRecord` fields listed in §2.2 survive when `MEMORY_PROVIDER=persistent` and Persistence durability is `durable` (postgres).

Cross-process durability claim requires:

```text
MEMORY_PROVIDER=persistent
PERSISTENCE_PROVIDER=postgres
```

`persistent` + in-memory Persistence proves adapter semantics only (not restart durability).

---

# 6. Categories and Lifetimes

No new categories. Existing Blueprint/contracts categories apply.

| Lifetime | Stored in v0.5? | Restart-useful guidance |
|---|---|---|
| `temporary` | Yes if captured | Prefer not for durable product demos |
| `session` | Yes if captured | No session GC worker in v0.5 |
| `persistent` | Yes | Primary durable target |
| `permanent` | Yes | Cannot `expire` (existing engine rule) |

Working/session **categories** are not automatically process-local; locality is a capture/lifetime policy choice, not a Persistence rule.

---

# 7. Capture Semantics

| Topic | Decision |
|---|---|
| Entry | Only `MemoryEngine.capture` |
| Identity | `memory:{tenantId}:{sourceEventId}` |
| Idempotency | Duplicate id → `MEMORY_DUPLICATE` (existing) |
| Content | Must JSON-serialize (existing) |
| Initial state | `captured` (current code — not silently changed to `available`) |
| Host bypass | Forbidden |

Recall requires lifecycle progression to `available` (existing engine filter), typically:

`classify → organize → index → make-available`

Tests must exercise this path for durable retrieve proofs (same as current unit tests).

---

# 8. Lifecycle / Deletion / Expiry

## 8.1 States (existing)

`captured | classified | organized | indexed | available | archived | expired | deleted`

## 8.2 Soft delete

`action: 'delete'` transitions to `state: 'deleted'`. Record **may remain** in Persistence for diagnostics; retrieve must not return it (`state === 'available'` filter).

No physical hard-delete API in v0.5. No background purge worker.

## 8.3 Expiration

| Topic | Decision |
|---|---|
| Persist | `retention.expiresAt?: string` (existing) |
| Explicit expire | Lifecycle `expire` (existing; forbidden for `permanent`) |
| Logical expiry at read | **Required for v0.5** — engine excludes records with `expiresAt` in the past from recall eligibility even if still `available` |
| Physical cleanup | Deferred |
| Clock | Optional `now?: () => Date` on `MemoryEngine` (default `() => new Date()`) |

Eligibility for recall:

```text
state === 'available'
AND (expiresAt undefined OR now < expiresAt)
AND existing security/scope/category/label/time filters
```

## 8.4 Archived

Archived memories are not returned by retrieve (not `available`). Remains stored.

---

# 9. Security Boundaries

| Operation | Gate |
|---|---|
| capture | Caller supplies `MemoryAuthorization`; engine validates labels + tenant match |
| lifecycle | `assertAuthorized` on loaded record |
| retrieve | Candidate filter: tenant/workspace/user/agent/visibility/labels/categories/time |
| Persistence | Never grants business authorization based on DB credentials |

Cross-tenant leakage prevention:

- Persistence tenant-only scope **must never** allow a tenant-a caller to load tenant-b rows through normal Memory operations
- Persistence partitioning is defense-in-depth only
- Business authorization remains Memory Engine + Security (`retrieve` filters, `assertAuthorized` on lifecycle/enrich)
- A crafted `memory:tenant-b:…` id must fail Memory/Security checks for a tenant-a caller even if storage bytes exist under tenant-b
- Tests must prove foreign-tenant records are not recalled / not transitioned

---

# 10. Privacy / Sensitive Data

| Rule | v0.5 |
|---|---|
| Log memory `content` | **Forbidden** in ordinary operational logs |
| Diagnostics | ids, counts, codes only (existing pattern) |
| Provider errors | Normalize; do not embed payload/SQL |
| Audit | Prefer operation facts: actor/decision/memory id/scope/outcome — **not** full content copies unless an existing Audit path already requires a redacted reference pattern |
| Encryption-at-rest | **Out of scope** (no new KMS) |

---

# 11. Optimistic Concurrency

| Layer | Token |
|---|---|
| Memory semantic | `lifecycleVersion` / `expectedLifecycleVersion` |
| Persistence physical | `revision` + `versionToken` |

Stale replace → `MEMORY_VERSION_CONFLICT`. No silent overwrite.

---

# 12. Idempotency

| Mechanism | Existing? |
|---|---|
| `sourceEventId` stable id | Yes |
| Capture semantics `idempotency: 'idempotent'` | Yes |
| New public idempotency key field | **Do not invent** |

Duplicate exact record ids remain deterministic (`MEMORY_DUPLICATE`).

---

# 13. Context Assembly Integration

| Boundary | Rule |
|---|---|
| Memory → Context | Only `MemoryRetrievalResult` / `RecalledMemory` |
| Context → Persistence | **Forbidden** |
| Prompt building | Still Prompt Builder / later — not Memory |

### Product wiring limitation (honest)

Local reference host currently holds `InMemoryMemoryProvider` but does **not** run `MemoryEngine` or `ContextAssemblyEngine` on `/invoke`.

v0.5 **required proof** is package/integration level:

1. Persistence-backed capture + lifecycle to available  
2. Restart durability get/retrieve  
3. Feed `MemoryRetrievalResult` into `ContextAssemblyEngine.assemble`  

Host product invoke integration is **optional stretch**, not a milestone blocker. Document as limitation if not wired.

---

# 14. Configuration

| Variable | Default | Values |
|---|---|---|
| `MEMORY_PROVIDER` | `in-memory` | `in-memory` \| `persistent` |
| `PERSISTENCE_PROVIDER` | `in-memory` | `in-memory` \| `postgres` (existing) |

Composition:

- `in-memory` → `InMemoryMemoryProvider` (unchanged default)
- `persistent` → `PersistenceBackedMemoryProvider(hostPersistenceProvider)`

Widen host composition type from `InMemoryMemoryProvider` to `MemoryStorageProvider & MemorySearchProvider` (or a small host alias type).

Smoke continues to assert in-memory Memory by default.

---

# 15. Host Startup / Compose

| Topic | Decision |
|---|---|
| New DB container | No |
| New migrations | No |
| Default compose | Memory in-memory; DB optional |
| Postgres profile | Reuse existing |
| Readiness | If `MEMORY_PROVIDER=persistent` and Persistence postgres selected, Memory health may contribute degraded/unhealthy when Persistence unavailable — do not silently fall back to in-memory Memory |

---

# 16. Events / Audit / Observability

Reuse existing Memory ports:

| Signal | Existing |
|---|---|
| Facts | `memory.captured`, `memory.{state}`, `memory.retrieval.*` |
| Telemetry | `captured` / `transitioned` / `retrieved` / `failed` |
| Diagnostics | operation + counts + errorCode |

Additive optional counters (host metrics, if wired):

- `memory.capture.completed`
- `memory.retrieval.completed`
- `memory.retrieval.expired_filtered` (if counted)
- `memory.provider.failure`

No payload logging.

---

# 17. Failure Scenarios

| Scenario | Behavior |
|---|---|
| Persistence unavailable | `MEMORY_STORAGE_UNAVAILABLE` / `MEMORY_UNAVAILABLE`; readiness impact when persistent Memory required |
| Malformed / non-JSON content | `MEMORY_VALIDATION` / `MEMORY_SERIALIZATION_FAILURE` |
| Cross-tenant query | Empty/filtered; no leakage |
| Stale lifecycle replace | `MEMORY_VERSION_CONFLICT` |
| Duplicate id | `MEMORY_DUPLICATE` |
| Expired memory | Excluded from recall; explicit expire lifecycle still valid |
| Missing memory | `MEMORY_UNAVAILABLE` |
| Process restart (postgres + persistent) | Record survives; recall if available & not expired |
| Process restart (in-memory Memory) | Records lost (accurate) |

---

# 18. Testing Requirements

## 18.1 Unit / contract (default `pnpm test`)

- PersistenceBacked against `InMemoryPersistenceProvider`
- Capture/get/replace OCC
- Search keyword + category filters
- Expiry exclusion (injectable `now`)
- Tenant isolation
- Error normalization (no SQL leakage)
- Existing MemoryEngine suite remains green on InMemory provider

## 18.2 PostgreSQL suite (`pnpm test:memory-persistence`)

Gated like other postgres suites (`RUN_POSTGRES_TESTS=1`):

1. capture → lifecycle to available  
2. close provider / new provider  
3. `get` same id + content  
4. `retrieve` returns recalled memory  
5. delete/expire paths  
6. OCC conflict  
7. tenant isolation  

## 18.3 Context Assembly proof

```text
durable MemoryRetrievalResult
→ ContextAssemblyEngine.assemble
→ elements include source=memory
→ no Persistence types in request/result
```

## 18.4 Manual probe (optional)

`scripts/memory-persistence-probe.mjs` (or approved equivalent) — write/read across process boundary with postgres. Prefer reusing patterns from durability/recovery probes without command sprawl.

---

# 19. CI Impact

| Job | Change |
|---|---|
| `verify` / `docker` | Unchanged defaults (Memory in-memory) |
| `persistence-postgres` | Unchanged |
| `runtime-recovery-postgres` | Unchanged |
| `memory-persistence-postgres` **or** extend postgres job | Run `pnpm test:memory-persistence` |

Prefer a dedicated small job mirroring runtime-recovery for clarity.

---

# 20. Documentation (Post-Approval Implementation)

| Doc | Update |
|---|---|
| `docs/guides/memory.md` | Create — in-memory vs persistent, ownership, no vectors |
| `docs/guides/persistence.md` | Cross-link Memory uses `memory-records` |
| README / docs/README | v0.5 pointers |
| `.env.example` | `MEMORY_PROVIDER` |
| `packages/memory/README.md` | Persistence-backed provider |

---

# 21. Future Vector Search (v0.6+ Path)

Leave contracts unchanged:

```text
MemoryEngine.retrieve
  → MemorySearchProvider (future vector-capable implementation)
  → still returns MemoryCandidate[]
```

Do **not** add embedding columns, model ids, or similarity thresholds to `MemoryRecord` in v0.5.

---

# 22. Explicit Non-Goals

- pgvector / Pinecone / Qdrant / Weaviate  
- embeddings / semantic similarity / RAG redesign  
- Redis / Kafka / background retention workers  
- encryption/KMS  
- UI / commercial Memory REST API  
- distributed Memory cache  
- Persistence ownership of Memory semantics  

---

# 23. Files Plan (Implementation Phase)

### Create

- `packages/memory/src/persistence-backed-memory-provider.ts`
- Memory persistence tests (+ postgres integration spec)
- `docs/guides/memory.md`
- `scripts/run-memory-persistence-tests.mjs` (+ vitest config if needed)
- Optional `scripts/memory-persistence-probe.mjs`
- Report + checklist at completion

### Modify

- `packages/memory/package.json` (dependency + version)
- `packages/memory/src/index.ts` / engine retrieve eligibility + optional `now`
- Host config/composition/helpers/smoke expectations
- CI, README, `.env.example`, persistence guide

### Forbidden without stop

- Blueprint/ADR rewrites  
- Persistence contract changes  
- New SQL migrations/tables  
- `pg` imports in Memory  

---

# 24. Decision Summary

| Question | Answer |
|---|---|
| Memory ownership confirmed? | Yes |
| Persistence scope | **`{ tenantId }` only** (corrected after Blueprint 24 verification) |
| `get(id)` strategy | Strict fail-closed id parse → `find(id, { tenantId })` |
| `replace` scope | `record.ownership.tenantId` (no id parse) |
| Contract amendment required? | **No** |
| New stop condition? | **No** |
| Dedicated `memory-postgres` package? | **No** |
| Provider design | `PersistenceBackedMemoryProvider` over Blueprint 24 |
| Repository | `memory-records` |
| Schema impact | **None** |
| Default Memory | `in-memory` |
| Durable config | `MEMORY_PROVIDER=persistent` + postgres Persistence |
| Vectors? | **No** |
| Context Assembly impact | Consume-only; package proof required |
| Host invoke Memory wiring | Optional; document limitation if absent |
| Safe for Autonomous implementation? | **Yes** |

---

# 25. Review Gate

Documentation correction complete. Production TypeScript may proceed only under an explicit Autonomous implementation command.
