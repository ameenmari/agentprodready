# ADR-002 — Explicit Ownership

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge is composed of multiple architectural frameworks, each responsible for a distinct aspect of the platform.

Without clearly defined ownership boundaries, responsibilities naturally drift between frameworks over time, leading to duplicated behavior, conflicting implementations, hidden dependencies, and unclear system behavior.

To maintain a modular and evolvable architecture, every architectural concern must have one authoritative owner.

---

# Decision

Every architectural responsibility within AgentForge shall have exactly one authoritative owner.

Frameworks may collaborate through public contracts, but ownership of an architectural concern must never be shared or assumed implicitly.

Where multiple frameworks participate in the same workflow, each framework remains responsible only for its explicitly defined architectural concern.

---

# Rationale

Explicit ownership provides:

* Clear architectural boundaries.
* Predictable framework responsibilities.
* Easier maintenance and evolution.
* Independent framework replacement.
* Reduced implementation ambiguity.
* Consistent architectural governance.

This principle prevents architectural drift and ensures that every responsibility has a single source of truth.

---

# Architectural Rule

**Every architectural concern has one authoritative owner.**

A framework may consume information, invoke another framework, or enforce decisions provided by another component, but it must never silently assume ownership of responsibilities belonging to another framework.

Ownership boundaries are established by the Engineering Blueprints and may only be changed through approved architectural governance.

---

# Consequences

The following practices are required:

* Every framework must define its responsibilities explicitly.
* Public contracts must clearly identify ownership boundaries.
* Responsibilities must not be duplicated across frameworks.
* Cross-framework collaboration must occur through normalized platform contracts.

The following practices are prohibited:

* Shared ownership of architectural concerns.
* Hidden responsibility transfer between frameworks.
* Frameworks making decisions owned by another framework.
* Introducing new ownership boundaries through implementation alone.

---

# Examples

Examples of authoritative ownership include:

| Architectural Concern        | Owner                 |
| ---------------------------- | --------------------- |
| Operational Execution        | Runtime               |
| Capability Selection         | Capability Resolution |
| Implementation Instantiation | Composition Framework |
| Authorization Decisions      | Security Platform     |
| Event Transport              | Event Bus             |
| Durable Accountability       | Audit Platform        |
| Memory Management            | Memory Engine         |
| Knowledge Retrieval          | Knowledge Engine      |
| Provider Interaction         | AI Provider Framework |
| External Tool Interaction    | Tool Framework        |

These ownership boundaries are constitutional and should remain consistent across the platform.

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 03 — Dependency Injection & Composition
* Blueprint 04 — Runtime
* Blueprint 07 — Capability Resolution
* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework
* Blueprint 10 — Knowledge Engine
* Blueprint 11 — Memory Engine
* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform
* Blueprint 31 — Platform Governance

---

# Related ADRs

* ADR-001 — Architecture Before Implementation
* ADR-005 — Composition Owns Instantiation
* ADR-006 — Runtime Owns Operational Execution
* ADR-007 — Capability Resolution Owns Selection
* ADR-008 — Security Owns Authorization

---

# Final Statement

**Every architectural concern within AgentForge has exactly one authoritative owner.**

Frameworks collaborate through well-defined public contracts, but ownership remains explicit, exclusive, and governed by the approved architecture.

No framework may silently assume, duplicate, or redefine responsibilities that belong to another architectural layer.

ADR-002 Constitutional Rule: Every architectural concern has exactly one authoritative owner.
