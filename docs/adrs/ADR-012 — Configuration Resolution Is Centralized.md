# ADR-012 — Configuration Resolution Is Centralized

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady is a configurable platform supporting multiple providers, deployment environments, execution policies, feature flags, security settings, runtime options, and operational parameters.

Without centralized configuration management, architectural frameworks may independently load environment variables, parse configuration files, or maintain their own configuration state, resulting in inconsistent behavior, duplicated logic, configuration drift, and reduced observability.

The platform therefore requires a single architectural responsibility for configuration resolution.

---

# Decision

Configuration resolution shall be centralized within the Configuration Framework.

Architectural frameworks consume normalized configuration through public contracts.

Frameworks must never independently load configuration from environment variables, files, external services, or provider-specific configuration sources.

The Configuration Framework owns:

* Configuration loading
* Configuration validation
* Configuration normalization
* Configuration resolution
* Configuration lifecycle

Frameworks consume resolved configuration but do not determine how it is obtained.

---

# Rationale

Centralized configuration provides:

* Consistent platform behavior.
* Unified validation.
* Simplified deployment.
* Reduced duplication.
* Easier testing.
* Improved observability.
* Provider independence.

Separating configuration resolution from configuration consumption prevents frameworks from becoming coupled to deployment environments or infrastructure concerns.

---

# Architectural Rule

Configuration is resolved centrally.

Frameworks consume resolved configuration through normalized platform contracts but must never independently resolve, validate, or load configuration.

---

# Consequences

The following practices are required:

* Configuration is resolved before framework consumption.
* Configuration validation occurs centrally.
* Frameworks depend on normalized configuration contracts.
* Configuration sources remain replaceable.
* Configuration changes remain observable and auditable where appropriate.

The following practices are prohibited:

* Reading environment variables directly within framework logic.
* Parsing configuration files inside framework implementations.
* Provider-specific configuration loading outside provider boundaries.
* Independent configuration caches maintained by frameworks.
* Business logic performing configuration resolution.

---

# Examples

Examples of centralized configuration:

| Configuration               | Owner                   |
| --------------------------- | ----------------------- |
| Runtime Settings            | Configuration Framework |
| AI Provider Selection       | Configuration Framework |
| Tool Provider Configuration | Configuration Framework |
| Database Configuration      | Configuration Framework |
| Security Policies           | Configuration Framework |
| Event Bus Configuration     | Configuration Framework |
| Audit Storage Configuration | Configuration Framework |

Architectural separation:

| Responsibility            | Owner                   |
| ------------------------- | ----------------------- |
| Configuration Loading     | Configuration Framework |
| Configuration Validation  | Configuration Framework |
| Configuration Resolution  | Configuration Framework |
| Configuration Consumption | Owning Framework        |

Conceptually:

```text id="configurationflow"
Configuration Sources
        │
        ▼
Configuration Framework
        │
        ▼
Resolved Configuration
        │
        ▼
Architectural Frameworks
```

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 23 — Configuration & Policy Framework
* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework
* Blueprint 10 — Knowledge Engine
* Blueprint 11 — Memory Engine
* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform

---

# Related ADRs

* ADR-002 — Explicit Ownership
* ADR-003 — Public Contracts Before Implementations
* ADR-004 — Provider Independence
* ADR-011 — Normalize at Architectural Boundaries

---

# Constitutional Rule

> **Configuration resolution is centralized.**
>
> Architectural frameworks consume normalized configuration but must never independently resolve, validate, or load configuration from external sources.

---

# Final Statement

Configuration is an infrastructure concern, not a framework responsibility.

By centralizing configuration resolution, AgentProdReady ensures consistent behavior across all architectural frameworks while maintaining provider independence, deployment flexibility, and a single authoritative source for platform configuration.
