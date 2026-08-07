# AgentProdReady v0.3 Durable PostgreSQL Persistence

**Version:** 0.3.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentProdReady v0.3 introduces the first production-capable **durable** persistence provider (PostgreSQL) while preserving Blueprint 24 contracts, Runtime ownership, provider independence, and the deterministic in-memory default used by local development and CI.

This slice proves Blueprint 24’s persistence semantics against a real database. It does **not** suddenly persist every AgentProdReady subsystem.

---

## Authority

| Document | Role |
|---|---|
| [Blueprint 24 — Persistence Framework](../blueprints/24-persistence-framework.md) | Persistence ownership and semantics |
| [ADR-004 — Provider Independence](../adrs/ADR-004%20%E2%80%94%20Provider%20Independence.md) | Vendor client encapsulation |
| [ADR-005 — Composition Owns Instantiation](../adrs/ADR-005%20%E2%80%94%20Composition%20Owns%20Instantiation.md) | Provider lifetime |
| [ADR-006 — Runtime Owns Operational Execution](../adrs/ADR-006%20%E2%80%94%20Runtime%20Owns%20Operational%20Execution.md) | Retry / timeout / recovery |
| [ADR-012 — Configuration Resolution Is Centralized](../adrs/ADR-012%20%E2%80%94%20Configuration%20Resolution%20Is%20Centralized.md) | Config surface |
| [Implementation Plan](../implementation/plans/agentprodready-v0.3-postgresql-persistence-plan.md) | Approach |
| [Implementation Specification](../implementation/specifications/agentprodready-v0.3-postgresql-persistence-specification.md) | Exact decisions |
| [Implementation Report](../implementation/reports/agentprodready-v0.3-postgresql-persistence-implementation-report.md) | Completion evidence |
| [Persistence Guide](../guides/persistence.md) | Operator usage |

Blueprints, ADRs, and existing public Persistence Framework contracts remain authoritative. Contract changes are **not** assumed; any required change is a documented stop condition.

---

## Product Boundary

```text
apps/platform-host
  └── Composition selects PersistenceProvider
        ├── InMemoryPersistenceProvider   (default, non-durable, unchanged)
        └── PostgresPersistenceProvider   (new, durable, additive)

@agentprodready/persistence                 ← public contracts / framework (unchanged unless stop condition approved)
@agentprodready/persistence-postgres        ← NEW provider package (pg client internal only)
```

The host selects the provider via configuration. The host must not contain SQL.

---

## Conservative Durability Scope

v0.3 makes durable **only** Blueprint 24 generic persistence artifacts required to prove contracts:

| Durable in v0.3 | Not durable in v0.3 (remain in-memory / deferred) |
|---|---|
| Generic repository entities (`PersistedEntity`) | Agent registry / lifecycle |
| Blueprint 24 persistence snapshots (`SnapshotStore`) | Runtime `ExecutionSnapshotPort` history |
| Migration application records | Audit records, Event Bus journal |
| | Memory / Knowledge / Workflow engine stores |
| | OpenAI / AI adapter state |

PostgreSQL proves repositories, transactions, isolation, optimistic concurrency, durability declaration, snapshots, and migrations — not “persist the whole platform.”

---

## Selection

| Setting | Default | Meaning |
|---|---|---|
| `PERSISTENCE_PROVIDER` | `in-memory` | `in-memory` \| `postgres` |

Default local/CI path remains deterministic and database-free.

---

## Persistence I/O Stop Condition (Resolved in Design)

Existing Blueprint 24 `Repository` and `SnapshotStore` surfaces are **synchronous**. PostgreSQL I/O in Node.js is asynchronous.

**Resolution (approved design path):** controlled Promise-based amendment of the existing Persistence Framework I/O contracts — documented in [24-persistence-async-io-contract-amendment.md](../implementation/amendments/24-persistence-async-io-contract-amendment.md).

- Blueprint 24 constitutional amendment: **not required**
- ADR: **not required**
- Dual `AsyncRepository` APIs / fake-sync bridges: **rejected**

Async I/O contract migration is complete (`@agentprodready/persistence@0.2.0`). PostgreSQL provider implementation is complete in this product slice.

---

## Explicit Non-Goals

- Redis, Kafka, distributed transactions
- Cloud-managed DB provisioning, backups, replicas, sharding, multi-region
- Kubernetes
- External secret manager implementation
- Persisting agents, audit, events, memory, knowledge, or Runtime recovery in this milestone
- Runtime / Workflow / Security redesign
- Making PostgreSQL mandatory for default CI or `pnpm start`

---

## Success Definition

v0.3 succeeds when:

1. PostgreSQL provider implements Blueprint 24 contracts honestly (after any approved contract amendment).
2. Default path remains `in-memory` with no database requirement.
3. Schema remains minimal and contract-focused.
4. CI can run ephemeral PostgreSQL integration without production secrets.
5. Future databases (MySQL, SQLite, DynamoDB, MongoDB) remain additive provider packages.

---

## Related Artifacts

- Plan: [agentprodready-v0.3-postgresql-persistence-plan.md](../implementation/plans/agentprodready-v0.3-postgresql-persistence-plan.md)
- Specification: [agentprodready-v0.3-postgresql-persistence-specification.md](../implementation/specifications/agentprodready-v0.3-postgresql-persistence-specification.md)
