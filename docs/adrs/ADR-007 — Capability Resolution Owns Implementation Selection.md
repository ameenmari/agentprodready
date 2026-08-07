# ADR-007 — Capability Resolution Owns Implementation Selection

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady supports multiple interchangeable implementations for the same architectural capability.

Examples include AI providers, tool providers, knowledge providers, memory providers, storage providers, and future plugin implementations.

Without a centralized mechanism for implementation selection, architectural frameworks may begin selecting providers independently, leading to inconsistent behavior, duplicated selection logic, fragmented configuration, and reduced replaceability.

The platform therefore requires a single authority responsible for determining which implementation satisfies a requested capability.

---

# Decision

Capability Resolution exclusively owns implementation selection.

When a framework requests a capability, the Capability Resolution Framework determines the appropriate implementation according to platform configuration, policies, availability, and capability metadata.

Capability Resolution selects the implementation.

It does not instantiate or execute it.

Instantiation remains the responsibility of the Composition Framework.

Execution remains the responsibility of the Runtime.

---

# Rationale

Centralizing implementation selection provides:

* Consistent provider selection.
* Reduced duplication.
* Centralized policy enforcement.
* Improved extensibility.
* Simplified testing.
* Technology independence.
* Predictable platform behavior.

This separation ensures that selection, instantiation, and execution remain distinct architectural concerns.

---

# Architectural Rule

Capability Resolution determines **which implementation** satisfies a requested capability.

It does not create implementations.

It does not execute implementations.

Implementation selection, instantiation, and execution are independent architectural responsibilities.

---

# Consequences

The following practices are required:

* All capability selection must occur through the Capability Resolution Framework.
* Frameworks request capabilities rather than concrete implementations.
* Selection policies remain centralized.
* Capability metadata may influence selection decisions.
* Selected implementations remain replaceable.

The following practices are prohibited:

* Frameworks selecting providers directly.
* Business logic bypassing Capability Resolution.
* Provider implementations selecting alternative providers.
* Runtime determining implementation selection.
* Composition making selection decisions.

---

# Examples

Examples of capability selection:

| Capability               | Selected By           |
| ------------------------ | --------------------- |
| AI Provider              | Capability Resolution |
| Tool Provider            | Capability Resolution |
| Memory Provider          | Capability Resolution |
| Knowledge Provider       | Capability Resolution |
| Event Transport Provider | Capability Resolution |
| Audit Storage Provider   | Capability Resolution |

Architectural separation:

| Responsibility               | Owner                 |
| ---------------------------- | --------------------- |
| Implementation Selection     | Capability Resolution |
| Implementation Instantiation | Composition Framework |
| Operational Execution        | Runtime               |

Conceptually:

```text id="capabilityflow"
Capability Request
        │
        ▼
Capability Resolution
        │
        ▼
Selected Implementation
        │
        ▼
Composition Framework
        │
        ▼
Instantiated Component
        │
        ▼
Runtime
        │
        ▼
Execution
```

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

---

# Related ADRs

* ADR-002 — Explicit Ownership
* ADR-004 — Provider Independence
* ADR-005 — Composition Owns Instantiation
* ADR-006 — Runtime Owns Operational Execution

---

# Constitutional Rule

> **Capability Resolution exclusively owns implementation selection.**
>
> It determines which implementation satisfies a requested capability but must never instantiate or execute that implementation.

---

# Final Statement

Implementation selection is a distinct architectural responsibility within AgentProdReady.

By separating selection from instantiation and execution, the platform maintains clear ownership boundaries, centralized decision-making, and provider independence. Capability Resolution determines **what** should be used, the Composition Framework creates it, and the Runtime governs its execution.
