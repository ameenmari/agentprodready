# ADR-005 — Composition Owns Instantiation

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge is designed as a modular platform composed of interchangeable implementations, providers, plugins, and framework components.

As the platform grows, implementations may vary based on configuration, capabilities, deployment environment, licensing, or future extensibility requirements.

Without a single authority responsible for object creation, frameworks may begin constructing their own dependencies, resulting in hidden coupling, inconsistent lifecycles, duplicated initialization logic, and reduced replaceability.

The platform therefore requires a centralized responsibility for implementation instantiation.

---

# Decision

The Composition Framework shall exclusively own the instantiation and lifecycle management of platform implementations.

Architectural frameworks request dependencies through public contracts.

They must never directly instantiate concrete implementations.

The Composition Framework creates implementations after Capability Resolution has selected the appropriate implementation for the requested capability.

---

# Rationale

Centralizing instantiation provides:

* Consistent dependency management.
* Provider replaceability.
* Simplified testing through dependency substitution.
* Centralized lifecycle management.
* Reduced coupling between frameworks.
* Improved extensibility.

This separation allows frameworks to remain focused on their own architectural responsibilities while treating implementation creation as an infrastructure concern.

---

# Architectural Rule

Implementation instantiation belongs exclusively to the Composition Framework.

Frameworks request dependencies through public contracts and consume the resulting implementations without knowledge of how they were created.

Capability Resolution determines **what** implementation should be used.

Composition determines **how** that implementation is created and managed.

---

# Consequences

The following practices are required:

* All framework dependencies must be resolved through the Composition Framework.
* Constructors should receive abstractions rather than concrete implementations.
* Lifecycle management must remain centralized.
* Dependency injection should be used consistently across the platform.
* Implementations should remain replaceable without modifying consumers.

The following practices are prohibited:

* Direct instantiation using `new` outside approved composition boundaries.
* Frameworks creating their own providers or dependencies.
* Hidden service locators or global dependency access.
* Business logic performing dependency construction.

---

# Examples

Examples of proper responsibility separation:

| Responsibility                   | Owner                 |
| -------------------------------- | --------------------- |
| Select appropriate AI provider   | Capability Resolution |
| Instantiate selected AI provider | Composition Framework |
| Execute AI request               | AI Provider Framework |
| Select tool implementation       | Capability Resolution |
| Instantiate selected tool        | Composition Framework |
| Invoke external tool             | Tool Framework        |

Conceptually:

```text id="compositionflow"
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
Consuming Framework
```

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 03 — Dependency Injection & Composition
* Blueprint 07 — Capability Resolution
* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework

---

# Related ADRs

* ADR-002 — Explicit Ownership
* ADR-003 — Public Contracts Before Implementations
* ADR-006 — Runtime Owns Operational Execution
* ADR-007 — Capability Resolution Owns Selection

---

# Constitutional Rule

> **The Composition Framework exclusively owns implementation instantiation and lifecycle management.**
>
> Frameworks consume implementations through public contracts but must never directly construct concrete implementations.

---

# Final Statement

Separating implementation instantiation from implementation selection and execution preserves the modular architecture of AgentForge.

Capability Resolution determines the appropriate implementation, the Composition Framework creates and manages it, and architectural frameworks focus solely on their own responsibilities. This separation maintains replaceability, simplifies testing, and prevents hidden coupling throughout the platform.
