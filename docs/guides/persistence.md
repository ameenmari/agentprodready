# Persistence Providers

**Version:** 0.3.0 (storage) / 0.4.0 (Runtime checkpoint rows)

AgentForge persistence is provider-independent (Blueprint 24). Composition selects one `PersistenceProvider`.

Runtime restart checkpoints (v0.4) are stored as ordinary repository entities in `runtime-executions` — see [runtime-recovery.md](./runtime-recovery.md). No Runtime-specific PostgreSQL tables are added.

## Selection

| `PERSISTENCE_PROVIDER` | Meaning | Default |
|---|---|---|
| `in-memory` | Non-durable reference provider | **Yes** |
| `postgres` | Durable PostgreSQL provider (`@agentforge/persistence-postgres`) | Opt-in |

Default local development, `pnpm verify`, and Docker smoke remain **database-free**.

## PostgreSQL (opt-in)

```bash
pnpm db:up
pnpm build
pnpm db:migrate
pnpm db:status

# optional integration tests
set DATABASE_URL=postgres://agentforge:agentforge@127.0.0.1:5432/agentforge   # Windows
pnpm test:postgres

# run host against Postgres
set PERSISTENCE_PROVIDER=postgres
set DATABASE_URL=postgres://agentforge:agentforge@127.0.0.1:5432/agentforge
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
| Agents, audit journal, event journal, memory, knowledge, OpenAI adapter state | No |

## CI

- `verify` / `docker`: in-memory only, no DB secrets  
- `persistence-postgres`: ephemeral Postgres service + migrate + `pnpm test:postgres`
- `runtime-recovery-postgres`: ephemeral Postgres + `pnpm test:runtime-recovery`

## Packages

- `@agentforge/persistence` — contracts + framework + in-memory provider  
- `@agentforge/persistence-postgres` — PostgreSQL provider (`pg`, no ORM)
