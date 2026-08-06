# Blueprint 24 — Persistence Framework Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Contract Decisions

`PersistedEntity<T>` is an immutable envelope containing stable ID, tenant/workspace scope, opaque payload, numeric revision, optimistic-lock token, and timestamps. Repositories expose normalized save/update/delete/find/exists/count/query operations and never expose provider query languages.

`ProviderCapabilities` declares boundary ID, supported isolation levels, atomicity, rollback, snapshots, migrations, maximum transaction repositories, and durability (`non-durable`, `process-durable`, or `durable`). A `TransactionRequest` declares mandatory isolation, durability, atomicity, repository boundary, and optional explicitly approved isolation fallback. Missing mandatory capabilities fail before staging. The default minimum isolation is read committed.

An in-memory transaction stages operations against a shadow copy. Commit validates every operation and swaps all affected repository state only after complete success; partial commit is impossible. Rollback discards staging and returns an explicit outcome. Stale revision/token updates fail without automatic merging. Cross-provider/boundary enlistment is rejected.

Snapshots are immutable point-in-time views and explicitly are not Audit history. Queries support normalized filters, stable sorting, pagination, projection-key declarations, and count aggregation. Migrations are explicit versioned plans with forward steps and rollback references; the reference provider records application only and performs no domain transformation.

Security authorization, Event transport, Audit persistence, Observability, and Configuration remain dependency-owned ports. The in-memory provider accurately declares non-durability. No database/vendor SDK or provider-specific type enters the public surface.

## Package

- `@agentforge/persistence`
- `src/index.ts`: public contracts, framework, capability negotiation, unit of work, queries, snapshots, migrations, and errors.
- `src/reference.ts`: atomic in-memory provider/repository and reference accountability providers.
- `src/persistence.spec.ts`: acceptance, contract, and integration tests.
