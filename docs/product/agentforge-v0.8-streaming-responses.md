# AgentProdReady v0.8 Streaming Responses

**Version:** 0.8.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentProdReady v0.8 introduces **provider-independent streaming AI responses** so incremental output can flow:

```text
Security
  → AgentFramework.invokeStream (acceptance + facts)
  → AgentRuntimePort.acceptStream
  → RuntimeOrchestrator.executeStream
  → AI Provider adapter.stream
  → host SSE client
```

while preserving:

- existing non-streaming `POST /v1/agents/reference-agent/invoke`
- **exactly one Runtime execution per accepted invocation** (no `execute` + `executeStream` double-run)
- Runtime ownership of operational execution (ADR-006)
- AI Provider normalization at the vendor boundary (ADR-011 / BP08)
- deterministic secret-free CI (reference streaming)
- v0.4 recovery honesty (no magical HTTP stream resume)

v0.8 is **not** tool calling, WebSockets, Runtime redesign, or stream replay.

---

## Authority

| Document | Role |
|---|---|
| [Blueprint 08 — AI Provider](../blueprints/08-ai-provider-framework.md) | Stream normalization |
| [Blueprint 04 — Runtime](../blueprints/04-runtime-orchestration.md) | Cancel / timeout / terminal execution |
| [Blueprint 18 — Agent Framework](../blueprints/18-agent-framework.md) | Invocation acceptance / Runtime handoff |
| [Blueprint 26 — API Framework](../blueprints/26-api-framework.md) | Transport-independent streaming contracts (SSE option) |
| ADR-002 / 004 / 005 / 006 / 008 / 010 / 011 | Ownership, providers, Composition, Runtime, Security, facts, normalize |
| [Plan](../implementation/plans/agentprodready-v0.8-streaming-responses-plan.md) | Approach (pending review) |
| [Specification](../implementation/specifications/agentprodready-v0.8-streaming-responses-specification.md) | Exact decisions (pending review) |

---

## Current Agent → Runtime Handoff (Inspection)

Exact non-stream sequence today:

```text
POST /invoke
  → Security authorization
  → AgentFramework.invoke(request)
       → validate / resolve version / effective definition
       → AgentRuntimePort.accept(RuntimeAgentInvocation)
            → LocalReferenceRuntimePort.accept
                 → await RuntimeOrchestrator.execute(...)   ← execution starts AND completes here
                 → store RuntimeResult by executionId
                 → return { executionReference }
       → publish agent.invocation.accepted + Agent audit
       → return AgentInvocationAcceptance
            (finalExecutionOutcomeIncluded: false, but host already finished execute)
  → host runtimePort.getResult(executionReference)
  → host audit / facts / JSON response
```

**Answer:** Yes — `AgentFramework.invoke` currently causes Runtime execution to start through `AgentRuntimePort.accept` because the host port implementation awaits `execute`.

### Duplicate-execution seam (previous draft)

A host path that called `AgentFramework.invoke` (→ `accept` → `execute`) and then also called `executeStream` for the same invocation would create **two Runtime executions**. That is forbidden.

### Selected streaming handoff

**Option A — additive AgentRuntimePort streaming handoff:**

```text
POST /invoke/stream
  → Security authorization
  → AgentFramework.invokeStream(request)     // additive; does NOT call accept/execute
       → AgentRuntimePort.acceptStream(...) // additive; starts executeStream only
       → one agent.invocation.accepted fact
  → host consumes stored stream by executionReference → SSE
```

Non-stream `/invoke` continues to use `invoke` → `accept` → `execute` unchanged.

---

## Contract Inventory (Inspection)

| Concern | Today | Verdict |
|---|---|---|
| `AiProviderAdapter.stream` + `NormalizedAiStreamEvent` | **Exists** | Reuse; amend AbortSignal + fail/cancel + **single terminal rule** |
| `AiProviderFramework.stream` | **Exists** | Reuse |
| Reference / OpenAI stream | Exists / stub | Deterministic CI + OpenAI implement |
| Runtime `execute` | **Exists** | Keep for `/invoke` only |
| Runtime `executeStream` | **Absent** | Amendment required |
| `CapabilityInvocationPort.stream?` | **Absent** | Amendment required |
| `AgentRuntimePort.accept` | **Exists** (host awaits `execute`) | Keep for non-stream |
| `AgentRuntimePort.acceptStream` / `invokeStream` | **Absent** | **Third amendment required** |
| API Framework `StreamFrame` | Exists unused | Optional; host SSE maps Runtime events |
| platform-host HTTP | JSON only | New `/invoke/stream` SSE route |

### Contract sufficiency gate

| Layer | Sufficient? |
|---|---|
| AI Provider stream shape | Mostly — amend signal + terminal events + single-failure rule |
| Runtime stream delivery | **No** — `executeStream` amendment |
| Agent → Runtime handoff for stream | **No** — additive `acceptStream` / `invokeStream` amendment |
| HTTP SSE | Host work |
| Memory / Context / Evaluation / Persistence | Unchanged |

---

## Recommended Product Shape

| Decision | Choice |
|---|---|
| Transport | **SSE** |
| Endpoint | **`POST .../invoke/stream`** |
| Existing `/invoke` | Unchanged (`invoke` → `accept` → `execute`) |
| Streaming handoff | **`invokeStream` → `acceptStream` → `executeStream` only** |
| AI / Runtime / Agent amendments | Three named implementation-contract amendments |
| Recovery | Final result checkpointable; no HTTP stream resume |
| CI | Reference streaming; no paid OpenAI |

---

## Ownership Summary

| Concern | Owner |
|---|---|
| Vendor stream → normalized events | AI Provider Framework |
| Cancel / timeout / terminal state / backpressure policy | Runtime |
| Agent acceptance + handoff selection | Agent Framework (`invoke` vs `invokeStream`) |
| Port implementation of accept / acceptStream | Composition (`LocalReferenceRuntimePort`) |
| SSE framing / disconnect / drain | platform-host HTTP |
| Authorization before stream start | Security |

HTTP must not fabricate Agent acceptance facts or call `executeStream` after `invoke`/`accept`.

---

## Amendments Required (3)

1. `08-ai-provider-streaming-signal-terminal-amendment.md`  
2. `04-runtime-streaming-execution-amendment.md`  
3. `18-agent-streaming-runtime-handoff-amendment.md` ← **new (handoff correction)**

Blueprint 18 / ADR constitutional rewrite: **No**.

---

## Explicit Non-Goals

- Tool calling / function execution  
- WebSocket chat infrastructure  
- Persistent stream replay / resume tokens  
- Checkpointing every chunk  
- Streaming Memory / Evaluation / Context internals  
- Kafka/NATS token brokers  
- UI chat application  
- Mandatory paid OpenAI in CI  
- Dual Runtime execution for one Agent acceptance  

---

## Completion

Implemented under Autonomous mode after Review-Gated approval. See [implementation report](../implementation/reports/agentprodready-v0.8-streaming-responses-implementation-report.md) and [checklist](../implementation/checklists/agentprodready-v0.8-streaming-responses-checklist.md).
