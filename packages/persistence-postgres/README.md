# @agentprodready/persistence-postgres

PostgreSQL provider for Blueprint 24 persistence contracts (`pg@8.22.0`, no ORM).

## Scope

Durable storage for:

- generic `PersistedEntity` rows
- Blueprint 24 `SnapshotStore` snapshots
- Blueprint 24 `MigrationProvider` application records
- SQL migrator bookkeeping (`schema_migrations`)

## Non-goals (v0.3)

Does **not** persist agents, audit, events, memory, knowledge, workflow engine state, Runtime `ExecutionSnapshotPort` recovery, or OpenAI adapter state.

## Selection

```bash
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready
```

Default product path remains `PERSISTENCE_PROVIDER=in-memory` (no database required).

## Migrations

Host startup does **not** auto-migrate. Apply explicitly:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:status
```

Destructive local/test reset requires `PERSISTENCE_ALLOW_RESET=1`.

## Ownership

- Persistence contracts: `@agentprodready/persistence`
- Instantiation: Composition / platform-host
- Operational retry/timeout/recovery: Runtime (not this package)
- `pg` types never leave this package
