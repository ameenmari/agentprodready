# Implementation Plan Template

**Version:** 1.0

**Document Type:** Blueprint Implementation Plan

---

# Blueprint Information

## Blueprint Number

```text id="bpnumber"
Engineering Blueprint XX
```

## Blueprint Name

```text id="bpname"
<Name>
```

## Blueprint Version

```text id="bpversion"
2.0
```

## Plan Version

```text id="planversion"
1.0
```

## Status

Choose one:

* Draft
* In Review
* Approved
* Superseded

---

# Objective

Describe the objective of this implementation.

Summarize what the blueprint introduces without describing implementation details.

---

# Documents Reviewed

Before implementation, confirm the following documents were reviewed.

| Document                        | Reviewed |
| ------------------------------- | -------- |
| README.md                       | ☐        |
| docs/README.md                  | ☐        |
| implementation-guidelines.md    | ☐        |
| glossary.md                     | ☐        |
| architecture-index.md           | ☐        |
| Current Blueprint               | ☐        |
| Dependency Blueprints           | ☐        |
| Related ADRs                    | ☐        |
| Previous Implementation Reports | ☐        |

Implementation should not begin until every required document has been reviewed.

---

# Blueprint Dependencies

List every direct dependency.

Example:

```text id="dependencies"
01 Foundation

03 Composition

04 Runtime

15 Security

22 Observability
```

---

# Scope

Describe exactly what will be implemented.

Examples:

* Public Contracts
* Domain Models
* Provider Interfaces
* Events
* Errors
* Diagnostics
* Configuration

Only include responsibilities owned by the blueprint.

---

# Explicit Non-Goals

List everything that will **not** be implemented.

Example:

* Business logic
* Runtime scheduling
* Authorization engine
* Provider SDK implementation
* UI

This prevents scope creep.

---

# Package Mapping

Specify where implementation belongs.

Example:

```text id="packagemap"
packages/runtime/

packages/runtime/contracts/

packages/runtime/domain/

packages/runtime/application/

packages/runtime/providers/

packages/runtime/events/

packages/runtime/errors/

packages/runtime/testing/
```

---

# Public Contracts

List every public contract that must exist.

Example:

| Contract         | Status |
| ---------------- | ------ |
| IRuntime         | ☐      |
| ExecutionContext | ☐      |
| ExecutionRequest | ☐      |
| ExecutionResult  | ☐      |

---

# Domain Components

List domain objects.

Example:

| Component            | Status |
| -------------------- | ------ |
| Runtime              | ☐      |
| ExecutionCoordinator | ☐      |
| ExecutionScope       | ☐      |

---

# Provider Interfaces

List provider interfaces.

Example:

| Provider           | Status |
| ------------------ | ------ |
| IExecutionProvider | ☐      |
| IRuntimeProvider   | ☐      |

---

# Reference Providers

Reference implementations used for testing.

Example:

| Provider         | Status |
| ---------------- | ------ |
| InMemoryProvider | ☐      |
| LocalProvider    | ☐      |

---

# Events

List Platform Events.

Example:

| Event              | Status |
| ------------------ | ------ |
| WorkflowStarted    | ☐      |
| ExecutionCompleted | ☐      |

---

# Errors

List normalized platform errors.

Example:

| Error        | Status |
| ------------ | ------ |
| RuntimeError | ☐      |
| TimeoutError | ☐      |

---

# Configuration

Configuration required by this blueprint.

Example:

* RuntimeConfiguration
* TimeoutPolicy
* RetryPolicy

---

# Security Integration

Describe integration with Blueprint 15.

Examples:

* Authorization enforcement
* Security context consumption
* Identity propagation

Do not redefine authorization.

---

# Event Bus Integration

Describe Platform Events published or consumed.

Examples:

Published:

* WorkflowStarted
* MemoryStored

Consumed:

* ConfigurationChanged

---

# Audit Integration

Identify audit-relevant activities.

Examples:

* Administrative operations
* Configuration changes
* Security-sensitive actions

---

# Observability Integration

List:

* Logs
* Metrics
* Traces
* Health checks

Required for this blueprint.

---

# Persistence Requirements

Describe persistence requirements.

If none:

```text id="nopersistence"
No persistence required.
```

---

# API Impact

Does this blueprint affect public APIs?

Choose:

* Yes
* No

If yes:

Describe required API changes.

---

# SDK Impact

Does this blueprint affect SDKs?

Choose:

* Yes
* No

---

# CLI Impact

Does this blueprint affect CLI commands?

Choose:

* Yes
* No

---

# Testing Strategy

The implementation should include:

| Test Type           | Required |
| ------------------- | -------- |
| Unit Tests          | ☐        |
| Contract Tests      | ☐        |
| Integration Tests   | ☐        |
| Provider Tests      | ☐        |
| Compatibility Tests | ☐        |

---

# Acceptance Criteria Mapping

Every blueprint acceptance criterion should map to implementation.

| Acceptance Criterion | Planned Component | Planned Test |
| -------------------- | ----------------- | ------------ |

No criterion should remain unmapped.

---

# Risks

Examples:

* Dependency not implemented
* Provider unavailable
* Performance uncertainty
* Compatibility concerns

---

# Deferred Work

Items intentionally postponed.

Deferred work should never violate blueprint ownership.

---

# Open Questions

Architectural questions requiring clarification.

Implementation should stop if these affect architectural ownership.

---

# Cursor Implementation Checklist

Before implementation:

* [ ] Blueprint reviewed
* [ ] Dependencies reviewed
* [ ] Existing code inspected
* [ ] Package structure confirmed
* [ ] Public contracts identified
* [ ] Scope confirmed

During implementation:

* [ ] Contracts implemented
* [ ] Domain implemented
* [ ] Providers implemented
* [ ] Errors normalized
* [ ] Events implemented
* [ ] Configuration integrated
* [ ] Observability integrated
* [ ] Security integrated

After implementation:

* [ ] Unit tests pass
* [ ] Contract tests pass
* [ ] Integration tests pass
* [ ] Acceptance criteria verified
* [ ] Documentation updated
* [ ] Implementation Report created

---

# Approval

| Role        | Name   | Status |
| ----------- | ------ | ------ |
| Architect   |        |        |
| Reviewer    |        |        |
| Implementer | Cursor |        |

---

# Final Statement

This implementation plan confirms the intended engineering approach for implementing the referenced Engineering Blueprint.

The implementation must remain faithful to the constitutional architecture and must not introduce new architectural ownership, dependency direction, or public contracts without an approved ADR.
