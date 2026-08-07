# AgentForge v0.5 Persistent Memory — Checklist

**Product Version:** 0.5.0  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

## Contracts / architecture

- [x] `PersistenceBackedMemoryProvider` in `@agentforge/memory`
- [x] No `@agentforge/memory-postgres`
- [x] No `pg` / SQL import in Memory package
- [x] Repository `memory-records`; entity id = `MemoryRecord.id`
- [x] Persistence scope tenant-only `{ tenantId }`
- [x] `PersistedEntity.data` = full `MemoryRecord`
- [x] No new PostgreSQL schema / migrations
- [x] No Memory or Persistence public contract amendment
- [x] No SnapshotStore for mutable Memory

## Behavior

- [x] `save` / `get` / `replace` via Persistence UoW
- [x] Strict fail-closed canonical Memory id parser
- [x] Duplicate → `MEMORY_DUPLICATE`
- [x] Lifecycle OCC + Persistence OCC → `MEMORY_VERSION_CONFLICT`
- [x] Capture → `captured`; lifecycle to `available` preserved
- [x] Soft delete → `deleted`; not recalled
- [x] Logical expiry via injectable `now`
- [x] Keyword search; semantic/hybrid degraded with `semantic-unavailable`
- [x] Tenant isolation at MemoryEngine; Persistence scope defense-in-depth
- [x] Error normalization (no Persistence/SQL leakage)

## Host / config

- [x] `MEMORY_PROVIDER=in-memory|persistent` (default in-memory)
- [x] Composition wiring; no silent fallback when persistent selected
- [x] Memory health when persistent
- [x] `/invoke` Memory→Context Assembly limitation documented

## Tests / CI / docs

- [x] Unit + contract tests (InMemory + PersistenceBacked)
- [x] `pnpm test:memory-persistence` Postgres suite
- [x] Context Assembly proof test
- [x] Manual durability probe
- [x] CI job `memory-persistence-postgres`
- [x] `docs/guides/memory.md` + README / persistence / `.env.example` updates
- [x] Implementation report
- [x] `pnpm verify` green
- [x] `pnpm test:postgres` + `pnpm test:runtime-recovery` + `pnpm test:memory-persistence` green
- [x] Docker reference smoke green

## Stop conditions

- [x] None triggered (tenant-safe `get(id)` implemented without public contract change)
