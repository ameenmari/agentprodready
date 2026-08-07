# AgentProdReady v0.8 Streaming Responses — Implementation Plan

**Version:** 0.8.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07  
**Product:** [agentprodready-v0.8-streaming-responses.md](../../product/agentprodready-v0.8-streaming-responses.md)  
**Specification:** [agentprodready-v0.8-streaming-responses-specification.md](../specifications/agentprodready-v0.8-streaming-responses-specification.md)

---

## 1. Goal

Ship provider-independent streaming responses end-to-end without breaking Runtime ownership, AI normalization, HTTP boundaries, secret-free CI, or **single-execution identity** per Agent acceptance.

```text
Security
  → AgentFramework.invokeStream
  → AgentRuntimePort.acceptStream
  → RuntimeOrchestrator.executeStream
  → Capability.stream → AI Provider.stream
  → host SSE
```

Non-stream path remains:

```text
AgentFramework.invoke → AgentRuntimePort.accept → RuntimeOrchestrator.execute
```

**Forbidden:** `invoke`/`accept`/`execute` followed by a second `executeStream` for the same logical invocation.

---

## 2. Implementation Mode

**Review-Gated.** No production code until product + plan + specification (including three implementation-contract amendments) are approved.

---

## 3. Authority Order

1. Constitution / ADRs  
2. Blueprints (04, 08, 13, 15, 16, 17, 18, 22, 23, 26)  
3. Dependency graph  
4. This product/plan/specification  
5. Implementation

---

## 4. Contract Inventory & Sufficiency (Summary)

| Surface | Exists? | Action |
|---|---|---|
| AI `stream` / `NormalizedAiStreamEvent` | Yes | Reuse; amend signal + fail/cancel + **single terminal rule** |
| Runtime `execute` | Yes | Keep for `/invoke` |
| Runtime `executeStream` | **No** | Amend |
| Capability `stream?` | **No** | Amend |
| `AgentRuntimePort.accept` | Yes (host awaits `execute`) | Keep for non-stream |
| `AgentFramework.invokeStream` / `acceptStream` | **No** | **Amend (third)** |
| API Framework `StreamFrame` | Exists unused | Optional |
| Host HTTP | JSON only | Add `/invoke/stream` |

**Gate:** Previous draft incorrectly claimed Agent Framework needed no contract change. Host Composition cannot call `executeStream` after `invoke` without duplicate execution. Additive Agent handoff is required.

---

## 5. Selected Approach

### 5.0 Streaming handoff (correction)

| Option | Verdict |
|---|---|
| A. Additive `acceptStream` / `invokeStream` | **Selected** — smallest explicit public change; `/invoke` untouched |
| B. Change `accept` to prepare-only (no execute) | Rejected for v0.8 — breaks current host `getResult` after `invoke` unless larger refactor |
| C. Host selects execute vs executeStream before Agent invoke | Rejected — either bypasses Agent entry or needs unsafe shared mode on the port |

Canonical stream path: **only** `invokeStream` → `acceptStream` → `executeStream`.

Identity: one `invocationId`, one `executionReference`/`executionId`, one Runtime execution, one `agent.invocation.accepted`, one terminal `RuntimeResult`.

### 5.1 Transport: SSE (Option A)

One-way server→client; BP26-aligned; no WebSockets.

### 5.2 Endpoint: new path (Option A)

```http
POST /v1/agents/reference-agent/invoke/stream
```

`POST .../invoke` remains JSON-only via existing `invoke`/`accept`/`execute`.

### 5.3 Normalized events

Reuse AI events; Runtime `RuntimeStreamEvent` envelope; host SSE mapping. Provider SDK types stay in openai package.

### 5.4 Ownership wiring

| Step | Owner |
|---|---|
| AuthZ before stream | Security |
| Acceptance + handoff method selection | Agent Framework |
| `accept` / `acceptStream` implementation | Composition |
| Operational stream + cancel/timeout | Runtime |
| Vendor stream translation | AI Provider |
| SSE write / drain / disconnect | platform-host |
| Checkpoint | Final capability result only |

### 5.5 Recovery honesty

No per-chunk checkpoint; no HTTP stream resume after crash.

### 5.6 Cancellation / backpressure / eval / memory

Unchanged from prior plan (Runtime cancel chain; await drain; eval final-only; Memory unchanged).

### 5.7 AI single-terminal failure rule

If `failed`/`cancelled` are emitted as `NormalizedAiStreamEvent` terminals: adapter/framework must **not** also throw the same normalized failure; iterable ends; Runtime maps one AI terminal → one Runtime terminal.

---

## 6. Work Packages (Post-Approval)

| WP | Scope | Packages |
|---|---|---|
| WP0 | Three amendment docs (AI, Runtime, **Agent handoff**) | docs |
| WP1 | AI Provider stream hardening + single-terminal rule | `@agentprodready/ai-provider` |
| WP2 | Reference deterministic streaming | `@agentprodready/ai-provider` |
| WP3 | OpenAI streaming adapter | `@agentprodready/ai-provider-openai` |
| WP4 | Runtime `executeStream` + capability `stream` | `@agentprodready/runtime` |
| WP5 | Agent `invokeStream` + `AgentRuntimePort.acceptStream` | `@agentprodready/agent-framework` |
| WP6 | Host `acceptStream` + capability stream + SSE | `@agentprodready/platform-host` |
| WP7 | Tests including **single-execution** / duplicate-fact guards | packages + host |
| WP8 | CI `test:streaming`, probe, docs, versions | root + docs |

API Framework: no mandatory rewrite.

---

## 7. Testing Strategy

| Suite | Content |
|---|---|
| Default CI | Reference streaming + Runtime stream + HTTP SSE + backpressure + cancel/timeout + **handoff identity** + boundary imports |
| Single-execution proofs | Stream: accept×1, execute×0, executeStream×1, provider×1, terminal×1; non-stream: execute unchanged |
| Duplicate-fact proofs | No double `agent.invocation.accepted` / runtime started / audit / terminal facts |
| OpenAI mock / live | Mock in CI; live opt-in |
| Recovery | Existing suite green; no HTTP resume claim |

---

## 8. Configuration (Minimal)

| Variable | Default |
|---|---|
| `STREAMING_HEARTBEAT_INTERVAL_MS` | `15000` (`0` = off) |
| `STREAMING_MAX_DRAIN_WAIT_MS` | `30000` |

---

## 9. Versioning Intent (Post-Implementation)

Expected bumps:

- `@agentprodready/ai-provider`  
- `@agentprodready/ai-provider-openai`  
- `@agentprodready/runtime`  
- `@agentprodready/agent-framework` ← **yes** (additive handoff)  
- `@agentprodready/platform-host` → product `0.8.0`

---

## 10. Documentation Deliverables (Post-Approval)

- `docs/guides/streaming.md`  
- README / docs README / `.env.example`  
- AI Provider / Runtime / Agent / host docs updates  

---

## 11. Stop Conditions

Stop and re-review if design/implementation would require:

- Runtime ownership moving into HTTP/API  
- OpenAI SDK stream types crossing AI boundary  
- New DB schema for token chunks  
- Mandatory paid OpenAI in CI  
- Context Assembly / Memory redesign  
- Event Bus as token transport  
- Runtime recovery redesign beyond documented stream limitations  
- New Blueprint/ADR constitutional changes without amendment review  
- Public contract changes beyond the **three** named amendments  
- **Any path that runs both `execute` and `executeStream` for one Agent acceptance** ← additive stop  

---

## 12. Autonomous Readiness

**PASS — Implemented.** WP0→WP8 complete with `pnpm verify`, `pnpm test:streaming`, streaming probe, report, and checklist.
