# ADR-010 — Events Represent Facts, Not Commands

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentProdReady uses Platform Events to communicate significant occurrences between architectural components.

Without a clear definition of what an event represents, events can gradually become requests, commands, workflow instructions, or tightly coupled remote procedure calls. This blurs architectural boundaries, introduces hidden dependencies, and weakens the Event Bus as a transport mechanism.

The platform therefore requires a consistent definition of Platform Events.

---

# Decision

Platform Events represent facts that have already occurred.

They communicate completed historical occurrences within the platform.

Events may inform other components that something happened, but they must never instruct another component to perform work.

Subscribers determine their own behavior after observing an event.

Publishing an event does not imply that any particular subscriber exists or that any subscriber must perform a specific action.

---

# Rationale

Treating events as historical facts provides:

* Loose coupling between components.
* Independent subscriber evolution.
* Reliable event replay.
* Improved auditability.
* Deterministic event history.
* Technology-independent messaging.

This approach separates historical communication from execution orchestration and preserves the independence of event producers and subscribers.

---

# Architectural Rule

Platform Events communicate completed facts.

They do not represent commands, requests, workflow instructions, or mandatory execution behavior.

Subscribers own their own processing decisions after receiving an event.

---

# Consequences

The following practices are required:

* Events describe completed platform occurrences.
* Event names should use past-tense language.
* Events remain immutable after publication.
* Subscribers remain independent of publishers.
* Multiple subscribers may process the same event differently.

The following practices are prohibited:

* Using events as remote procedure calls.
* Publishing events to force another component to perform work.
* Embedding execution instructions inside event payloads.
* Assuming subscribers exist before publishing an event.
* Coupling publishers to subscriber implementations.

---

# Examples

Examples of valid Platform Events:

| Event               | Represents                                     |
| ------------------- | ---------------------------------------------- |
| WorkflowStarted     | A workflow has started.                        |
| ToolExecuted        | A tool execution completed.                    |
| MemoryStored        | A memory record was created.                   |
| PromptBuilt         | A prompt package was successfully constructed. |
| EvaluationCompleted | An evaluation finished.                        |
| AuditRecordCreated  | An audit record was recorded.                  |

Examples of invalid event names:

| Invalid Event   | Reason                |
| --------------- | --------------------- |
| ExecuteWorkflow | Command               |
| RunPrompt       | Instruction           |
| SendEmail       | Request               |
| RetryOperation  | Operational directive |
| ProcessMemory   | Imperative action     |

Conceptually:

```text id="eventfactflow"
Platform Operation
        │
        ▼
Historical Fact
        │
        ▼
Platform Event
        │
        ▼
Event Bus
        │
        ▼
Independent Subscribers
```

---

# Related Blueprints

* Blueprint 06 — Workflow Engine
* Blueprint 14 — Evaluation Engine
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform

---

# Related ADRs

* ADR-009 — Historical Facts Are Immutable
* ADR-011 — Normalize at Architectural Boundaries
* ADR-013 — Audit Preserves Accountability

---

# Constitutional Rule

> **Platform Events represent completed historical facts, not commands.**
>
> Events communicate what has already occurred. Subscribers independently determine whether and how to respond.

---

# Final Statement

Platform Events preserve loose coupling by communicating historical facts rather than directing behavior.

This architectural separation allows publishers and subscribers to evolve independently, enables reliable replay and auditing, and ensures that the Event Bus remains a transport mechanism for facts rather than an execution engine for commands.
