# AgentProdReady v0.9 Tool Calling & Agent Actions — Implementation Plan

**Version:** 0.9.0  
**Status:** Implemented  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07  
**Product:** [agentprodready-v0.9-tool-calling-agent-actions.md](../../product/agentprodready-v0.9-tool-calling-agent-actions.md)  
**Specification:** [agentprodready-v0.9-tool-calling-agent-actions-specification.md](../specifications/agentprodready-v0.9-tool-calling-agent-actions-specification.md)

---

## 1. Goal

Wire existing Blueprint 09 Tool Framework into a bounded, Security-gated, Runtime-owned AI tool-calling loop without claiming exactly-once external effects or inventing a parallel tool stack.

```text
AI (tools enabled)
  → NormalizedToolCall(+s)
  → validate → Security authorize
  → Cap Resolution → Composition ToolAdapter
  → Runtime executes ToolInvocationCoordinator.invoke
  → NormalizedToolResult checkpointed
  → AI continuation → final response
```

Default: tools disabled; existing chat/streaming paths unchanged.

---

## 2. Mode

**Review-Gated.** No production code until product + plan + specification + named amendments are approved.

---

## 3. Authority

Constitution → ADRs → Blueprints 02/03/04/07/08/09/15/16/17/18/20/22/23/24/26 → dependency graph → this design → code.

---

## 4. Inventory summary

| Surface | Status | Action |
|---|---|---|
| `@agentprodready/tool-framework` | **Exists** | Reuse; small amendment |
| `ToolContract` / sideEffect / idempotency | Exists | Reuse taxonomy |
| `AiToolCallHandoff` | Exists | Reuse |
| `NormalizedToolCall` / `AiToolDefinition` | Exists | Reuse; OpenAI implement |
| OpenAI tools | Stub throw | Implement |
| Host AI↔Tool loop | Missing | Productize |
| Runtime toolCall checkpoints | Missing | Amend |
| Human Interaction | Exists unwired | Fail-closed approval unless wait amendment approved |
| New tool package | Not needed | Do not create `@agentprodready/tools` |

---

## 5. Selected approach

### 5.1 Ownership topology

Reuse BP09 path: Runtime coordinates; Tool Framework validates/invokes/normalizes; Security authorizes; Cap/Composition select/instantiate; AI Provider translates vendor tool schemas and assembles streamed tool calls.

### 5.2 Loop

Sequential, bounded:

1. AI execute/stream with tool definitions  
2. If finishReason `tool-calls` / stream `tool-call` events → complete calls only  
3. Persist turn envelope (`baseMessages` + `proposedCalls`) — not admission  
4. For each call (sequential): validate → authorize → approval → Cap/Composition → **pre-tool** → invoke → **post-tool**  
5. Append normalized tool results → AI continuation (Amendment B) until final response or limits  
   Deny/approval-required/validation: no `pre-tool`, adapter count 0  

### 5.3 Side effects & retry

Reuse `ToolSideEffect` + `ToolIdempotency`. Runtime owns retry:

| Class | Auto-retry after unknown crash mid-call |
|---|---|
| read-only + idempotent | May retry |
| mutating/external + idempotent + stable key | May retry with **same** idempotency key |
| non-idempotent | **No** silent re-execute |

### 5.4 Recovery (final ordering)

Mirror v0.4 with **durable normalized tool-turn state**:

- **Turn envelope first:** `turn` / `maxTurns` / `baseMessages` / `proposedCalls` (proposal only — not authorized)  
- **pre-tool only after** validate + Security allow + approval permit + Cap/Composition resolve; includes complete `NormalizedToolCall` + stable `idempotencyKey`; means invoke **may** have occurred  
- **post-tool:** same `NormalizedToolCall` + `NormalizedToolResult`; never re-execute; rebuild continuation without re-running proposing AI turn  
- Deny / approval-required / validation failure: **no** per-call `pre-tool`; adapter = 0; not unsafe-recovery  
- Non-idempotent crash from `pre-tool`: `TOOL_UNSAFE_RECOVERY`  

No new `tool_calls` table preferred. See Amendment C.

### 5.5 Streaming / SSE

- Provider assembles complete ToolCall before execution  
- SSE `tool_call` `executing` only after validate + authz + approval + resolution + **durable pre-tool**, immediately before/when invoke  
- Denied / approval-required / validation → never `tool_call` executing  
- No secrets/args/results by default; align stream + non-stream semantics  

### 5.5.1 AI continuation contract

Amendment B freezes `AiMessage.toolCalls`, `AiToolContinuationInput`, and `buildToolContinuationMessages`. Host must not build OpenAI `role=tool` messages.

### 5.6 Approval

v0.9 core: tools with `approvalRequirement` → Security / policy fail-closed (`TOOL_APPROVAL_REQUIRED`) without execution.  
Durable mid-loop Human Interaction wait: **named optional Runtime amendment**; not claimed without it.

### 5.7 Reference CI

Deterministic reference AI emits predictable tool calls (`reference.echo`, `reference.counter`); reference adapters; `pnpm test:tools`; probe script.

---

## 6. Work packages (post-approval)

| WP | Scope |
|---|---|
| WP0 | Amendment docs (Runtime tool-loop, Tool statuses/facts, AI/OpenAI tools) |
| WP1 | Tool Framework amendment + reference tools |
| WP2 | AI/OpenAI tool definitions + stream assembly + continuation |
| WP3 | Runtime tool-loop + checkpoint metadata |
| WP4 | Host Composition: Cap tools, Security per call, loop wiring |
| WP5 | SSE safe tool events + streaming alignment |
| WP6 | Config, seed agent tool limits, tests, CI `test:tools` |
| WP7 | Docs, probe, report, checklist, versions |

---

## 7. Testing strategy

- Contract/validation/auth denial/idempotency/timeout/cancel/size  
- AI loop counts (one tool exec per call; no duplicate after checkpoint)  
- Recovery matrix A–E  
- Streaming sequence + terminal + backpressure regression  
- Boundary imports (no OpenAI in tool-framework; no auth in adapters)  

---

## 8. Configuration (intent)

| Variable | Default |
|---|---|
| `TOOLS_ENABLED` | `false` |
| `TOOL_MAX_CALLS_PER_INVOCATION` | small bound (e.g. 8) |
| `TOOL_MAX_TURNS` | small bound (e.g. 4) |
| `TOOL_MAX_ARGUMENT_BYTES` | bound |
| `TOOL_MAX_RESULT_BYTES` | bound |

Exact names/validation in specification after config conventions.

---

## 9. Versioning intent

Product `0.9.0`. Likely bumps: `tool-framework`, `ai-provider`, `ai-provider-openai`, `runtime`, `platform-host`, possibly `agent-framework` if agent tool declarations change. No Memory/Vector/Evaluation/Persistence bumps unless forced.

---

## 10. Stop conditions

Stop if design/implementation requires:

- Authorization outside Security  
- Retry/recovery outside Runtime  
- AI provider executing arbitrary tools  
- Unregistered dynamic code execution  
- Exactly-once external guarantees  
- Mandatory paid OpenAI in CI  
- Event Bus as command queue  
- New Persistence schema for every token/tool chunk without justification  
- Constitutional Blueprint/ADR changes without separate approval  
- Public contract changes beyond named amendments  
- Re-running the prior AI turn to rediscover tool calls / arguments after durable post-tool  
- Storing OpenAI SDK message types in Runtime checkpoints  
- platform-host constructing vendor tool messages instead of Amendment B continuation  
- Persisting per-call `pre-tool` before Security authorization  
- Emitting SSE `tool_call` executing before durable pre-tool  

---

## 11. Autonomous readiness

**FAIL** until Review-Gated approval of this design + named amendments A/B/C (including honesty on approval wait vs fail-closed, and durable NormalizedToolCall continuation recovery).
