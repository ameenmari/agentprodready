# AgentForge v0.1 Local Reference Product — Implementation Specification

**Document Version:** 1.0  
**Product Version:** 0.1.0  
**Status:** In Review  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07

---

# Package Boundary

```text
Product package:  @agentforge/platform-host
Product path:     apps/platform-host/
Public entry:     apps/platform-host/src/main.ts
Composition only: apps/platform-host/src/composition/**
HTTP only:        apps/platform-host/src/http/**
```

All framework behavior remains in existing `@agentforge/*` packages.

---

# A. Application Host

## Current Behavior

`apps/platform-host/src/main.ts` creates a Nest application context, starts an empty `ApplicationHost([])`, immediately stops, and exits.

## Required Behavior

1. Build `LocalReferenceComposition`.
2. Seed reference agent and capabilities during startup.
3. Create Nest HTTP application (`NestFactory.create`).
4. Register `LocalReferenceModule` with HTTP controller and injected product services.
5. Listen on `HOST:PORT` until SIGINT/SIGTERM.
6. On shutdown: mark readiness false → stop HTTP → dispose composition → stop `ApplicationHost` lifecycle components → exit 0.

## Ownership Rule

The host may:

- wire framework ports;
- map HTTP to ApiFramework;
- seed local fixtures;
- translate product DTOs.

The host may **not**:

- implement planning, workflow, runtime, security policy evaluation, capability selection, or AI normalization itself;
- expose vendor types;
- bypass Security authorization.

---

# B. HTTP Surface

All endpoints use:

- **Content-Type (request):** `application/json; charset=utf-8`
- **Content-Type (response):** `application/json; charset=utf-8`
- **Correlation header (optional request):** `X-Correlation-Id`
- **Correlation header (response):** `X-Correlation-Id` (echoed or generated UUID v4)
- **API version header (optional request):** `Accept-Version: 1.1`

Responses are mapped from Blueprint 26 `ApiResponse<T>` to HTTP using `httpStatusHint`.

---

## B.1 GET /health

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/health` |
| Auth | None |
| Request body | None |

### Response 200

```json
{
  "status": "ok",
  "service": "agentforge-local-reference",
  "version": "0.1.0",
  "uptimeMs": 1234,
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `status` | `"ok"` | Yes | Process is alive |
| `service` | `string` | Yes | Product identifier |
| `version` | `string` | Yes | Product version |
| `uptimeMs` | `number` | Yes | Milliseconds since host start |
| `correlationId` | `string` | Yes | Request correlation |

### Error Responses

| Status | When |
|---|---|
| `503` | Host process exists but health handler unavailable (should not occur after init) |

This endpoint checks **liveness only**. It does not consult readiness contributors.

---

## B.2 GET /ready

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/ready` |
| Auth | None |
| Request body | None |

### Response 200

```json
{
  "ready": true,
  "checks": [
    { "name": "composition", "status": "healthy" },
    { "name": "security", "status": "healthy" },
    { "name": "runtime", "status": "healthy" },
    { "name": "agent-registry", "status": "healthy" },
    { "name": "event-bus", "status": "healthy" },
    { "name": "audit", "status": "healthy" },
    { "name": "reference-agent", "status": "healthy" }
  ],
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `ready` | `boolean` | Yes | True only when all mandatory checks are healthy |
| `checks` | `array` | Yes | Foundation `HealthResult[]` mapped to `{name,status}` |
| `correlationId` | `string` | Yes | Request correlation |

### Response 503

Same schema with `"ready": false` and one or more checks `"degraded"` or `"unhealthy"`.

### Readiness Semantics

Readiness is **false** when:

- startup has not completed;
- any mandatory contributor failed initialization;
- graceful shutdown has begun.

Mandatory contributors:

1. `composition`
2. `security`
3. `runtime`
4. `agent-registry`
5. `event-bus`
6. `audit`
7. `reference-agent` (active seeded agent present)

Implementation uses Foundation `HealthService` + `ReadinessService`; HTTP controller reads those services only.

---

## B.3 POST /v1/agents/reference-agent/invoke

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/v1/agents/reference-agent/invoke` |
| Auth | Local reference credential header (see Security) |
| Request body | JSON |

### Request Schema

```json
{
  "objective": "hello agentforge",
  "inputs": {
    "note": "optional"
  }
}
```

| Field | Type | Required | Constraints |
|---|---|---:|---|
| `objective` | `string` | Yes | Non-empty, max 4096 chars |
| `inputs` | `Record<string,string>` | No | String values only, max 16 keys |

### Response 200 — Success

```json
{
  "status": "success",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "causationId": null,
  "agent": {
    "agentId": "reference-agent",
    "version": "1.0.0",
    "invocationId": "invocation:550e8400-e29b-41d4-a716-446655440000"
  },
  "execution": {
    "executionReference": "execution:abc123",
    "state": "completed",
    "attempts": 1
  },
  "result": {
    "kind": "normalized-ai",
    "text": "hello agentforge",
    "finishReason": "completed",
    "diagnosticId": "ai:execution:abc123:task-1"
  },
  "evidence": {
    "planId": "plan:execution:abc123",
    "workflowId": "reference-workflow",
    "capabilityBindingId": "binding:execution:abc123:task-1:0",
    "adapterId": "reference-ai"
  },
  "diagnosticsReference": "local-reference:invoke:550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `status` | `"success"` | Yes | Completed execution |
| `correlationId` | `string` | Yes | End-to-end correlation |
| `causationId` | `string \| null` | Yes | Upstream cause if any |
| `agent.agentId` | `string` | Yes | Always `reference-agent` |
| `agent.version` | `string` | Yes | Resolved active version |
| `agent.invocationId` | `string` | Yes | Agent invocation id |
| `execution.executionReference` | `string` | Yes | Runtime execution id |
| `execution.state` | `"completed"` | Yes | Runtime terminal state |
| `execution.attempts` | `number` | Yes | Runtime attempts |
| `result.kind` | `"normalized-ai"` | Yes | Result type |
| `result.text` | `string` | Yes | Deterministic echo from reference AI |
| `result.finishReason` | `string` | Yes | From `NormalizedAiResult` |
| `result.diagnosticId` | `string` | Yes | AI diagnostics reference |
| `evidence.planId` | `string` | Yes | Planning proof |
| `evidence.workflowId` | `string` | Yes | Workflow proof |
| `evidence.capabilityBindingId` | `string` | Yes | Resolution proof |
| `evidence.adapterId` | `string` | Yes | Composition/AI proof |
| `diagnosticsReference` | `string` | Yes | Product diagnostics id |

Deterministic rule: for request objective `"hello agentforge"`, `result.text` must equal `"hello agentforge"`.

### Normalized Error Response

All error responses use:

```json
{
  "status": "failed",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": [
    {
      "code": "AUTHORIZATION_DENIED",
      "message": "Local reference authorization denied",
      "retryable": false,
      "details": {}
    }
  ],
  "diagnosticsReference": "local-reference:error:550e8400-e29b-41d4-a716-446655440000"
}
```

| HTTP Status | ApiError code | When |
|---|---|---|
| `400` | `REQUEST_INVALID` | Missing/invalid JSON or objective |
| `401` | `AUTHENTICATION_FAILED` | Missing/invalid local credential header |
| `403` | `AUTHORIZATION_DENIED` | Security deny |
| `404` | `RESOURCE_NOT_FOUND` | Reference agent disabled or not seeded |
| `409` | `VALIDATION_FAILED` | Agent inactive or validation failure |
| `500` | `INTERNAL_ERROR` | Unexpected product/framework failure |
| `503` | `INTERNAL_ERROR` | Host not ready |

Product handler maps framework errors to the closest `ApiError` code without leaking vendor details.

---

# C. Reference Agent

## Identity

| Field | Value |
|---|---|
| Agent ID | `reference-agent` |
| Version | `1.0.0` |
| Type | `task` |
| Lifecycle at steady state | `active` |
| Tenant | `local-tenant` |
| Workspace | `local-workspace` |
| Project | `local-project` |

## Manifest (seed)

```json
{
  "manifestId": "manifest:reference-agent:1.0.0",
  "schemaVersion": "1",
  "agentId": "reference-agent",
  "version": "1.0.0",
  "name": "Reference Agent",
  "description": "Deterministic local reference agent",
  "purpose": "Echo objectives through the full AgentForge execution chain",
  "type": "task",
  "principalReference": "agent-principal:reference-agent",
  "scope": {
    "tenantId": "local-tenant",
    "workspaceId": "local-workspace",
    "projectId": "local-project"
  },
  "capabilities": [
    {
      "capability": "text-generation",
      "contractVersion": "1",
      "requirement": "required"
    }
  ],
  "tools": [],
  "knowledge": [],
  "memory": [],
  "planning": {
    "enabled": true,
    "strategies": ["single-step"],
    "policyReference": "planning-policy:local"
  },
  "workflows": ["reference-workflow"],
  "contextPolicyReferences": ["context-policy:local"],
  "promptPolicyReferences": ["prompt-policy:local"],
  "evaluationPolicyReferences": ["evaluation-policy:local"],
  "securityPermissionDeclarations": ["invoke"],
  "delegationRequirementReferences": [],
  "constraints": {
    "maximumDurationMs": 30000,
    "maximumCost": 1,
    "maximumToolInvocations": 0,
    "maximumPlanningDepth": 1,
    "maximumWorkflowIterations": 1,
    "prohibitedOperations": [],
    "requiredApprovals": [],
    "dataResidencies": ["local"]
  },
  "configuration": {},
  "policyReferences": ["agent-policy:local"],
  "pluginDependencies": [],
  "compatibility": {
    "platformRange": "^1.0.0",
    "contractVersions": { "runtime": "1" }
  },
  "governance": {
    "owner": "agentforge-local",
    "reviewStatus": "approved",
    "classification": "internal",
    "policyVersion": "local-1"
  },
  "publisherReference": "publisher:agentforge-local",
  "sourceConfigurationVersions": ["config:local:1"],
  "createdAt": "2026-08-07T00:00:00.000Z",
  "createdBy": "local-seed",
  "parentAgentReferences": [],
  "appliedOverrides": []
}
```

## Objective Contract

- HTTP `objective` becomes Agent `AgentInvocationRequest.objective`.
- Planning `ExecutionPlan.objective` equals the same string.
- Reference AI echoes transcript built from objective message content.

## Capability Requirements

| Capability | Contract | Implementation |
|---|---|---|
| `text-generation` | `1` | `reference-ai` |

## Workflow Definition

Catalog entry `reference-workflow` maps objective prefix `echo:` optional; default generated workflow from plan tasks:

```json
{
  "id": "reference-workflow",
  "source": "catalog",
  "taskIds": ["task-1"]
}
```

Graph (from plan task `task-1`):

- one capability node: `text-generation`
- linear entry → exit

## Input Contract

| Source | Field | Maps to |
|---|---|---|
| HTTP body | `objective` | `AgentInvocationRequest.objective` |
| HTTP body | `inputs.*` | `AgentInvocationRequest.inputs` |
| HTTP header | `X-Correlation-Id` | `correlationId` |
| Local config | principal ids | authorization + agent principals |

## Output Contract

Product response `result.text` is the normalized AI text content. Evidence fields prove each framework participated.

---

# D. End-to-End Execution Chain

## Runtime Request Input

`RuntimeOrchestrator.execute` receives:

```ts
{
  context: CreateExecutionContextRequest {
    executionId: generated,
    correlationId: from HTTP,
    tenantId: 'local-tenant',
    workspaceId: 'local-workspace',
    projectId: 'local-project',
    securityContextId: from SecurityPlatform.createSecurityContext,
    objective: invocation.objective,
    metadata: { agentId: 'reference-agent', agentVersion: '1.0.0' }
  },
  input: invocation.objective
}
```

## Chain Steps

1. **HTTP handler** validates request and authenticates local credential.
2. **SecurityPlatform** produces `AuthorizationDecision` and `SecurityContext`.
3. **AgentFramework.invoke** validates active agent and hands off to `AgentRuntimePort`.
4. **LocalReferenceRuntimePort** calls `RuntimeOrchestrator.execute`.
5. **PlanningEngine** produces immutable `ExecutionPlan`.
6. **WorkflowEngine** produces eligible node contracts from plan.
7. **LocalReferenceCapabilityExecution** (implements `CapabilityInvocationPort`):
   - calls `CapabilityResolver.resolve` per eligible node;
   - uses `CompositionRoot` execution scope to resolve AI adapter token bound to `reference-ai`;
   - calls `AiProviderFramework.execute` with `AiExecutionRequest` built from binding + objective message;
   - returns `{ bindings, aiResult }`.
8. **Runtime** completes and returns `RuntimeResult`.
9. **Product mapper** builds HTTP success response with evidence from plan/workflow/binding/AI diagnostics.

No step may short-circuit with hardcoded final text in the host. The echo must come from `ReferenceAiProviderAdapter`.

---

# E. Local Authorization

## Interface Use

Uses existing `@agentforge/security` contracts only:

- `AuthenticationEvidence`
- `StaticPrincipalNormalizer`
- `SecurityPlatform.authorize`
- `SecurityPlatform.createSecurityContext`
- `AuthorizationDecision`

## Local Credential

| Header | Value |
|---|---|
| `Authorization` | `LocalReference principalId=local-user;tenantId=local-tenant` |

Parser behavior:

- Missing/invalid header → authentication failed (`401`).
- Valid header → normalized principal with permissions `['invoke']`.

## Permit Policy

`LocalReferenceSecurityPolicy` registers one `SecurityPolicy`:

```json
{
  "id": "policy:local-reference-permit",
  "version": "local-1",
  "effect": "permit",
  "principalTypes": ["human"],
  "actions": ["invoke", "register", "lifecycle", "discover"],
  "resourceTypes": ["agent", "capability", "api-operation"],
  "tenantIds": ["local-tenant"],
  "workspaceIds": ["local-workspace"],
  "projectIds": ["local-project"]
}
```

Policy metadata must include:

```json
{ "referenceOnly": "true", "profile": "local-reference-v0.1" }
```

## Agent Authorization Mapping

HTTP invoke maps to Agent `AgentAuthorizationOutcome` via Security decision:

| Field | Value |
|---|---|
| `authorized` | from decision |
| `state` | `active` |
| `operation` | `invoke` |
| `principalId` | `local-user` |
| `agentPrincipalId` | `agent-principal:reference-agent` |
| `allowedCapabilities` | `['text-generation']` |
| `scope` | local tenant/workspace/project |

This is reference-only and must not be used outside local product composition.

---

# F. Reference Providers

| Concern | Class | Package |
|---|---|---|
| AI adapter | `ReferenceAiProviderAdapter` | `@agentforge/ai-provider` |
| AI resolver | `FactoryAiAdapterResolver` | `@agentforge/ai-provider` |
| Persistence | `InMemoryPersistenceProvider` | `@agentforge/persistence` |
| Memory | `InMemoryMemoryProvider` | `@agentforge/memory` |
| Audit | `AuditPlatform` + in-memory stores | `@agentforge/audit` |
| Observability logs | `ConsoleLoggingProvider` | `@agentforge/observability` |
| Observability metrics/traces | in-memory providers | `@agentforge/observability` |
| Event Bus | `EventBus` + in-process transport | `@agentforge/event-bus` |
| Security | `SecurityPlatform` + static policy | `@agentforge/security` |

## EventTransport Decision

### Question

Can Blueprint 16 contracts support a minimal in-process `EventTransport`?

### Answer

**Yes.** Safe to implement.

Evidence:

- `EventTransport` is already defined as:

```ts
export interface EventTransport {
  publish(event: PlatformEvent): Promise<void>;
}
```

- Blueprint 16 explicitly allows reference implementations using in-memory stores and transport independence.
- `EventBus.publish` already performs in-process routing/delivery.
- A reference `InProcessEventTransport` that delegates to `EventBus.publish` completes the port without new architecture.

### Minimal Reference Implementation

```ts
export class InProcessEventTransport implements EventTransport {
  constructor(private readonly bus: EventBus) {}
  async publish(event: PlatformEvent): Promise<void> {
    await this.bus.publish(event);
  }
}
```

Location: `packages/event-bus/src/reference/in-process-event-transport.ts`

Ownership: Blueprint 16 reference provider. Not a host concern.

**Stop condition:** Not triggered.

---

# G. Health and Readiness

See section B.1 and B.2.

Foundation services:

```ts
new HealthService([
  compositionContributor,
  securityContributor,
  runtimeContributor,
  agentRegistryContributor,
  eventBusContributor,
  auditContributor,
  referenceAgentContributor,
]);

new ReadinessService(healthService);
```

Controller rules:

- `/health` → always 200 while event loop active and handler mounted.
- `/ready` → 200 iff `readinessService.isReady()` true, else 503.

---

# H. Local Configuration

## Environment Variables

| Name | Default | Required | Meaning |
|---|---|---:|---|
| `HOST` | `127.0.0.1` | No | Bind address |
| `PORT` | `3000` | No | Bind port |
| `LOG_LEVEL` | `info` | No | `debug\|info\|warn\|error` |
| `REFERENCE_AGENT_ENABLED` | `true` | No | Seed/disable reference agent |

## Defaults-Only First Run

Product runs with zero env files when defaults are used:

```powershell
pnpm build
pnpm start
```

## `.env.example`

**Deferred.** Not required because defaults are sufficient and no secrets exist.

---

# I. Local Developer Commands

| Command | Definition |
|---|---|
| `pnpm dev` | Existing root script: TypeScript project-reference watch (`tsc -b --watch`) |
| `pnpm start` | **Modified:** start long-running local reference host after build |
| `pnpm smoke` | **New:** run `node apps/platform-host/dist/smoke/smoke.js` (builds if needed) |
| `pnpm verify` | Existing: lint + typecheck + test + build |

### `pnpm start` (after implementation)

```powershell
pnpm build
node apps/platform-host/dist/bootstrap-local.js
```

Root `package.json` `start` script will invoke long-running bootstrap instead of one-shot smoke exit.

### `pnpm smoke`

Runs the automated smoke flow in section J against `HOST:PORT` (defaults or env overrides). Exits non-zero on failure.

---

# J. Smoke Test Flow

Automated script `apps/platform-host/src/smoke/smoke.ts`:

1. Start platform-host on ephemeral port (dynamic `PORT=0` or dedicated test port).
2. Poll `GET /ready` until 200 or timeout 15s.
3. `GET /health` → expect 200 + `status=ok`.
4. `GET /ready` → expect 200 + `ready=true`.
5. `POST /v1/agents/reference-agent/invoke` with `{ "objective": "smoke-test" }` and valid local auth header.
6. Assert response `result.text === "smoke-test"`.
7. Assert at least one platform event published (`agent.invocation.accepted` or runtime/planning fact).
8. Assert at least one audit record persisted.
9. Assert at least one observability log line captured.
10. Send graceful shutdown signal.
11. Assert process exits code 0 within 10s.

---

# K. Required Tests

| Area | Test file | Assertions |
|---|---|---|
| Host startup | `local-reference.spec.ts` | composition builds, readiness true |
| Failed startup | `local-reference.spec.ts` | seed failure → readiness false |
| Health | `local-reference.e2e.spec.ts` | GET /health 200 |
| Readiness | `local-reference.e2e.spec.ts` | GET /ready 200 before invoke |
| Reference agent registration | `local-reference.spec.ts` | active agent in registry |
| Reference agent invocation | `local-reference.e2e.spec.ts` | POST invoke success |
| Planning integration | `local-reference.e2e.spec.ts` | evidence.planId present |
| Workflow integration | `local-reference.e2e.spec.ts` | evidence.workflowId present |
| Runtime integration | `local-reference.e2e.spec.ts` | execution.state completed |
| Capability Resolution | `local-reference.e2e.spec.ts` | evidence.capabilityBindingId present |
| Composition integration | `local-reference.e2e.spec.ts` | evidence.adapterId `reference-ai` |
| Reference AI Provider | `local-reference.e2e.spec.ts` | deterministic echo |
| Event Bus integration | `local-reference.e2e.spec.ts` | event published |
| Audit integration | `local-reference.e2e.spec.ts` | audit record present |
| Graceful shutdown | `local-reference.e2e.spec.ts` | clean close |
| Normalized failures | `local-reference.e2e.spec.ts` | 401/400 error envelope |
| Dependency boundaries | existing `pnpm boundaries` | no new violations |

All existing **387** repository tests must continue to pass.

---

# L. Explicit Non-Goals

Confirmed out of scope:

- PostgreSQL, Redis, Kafka, RabbitMQ, NATS
- Docker, Docker Compose, Kubernetes, `.dockerignore`
- External AI APIs, OpenAI/Anthropic credentials
- Production authentication, production secret management
- Cloud deployment, UI, marketplace UI
- Changes to approved blueprints, ADRs, framework ownership, public contracts, dependency direction

---

# M. Review Output

## 1. Proposed Files to Create

See [implementation plan](./../plans/agentforge-v0.1-local-reference-product-plan.md#proposed-files).

## 2. Proposed Files to Modify

- `apps/platform-host/package.json`
- `apps/platform-host/src/main.ts`
- `package.json` (add `smoke` script, update `start`)
- `packages/event-bus/src/index.ts`
- `packages/event-bus/src/reference/in-process-event-transport.ts` (new)

## 3. Exact Endpoint Contracts

Defined in section **B** above:

- `GET /health`
- `GET /ready`
- `POST /v1/agents/reference-agent/invoke`

## 4. Exact Reference-Agent Contract

Defined in section **C** above (`reference-agent` v1.0.0).

## 5. Exact Package Composition

```text
apps/platform-host
  depends on:
    @agentforge/foundation
    @agentforge/composition
    @agentforge/runtime
    @agentforge/planning
    @agentforge/workflow
    @agentforge/capability-resolution
    @agentforge/ai-provider
    @agentforge/security
    @agentforge/event-bus
    @agentforge/audit
    @agentforge/agent-framework
    @agentforge/observability
    @agentforge/api-framework
    @agentforge/persistence        (in-memory snapshots only)
    @nestjs/core
    @nestjs/common                 (if controller decorators used)
```

## 6. EventTransport Gap — Safe to Implement?

**Yes.** `InProcessEventTransport` under `@agentforge/event-bus` reference providers completes the existing port. Not a stop condition.

## 7. Framework Contract Modifications Required?

**None.**

Existing public contracts are sufficient. Implementation adds:

- product-only DTOs in `apps/platform-host`;
- one new reference class in Event Bus;
- host-local adapters that **implement existing ports** without changing their signatures.

## 8. Architectural Stop Conditions

**None identified.**

## 9. Exact Commands After Implementation

```powershell
pnpm build
pnpm start
pnpm smoke
pnpm verify
```

Manual check:

```powershell
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
curl -X POST http://127.0.0.1:3000/v1/agents/reference-agent/invoke `
  -H "Content-Type: application/json" `
  -H "Authorization: LocalReference principalId=local-user;tenantId=local-tenant" `
  -H "X-Correlation-Id: demo-1" `
  -d "{\"objective\":\"hello agentforge\"}"
```

## 10. Safe to Approve for Autonomous Implementation?

**Yes.**

Conditions:

1. This specification and plan are approved in Review-Gated mode.
2. Implementation remains confined to `apps/platform-host` plus Event Bus reference transport.
3. No public framework contract edits.
4. All acceptance tests and existing 387 tests pass before completion is claimed.

---

# STOP

Review-Gated design is complete. **Do not modify production code** until this specification and plan are approved.
