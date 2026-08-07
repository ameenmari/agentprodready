# Blueprint 11 Implementation Contract Amendment — Memory Index Provider Coordination

**Amendment ID:** `11-memory-index-provider`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous  
**Affects:** `@agentprodready/memory` implementation contracts (not Blueprint 11 constitutional rewrite)  
**Related:** [v0.7 Vector Search & Semantic Memory specification](../specifications/agentprodready-v0.7-vector-search-semantic-memory-specification.md)

---

## 1. Problem

Blueprint 11 owns Memory indexing **semantics and coordination**. The lifecycle action `index` exists (`organized → indexed`), but `MemoryEngine.transition` today only persists `state: 'indexed'` via `MemoryStorageProvider.replace`.

v0.7 introduces derived vector search artifacts behind `MemoryIndexProvider`. Writing canonical `indexed` **before** a successful vector upsert is unsafe:

```text
storage.replace(state=indexed)  ✅
VectorStore.upsert              ❌
→ Memory claims indexed with no vector; transition error cannot undo Persistence
```

Memory storage and VectorStore are separate resources — there is **no** honest distributed transaction.

---

## 2. Authority Review

| Source | Finding |
|---|---|
| Blueprint 11 | Memory owns indexing coordination; providers own physical index impl; MemoryRecord is authoritative experience state |
| ADR-004 / 011 | Replaceable providers; normalize at boundaries |
| v0.5 / v0.7 SoT | Vector rows are derived; never authorize recall alone |

### Blueprint amendment required?

**No.**

### ADR required?

**No.**

---

## 3. Frozen Contracts

```ts
export interface MemoryIndexProvider {
  /**
   * Index the *proposed* MemoryRecord that would result from action=index.
   * Called BEFORE canonical storage.replace.
   * Must embed + upsert derived artifacts (or no-op when vector search disabled).
   */
  index(record: MemoryRecord, context: ExecutionContext): Promise<void>;

  /**
   * Remove derived artifacts AFTER canonical delete/expire/archive persisted.
   * Failure must not roll back canonical Memory lifecycle state.
   */
  remove(
    memoryId: string,
    tenantId: string,
    context: ExecutionContext,
    reason: 'deleted' | 'expired' | 'archived' | 'reindex',
  ): Promise<void>;

  health(): Promise<HealthResult>;
}

export class NoopMemoryIndexProvider implements MemoryIndexProvider {
  async index(): Promise<void> {}
  async remove(): Promise<void> {}
  async health(): Promise<HealthResult> { /* healthy */ }
}
```

`MemoryEngine` constructor gains `indexProvider: MemoryIndexProvider`.

This is **not** a second search API. Search remains `MemorySearchProvider.search`.

---

## 4. INDEX Ordering (mandatory)

```text
INDEX: derived artifact first → canonical state second

1. Load current MemoryRecord
2. Authorize + validate organized→indexed + OCC expectation
3. Construct proposed MemoryRecord:
     state = 'indexed'
     lifecycleVersion = current.lifecycleVersion + 1
4. await indexProvider.index(proposed, context)
     → Capability Resolution ("embedding")
     → AiEmbeddingAdapter.embed
     → VectorStore.upsert (contentVersion/lifecycleVersion from proposed)
5. ONLY if step 4 succeeds:
     await storage.replace(proposed, expectedLifecycleVersion)
6. ONLY if step 5 succeeds:
     publish memory.indexed + diagnostics/telemetry
```

| Failure | Engine behavior |
|---|---|
| Step 4 fails (embed/vector) | Do **not** persist `indexed`; fail closed (`MEMORY_INDEX_UNAVAILABLE` / mapped); canonical remains prior state (`organized`) |
| Step 4 ok, step 5 OCC/storage fails | Do **not** claim success; return storage/OCC error; vector may be orphan/stale; MemoryRecord remains authority |
| Both ok | Canonical `indexed` aligned with derived vector versions |

**Do not introduce distributed transactions.**

---

## 5. REMOVE Ordering (mandatory)

```text
REMOVE: canonical state first → derived cleanup second

For action ∈ { delete, expire, archive }:

1. Authorize + validate transition + OCC
2. Construct proposed non-recallable MemoryRecord
3. await storage.replace(proposed, expectedLifecycleVersion)   # FIRST
4. Publish memory.deleted | memory.expired | memory.archived
5. Best-effort: await indexProvider.remove(id, tenantId, context, reason)
6. If step 5 fails:
     keep canonical state
     record diagnostics/telemetry for stale derived cleanup / repair
     do NOT roll back delete/expire/archive
```

Reason: once canonical Memory is deleted/expired/archived, `MemoryEngine.retrieve` will not recall it even if a vector row temporarily remains.

---

## 6. Orphan / Stale Vector Semantics

When a vector exists without a matching authoritative recallable MemoryRecord:

- Semantic/hybrid assembly **must** load canonical Memory and exclude on:
  - missing Memory
  - tenant mismatch
  - `state !== 'available'`
  - expired
  - `contentVersion` mismatch
  - incompatible/stale `lifecycleVersion`
  - model/dimension ≠ active vector contract
- VectorStore matches alone never authorize recall
- Cleanup of orphans is best-effort / repair; must not change authorization or SoT rules

---

## 7. Embedding Boundary (consumers of this amendment)

Index implementations that embed MUST use:

```text
Memory
  → Capability Resolution (capability "embedding")
  → AiEmbeddingAdapterResolver
  → AiEmbeddingAdapter
  → provider
```

`@agentprodready/memory` must not import OpenAI package/SDK or provider-specific embedding types. See amendment `08-ai-provider-embedding`.

---

## 8. Default / Disabled Vector Search

When `VECTOR_SEARCH_ENABLED=false`, Composition wires `NoopMemoryIndexProvider`:

- `index` is a no-op success → Engine may persist `indexed` as today’s state machine (keyword world; no vector claim)
- `remove` is a no-op

When vector search is enabled, non-noop indexer applies §4–§5 strictly.

---

## 9. Non-Goals

- Second public Memory search API  
- Distributed transactions across Persistence + VectorStore  
- Rolling back canonical delete/expire/archive on vector cleanup failure  
- Embedding fields on `MemoryRecord`  

---

## 10. Status

**Implemented** with `@agentprodready/memory@0.7.0` INDEX/REMOVE ordering under AgentProdReady v0.7.
