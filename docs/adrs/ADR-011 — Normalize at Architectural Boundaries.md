# ADR-011 — Normalize at Architectural Boundaries

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady integrates with a wide variety of external technologies, including AI providers, databases, message brokers, vector stores, identity systems, storage providers, and third-party APIs.

Each technology exposes its own requests, responses, errors, metadata, authentication mechanisms, and protocols.

If these provider-specific representations propagate throughout the platform, architectural frameworks become tightly coupled to implementation details, reducing replaceability and increasing maintenance complexity.

The platform therefore requires a consistent normalization strategy at every architectural boundary.

---

# Decision

Every architectural boundary interacting with external technologies shall normalize provider-specific representations into platform-defined contracts.

Normalization applies to:

* Requests
* Responses
* Errors
* Metadata
* Identifiers
* Status information

Provider-specific representations must remain encapsulated within the framework responsible for that integration.

Higher architectural layers interact only with normalized platform contracts.

---

# Rationale

Boundary normalization provides:

* Technology independence.
* Stable public contracts.
* Simplified provider replacement.
* Consistent platform behavior.
* Reduced architectural coupling.
* Improved testing.
* Easier long-term maintenance.

This approach allows AgentProdReady to evolve independently of external technologies while presenting a consistent programming model throughout the platform.

---

# Architectural Rule

Architectural boundaries normalize external representations into platform-defined contracts.

Provider-specific types, protocols, and behaviors must never propagate beyond their owning framework.

Normalization is mandatory whenever information crosses an architectural boundary.

---

# Consequences

The following practices are required:

* Requests are translated into provider-specific formats at the boundary.
* Responses are translated into normalized platform results.
* Provider-specific exceptions become normalized platform errors.
* Provider metadata is mapped into platform-defined metadata where required.
* Public contracts remain stable regardless of implementation technology.

The following practices are prohibited:

* Returning provider SDK objects through public contracts.
* Exposing provider-specific error types.
* Leaking transport protocols outside provider boundaries.
* Coupling business logic to vendor-specific APIs.
* Allowing implementation details to become architectural contracts.

---

# Examples

Examples of normalization:

| External Representation | Normalized Platform Contract |
| ----------------------- | ---------------------------- |
| OpenAI Response         | AI Result                    |
| Anthropic Response      | AI Result                    |
| PostgreSQL Error        | Storage Error                |
| Kafka Delivery Failure  | Event Bus Error              |
| REST API Response       | Tool Result                  |
| Vector Database Search  | Knowledge Retrieval Result   |

Conceptually:

```text id="boundaryflow"
External Technology
        │
        ▼
Owning Framework
        │
        ▼
Normalization
        │
        ▼
Platform Contract
        │
        ▼
Rest of AgentProdReady
```

---

# Related Blueprints

* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework
* Blueprint 10 — Knowledge Engine
* Blueprint 11 — Memory Engine
* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform

---

# Related ADRs

* ADR-003 — Public Contracts Before Implementations
* ADR-004 — Provider Independence
* ADR-010 — Events Represent Facts, Not Commands

---

# Constitutional Rule

> **Every architectural boundary must normalize external representations into platform-defined contracts.**
>
> Provider-specific requests, responses, errors, metadata, and protocols must remain encapsulated within their owning framework and must never leak into the rest of the platform.

---

# Final Statement

Normalization at architectural boundaries preserves the technology independence of AgentProdReady.

By isolating provider-specific behavior within dedicated frameworks and exposing only stable platform contracts, the platform remains modular, replaceable, and resilient to technological change while presenting a consistent architectural model to every framework.
