# AgentForge v0.5 Persistent Memory — Implementation Report

**Product Version:** 0.5.0  
**Memory Package Version:** `@agentforge/memory@0.5.0`  
**Platform Host Version:** `@agentforge/platform-host@0.5.0`  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07  
**Status:** Complete

---

## Summary

v0.5 adds durable Memory storage via `PersistenceBackedMemoryProvider` in `@agentforge/memory`, using Blueprint 24 repository `memory-records` with **tenant-only** Persistence scope. Memory semantics (lifecycle, ranking, workspace/user/agent authorization, visibility, labels) remain Memory Engine + Security owned. No new PostgreSQL schema, no embeddings/pgvector, no Memory public contract amendment.

---

## Provider architecture

```text
MemoryEngine
  → MemoryStorageProvider / MemorySearchProvider
    → PersistenceBackedMemoryProvider
      → PersistenceProvider.repository("memory-records")
        → InMemoryPersistenceProvider | PostgresPersistenceProvider
```

- Default host: `MEMORY_PROVIDER=in-memory` → `InMemoryMemoryProvider`
- Opt-in: `MEMORY_PROVIDER=persistent` → `PersistenceBackedMemoryProvider(selected PersistenceProvider)`
- No `MEMORY_PROVIDER=postgres`; Memory stays Persistence-provider independent
- Memory package does **not** import `pg`

---

## Persistence mapping

| Item | Value |
|---|---|
| Repository | `memory-records` |
| Entity id | `MemoryRecord.id` |
| Scope | `{ tenantId }` only |
| Data | Full `MemoryRecord` in `PersistedEntity.data` |
| New SQL tables / migrations | None |
| SnapshotStore for mutable Memory | Not used |

---

## get(id) parsing

Canonical id: `memory:{tenantId}:{sourceEventId}`  
Parser: strict regex `/^memory:([^:]+):([^:]+)$/`; segments must not contain `:`.  
Malformed/ambiguous ids → `ExternalMemoryError('unavailable')` → `MEMORY_UNAVAILABLE`.  
No tenant-wide search fallback. Capture rejects `:` in `tenantId` / `sourceEventId`.

---

## Lifecycle / expiry / delete / OCC

| Behavior | Result |
|---|---|
| Capture initial state | `captured` |
| Progression to available | Existing actions: classify → organize → index → make-available |
| Soft delete | `delete` → `deleted`; record kept; not recalled |
| Logical expiry | Recall only if `available` and (`expiresAt` absent or `now < expiresAt`); injectable `now` |
| Memory OCC | `lifecycleVersion` / `expectedLifecycleVersion` → `MEMORY_VERSION_CONFLICT` |
| Persistence OCC | `revision` + `versionToken` mapped to `MEMORY_VERSION_CONFLICT` |
| Duplicate | `MEMORY_DUPLICATE` |

---

## Search / semantic degradation

Keyword / metadata / temporal filters supported.  
`semantic` / `hybrid` → keyword fallback + `partialReasons: ['semantic-unavailable']`.  
No embeddings claimed.

---

## Tenant-only scope proof

Unit test persists under `{ tenantId }` and proves workspace-scoped `find` misses the row.  
Workspace/user/agent filters remain MemoryEngine authorization on retrieve.

---

## Context Assembly proof

Host test `apps/platform-host/src/composition/memory-context-assembly.spec.ts`:

`PersistenceBackedMemoryProvider` → `MemoryEngine.retrieve` → `ContextAssemblyEngine.assemble` → elements with `source === 'memory'`; no Persistence type leakage in package JSON.

---

## Host / readiness

- Config: `MEMORY_PROVIDER=in-memory|persistent`
- Persistent Memory health contributor when selected
- No silent fallback to in-memory when persistent selected and storage unhealthy
- `/invoke` still does **not** wire Memory → Context Assembly (documented limitation)

---

## Files created / modified (high level)

**Created**

- `packages/memory/src/persistence-backed-memory-provider.ts`
- `packages/memory/src/memory-id.ts`
- `packages/memory/src/memory-errors.ts`
- `packages/memory/src/persistence-backed-memory.spec.ts`
- `packages/memory/src/memory-persistence.postgres.integration.spec.ts`
- `apps/platform-host/src/composition/memory-context-assembly.spec.ts`
- `vitest.memory-persistence.config.ts`
- `scripts/run-memory-persistence-tests.mjs`
- `scripts/memory-persistence-probe.mjs`
- `docs/guides/memory.md`
- This report + checklist
- (Design artifacts already authored) product/plan/specification under `docs/`

**Modified**

- `packages/memory` package/version/README/index/reference/tsconfig
- `packages/persistence/tsconfig.json` (see deviations)
- Host composition/config/health/smoke/e2e version tags
- CI job `memory-persistence-postgres`
- `.env.example`, README, docs/README, persistence guide
- Root `package.json` script `test:memory-persistence`

---

## Verification results (Node.js 24.19.0)

| Gate | Result |
|---|---|
| `pnpm lint` | Passed |
| `pnpm boundaries` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed (458 tests; 1 live OpenAI skipped) |
| `pnpm build` | Passed |
| `pnpm smoke` | Passed |
| `pnpm verify` | Passed |
| `pnpm test:postgres` | Passed |
| `pnpm test:runtime-recovery` | Passed |
| `pnpm test:memory-persistence` | Passed (3 tests) |
| Manual `scripts/memory-persistence-probe.mjs` | Passed |
| Docker `compose up --build` + `docker-smoke` | Passed (`0.5.0`) |

CI additive job: `memory-persistence-postgres` (ephemeral Postgres, no GitHub Secrets).

---

## Known limitations

1. Local reference `/invoke` does not compose MemoryEngine → Context Assembly (package/integration proof is sufficient for v0.5).
2. No vector/embedding/semantic similarity retrieval.
3. No physical delete / TTL background worker.
4. No encryption/KMS for Memory payloads.
5. pnpm reports a workspace package cycle involving memory↔persistence (pre-existing style of blueprint dependency cycles); TypeScript project graph is acyclic after Persistence tsconfig cleanup.

---

## Architectural deviations

1. **Persistence `tsconfig.json` project references cleared** — Persistence source never imported `@agentforge/security`, `@agentforge/observability`, etc., but those project references created a TypeScript cycle once Memory referenced Persistence (`memory → persistence → security → … → context-assembly → memory`). Package.json Blueprint dependencies on Persistence are unchanged. No Persistence public contract change.
2. Context Assembly proof lives in **platform-host** (not `@agentforge/context-assembly`) to avoid adding a Persistence dependency to Context Assembly.

No Memory/Persistence public contract amendments. No new SQL migrations. No ADR/Blueprint constitutional edits.

---

## Whether v0.6 may begin

**Yes** — v0.5 Persistent Memory is complete with required tests, report, and checklist. v0.6 may begin under a new product slice / Implementation Mode declaration.
