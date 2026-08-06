# ADR-008 — Security Owns Authorization

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge coordinates numerous architectural frameworks that process protected operations, including workflow execution, AI interactions, tool invocation, memory retrieval, knowledge retrieval, event publication, audit access, and administrative operations.

Many of these frameworks require authorization before performing work.

Without a centralized authorization authority, frameworks could begin making independent permission decisions, resulting in inconsistent security behavior, duplicated authorization logic, privilege escalation risks, and fragmented governance.

The platform therefore requires a single authority responsible for authorization decisions.

---

# Decision

The Security Platform exclusively owns authorization decisions.

Architectural frameworks must request authorization through the Security Platform and consume the resulting authorization outcome.

Frameworks may enforce the supplied authorization outcome but must never independently grant, broaden, reinterpret, or override permissions.

Authentication integrations establish identity and supply normalized authentication evidence through Security-owned integration contracts; they do not independently authorize. Authorization and permission evaluation remain centralized within the Security Platform.

---

# Rationale

Centralizing authorization provides:

* Consistent security enforcement.
* Unified access control policies.
* Reduced duplication.
* Improved auditability.
* Simplified governance.
* Clear separation of security responsibilities.
* Reduced risk of privilege escalation.

This approach allows architectural frameworks to focus on their domain responsibilities while relying on a single authoritative security model.

---

# Architectural Rule

Authorization decisions belong exclusively to the Security Platform.

Other frameworks consume and enforce authorization outcomes but must never independently determine whether an operation is permitted.

Possession of credentials does not imply authorization.

---

# Consequences

The following practices are required:

* All protected operations must obtain authorization through the Security Platform.
* Authorization outcomes should be propagated through normalized platform contracts.
* Frameworks enforce the supplied authorization outcome without modification.
* Authorization decisions remain auditable.
* Security policies remain centralized.

The following practices are prohibited:

* Framework-specific authorization logic.
* Provider implementations granting permissions.
* Tool adapters interpreting authorization independently.
* AI providers making authorization decisions.
* Business logic bypassing the Security Platform.

---

# Examples

Examples of authorization ownership:

| Operation                | Authorization Decision |
| ------------------------ | ---------------------- |
| AI Request               | Security Platform      |
| Tool Invocation          | Security Platform      |
| Memory Retrieval         | Security Platform      |
| Knowledge Retrieval      | Security Platform      |
| Event Subscription       | Security Platform      |
| Audit Query              | Security Platform      |
| Administrative Operation | Security Platform      |

Architectural separation:

| Responsibility            | Owner               |
| ------------------------- | ------------------- |
| Authentication            | Security Platform   |
| Authorization             | Security Platform   |
| Authorization Enforcement | Consuming Framework |
| Business Operation        | Owning Framework    |

Conceptually:

```text id="securityflow"
Protected Operation
        │
        ▼
Security Platform
        │
        ▼
Authorization Decision
        │
        ▼
Authorization Outcome
        │
        ▼
Consuming Framework
        │
        ▼
Authorized Operation
```

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

* ADR-002 — Explicit Ownership
* ADR-006 — Runtime Owns Operational Execution
* ADR-011 — Normalize at Architectural Boundaries
* ADR-013 — Audit Preserves Accountability

---

# Constitutional Rule

> **The Security Platform exclusively owns authorization decisions.**
>
> Architectural frameworks enforce authorization outcomes but must never independently grant, reinterpret, broaden, or override permissions.

---

# Final Statement

Security within AgentForge is governed through a single authoritative authorization model.

By separating authorization decisions from business execution, the platform maintains consistent access control, simplifies governance, strengthens auditability, and prevents individual frameworks from introducing conflicting or unauthorized security behavior.
