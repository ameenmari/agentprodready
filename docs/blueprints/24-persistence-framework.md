# AgentForge

# Engineering Blueprint 24

# Persistence Framework

**Version:** 2.0

**Status:** Approved

---

# 1. Purpose

The Persistence Framework defines the provider-independent persistence architecture for AgentForge.

It establishes standardized contracts for storing and retrieving platform data while keeping every storage technology replaceable.

This blueprint governs persistence semantics.

It does **not** govern:

* Business logic
* Runtime execution
* Workflow execution
* Authorization
* Audit semantics
* Memory semantics
* Knowledge retrieval
* Event transport

---

# 2. Responsibilities

The Persistence Framework owns:

* Persistence contracts
* Repository contracts
* Unit of Work
* Transactions
* Persistence Providers
* Optimistic concurrency
* Persistence versioning
* Snapshot semantics
* Query contracts
* Persistence diagnostics

It does **not** own:

* Domain logic
* Runtime scheduling
* Authorization
* Audit records
* Memory lifecycle
* Knowledge lifecycle
* Event publication
* Business retries

---

# 3. Dependencies

Blueprint 24 depends on:

* Blueprint 03 — Composition Framework
* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform
* Blueprint 22 — Observability
* Blueprint 23 — Configuration & Policy

---

# 4. Public Contracts

## Consumes

* Persistence Requests
* Repository Queries
* Transaction Requests
* Snapshot Requests

## Produces

* Persistence Result
* Query Result
* Transaction Result
* Snapshot
* Version Metadata

Owns provider-independent persistence contracts.

---

# 5. Core Components

The framework defines:

* Repository
* Unit of Work
* Transaction
* Persistence Provider
* Snapshot Store
* Version Store
* Query Engine
* Migration Provider

---

# 6. Repository

Repositories expose normalized persistence operations.

Examples:

* Save
* Update
* Delete
* Find
* Query
* Exists
* Count

Repositories remain technology-independent.

---

# 7. Unit of Work

The Unit of Work coordinates multiple repository operations as a single persistence boundary.

It owns:

* Transaction scope
* Commit
* Rollback
* Consistency

It does not own business workflows.

---

# 8. Transactions

Transactions enforce their declared consistency guarantees within one provider-supported transaction boundary.

Supported semantics may include:

* Atomic commit
* Rollback
* Isolation
* Consistency
* Durability

Transaction implementation remains provider-specific.

---

# 8A. Default Persistence Semantics

These semantics are the platform baseline. Providers may offer stronger capabilities but must never silently weaken a requested mandatory guarantee.

## Transaction Semantics

* A transaction is atomic within one provider-supported transaction boundary.
* Partial commit is not a successful transaction result.
* Commit and rollback outcomes are explicit.
* Cross-provider atomic transactions are not guaranteed by default.

## Isolation

* Providers declare their supported isolation capabilities.
* The default platform expectation is read-committed or stronger.
* Stronger isolation may be requested when supported.
* Unsupported requested isolation fails explicitly unless an approved, documented fallback exists.
* Silent isolation downgrade is prohibited.

## Durability

* A successful durable commit means the provider has accepted responsibility for persistence according to its declared durability capability.
* In-memory reference providers are explicitly non-durable.
* Production providers declare their durability guarantees.

## Optimistic Concurrency

* Versioned entities use a stable version or revision token.
* A stale write fails with a normalized optimistic-concurrency error.
* Automatic conflict merging is not a default framework behavior.

## Cross-Repository Transactions

* Repositories share a transaction only when backed by the same compatible transaction boundary.
* Cross-provider transactions are not atomic by default.
* Distributed transactions require a separate approved architectural decision.

## Provider Capability Fallback

* Provider capability limitations are declared.
* Unsupported mandatory guarantees cause explicit failure.
* Silent weakening of consistency, isolation, or durability is prohibited.

---

# 9. Versioning

Persisted entities may support:

* Version Number
* Revision
* Change Timestamp
* Optimistic Lock Token

Versioning enables safe concurrent updates.

---

# 10. Snapshots

Snapshots represent immutable persistence views.

They may support:

* Workflow snapshots
* Execution snapshots
* Configuration snapshots
* State snapshots

Snapshots do not replace Audit history.

---

# 11. Queries

Queries are provider-independent.

Support includes:

* Filtering
* Sorting
* Pagination
* Projection
* Aggregation

Provider-specific query languages remain internal.

---

# 12. Migration

Migration supports:

* Schema evolution
* Data migration
* Version compatibility
* Rollback planning

Migration is explicit and versioned.

---

# 13. Providers

Replaceable providers may include:

* PostgreSQL
* MySQL
* MongoDB
* SQLite
* CosmosDB
* DynamoDB
* Redis
* File-based stores

All providers implement identical contracts.

---

# 14. Security Boundary

Blueprint 15 determines authorization.

The Persistence Framework enforces authorized operations.

Database credentials do not imply business authorization.

---

# 15. Event Integration

Persistence events include:

* Entity Persisted
* Entity Updated
* Entity Deleted
* Transaction Committed
* Transaction Rolled Back

Blueprint 16 transports these events.

---

# 16. Audit Integration

Audit-relevant persistence operations include:

* Administrative changes
* Schema migration
* Manual data correction
* Destructive operations

Blueprint 17 owns accountability.

---

# 17. Error Normalization

Normalized errors include:

* Transaction Failed
* Optimistic Lock Failed
* Entity Not Found
* Duplicate Entity
* Migration Failed
* Provider Unavailable
* Constraint Violation
* Persistence Timeout

Database-specific exceptions remain internal.

---

# 18. Cursor Implementation Guide

Implement:

* Repository abstraction
* Unit of Work
* Transaction abstraction
* Snapshot abstraction
* Version abstraction
* Query abstraction
* Provider interfaces
* Diagnostics
* Normalized errors

Reference implementations:

* In-memory Repository
* SQLite Provider
* File Snapshot Store

Do not implement:

* Business rules
* Runtime logic
* Authorization engine
* Workflow logic
* Provider-specific APIs in public contracts

---

# 19. Testing Requirements

Verify:

* CRUD operations
* Transactions
* Rollbacks
* Optimistic locking
* Concurrent updates
* Snapshot creation
* Query consistency
* Migration
* Provider replacement
* Event publication
* Audit references
* Atomic commit and explicit rollback outcomes
* Partial-commit failure handling
* Read-committed-or-stronger default isolation
* Explicit failure for unsupported isolation without approved fallback
* Declared durable versus non-durable provider behavior
* Stale-version optimistic-concurrency failure
* Same-boundary cross-repository transactions
* Rejection of implicit cross-provider atomicity
* Explicit provider-capability failure without silent weakening

---

# 20. Acceptance Criteria

Blueprint 24 is complete when:

* Persistence contracts are provider-independent.
* Transactions are explicit.
* Repository abstraction is standardized.
* Versioning supports optimistic concurrency.
* Snapshots are immutable.
* Providers remain replaceable.
* Events and audit references are produced.
* Runtime remains independent.
* Transactions are atomic within one declared provider transaction boundary.
* Partial commit is never reported as success.
* Isolation capabilities are declared and silent downgrade is prohibited.
* Durable and non-durable providers declare their guarantees accurately.
* Stale writes fail with a normalized optimistic-concurrency error.
* Cross-provider atomic transactions are not assumed.
* Unsupported mandatory provider guarantees fail explicitly.

---

# 21. Final Ownership

## Persistence Framework

Owns:

* Persistence contracts
* Repository abstraction
* Transactions
* Snapshots
* Versioning
* Queries
* Provider abstraction

## Runtime

Owns:

* Execution

## Security Platform

Owns:

* Authorization

## Event Bus

Owns:

* Event transport

## Audit Platform

Owns:

* Accountability

---

# 22. Chief Architect's Notes

The Persistence Framework provides a technology-independent storage layer for AgentForge.

The constitutional flow is:

```text
Repository Request
        │
        ▼
Repository
        │
        ▼
Unit of Work
        │
        ▼
Transaction
        │
        ▼
Persistence Provider
        │
        ▼
Storage Technology
```

The framework answers:

> "How does the platform reliably store and retrieve information?"

It does **not** answer:

> "Should this information be created, who may access it, or how execution proceeds?"

Those responsibilities remain with the corresponding architectural owners.

---
