# Memory Providers

**Version:** 0.7.0

AgentProdReady Memory (Blueprint 11) owns capture, lifecycle, retrieval ranking, visibility, and security-label filtering. Storage is provider-independent.

## Ownership

| Concern | Owner |
|---|---|
| MemoryRecord semantics, lifecycle, ranking, category filters | Memory Engine |
| Workspace / user / agent authorization, visibility, security labels | Memory Engine + Security |
| Bytes / entities / OCC revision tokens | Persistence (Blueprint 24) |
| Context package assembly from normalized `MemoryRetrievalResult` | Context Assembly |

Persistence tenant scope is storage partitioning only. It is **not** the complete business authorization decision.

## Selection

| `MEMORY_PROVIDER` | Meaning | Default |
|---|---|---|
| `in-memory` | Process-local `InMemoryMemoryProvider` | **Yes** |
| `persistent` | `PersistenceBackedMemoryProvider` over the selected Persistence provider | Opt-in |

There is **no** `MEMORY_PROVIDER=postgres`. Memory stays Persistence-provider independent.

## Durability combinations

| Memory | Persistence | Cross-process durable? |
|---|---|---|
| `in-memory` | any | No (process-local Memory) |
| `persistent` | `in-memory` | No (Persistence-backed semantics only) |
| `persistent` | `postgres` | **Yes** |

```bash
pnpm db:up
pnpm build
pnpm db:migrate

# Windows PowerShell
$env:MEMORY_PROVIDER='persistent'
$env:PERSISTENCE_PROVIDER='postgres'
$env:DATABASE_URL='postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready'
pnpm start
```

Optional durability suite:

```bash
pnpm test:memory-persistence
```

Manual restart-boundary probe (after build + migrate):

```bash
node scripts/memory-persistence-probe.mjs
```

## Persistence mapping

- Repository: `memory-records` (existing `persistence_entities` rows)
- Entity id: `MemoryRecord.id`
- Scope: `{ tenantId }` only (no `workspaceId` in PersistenceScope)
- Data: full `MemoryRecord` in `PersistedEntity.data`
- No new PostgreSQL tables or migrations
- Mutable Memory does **not** use SnapshotStore

Canonical id shape used by v0.5: `memory:{tenantId}:{sourceEventId}` with a strict fail-closed parser (segments must not contain `:`).

## Lifecycle, expiry, deletion

- Capture starts at state `captured` (not automatically available)
- Progression to `available` uses existing lifecycle actions (`classify` → `organize` → `index` → `make-available`)
- Soft delete: action `delete` → state `deleted` (record kept; not recalled)
- Logical expiry: recall only when `state === available` and (`expiresAt` absent or `now < expiresAt`)
- No background TTL worker; no physical delete worker in v0.5

## Search

Deterministic keyword / metadata / temporal filtering remain the default.

When `VECTOR_SEARCH_ENABLED=false` (default), strategies `semantic` and `hybrid` degrade to keyword with `partialReasons` including `semantic-unavailable`.

When vector search is enabled, see [vector-search.md](vector-search.md) for semantic NN retrieval, hybrid RRF, INDEX/REMOVE consistency, and pgvector profiles.

Category `semantic` is a Memory category enum value — not vector search.

## Context Assembly boundary

Approved package flow:

```text
MemoryEngine.retrieve
  → MemoryRetrievalResult
  → ContextAssemblyEngine.assemble
  → ExecutionContextPackage memory elements (source: "memory")
```

Context Assembly must never import Persistence, `PersistedEntity`, or SQL.

## Product host `/invoke` limitation

The local reference `/invoke` path does **not** yet compose MemoryEngine → Context Assembly. v0.5 completion is proved at package/integration level. Do not treat `/invoke` as a Memory REST API.

## Privacy

Operational logs/diagnostics use ids, counts, error codes, and operation names — not Memory content. Persistence/SQL errors must not expose stored Memory payloads.

## CI

- `verify` / `docker`: default in-memory Memory, no DB secrets
- `memory-persistence-postgres`: ephemeral Postgres + `pnpm test:memory-persistence`

## Packages

- `@agentprodready/memory` — MemoryEngine, `InMemoryMemoryProvider`, `PersistenceBackedMemoryProvider`
- `@agentprodready/persistence` / `@agentprodready/persistence-postgres` — storage only
