# AgentProdReady v0.3 Durable PostgreSQL Persistence — Checklist

**Document Version:** 1.0  
**Product Version:** 0.3.0  
**Implementation Mode:** Autonomous  
**Reviewer:** Autonomous verification  
**Review Date:** 2026-08-07  
**Decision:** Approved

## Required Artifacts

- [x] **Documentation Verification:** [Product](../../product/agentprodready-v0.3-postgresql-persistence.md)
- [x] **Documentation Verification:** [Plan](../plans/agentprodready-v0.3-postgresql-persistence-plan.md)
- [x] **Documentation Verification:** [Specification](../specifications/agentprodready-v0.3-postgresql-persistence-specification.md)
- [x] **Documentation Verification:** [Async I/O amendment](../amendments/24-persistence-async-io-contract-amendment.md) already implemented
- [x] **Documentation Verification:** [Implementation report](../reports/agentprodready-v0.3-postgresql-persistence-implementation-report.md)
- [x] **Documentation Verification:** [Persistence guide](../../guides/persistence.md)

## Provider Package

- [x] `@agentprodready/persistence-postgres` created with exact `pg@8.22.0` pin
- [x] No ORM introduced
- [x] Host does not import `pg`
- [x] No `pg` Pool/Client/Result types exported publicly
- [x] Implements provider, repository, transaction, snapshot store, migration provider, error translation, migrator

## Selection and Config

- [x] `PERSISTENCE_PROVIDER=in-memory|postgres` (default in-memory)
- [x] `DATABASE_URL` canonical when postgres
- [x] Optional SSL/pool/discrete vars per specification
- [x] Postgres config required only when provider=postgres
- [x] Credentials never logged
- [x] Composition typed as `PersistenceProvider`

## Schema and Migrations

- [x] Only four approved tables
- [x] Explicit versioned SQL migrations (`001_init` + down)
- [x] No silent auto-migrate on host start
- [x] Commands: `db:up`, `db:migrate`, `db:status`, `db:down`, `test:postgres`, `db:reset:test`
- [x] Destructive reset guarded by `PERSISTENCE_ALLOW_RESET=1`

## Semantics

- [x] Async repository find/exists/count/query
- [x] Transaction begin/stage/commit/rollback with client release
- [x] Isolation: RC/RR/Serializable; snapshot unsupported (no silent downgrade)
- [x] Optimistic concurrency revision + version_token
- [x] Snapshot create-once immutability
- [x] Durable capability declaration
- [x] Normalized PersistenceError mapping

## Host / Compose / CI

- [x] Host wiring selects provider; no host SQL
- [x] OpenAI/reference behavior unchanged
- [x] Compose profile `postgres` with healthcheck + volume
- [x] Default compose remains DB-free
- [x] CI job `persistence-postgres` additive; verify/docker unchanged

## Tests and Verification

- [x] Unit tests (config/serialize/errors) in default `pnpm test`
- [x] Integration tests via `pnpm test:postgres` (9 passed)
- [x] Manual durability probe write/read after process restart
- [x] `pnpm lint` / `boundaries` / `typecheck` / `test` / `build` / `smoke` / `verify`
- [x] `docker compose up --build -d` + docker-smoke + `down`

## Ownership / Stop Conditions

- [x] No ADR or blueprint constitutional changes
- [x] No further public Persistence contract redesign
- [x] Runtime retry/recovery not owned by provider
- [x] Runtime restart/recovery product behavior deferred

## Completion

- [x] Report and checklist complete
- [x] Reviewer decision: **Approved**
- [x] Next: restart/recovery validation may begin as a **separate** milestone
