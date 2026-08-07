# ADR-015 — Tests Verify Architectural Contracts

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady is built around stable architectural contracts that separate frameworks, providers, and implementations.

Testing implementation details alone does not guarantee architectural correctness.

The platform therefore requires testing to verify that implementations satisfy the architectural contracts established by the Engineering Blueprints.

---

# Decision

Testing within AgentProdReady shall primarily verify architectural contracts and observable behavior rather than internal implementation details.

Public contracts, ownership boundaries, normalized interfaces, and framework interactions should be validated through appropriate testing.

Internal implementations may evolve provided their contractual behavior remains unchanged.

---

# Rationale

Testing architectural contracts provides:

* Stable implementations
* Safer refactoring
* Provider replaceability
* Reduced coupling
* Long-term maintainability
* Reliable platform evolution

This approach allows implementation details to change without breaking the architectural guarantees relied upon by other frameworks.

---

# Architectural Rule

Tests verify architectural contracts.

Implementations may evolve, but observable behavior defined by approved public contracts must remain correct and verifiable.

---

# Consequences

The following practices are required:

* Public contracts must be covered by tests.
* Provider implementations must satisfy the same contract tests.
* Contract tests must remain implementation-independent.
* Integration tests must verify framework collaboration.
* Automated tests must detect architectural regressions.
* Acceptance criteria must map to verifiable tests or documented checks.

The following practices are prohibited:

* Coupling tests to private implementation details.
* Treating one provider implementation as the platform contract.
* Encoding undocumented implementation behavior as an architectural guarantee.
* Changing public contracts without updating their contract tests.
* Marking a blueprint complete while required contract behavior remains unverified.

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform
* Blueprint 30 — Testing & Verification Framework

---

# Related ADRs

* ADR-003 — Public Contracts Before Implementations
* ADR-004 — Provider Independence
* ADR-011 — Normalize at Architectural Boundaries
* ADR-014 — Documentation Is Part of the Architecture

---

# Constitutional Rule

> **Tests verify architectural contracts, not implementation details.**
>
> Public contracts define expected behavior, and every implementation must demonstrate compliance through repeatable, implementation-independent tests.

---

# Final Statement

Testing is the mechanism through which AgentProdReady proves its architectural promises.

By focusing on public contracts and observable behavior, the platform supports safe refactoring, provider replacement, and long-term evolution without weakening the guarantees established by its blueprints and ADRs.
