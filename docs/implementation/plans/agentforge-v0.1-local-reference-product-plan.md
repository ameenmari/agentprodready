# AgentProdReady v0.1 Local Reference Product — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.1.0  
**Plan Version:** 1.0  
**Status:** In Review  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07

---

# Objective

Compose the existing Blueprint 01–31 framework packages into the smallest locally runnable AgentProdReady reference product. The product must expose three HTTP endpoints, seed one deterministic reference agent, and prove the constitutional execution chain without external dependencies.

This is a **product composition** task, not a framework redesign.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| README.md | Yes |
| docs/README.md | Yes |
| docs/cursor-start-here.md | Yes |
| docs/implementation-guidelines.md | Yes |
| docs/implementation/implementation-modes.md | Yes |
| docs/architecture/dependency-graph.md | Yes |
| docs/implementation/reviews/local-runnability-assessment.md | Yes |
| docs/product/agentprodready-v0.1-local-reference-product.md | Yes |
| Blueprints 01, 03, 04, 05, 06, 07, 08, 15, 16, 17, 18, 22, 23, 24, 26 | Yes |
| ADR-001 through ADR-015 | Yes |
| Existing implementation reports 01–31 | Yes |

---

# Scope

## In Scope

- Long-running HTTP host in `apps/platform-host`
- Product composition module wiring existing framework ports
- Local reference security policy (Security-owned, deterministic, reference-only)
- Reference agent seeding at startup
- Agent-to-Runtime adapter and full execution chain wiring
- Three HTTP endpoints with Blueprint 26 normalization
- In-process Event Bus composition including minimal `InProcessEventTransport`
- Health/readiness via Foundation `HealthService` / `ReadinessService`
- Local configuration defaults (environment overrides optional)
- Smoke test and product integration tests
- Root/workspace script updates: `start`, `smoke` (reuse `dev`, `verify`)

## Out of Scope

- Changes to approved blueprints or ADRs
- Changes to existing public framework contracts
- PostgreSQL, Redis, message brokers, Docker, Kubernetes
- External AI, production auth, secrets, UI, marketplace
- `.env.example`, Dockerfile, compose files (deferred)
- Durable persistence or distributed event transport

---

# Dependencies

Hard dependencies are already implemented:

| Blueprint | Package | Use |
|---|---|---|
| 01 | `@agentprodready/foundation` | Host, ExecutionContext, health |
| 03 | `@agentprodready/composition` | CompositionRoot, execution scopes |
| 04 | `@agentprodready/runtime` | RuntimeOrchestrator |
| 05 | `@agentprodready/planning` | PlanningEngine |
| 06 | `@agentprodready/workflow` | WorkflowEngine |
| 07 | `@agentprodready/capability-resolution` | CapabilityResolver |
| 08 | `@agentprodready/ai-provider` | AiProviderFramework + reference adapter |
| 15 | `@agentprodready/security` | SecurityPlatform |
| 16 | `@agentprodready/event-bus` | EventBus |
| 17 | `@agentprodready/audit` | AuditPlatform |
| 18 | `@agentprodready/agent-framework` | AgentFramework |
| 22 | `@agentprodready/observability` | Observability providers |
| 24 | `@agentprodready/persistence` | In-memory persistence (optional snapshots) |
| 26 | `@agentprodready/api-framework` | Normalized API surface |

---

# Proposed Files

## Create

```text
apps/platform-host/src/
  bootstrap-local.ts
  local-reference.module.ts
  composition/
    local-reference-composition.ts
    local-reference-capability-execution.ts
    local-reference-runtime-port.ts
    local-reference-security-policy.ts
    local-reference-health-contributors.ts
  http/
    local-reference.controller.ts
    local-reference-catalog.ts
    local-reference-handlers.ts
  seed/
    reference-agent.seed.ts
    reference-capabilities.seed.ts
  config/
    local-reference-config.ts
  smoke/
    smoke.ts
  local-reference.spec.ts
  local-reference.e2e.spec.ts

packages/event-bus/src/reference/in-process-event-transport.ts
```

## Modify

```text
apps/platform-host/package.json          ← add framework deps, smoke script
apps/platform-host/src/main.ts           ← long-running HTTP bootstrap
package.json                             ← add smoke script
packages/event-bus/src/index.ts          ← export InProcessEventTransport
packages/event-bus/src/reference.ts      ← re-export transport (if barrel used)
```

## Do Not Modify

- `docs/blueprints/**`
- `docs/adrs/**`
- Existing public contracts in `packages/*/src/contracts/**`
- Existing framework application logic except adding reference transport in Event Bus

---

# Implementation Stages

## Stage 1 — Reference EventTransport

Add `InProcessEventTransport` under `@agentprodready/event-bus` reference providers. It implements the existing `EventTransport` port by delegating to an injected `EventBus.publish`. This completes the approved Blueprint 16 contract; it is not new architecture.

## Stage 2 — Local Composition

Create `LocalReferenceComposition` that:

1. Builds `CompositionRoot` and registers `reference-ai` adapter factory.
2. Wires Security, Audit, Event Bus, Observability, Planning, Workflow, Capability Resolution, AI, Runtime.
3. Seeds capability registry, provider registry, and reference agent.
4. Exposes `HealthContributor` instances for mandatory components.

## Stage 3 — Execution Adapters

Create host-local adapters only:

- `LocalReferenceRuntimePort` — Agent `AgentRuntimePort` → `RuntimeOrchestrator.execute`
- `LocalReferenceCapabilityExecution` — wraps resolution + composition + `AiProviderFramework.execute`
- `LocalReferenceSecurityPolicy` — permit policy for local principal/scope

## Stage 4 — HTTP Surface

Use Nest HTTP (`NestFactory.create`) with a thin controller mapping:

- Raw HTTP → `ApiFramework` normalization → handlers → product response mapping

Product catalog lives in `apps/platform-host`; do not modify `referenceCatalog` in `@agentprodready/api-framework`.

## Stage 5 — Startup Lifecycle

Replace bootstrap-and-exit with:

1. Initialize composition
2. Seed reference agent
3. Register health contributors
4. Mark readiness true
5. Listen on configured host/port
6. Handle SIGINT/SIGTERM for graceful shutdown

## Stage 6 — Tests and Smoke

- Unit tests for composition, seed, config, security policy
- Integration test starting ephemeral host
- `pnpm smoke` script executing the 11-step smoke flow

---

# Risks

| Risk | Mitigation |
|---|---|
| Runtime capability port returns bindings only | Host adapter chains resolution + composition + AI execution without bypassing frameworks |
| Agent invoke returns acceptance only | Product layer synchronously awaits Runtime result and maps HTTP response |
| EventTransport missing | Add in-process reference transport under Event Bus ownership |
| Nest dependency in host only | Keep HTTP transport in app boundary; frameworks remain transport-independent |

---

# Testing Strategy

| Layer | Tests |
|---|---|
| Composition | Provider wiring, seed idempotency, health contributors |
| HTTP | Route contracts, status codes, error normalization |
| E2E | Full smoke flow on ephemeral port |
| Regression | All existing 387 tests unchanged and passing |
| Boundaries | `pnpm boundaries` — host must not import provider SDKs |

---

# Acceptance Mapping

| Criterion | Verification |
|---|---|
| Long-running host | Manual `pnpm start` + smoke wait-for-ready |
| Three endpoints | E2E HTTP assertions |
| Full execution chain | E2E asserts AI echo + runtime/planning/workflow evidence |
| Local auth only | Security policy unit test + denied unknown principal |
| In-memory providers only | No external network calls in smoke |
| Graceful shutdown | Smoke step 10–11 |
| 387+ tests pass | `pnpm verify` |

---

# Completion Artifacts

After implementation:

- `docs/implementation/reports/agentprodready-v0.1-local-reference-product-implementation-report.md`
- `docs/implementation/checklists/agentprodready-v0.1-local-reference-product-checklist.md`

---

# Review Decision

**Safe to approve for Autonomous implementation:** Yes, provided:

1. No public framework contract changes are required (confirmed in specification).
2. `InProcessEventTransport` is implemented as Event Bus reference provider only.
3. All product logic remains in `apps/platform-host` except the approved reference transport addition.

**Stop conditions:** None identified. EventTransport gap is closable within existing Blueprint 16 contracts.
