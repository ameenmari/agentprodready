# Persistence Providers

**Version:** 0.3.0 (storage) / 0.4.0 (Runtime checkpoint rows) / 0.5.0 (Memory rows) / 0.7.0 (shared pgvector-capable Postgres image)

AgentProdReady persistence is provider-independent (Blueprint 24). Composition selects one `PersistenceProvider`.

Runtime restart checkpoints (v0.4) are stored as ordinary repository entities in `runtime-executions` — see [runtime-recovery.md](./runtime-recovery.md). No Runtime-specific PostgreSQL tables are added.

Durable Memory (v0.5) uses repository `memory-records` with tenant-only Persistence scope — see [memory.md](./memory.md). No Memory-specific PostgreSQL tables are added.

Vector search (v0.7) uses a **separate** `memory_vector_index` owned by `@agentprodready/vector-store-pgvector`, not generic Persistence ranking — see [vector-search.md](./vector-search.md). Compose/CI Postgres image is pgvector-enabled PostgreSQL 16; Persistence migrations remain `pnpm db:migrate`, vector migrations are `pnpm db:migrate:vector`.

## Selection

| `PERSISTENCE_PROVIDER` | Meaning | Default |
|---|---|---|
| `in-memory` | Non-durable reference provider | **Yes** |
| `postgres` | Durable PostgreSQL provider (`@agentprodready/persistence-postgres`) | Opt-in |

Default local development, `pnpm verify`, and Docker smoke remain **database-free**.

## PostgreSQL (opt-in)

```bash
pnpm db:up
pnpm build
pnpm db:migrate
pnpm db:status

# optional integration tests
set DATABASE_URL=postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready   # Windows
pnpm test:postgres

# run host against Postgres
set PERSISTENCE_PROVIDER=postgres
set DATABASE_URL=postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready
pnpm start
```

Compose profile:

```bash
docker compose --profile postgres up -d
```

Default `docker compose up` does **not** start PostgreSQL.

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `PERSISTENCE_PROVIDER` | No | `in-memory` \| `postgres` |
| `DATABASE_URL` | Yes if postgres | Secret — never log credentials |
| `POSTGRES_SSL` | No | `true`/`false` |
| `POSTGRES_POOL_MIN` / `POSTGRES_POOL_MAX` | No | Pool sizing only |
| Discrete `POSTGRES_HOST`… | Alt | Used only when `DATABASE_URL` absent |

Destructive reset:

```bash
# requires explicit guard
PERSISTENCE_ALLOW_RESET=1 pnpm db:reset:test
```

Host startup never auto-migrates. Production should treat SQL migrations as forward-oriented; down migrations are for local/test reset.

## Durability scope

| Concern | Durable when `PERSISTENCE_PROVIDER=postgres` |
|---|---|
| Generic entities / Blueprint 24 snapshots / migrations | Yes (v0.3) |
| Runtime `ExecutionCheckpoint` in `runtime-executions` | Yes (v0.4) — recovery still owned by Runtime |
| Memory records in `memory-records` when `MEMORY_PROVIDER=persistent` | Yes (v0.5) — semantics still owned by Memory |
| Agents, audit journal, event journal, knowledge, OpenAI adapter state | No |

## CI

- `verify` / `docker`: in-memory only, no DB secrets  
- `persistence-postgres`: ephemeral Postgres service + migrate + `pnpm test:postgres`
- `runtime-recovery-postgres`: ephemeral Postgres + `pnpm test:runtime-recovery`
- `memory-persistence-postgres`: ephemeral Postgres + `pnpm test:memory-persistence`

## Packages

- `@agentprodready/persistence` — contracts + framework + in-memory provider  
- `@agentprodready/persistence-postgres` — PostgreSQL provider (`pg`, no ORM)
