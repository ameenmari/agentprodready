# ADR-001 — Architecture Before Implementation

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady is intended to be a long-lived, provider-independent AI platform composed of independently evolving architectural frameworks.

Without a clear architectural foundation, implementation decisions can gradually redefine platform behavior, introduce inconsistent ownership, and create tight coupling between components.

The platform therefore requires a governing principle that architecture is the primary source of truth.

---

# Decision

The AgentProdReady architecture shall be defined before implementation begins.

Engineering Blueprints establish the constitutional responsibilities, ownership boundaries, public contracts, and dependency relationships of the platform.

Implementations realize the architecture.

They do not define or modify it.

Architectural changes must be introduced through approved governance processes rather than implementation convenience.

---

# Rationale

Establishing the architecture before implementation provides several long-term benefits:

* Consistent ownership across the platform.
* Stable public contracts.
* Provider independence.
* Reduced architectural drift.
* Easier maintenance and evolution.
* Predictable implementation across multiple contributors.

This approach allows implementation technologies to evolve without changing the platform's architectural intent.

---

# Architectural Rule

**Architecture is the authoritative source of truth.**

Implementation must faithfully realize the approved architecture.

Implementation must not introduce new architectural responsibilities, ownership boundaries, dependency directions, or public contracts without an approved architectural review.

---

# Consequences

The following practices are required:

* Every major platform capability must originate from an approved Engineering Blueprint.
* Significant architectural changes require an Architectural Decision Record (ADR).
* Implementation should follow the approved blueprint implementation process.
* Existing source code does not override approved architecture.
* Documentation and implementation should remain synchronized.

The following practices are prohibited:

* Allowing implementation convenience to redefine architectural ownership.
* Introducing undocumented architectural concepts through source code.
* Modifying public contracts without governance.
* Creating framework responsibilities that conflict with approved blueprints.

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 31 — Platform Governance

---

# Related ADRs

* ADR-002 — Explicit Ownership
* ADR-003 — Public Contracts Before Implementations
* ADR-014 — Documentation Is Part of the Architecture

---

# Final Statement

**AgentProdReady is an architecture-driven platform.**

The architecture defines the platform.

Engineering Blueprints specify the architecture.

Implementations realize that architecture.

When implementation and architecture differ, the architecture takes precedence until an approved governance process determines otherwise.

ADR-001 Constitutional Rule: Architecture defines the platform; implementation realizes it.
