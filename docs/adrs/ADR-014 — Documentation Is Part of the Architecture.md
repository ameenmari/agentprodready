# ADR-014 — Documentation Is Part of the Architecture

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge is intended to be a long-lived engineering platform that evolves through multiple implementations, providers, contributors, and architectural revisions.

Architecture that exists only in source code becomes difficult to understand, review, govern, and evolve over time.

To preserve architectural intent, documentation must evolve together with the platform.

---

# Decision

Architecture documentation is a first-class engineering artifact.

Engineering Blueprints, ADRs, implementation guides, engineering standards, and related documentation collectively define the architectural intent of the platform.

Implementation and documentation shall remain synchronized.

Changes affecting architectural behavior, ownership, public contracts, dependency direction, or platform governance must be reflected in the corresponding architectural documentation.

---

# Rationale

Maintaining architecture as documentation provides:

* Long-term maintainability.
* Consistent engineering practices.
* Easier onboarding.
* Architectural traceability.
* Better governance.
* Reduced implementation ambiguity.
* Reliable future evolution.

Documentation is therefore considered part of the platform rather than supplementary material.

---

# Architectural Rule

Architecture documentation is part of the platform.

Implementation must remain consistent with approved architectural documentation, and documentation must evolve alongside architectural changes.

---

# Consequences

The following practices are required:

* Engineering Blueprints remain the primary architectural reference.
* ADRs document significant architectural decisions.
* Documentation is updated when architecture changes.
* Architectural reviews verify both implementation and documentation.

The following practices are prohibited:

* Allowing source code to become the only architectural reference.
* Introducing architectural changes without updating documentation.
* Treating documentation as optional after implementation.

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 31 — Platform Governance

---

# Related ADRs

* ADR-001 — Architecture Before Implementation
* ADR-002 — Explicit Ownership
* ADR-015 — Tests Verify Architectural Contracts

---

# Constitutional Rule

> **Architecture documentation is part of the platform.**
>
> Approved architectural documentation and implementation must remain synchronized throughout the lifetime of AgentForge.

---

# Final Statement

Architecture is preserved through both implementation and documentation.

Maintaining accurate architectural documentation ensures that AgentForge remains understandable, governable, and evolvable long after individual implementations have changed.
