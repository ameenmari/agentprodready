# ADR-003 — Public Contracts Before Implementations

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady is designed as a provider-independent, modular platform where architectural frameworks collaborate through well-defined contracts rather than concrete implementations.

Without stable public contracts, implementations become tightly coupled, providers become difficult to replace, and architectural boundaries gradually erode.

The platform therefore requires a consistent approach where contracts define the architecture, and implementations realize those contracts.

---

# Decision

Every architectural framework shall define its public contracts before implementation begins.

Public contracts define the responsibilities, inputs, outputs, behaviors, and interactions of a framework.

Implementations must conform to these contracts and must not redefine or extend architectural behavior outside the approved contract.

Provider-specific details remain internal to the implementing component.

---

# Rationale

Defining public contracts first provides several long-term benefits:

* Stable architectural boundaries.
* Independent provider implementations.
* Easier testing through contract verification.
* Reduced implementation coupling.
* Improved maintainability.
* Clear framework collaboration.

By separating contracts from implementations, AgentProdReady remains adaptable to new providers and technologies without changing its architectural foundation.

---

# Architectural Rule

Public contracts define the platform.

Implementations realize those contracts.

Implementations must not redefine architectural behavior, ownership boundaries, dependency direction, or public interfaces without approved architectural governance.

---

# Consequences

The following practices are required:

* Every framework must expose explicit public contracts.
* Consumers depend on contracts rather than concrete implementations.
* Provider implementations remain replaceable.
* Contract changes require architectural review.
* Contract tests verify expected behavior independently of implementation.

The following practices are prohibited:

* Consumers depending directly on implementation classes.
* Exposing provider-specific types through public contracts.
* Allowing implementations to become the architectural source of truth.
* Modifying public contracts through implementation convenience.

---

# Examples

Examples of public contracts include:

| Framework             | Public Contract                    |
| --------------------- | ---------------------------------- |
| Runtime               | IRuntime                           |
| AI Provider Framework | IAIProvider                        |
| Tool Framework        | IToolProvider                      |
| Knowledge Engine      | IKnowledgeProvider                 |
| Memory Engine         | IMemoryProvider                    |
| Event Bus             | IEventPublisher / IEventSubscriber |
| Audit Platform        | IAuditProvider                     |
| Security Platform     | IAuthorizationProvider             |

Concrete implementations remain internal and replaceable.

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 03 — Dependency Injection & Composition
* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework
* Blueprint 10 — Knowledge Engine
* Blueprint 11 — Memory Engine
* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform

---

# Related ADRs

* ADR-001 — Architecture Before Implementation
* ADR-002 — Explicit Ownership
* ADR-004 — Provider Independence
* ADR-005 — Composition Owns Instantiation
* ADR-015 — Tests Verify Architectural Contracts

---

# Constitutional Rule

> **Public contracts define the AgentProdReady platform.**
>
> Implementations realize those contracts but must never redefine architectural behavior, ownership, or public interfaces outside the approved governance process.

---

# Final Statement

Public contracts are the architectural foundation upon which all implementations are built.

By defining stable contracts before implementation, AgentProdReady ensures that frameworks remain independently evolvable, provider implementations remain replaceable, and architectural boundaries remain consistent regardless of the underlying technologies used to realize the platform.
