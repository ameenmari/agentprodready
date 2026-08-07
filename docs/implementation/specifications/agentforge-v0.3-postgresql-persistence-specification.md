# AgentProdReady v0.3 Durable PostgreSQL Persistence — Implementation Specification

**Document Version:** 1.0  
**Product Version:** 0.3.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Authority and Mode

```text
Implementation Mode: Autonomous
```

This specification records exact design decisions for additive PostgreSQL persistence. The Promise-based I/O stop condition was cleared before implementation; production code for this slice is complete.

Architectural authority order remains Foundation → ADRs → Blueprint 24 → dependencies → Governance → this specification → conforming code.

---

# 1. Provider Selection

## Recommendation

**Use `pg` (node-postgres) with an exact version pin. Do not use an ORM for v0.3.**

| Technology | Verdict | Reason |
|---|---|---|
| **pg** | **Selected** | Minimal driver; SQL/pooling stay inside provider; maps to Blueprint 24 without competing abstractions |
| postgres.js | Acceptable alt | Similar thinness; no gain over `pg` for this milestone |
| Prisma | Rejected | Schema/client generation and query model compete with Blueprint 24 contracts |
| Drizzle | Rejected for v0.3 | Extra layer not required to prove contracts |
| TypeORM | Rejected | Entity/ORM lifecycle risks ownership leakage |

Exact npm pin is fixed at implementation time from the then-current stable `pg` release (same discipline as `openai@7.4.0` in v0.2).

---

# 2. Package Boundary

```text
packages/persistence/                 # @agentprodready/persistence — contracts/framework (unchanged unless stop condition amendment)
packages/persistence-postgres/        # @agentprodready/persistence-postgres — NEW
  package.json
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
    migrator.ts
    migrations/
      001_init.sql
      001_init.down.sql
    postgres-persistence.spec.ts
    postgres-persistence.integration.spec.ts
```

### Dependency rules

```text
@agentprodready/persistence-postgres
  → @agentprodready/persistence
  → pg                              (private)

apps/platform-host
  → @agentprodready/persistence
  → @agentprodready/persistence-postgres
  ✗ pg                              (forbidden)

Other @agentprodready/* packages
  ✗ @agentprodready/persistence-postgres
  ✗ pg
```

No `pg` Pool/Client/Result types may appear in public exports.

Public exports may include: `PostgresPersistenceProvider`, `PostgresSnapshotStore`, `PostgresMigrationProvider`, `loadPostgresPersistenceConfig`, `PERSISTENCE_POSTGRES_BOUNDARY_ID`, migrator CLI helpers.

---

# 3. Existing Persistence Contracts

## Already sufficient (no redesign intended)

| Concern | Existing contract |
|---|---|
| Repository reads/queries | `Repository` |
| Writes | `EntityWrite` / `EntityDelete` staged via `TransactionOperation` |
| Unit of Work | `UnitOfWork` / `PersistenceTransaction` |
| Capabilities | `ProviderCapabilities` (`durable`, isolation list, snapshots, migrations, …) |
| Transaction request | `TransactionRequest` (isolation, mandatory durability, atomicity) |
| Optimistic concurrency | `revision` + `versionToken` on `PersistedEntity` / expected fields on writes |
| Snapshots | `PersistenceSnapshot` + `SnapshotStore` |
| Migrations | `MigrationPlan` / `MigrationProvider` / `MigrationResult` |
| Errors | `PersistenceError` + `PersistenceErrorCode` |
| Framework facade | `PersistenceFramework` |

## Gap / Stop Condition — Design Resolution

| Gap | Status |
|---|---|
| Sync `Repository` / `SnapshotStore` / sync `begin` & `framework.snapshot` | **Resolved by amendment design** |

Authoritative amendment:

[docs/implementation/amendments/24-persistence-async-io-contract-amendment.md](../amendments/24-persistence-async-io-contract-amendment.md)

Target contracts (async migration implemented before this slice):

```ts
export interface Repository<T = unknown> {
  readonly name: string;
  readonly providerBoundaryId: string;
  find(id: string, scope: PersistenceScope): Promise<PersistedEntity<T> | undefined>;
  exists(id: string, scope: PersistenceScope): Promise<boolean>;
  count(scope: PersistenceScope): Promise<number>;
  query(request: RepositoryQuery): Promise<QueryResult<T>>;
}

export interface SnapshotStore {
  save(value: PersistenceSnapshot): Promise<void>;
  get(id: string): Promise<PersistenceSnapshot | undefined>;
}

// UnitOfWork.begin / PersistenceFramework.begin → Promise<PersistenceTransaction>
// PersistenceFramework.snapshot → Promise<PersistenceSnapshot>
// PersistenceTransaction.stage remains synchronous
```

Blueprint amendment: **No**. ADR: **No**. Dual async APIs / fake-sync bridges: **Rejected**.

Async I/O TypeScript migration passed `pnpm verify` before this PostgreSQL slice. This v0.3 design did not otherwise change public Persistence contracts.

---

# 4. Persistence Selection

| Variable | Values | Default |
|---|---|---|
| `PERSISTENCE_PROVIDER` | `in-memory` \| `postgres` | `in-memory` |

### Composition rules

- Composition instantiates exactly one `PersistenceProvider` for the product boundary.
- `in-memory` → existing `InMemoryPersistenceProvider` (+ in-memory snapshot/migration stores when wiring `PersistenceFramework`).
- `postgres` → `PostgresPersistenceProvider` (+ postgres snapshot/migration stores), requires valid DB config.
- Host contains **no** SQL.
- Default CI / smoke remain `in-memory`.

### Host typing

`LocalReferenceComposition.persistence` should be typed as `PersistenceProvider`, not concretely `InMemoryPersistenceProvider`. Smoke asserts `instanceof InMemoryPersistenceProvider` **only** when `PERSISTENCE_PROVIDER=in-memory` (default).

---

# 5. PostgreSQL Configuration

## Canonical strategy

**Prefer `DATABASE_URL` as the single required connection string when `PERSISTENCE_PROVIDER=postgres`.**

| Variable | Required | Default | Secret? | Validation |
|---|---|---|---|---|
| `PERSISTENCE_PROVIDER` | No | `in-memory` | No | `in-memory` \| `postgres` |
| `DATABASE_URL` | Yes if postgres | none | **Yes** (may embed password) | Must parse as `postgres:` / `postgresql:` URL |
| `POSTGRES_SSL` | No | unset | No | `true`/`false`; when true, SSL enabled |
| `POSTGRES_POOL_MIN` | No | `0` | No | integer ≥ 0 |
| `POSTGRES_POOL_MAX` | No | `10` | No | integer ≥ 1 and ≥ min |
| `POSTGRES_HOST` | Alt | — | No | Used only if `DATABASE_URL` absent |
| `POSTGRES_PORT` | Alt | `5432` | No | TCP port |
| `POSTGRES_DATABASE` | Alt | — | No | non-empty |
| `POSTGRES_USER` | Alt | — | No | non-empty |
| `POSTGRES_PASSWORD` | Alt | — | **Yes** | may be empty only for local trust configs; still classified secret when set |

If discrete vars are used instead of `DATABASE_URL`, Composition/config constructs an equivalent URL internally. Do not require both styles simultaneously.

### Explicitly excluded as provider execution policy

- Provider-owned retry loops for business operations
- Provider-owned application timeout policy competing with Runtime  
  (driver `connectionTimeoutMillis` / idle timeouts are infrastructure settings only and must be documented as such)

---

# 6. Secret Handling

| Context | Behavior |
|---|---|
| Local | `.env` (gitignored); `.env.example` placeholders only |
| Source control | No real credentials |
| Default CI (`verify`, `docker`) | No Postgres; no DB secrets |
| Postgres CI job | Ephemeral service container; test user/password in workflow YAML (non-production) |
| Docker images | No baked credentials; runtime env injection |
| Staging/production | External injection of `DATABASE_URL` / SSL settings |

Never log full `DATABASE_URL` or passwords. Redact credentials in error messages.

---

# 7. Schema Ownership (Conservative)

v0.3 owns **only** Blueprint 24 proof tables.

## Tables

### `schema_migrations`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Migration id e.g. `001_init` |
| `applied_at` | `TIMESTAMPTZ NOT NULL` | |

### `persistence_entities`

| Column | Type | Notes |
|---|---|---|
| `repository` | `TEXT NOT NULL` | Repository name |
| `id` | `TEXT NOT NULL` | Entity id |
| `tenant_id` | `TEXT NOT NULL` | Scope |
| `workspace_id` | `TEXT NULL` | Scope optional |
| `data` | `JSONB NOT NULL` | Opaque payload |
| `revision` | `BIGINT NOT NULL` | Optimistic concurrency |
| `version_token` | `TEXT NOT NULL` | Optimistic concurrency |
| `created_at` | `TIMESTAMPTZ NOT NULL` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL` | |

Constraints:

- `PRIMARY KEY (repository, tenant_id, COALESCE(workspace_id, ''), id)` via unique index on `(repository, tenant_id, workspace_id, id)` with NULLS NOT DISTINCT if PG15+, or synthesized `scope_key` column.
- Prefer explicit `scope_key TEXT NOT NULL` generated as `tenant_id || '\0' || coalesce(workspace_id,'')` for portable uniqueness: `PRIMARY KEY (repository, scope_key, id)`.

### `persistence_snapshots`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Snapshot id |
| `repository` | `TEXT NOT NULL` | |
| `tenant_id` | `TEXT NOT NULL` | |
| `workspace_id` | `TEXT NULL` | |
| `provider_boundary_id` | `TEXT NOT NULL` | |
| `entities` | `JSONB NOT NULL` | Serialized `PersistedEntity[]` |
| `source_revision_digest` | `TEXT NOT NULL` | |
| `created_at` | `TIMESTAMPTZ NOT NULL` | |
| `immutable` | `BOOLEAN NOT NULL DEFAULT TRUE` | |

### `persistence_migration_records`

| Column | Type | Notes |
|---|---|---|
| `plan_id` | `TEXT PRIMARY KEY` | MigrationPlan.id |
| `version` | `TEXT NOT NULL` | |
| `provider_boundary_id` | `TEXT NOT NULL` | |
| `outcome` | `TEXT NOT NULL` | applied / rolled-back |
| `applied_at` | `TIMESTAMPTZ NOT NULL` | |
| `rollback_plan_reference` | `TEXT NOT NULL` | |

## Explicitly not created in v0.3

Agent tables, audit tables, event journal tables, memory/knowledge tables, workflow/runtime execution tables, OpenAI caches.

---

# 8. Migration Strategy

## Mechanics

- Versioned SQL files under `src/migrations/`.
- First migration `001_init` creates the four tables above.
- Down migration `001_init.down.sql` drops them (dev/test reset only).
- Migrator records applied ids in `schema_migrations`.
- Deterministic ordering by filename.

## Commands

| Command | Purpose |
|---|---|
| `pnpm db:up` | `docker compose --profile postgres up -d postgres` |
| `pnpm db:migrate` | Apply pending SQL migrations (explicit) |
| `pnpm db:status` | Print applied/pending migrations |
| `pnpm db:down` | Stop postgres profile containers |
| `pnpm test:postgres` | Run postgres integration/contract tests (expects migrated DB) |
| `pnpm db:reset:test` | Drop/recreate test schema or run down+up migrations (test only; refuse unless `PERSISTENCE_ALLOW_RESET=1`) |

## Startup policy

- Product host **must not** auto-migrate on start.
- In `postgres` mode, readiness may verify connectivity and that required migrations are applied; if missing → not ready / fail fast with clear error.
- CI applies migrations explicitly before tests.

Forward-only in production is acceptable; down migrations are for local/test reset and must be documented as such.

---

# 9. Transaction Semantics

| Step | Behavior |
|---|---|
| `unitOfWork().begin(request)` | Open PG client from pool; `BEGIN`; `SET TRANSACTION ISOLATION LEVEL ...` |
| `stage(op)` | Buffer operations in memory **or** apply to TX-scoped temp state; must not commit |
| `commit(at)` | Apply all staged ops inside the open PG transaction; `COMMIT` on full success; on any failure `ROLLBACK` and throw normalized error |
| `rollback(at)` | `ROLLBACK` if still open; return explicit rollback result |

### Rules

- One PostgreSQL transaction boundary per `PersistenceTransaction`.
- Partial commit is never a success outcome.
- Connection checked out for the transaction lifetime; released after commit/rollback/fail.
- Cross-provider / cross-boundary enlistment rejected (`CROSS_PROVIDER_TRANSACTION`).
- Distributed transactions out of scope.

Capability declaration:

```ts
durability: 'durable'
atomicTransactions: true
rollback: true
crossProviderAtomicity: false
boundaryId: 'postgres-boundary' // constant
providerId: 'postgres'
```

---

# 10. Isolation Semantics

### PostgreSQL capability list

```ts
isolationLevels: ['read-committed', 'repeatable-read', 'serializable']
defaultIsolation: 'read-committed'
```

**Omit `snapshot`.** PostgreSQL has no separate `SNAPSHOT` isolation level matching the contract name. Requesting `snapshot` without an approved fallback must fail via existing `negotiate()` → `UNSUPPORTED_CAPABILITY`. Silent mapping of `snapshot` → `repeatable-read` is prohibited.

| Contract level | PostgreSQL |
|---|---|
| `read-committed` | `READ COMMITTED` |
| `repeatable-read` | `REPEATABLE READ` |
| `serializable` | `SERIALIZABLE` |
| `snapshot` | **unsupported** (fail explicitly) |

---

# 11. Optimistic Concurrency

On save/update of existing row:

```sql
UPDATE persistence_entities
SET data = $data,
    revision = revision + 1,
    version_token = $newToken,
    updated_at = $updatedAt
WHERE repository = $repository
  AND scope_key = $scopeKey
  AND id = $id
  AND revision = $expectedRevision
  AND version_token = $expectedVersionToken;
```

- If row missing on expected update → `ENTITY_NOT_FOUND` or `OPTIMISTIC_LOCK_FAILED` per existing in-memory semantics (match reference provider behavior exactly).
- If `rowCount === 0` when expectations were provided → `OPTIMISTIC_LOCK_FAILED`.
- Insert path: unique violation → `DUPLICATE_ENTITY`.
- Delete similarly predicates on expected revision/token.
- No automatic merge.

`version_token` generation: opaque random/ulid string; `revision` monotonic bigint starting at 1.

---

# 12. Durability

| Provider | `ProviderCapabilities.durability` |
|---|---|
| In-memory | `non-durable` (unchanged) |
| PostgreSQL | `durable` |

Successful `COMMIT` means PostgreSQL has accepted durability responsibility under the cluster’s synchronous_commit settings (default local Docker/CI uses standard commit). Document that platform `durable` means provider-declared durable commit, not multi-AZ cloud RPO guarantees.

Requests with `mandatoryDurability: 'durable'` succeed only against postgres. Against in-memory they continue to fail via existing capability negotiation.

---

# 13. Repository Semantics

Through normalized contracts only:

| Operation | Behavior |
|---|---|
| create (save new) | Insert; conflict → `DUPLICATE_ENTITY` |
| read (`find`) | Select by repository+scope+id; missing → `undefined` |
| update (save existing) | Versioned update (§11) |
| delete | Versioned delete |
| exists/count/query | Scoped filters; normalized query operators mapped to SQL carefully; unsupported filter shapes → `CONSTRAINT_VIOLATION` |
| serialization | `data` / snapshot payloads as JSONB via structured clone–safe JSON; failure → `CONSTRAINT_VIOLATION` or dedicated message under that code / `TRANSACTION_FAILED` if mid-tx |

No `pg` `QueryResult` rows escape the provider. Returned objects are frozen `PersistedEntity` envelopes.

---

# 14. Snapshot Store

**Included in v0.3** because Blueprint 24 already defines `SnapshotStore` and the in-memory provider supports snapshots.

| Field | Storage |
|---|---|
| snapshot id | `persistence_snapshots.id` |
| repository | column |
| scope | tenant/workspace columns |
| entities | JSONB array of `PersistedEntity` |
| sourceRevisionDigest | column |
| createdAt | column |

Semantics:

- Immutable: updates forbidden; duplicate id → `DUPLICATE_ENTITY` / constraint error normalized.
- Not Audit history (`auditHistory: false` preserved in payload).
- Optimistic concurrency for snapshot rows is create-once; no in-place mutation API.

Runtime `ExecutionSnapshotPort` remains in-memory and **out of scope** for v0.3 durability.

---

# 15. Error Normalization

All driver errors → `PersistenceError` before leaving the package.

| Condition | Code |
|---|---|
| Connection refused / DB down | `PROVIDER_UNAVAILABLE` |
| Auth failure (28P01 etc.) | `PROVIDER_UNAVAILABLE` or `PERSISTENCE_UNAUTHORIZED` only if clearly authz; prefer `PROVIDER_UNAVAILABLE` for DB login failures (credentials ≠ business authz) |
| Unique violation | `DUPLICATE_ENTITY` |
| Check/FK/not-null | `CONSTRAINT_VIOLATION` |
| Missing entity | `ENTITY_NOT_FOUND` |
| Stale version | `OPTIMISTIC_LOCK_FAILED` |
| TX abort / serialization failure (40001) | `TRANSACTION_FAILED` (retryability is Runtime’s decision) |
| JSON serialize/deserialize failure | `CONSTRAINT_VIOLATION` |
| Statement/connection timeout naturally surfaced | `PERSISTENCE_TIMEOUT` |
| Migration failure | `MIGRATION_FAILED` |
| Unsupported isolation/capability | `UNSUPPORTED_CAPABILITY` |
| Unknown | `TRANSACTION_FAILED` or message under closest existing code; do not invent new public codes in v0.3 |

Raw `pg` errors never appear on public results.

---

# 16. Runtime Ownership

PostgreSQL provider must **not** own:

- retry / recovery / scheduling / cancellation policy
- provider failover
- workflow/agent recovery product behavior
- application-level timeout policy

Allowed infrastructure: pool sizing, connection acquire, per-transaction client checkout, idle client timeouts as pool settings.

Runtime continues to own operational execution around any future durable recovery milestone.

---

# 17. Docker Compose

## Recommendation: **Option B — Compose profile `postgres`**

```yaml
services:
  agentprodready:
    # existing service; optionally:
    # profiles interaction documented; depends_on only when using postgres profile docs
  postgres:
    profiles: ["postgres"]
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: agentprodready
      POSTGRES_PASSWORD: agentprodready
      POSTGRES_DB: agentprodready
    ports:
      - "5432:5432"
    volumes:
      - agentprodready_pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agentprodready -d agentprodready"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  agentprodready_pg:
```

### Why B

- Default compose path stays single-service / DB-optional.
- Clearer than always-on unused postgres (A).
- Simpler than a fully separate compose file (C) while remaining discoverable.

Local postgres mode example:

```bash
pnpm db:up
pnpm db:migrate
PERSISTENCE_PROVIDER=postgres DATABASE_URL=postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready pnpm start
```

---

# 18. GitHub Actions

Keep `verify` and `docker` jobs as deterministic in-memory paths.

Add job `persistence-postgres` (may `needs: verify`):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: agentprodready_ci
      POSTGRES_PASSWORD: agentprodready_ci
      POSTGRES_DB: agentprodready_ci
    ports: ["5432:5432"]
    options: >-
      --health-cmd "pg_isready -U agentprodready_ci -d agentprodready_ci"
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10
```

Steps: checkout → pnpm install → build → migrate against service → `pnpm test:postgres`.

No GitHub Secrets required.

---

# 19. Testing

## Unit (no DB; part of `pnpm test`)

- config validation
- JSON serialization edge cases
- error translation matrix

## Integration / contract (`pnpm test:postgres`)

- create/read/update/delete
- transaction commit atomicity
- rollback discards staged work
- isolation: unsupported `snapshot` fails; supported levels set successfully
- optimistic concurrency conflict
- duplicate/constraint handling
- snapshots save/get immutability
- migration apply idempotency (`already-applied`)
- connection failure normalization (optional fault injection)

## Regression

- Existing persistence in-memory suite green
- Host e2e/smoke default path still expects in-memory
- OpenAI / reference AI paths unchanged

## Manual

1. `pnpm db:up && pnpm db:migrate`  
2. Start host with postgres provider  
3. Run a small persistence probe (test or temporary script using PersistenceFramework) writing an entity  
4. Restart host  
5. Confirm entity still readable  

---

# 20. Restart Preparation

### Durable after v0.3 (process stop → start)

- `persistence_entities` rows  
- `persistence_snapshots` rows  
- migration records  

### Remains non-durable / deferred

| State | Owner today | v0.3 |
|---|---|---|
| Runtime execution transition history | `InMemoryExecutionSnapshotPort` | unchanged |
| Agent registry/lifecycle | in-memory agent stores | unchanged |
| Audit records | in-memory audit | unchanged |
| Event bus journal/replay | in-memory | unchanged |
| Memory/Knowledge | in-memory | unchanged |
| Product invoke recovery UX | n/a | deferred |

v0.3 does **not** implement Runtime recovery. It only ensures Blueprint 24 durable primitives exist for a later recovery milestone.

---

# 21. Developer Commands

| Command | Action |
|---|---|
| `pnpm db:up` | Start postgres profile |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:status` | Show migration status |
| `pnpm db:down` | Stop postgres profile |
| `pnpm test:postgres` | Postgres integration tests |
| `pnpm db:reset:test` | Destructive reset (guarded) |

Avoid additional aliases unless necessary.

---

# 22. Documentation Updates

| Doc | Update |
|---|---|
| `docs/guides/persistence.md` | Create — selection, migrate, compose profile, CI |
| `.env.example` | Add persistence vars (placeholders) |
| `README.md` | v0.3 optional postgres notes |
| `docs/README.md` | Link product/plan/spec/guide |
| `packages/persistence-postgres/README.md` | Provider scope + non-goals |
| `packages/persistence/README.md` | Pointer to postgres package |
| Compose comments | Profile usage |

---

# 23. Future Databases

Adding MySQL / SQLite / CockroachDB / DynamoDB / MongoDB requires:

1. New provider package implementing the same Persistence contracts  
2. Composition selection wiring  
3. Provider-specific migrations/capabilities  

Must **not** require changes to Runtime, Planning, Workflow, Security ownership, or Persistence public contracts (after the approved async amendment, if any).

---

# 24. Explicit Non-Goals

- Redis, Kafka, distributed transactions  
- Production cloud database provisioning  
- Kubernetes  
- Backup/restore automation, replicas, sharding, multi-region  
- External secret manager implementation  
- Runtime redesign / workflow redesign  
- New persistence architecture beyond Blueprint 24  
- Persisting all AgentProdReady subsystems  

---

# 25. Review End-State Summary

| Item | Decision |
|---|---|
| Recommended client/ORM | **`pg` only (no ORM)** |
| Package structure | `packages/persistence-postgres` (`@agentprodready/persistence-postgres`) |
| Files to create | Provider package, migrations, guide, post-impl report/checklist |
| Files to modify | Host config/composition/smoke types, compose profile, CI job, `.env.example`, README/docs, root scripts; `@agentprodready/persistence` **only if async amendment approved** |
| Schema/tables | `schema_migrations`, `persistence_entities`, `persistence_snapshots`, `persistence_migration_records` |
| Migration strategy | Explicit versioned SQL; no silent startup migrate |
| Environment variables | `PERSISTENCE_PROVIDER`, `DATABASE_URL` (+ optional SSL/pool/discrete URL parts) |
| Secrets required | None for default CI; local/CI postgres uses non-prod credentials |
| Docker/Compose impact | Profile `postgres` + volume + healthcheck |
| CI impact | Additive `persistence-postgres` job; verify/docker unchanged |
| Test strategy | Unit without DB; contract/integration with ephemeral Postgres |
| Persistence semantics | Atomic PG transactions; durable capability; read-committed default |
| Optimistic concurrency | `revision` + `version_token` predicated UPDATE/DELETE |
| Restart-preparation impact | Durable Blueprint 24 entities/snapshots only; Runtime recovery deferred |
| Stop conditions | Async I/O **code migration** must complete first; then standard ownership/security stops |
| Architectural deviations | None — Promise-based I/O amendment is a separate approved contract step |
| Autonomous PostgreSQL safe? | **Yes** — async I/O migration green; this slice implemented |

---

# Stop Conditions (Complete List)

Stop and report if:

1. PostgreSQL implementation is attempted **before** the Promise-based persistence I/O code migration is complete and verified.  
2. Implementation would require changing ADRs/blueprints without governance.  
3. Schema pressure appears to persist non–Blueprint-24 subsystems “because Postgres exists.”  
4. Provider would need to own Runtime retry/timeout/failover.  
5. Default CI cannot remain green without Postgres secrets or a mandatory DB.  
6. `pg` types would leak across the Blueprint 24 boundary.  
7. Isolation `snapshot` would be silently downgraded.  
8. Host would embed SQL.

---

# Review Decision

**Status:** Implemented — see [implementation report](../reports/agentprodready-v0.3-postgresql-persistence-implementation-report.md).

Async I/O prerequisite was satisfied before this Autonomous PostgreSQL cycle.
