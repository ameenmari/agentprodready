# AgentProdReady v0.3 Durable PostgreSQL Persistence — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.3.0  
**Plan Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Objective

Add an additive PostgreSQL Persistence Provider that proves Blueprint 24 contracts with durable storage, while keeping `InMemoryPersistenceProvider` as the default for deterministic local development and CI.

This is a **provider integration** task with a **conservative schema**. It is not a platform-wide “persist everything” migration.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| AGENTS.md | Yes |
| docs/cursor-start-here.md | Yes |
| docs/implementation-guidelines.md | Yes |
| docs/implementation/implementation-modes.md | Yes |
| docs/architecture/dependency-graph.md | Yes |
| Blueprint 24 — Persistence Framework | Yes |
| Blueprints 03, 04, 15, 16, 17, 22, 23, 31 | Yes |
| ADR-003, ADR-004, ADR-005, ADR-006, ADR-011, ADR-012 | Yes |
| 24-persistence plan/spec/report | Yes |
| packages/persistence contracts + InMemory provider | Yes |
| apps/platform-host composition + smoke | Yes |
| compose.yaml, Dockerfile, CI, .env.example | Yes |
| agentprodready-v0.2 OpenAI product/plan/spec pattern | Yes |

---

# Recommended Client

**`pg` (node-postgres), exact version pin at implementation time — no ORM.**

| Option | Decision |
|---|---|
| **pg** | **Selected** — smallest honest SQL driver; maps cleanly to Blueprint 24 provider boundary |
| postgres (postgres.js) | Viable alternative; slightly different API; no material architectural gain over `pg` |
| Prisma | Rejected for v0.3 — heavy codegen/schema ownership competes with Blueprint 24 contracts |
| Drizzle | Rejected for v0.3 — useful later maybe; extra abstraction not required to prove contracts |
| TypeORM | Rejected — ORM lifecycle/entity models risk leaking domain ownership into persistence |

Rationale: Blueprint 24 already defines repositories, UoW, transactions, snapshots, migrations, and errors. An ORM would duplicate those concepts. `pg` keeps SQL and connection pooling internal to the provider package.

---

# Scope

## In Scope

- Package `@agentprodready/persistence-postgres`
- PostgreSQL implementation of `PersistenceProvider`, `SnapshotStore`, `MigrationProvider`
- Minimal schema for generic entities, snapshots, and migration records
- Versioned SQL migrations + explicit migrate/status commands
- `PERSISTENCE_PROVIDER` selection (default `in-memory`)
- Compose PostgreSQL profile (optional, not mandatory for reference mode)
- CI job with ephemeral Postgres service (no production secrets)
- Contract/integration tests for transactions, isolation, optimistic concurrency
- Docs: guide, `.env.example`, package README, README links

## Out of Scope

- Persisting agents, audit, events, memory, knowledge, workflow engine stores
- Runtime `ExecutionSnapshotPort` durability / restart recovery product behavior
- Redis, Kafka, distributed transactions, cloud DB ops, K8s
- Changing ADRs/blueprints except via documented stop-condition approval
- Making Postgres required for default verify/docker smoke

---

# Persistence I/O Stop Condition

### Status: Cleared — async I/O migration complete before PostgreSQL

Canonical resolution:

[docs/implementation/amendments/24-persistence-async-io-contract-amendment.md](../amendments/24-persistence-async-io-contract-amendment.md)

PostgreSQL implementation proceeded only after Promise-based I/O migration was green.

---

# Package Structure

```text
packages/persistence-postgres/
  package.json                 # @agentprodready/persistence-postgres
  tsconfig.json
  README.md
  src/
    index.ts
    config.ts
    pool.ts
    postgres-persistence-provider.ts
    postgres-repository.ts
    postgres-transaction.ts
    postgres-snapshot-store.ts
    postgres-migration-provider.ts
    postgres-error-translation.ts
    serialize.ts
    migrations/
      001_init.sql
      001_init.down.sql
    migrator.ts
    postgres-persistence.spec.ts
    postgres-persistence.integration.spec.ts
```

`pg` remains a private dependency of this package only.

---

# Proposed Files

## Create

```text
packages/persistence-postgres/** (as above)
docs/guides/persistence.md
docs/implementation/reports/agentprodready-v0.3-postgresql-persistence-implementation-report.md   (post-impl)
docs/implementation/checklists/agentprodready-v0.3-postgresql-persistence-checklist.md           (post-impl)
```

## Modify (after stop condition cleared)

```text
apps/platform-host/src/config/local-reference-config.ts
apps/platform-host/src/composition/local-reference-composition.ts
apps/platform-host/src/composition/local-reference-composition-helpers.ts  # PersistenceProvider type, not InMemory-only
apps/platform-host/package.json / tsconfig.json
apps/platform-host/src/smoke/smoke.ts   # assert in-memory only when default mode
compose.yaml                            # postgres profile
.env.example
README.md / docs/README.md
package.json scripts (db:up, db:migrate, db:status, db:down, test:postgres)
.github/workflows/ci.yml                # additive postgres job
pnpm-lock.yaml
tsconfig.json / tsconfig.eslint.json
@agentprodready/persistence                 # ONLY if async contract amendment approved
```

## Do Not Modify

```text
docs/adrs/** (unless governance ADR for async amendment is separately authorized)
docs/blueprints/**
InMemoryPersistenceProvider behavior (except async wrapper if amendment approved)
OpenAI provider architecture
Default deterministic AI path
```

---

# Schema (Conservative)

Only three application tables + one migrator bookkeeping table:

1. `schema_migrations` — SQL migrator versions  
2. `persistence_entities` — generic `PersistedEntity` rows by repository name  
3. `persistence_snapshots` — Blueprint 24 `SnapshotStore`  
4. `persistence_migration_records` — Blueprint 24 `MigrationProvider` apply/rollback records  

No agent/audit/event/runtime/workflow tables in v0.3.

---

# Configuration Summary

Canonical connection: **`DATABASE_URL`**.

| Variable | Required | Default |
|---|---|---|
| `PERSISTENCE_PROVIDER` | No | `in-memory` |
| `DATABASE_URL` | Yes if postgres | none |
| `POSTGRES_SSL` | No | unset / false locally |
| `POSTGRES_POOL_MIN` | No | `0` |
| `POSTGRES_POOL_MAX` | No | `10` |

Discrete `POSTGRES_HOST/PORT/...` may be accepted as an alternate way to construct `DATABASE_URL`, but are not all required when `DATABASE_URL` is present.

Forbidden as provider execution policy: adapter-owned retry loops / application timeout ownership that conflicts with Runtime.

---

# Docker / Compose

**Recommend Option B — Compose profile `postgres`.**

- Default `docker compose up` remains single-service AgentProdReady (reference / in-memory).
- `docker compose --profile postgres up` starts PostgreSQL with healthcheck + named volume.
- AgentProdReady service can optionally depend_on postgres when profile enabled and `PERSISTENCE_PROVIDER=postgres`.

---

# CI

Keep existing `verify` and `docker` jobs functionally unchanged (in-memory).

Add job `persistence-postgres`:

- Postgres service container (ephemeral, test credentials in workflow YAML — not GitHub Secrets)
- migrate
- `pnpm test:postgres`
- no production secrets

---

# Testing Strategy

| Layer | Content | Default CI |
|---|---|---|
| Unit | config, serialize, error translation | Yes (no DB) |
| Contract | shared persistence suite vs postgres | Postgres job |
| Integration | CRUD, tx commit/rollback, isolation, OCC, constraints, snapshots, migrations | Postgres job |
| Regression | existing verify | Yes |
| Manual | compose profile + migrate + host postgres mode | Local |

---

# Restart Preparation

v0.3 durable state after process restart:

- rows in `persistence_entities`
- rows in `persistence_snapshots`
- migration records

Still non-durable / deferred:

- Runtime execution snapshots (`InMemoryExecutionSnapshotPort`)
- Agent/audit/event/memory stores
- Product invoke “recovery” behavior

Next milestone can load durable Blueprint 24 entities/snapshots into a recovery policy without redesigning v0.3 schema.

---

# Decision Summary

| Item | Decision |
|---|---|
| Client | `pg` (no ORM), exact pin |
| Package | `packages/persistence-postgres` |
| Default provider | `in-memory` |
| Schema | Minimal 4-table contract proof |
| Compose | Profile `postgres` |
| CI | Additive postgres job + unchanged verify |
| Autonomous PostgreSQL safe? | **Yes** (async I/O migration complete) |

---

# Review Decision

**Status:** Implemented — see [implementation report](../reports/agentprodready-v0.3-postgresql-persistence-implementation-report.md).

**Companion specification:** [agentprodready-v0.3-postgresql-persistence-specification.md](../specifications/agentprodready-v0.3-postgresql-persistence-specification.md)  
**Companion product doc:** [agentprodready-v0.3-postgresql-persistence.md](../../product/agentprodready-v0.3-postgresql-persistence.md)
