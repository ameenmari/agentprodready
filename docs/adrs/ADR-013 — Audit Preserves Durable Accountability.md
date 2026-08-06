# ADR-013 — Audit Preserves Durable Accountability

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge performs numerous operations that may have legal, regulatory, security, governance, or operational significance.

These operations include authorization decisions, administrative actions, configuration changes, workflow execution, provider interactions, data access, evidence generation, exports, and other platform activities.

While logs, metrics, traces, and events provide valuable operational insight, they do not constitute durable historical accountability.

The platform therefore requires a dedicated architectural responsibility for preserving authoritative audit history.

---

# Decision

The Audit Platform exclusively owns durable accountability.

The Audit Platform records and preserves audit-relevant historical facts in a durable, queryable, and governed manner.

The Audit Platform consumes historical information but does not authorize, execute, transport, or reinterpret the operations that produced those facts.

Audit records remain historically accurate and governed according to platform retention, legal, and compliance policies.

---

# Rationale

Separating audit from other platform concerns provides:

* Reliable historical accountability.
* Long-term traceability.
* Regulatory compliance.
* Security investigation support.
* Evidence preservation.
* Independent governance.
* Consistent audit semantics.

This separation prevents operational tooling from becoming the authoritative source of historical truth.

---

# Architectural Rule

The Audit Platform preserves durable accountability.

It records authoritative historical facts but does not own execution, authorization, event transport, business operations, or operational observability.

Historical accountability remains distinct from operational telemetry.

---

# Consequences

The following practices are required:

* Audit records must be durably preserved.
* Audit history remains queryable.
* Audit records follow platform governance policies.
* Audit exports remain governed.
* Audit access remains subject to authorization.
* Audit records remain immutable after creation.

The following practices are prohibited:

* Using application logs as audit history.
* Treating Event Bus history as the authoritative audit repository.
* Reconstructing audit history from metrics or traces.
* Rewriting audit records after creation.
* Allowing provider-specific storage semantics to define audit behavior.

---

# Examples

Architectural separation:

| Responsibility         | Owner                  |
| ---------------------- | ---------------------- |
| Business Operation     | Owning Framework       |
| Authorization Decision | Security Platform      |
| Event Transport        | Event Bus              |
| Operational Telemetry  | Observability Platform |
| Durable Accountability | Audit Platform         |

Conceptually:

```text id="auditflow"
Platform Operation
        │
        ▼
Historical Fact
        │
        ├────────────► Event Bus
        │
        ├────────────► Observability
        │
        └────────────► Audit Platform
                           │
                           ▼
                  Durable Audit Record
```

Each component serves a distinct architectural purpose.

---

# Related Blueprints

* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform
* Blueprint 22 — Observability

---

# Related ADRs

* ADR-008 — Security Owns Authorization
* ADR-009 — Historical Facts Are Immutable
* ADR-010 — Events Represent Facts, Not Commands
* ADR-011 — Normalize at Architectural Boundaries

---

# Constitutional Rule

> **The Audit Platform exclusively preserves durable accountability.**
>
> Audit records represent governed historical accountability and must remain distinct from logs, metrics, traces, events, and operational telemetry.

---

# Final Statement

The Audit Platform serves as AgentForge's authoritative historical accountability system.

By separating durable audit history from execution, event transport, observability, and business operations, the platform preserves trustworthy historical records while allowing each architectural framework to remain focused on its own responsibility.
