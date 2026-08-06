# ADR-006 — Runtime Owns Operational Execution

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge consists of multiple architectural frameworks that define platform behavior, including AI Providers, Tool Framework, Memory Engine, Knowledge Engine, Event Bus, Audit Platform, Security Platform, and others.

Many of these frameworks perform operations that may require retry, timeout, cancellation, scheduling, concurrency management, recovery, or resource coordination.

If each framework independently implements these operational concerns, the platform will develop inconsistent execution behavior, conflicting retry policies, duplicated scheduling logic, fragmented execution state, and unpredictable runtime behavior.

The platform therefore requires a single authority responsible for operational execution.

---

# Decision

The Runtime exclusively owns operational execution throughout the platform.

Operational execution includes:

* Scheduling
* Retry
* Timeout
* Cancellation
* Recovery
* Concurrency coordination
* Resource coordination
* Execution lifecycle management

Other architectural frameworks define execution semantics and submit work to the Runtime but must never independently coordinate operational execution.

---

# Rationale

Centralizing operational execution provides:

* Consistent execution behavior.
* Unified retry and timeout policies.
* Predictable cancellation semantics.
* Centralized resource management.
* Simplified observability.
* Reduced architectural duplication.
* Clear ownership boundaries.

This separation allows frameworks to focus on their domain responsibilities while the Runtime consistently manages execution across the platform.

---

# Architectural Rule

Operational execution belongs exclusively to the Runtime.

Architectural frameworks define **what** should happen.

The Runtime determines **when**, **how**, and **under which operational policies** that work is executed.

No framework may independently schedule, retry, timeout, cancel, recover, or coordinate execution outside the Runtime.

---

# Consequences

The following practices are required:

* All operational execution must occur under Runtime coordination.
* Frameworks should submit work rather than execute operational policies themselves.
* Retry, timeout, cancellation, and recovery policies must remain centralized.
* Execution state belongs to the Runtime.
* ExecutionContext is created only by the ExecutionContextFactory and is Runtime-owned after creation.
* Runtime manages the ExecutionContext lifecycle without mutating its immutable contract.
* Mutable execution progress is held in dedicated Runtime execution-state structures.

The following practices are prohibited:

* Provider-managed retry policies that conflict with Runtime policies.
* Framework-specific scheduling mechanisms.
* Independent timeout implementations.
* Hidden execution coordination.
* Multiple execution lifecycle managers.
* Competing ExecutionContext construction by Runtime components or other frameworks.

---

# Examples

Examples of Runtime ownership:

| Operational Concern   | Owner   |
| --------------------- | ------- |
| Retry                 | Runtime |
| Timeout               | Runtime |
| Cancellation          | Runtime |
| Scheduling            | Runtime |
| Recovery              | Runtime |
| Resource Coordination | Runtime |
| Concurrency           | Runtime |

Examples of framework responsibilities:

| Framework             | Defines                             |
| --------------------- | ----------------------------------- |
| AI Provider Framework | AI execution semantics              |
| Tool Framework        | External tool interaction semantics |
| Memory Engine         | Memory lifecycle semantics          |
| Event Bus             | Event transport semantics           |
| Audit Platform        | Audit persistence semantics         |

Conceptually:

```text id="runtimeflow"
Framework
      │
      │ Defines work
      ▼
Runtime
      │
      │ Applies execution policies
      ▼
Execution
      │
      ▼
Result
```

---

# Related Blueprints

* Blueprint 01 — Foundation
* Blueprint 04 — Runtime
* Blueprint 08 — AI Provider Framework
* Blueprint 09 — Tool Framework
* Blueprint 11 — Memory Engine
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform

---

# Related ADRs

* ADR-002 — Explicit Ownership
* ADR-005 — Composition Owns Instantiation
* ADR-007 — Capability Resolution Owns Selection
* ADR-008 — Security Owns Authorization

---

# Constitutional Rule

> **The Runtime exclusively owns operational execution.**
>
> Frameworks define execution semantics, but all scheduling, retry, timeout, cancellation, recovery, concurrency, and execution lifecycle management remain the sole responsibility of the Runtime.

---

# Final Statement

Operational consistency is fundamental to AgentForge's architecture.

By centralizing execution within the Runtime, every framework behaves predictably, shares the same operational policies, and remains focused on its own architectural responsibility. This separation prevents fragmented execution models, eliminates conflicting operational behavior, and establishes a single, authoritative execution model for the entire platform.
