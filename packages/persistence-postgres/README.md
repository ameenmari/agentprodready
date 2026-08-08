# `@agentprodready/persistence-postgres`

**PostgreSQL persistence provider** for AgentProdReady (`pg`, no ORM).

| | |
|---|---|
| **Status** | Production provider published (`1.0.x`) |
| **Install** | `npm install @agentprodready/persistence-postgres` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |

Default product path remains in-memory — Postgres is opt-in.

---

## When to use

You need durable Persistence repositories / snapshots for a composed host. Not required for Simple `createAgent` + ephemeral `memory: true`.

---

## Install

```bash
npm install @agentprodready/persistence @agentprodready/persistence-postgres
```

```bash
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready
```

---

## Sample (host selection)

```ts
// Composition / host selects the Postgres provider when PERSISTENCE_PROVIDER=postgres.
// Apply migrations explicitly — hosts do not auto-migrate on startup.
console.log(process.env.DATABASE_URL);
```

```bash
pnpm db:up
pnpm db:migrate
pnpm db:status
```

Destructive local reset requires `PERSISTENCE_ALLOW_RESET=1`.

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Postgres adapters for Persistence ports | Persistence contracts (see `@agentprodready/persistence`) |
| SQL migrator bookkeeping | Runtime recovery policy; leaking `pg` types upward |

---

## Docs

- [Persistence guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/persistence.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)

## License

MIT © 2026 ameenmari
