# AgentProdReady v0.1 Local Reference Product

**Version:** 0.1.0  
**Status:** Implemented — Complete  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentProdReady v0.1 Local Reference Product is the smallest useful locally runnable AgentProdReady application. It composes the already implemented Blueprint 01–31 framework packages into one deterministic, in-memory, database-free product that proves the constitutional execution chain end-to-end.

This product is **not** production software. It is a local reference surface for architecture validation, developer onboarding, and smoke verification.

---

## Authority

| Document | Role |
|---|---|
| [Local-Runnability Assessment](../implementation/reviews/local-runnability-assessment.md) | Gap analysis and provider inventory |
| [Implementation Plan](../implementation/plans/agentprodready-v0.1-local-reference-product-plan.md) | Approved implementation approach |
| [Implementation Specification](../implementation/specifications/agentprodready-v0.1-local-reference-product-specification.md) | Exact local contracts before code |

Framework blueprints, ADRs, and existing public framework contracts remain authoritative and unchanged.

---

## Product Boundary

```text
HTTP Client
    │
    ▼
apps/platform-host          ← composition / transport only
    │
    ├── ApiFramework        ← normalized request/response
    ├── AgentFramework      ← reference-agent lifecycle + invoke
    ├── SecurityPlatform    ← local reference authorization
    ├── RuntimeOrchestrator ← execution owner
    ├── PlanningEngine
    ├── WorkflowEngine
    ├── CapabilityResolver
    ├── CompositionRoot     ← adapter instantiation
    ├── AiProviderFramework ← reference-ai execution
    ├── EventBus            ← in-process facts
    ├── AuditPlatform       ← in-memory accountability
    └── Observability       ← console + in-memory diagnostics
```

The host **must not** absorb framework ownership. It wires ports, seeds fixtures, exposes HTTP, and maps product responses.

---

## Local Surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Process liveness |
| `GET` | `/ready` | Application readiness |
| `POST` | `/v1/agents/reference-agent/invoke` | Invoke the built-in reference agent |

Exact schemas, status codes, and error envelopes are defined in the implementation specification.

---

## Reference Agent

| Field | Value |
|---|---|
| Agent ID | `reference-agent` |
| Version | `1.0.0` |
| Capability | `text-generation` / contract `1` |
| AI implementation | `reference-ai` |
| Lifecycle at startup | `active` |
| Behavior | Echo objective text through the full execution chain |

No external AI, tools, database, or secrets are required.

---

## Execution Chain Proven

```text
HTTP Request
  → Agent Framework
  → Planning Engine → Execution Plan
  → Workflow Engine
  → Runtime
  → Capability Resolution → Capability Binding
  → Composition Framework
  → Reference AI Provider
  → Normalized AI Result
  → Runtime completion
  → Workflow completion
  → Agent result
  → HTTP Response
```

No major framework in this path may be bypassed by hardcoded application logic.

---

## Reference Providers

| Concern | Implementation |
|---|---|
| AI | `ReferenceAiProviderAdapter` |
| Persistence | `InMemoryPersistenceProvider` |
| Memory | `InMemoryMemoryProvider` |
| Audit | `AuditPlatform` + in-memory stores |
| Observability | `ConsoleLoggingProvider` + in-memory metrics/traces |
| Event Bus | `EventBus` + new `InProcessEventTransport` reference adapter |
| Security | `SecurityPlatform` + local reference permit policy |

---

## Local Configuration

Defaults allow first run with **no `.env` file**:

| Setting | Default |
|---|---|
| `HOST` | `127.0.0.1` |
| `PORT` | `3000` |
| `LOG_LEVEL` | `info` |
| `REFERENCE_AGENT_ENABLED` | `true` |

`.env.example` is **deferred** until external configuration is introduced.

---

## Developer Commands

| Command | Intent |
|---|---|
| `pnpm dev` | TypeScript watch build (existing) |
| `pnpm start` | Run long-running local reference host |
| `pnpm smoke` | Automated end-to-end smoke against running or ephemeral host |
| `pnpm verify` | Lint, typecheck, test, build (existing) |

---

## Explicit Non-Goals

- PostgreSQL, Redis, Kafka, RabbitMQ, NATS
- Docker, Docker Compose, Kubernetes
- External AI APIs and credentials
- Production authentication or secret management
- Cloud deployment, UI, marketplace UI
- New framework architecture or public contract changes

---

## Success Criteria

1. `pnpm build && pnpm verify` passes with all existing 387 tests plus new product tests.
2. `pnpm start` keeps a host listening until graceful shutdown.
3. `pnpm smoke` verifies health, readiness, agent invocation, events, audit, observability, and clean exit.
4. One POST to `/v1/agents/reference-agent/invoke` returns a deterministic echo of the submitted objective through the full chain.

---

## Next Step

Review and approve the [implementation plan](../implementation/plans/agentprodready-v0.1-local-reference-product-plan.md) and [implementation specification](../implementation/specifications/agentprodready-v0.1-local-reference-product-specification.md) before Autonomous implementation begins.
