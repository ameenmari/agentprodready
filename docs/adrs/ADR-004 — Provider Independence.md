# ADR-004 — Provider Independence

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge integrates with numerous external technologies, including AI providers, databases, vector stores, messaging systems, identity providers, storage systems, and external tools.

These technologies will evolve over time. New providers will emerge, existing providers may become obsolete, and deployment environments may require different implementations.

If business logic or architectural frameworks depend directly on provider-specific technologies, replacing those providers becomes costly and risks introducing architectural coupling throughout the platform.

AgentForge therefore requires provider independence as a core architectural principle.

---

# Decision

All integrations with external technologies shall occur through provider abstractions defined by the platform.

Architectural frameworks depend only on normalized public contracts.

Provider-specific SDKs, APIs, protocols, data models, configuration, and transport mechanisms remain encapsulated within provider implementations.

No framework outside the provider boundary may directly depend upon provider-specific behavior.

---

# Rationale

Provider independence provides:

* Technology replaceability.
* Vendor neutrality.
* Reduced architectural coupling.
* Simplified testing.
* Consistent platform behavior.
* Long-term maintainability.
* Easier adoption of future technologies.

This approach allows AgentForge to evolve independently of the technologies used to implement its capabilities.

---

# Architectural Rule

External technologies are implementation details.

Architectural frameworks collaborate exclusively through platform-defined public contracts.

Provider implementations adapt external technologies to those contracts without exposing provider-specific behavior to the rest of the platform.

---

# Consequences

The following practices are required:

* Every external technology must be accessed through a provider abstraction.
* Provider implementations must normalize requests, responses, errors, and metadata.
* Frameworks consume only normalized platform contracts.
* Multiple provider implementations may coexist for the same capability.
* Providers should be replaceable without modifying business or domain logic.

The following practices are prohibited:

* Importing provider SDKs outside provider implementations.
* Returning provider-specific objects through public contracts.
* Embedding provider-specific business logic within architectural frameworks.
* Making architectural decisions based on provider capabilities.

---

# Examples

Examples of provider independence include:

| Capability        | Provider Examples          |
| ----------------- | -------------------------- |
| AI Models         | OpenAI, Anthropic, Ollama  |
| Vector Storage    | Pinecone, Qdrant, pgvector |
| Databases         | PostgreSQL, MongoDB        |
| Object Storage    | S3, Azure Blob Storage     |
| Event Transport   | Kafka, RabbitMQ, NATS      |
| Identity          | Auth0, Keycloak, Azure AD  |
| Email             | SendGrid, SES, SMTP        |
| Tool Integrations | GitHub, Slack, Jira        |

Each provider implements the same normalized platform contract while hiding technology-specific implementation details.

---

# Related Blueprints

* Blueprint 01 — Foundation
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
* ADR-003 — Public Contracts Before Implementations
* ADR-011 — Normalize at Architectural Boundaries

---

# Constitutional Rule

> **External technologies are replaceable implementation details.**
>
> AgentForge architectural frameworks depend only on normalized public contracts, while provider implementations encapsulate all technology-specific behavior.

---

# Final Statement

Provider independence ensures that AgentForge evolves according to its own architecture rather than the capabilities or limitations of any particular vendor or technology.

By isolating provider-specific concerns behind stable public contracts, the platform remains portable, maintainable, and adaptable to future technological change without compromising its architectural integrity.
