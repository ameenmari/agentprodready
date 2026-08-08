# `@agentprodready/persistence`

**Persistence ports — repositories and transactions without locking you to a database vendor.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/persistence` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You need durable stores (checkpoints, memory records, etc.) behind replaceable providers.

**Prefer not to start here** if ephemeral Simple Memory is enough (`memory: true`).

---

## Install

```bash
npm install @agentprodready/persistence
# Postgres provider (optional)
npm install @agentprodready/persistence-postgres
```

---

## Sample

```ts
import type { PersistenceUnitOfWork } from '@agentprodready/persistence';

declare const uow: PersistenceUnitOfWork;
await uow.withTransaction(async (tx) => {
  // repositories accessed via tx — drivers live in provider packages
  return tx;
});
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Persistence ports and repository contracts | Postgres driver details (see persistence-postgres); Runtime recovery policy |

---

## Documentation

- [Blueprint 24](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/24-persistence.md)
- [Persistence guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/persistence.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
