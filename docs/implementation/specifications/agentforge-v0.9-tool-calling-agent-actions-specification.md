# AgentProdReady v0.9 Tool Calling & Agent Actions — Implementation Specification

**Document Type:** Product Implementation Specification  
**Product Version:** 0.9.0  
**Specification Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07  
**Product:** [agentprodready-v0.9-tool-calling-agent-actions.md](../../product/agentprodready-v0.9-tool-calling-agent-actions.md)  
**Plan:** [agentprodready-v0.9-tool-calling-agent-actions-plan.md](../plans/agentprodready-v0.9-tool-calling-agent-actions-plan.md)

---

# 1. Authority and Mode

```text
Implementation Mode: Review-Gated
```

No production code until this specification and named amendments are approved.

Authority: Constitution → ADRs → Blueprints 02/03/04/07/08/09/15/16/17/18/20/22/23/24/26 → dependency graph → this specification → code.

---

# 2. Premises

1. Blueprints 01–31 implemented; v0.1–v0.8 shipped.  
2. `@agentprodready/tool-framework@0.1.0` implements Blueprint 09 contracts (registry, validator, coordinator, plugin registration, reference adapter, `AiToolCallHandoff`).  
3. AI contracts already include `AiToolDefinition`, `NormalizedToolCall`, stream `tool-call`, finishReason `tool-calls`.  
4. OpenAI adapter **rejects** tools; streaming fails closed on tool-calls finish.  
5. Host capability path is AI chat (+ streaming) only; reference agent `maximumToolInvocations: 0`.  
6. Runtime has `execute` / `executeStream`, AbortSignal, timeout, checkpoints (`pre-invoke` / `post-invoke` / `capabilityResult`), not a multi-toolCall loop.  
7. Security owns authorization; `SecurityCondition` includes `allowed-tools` and `human-approval`.  
8. `@agentprodready/human-interaction` exists with `RuntimeInteractionPort.awaiting/completed`; not wired into AI tool loop.  
9. Audit category `tool-side-effect` already exists.  
10. Default CI must remain secret-free.

---

# 3. Exact Contract Inventory

| Concern | Location | Status | Sufficiency |
|---|---|---|---|
| Tool descriptor (`ToolContract`) | `tool-framework` contracts | **Exists** | Sufficient core; optional `approvalRequirement` amendment |
| inputSchema / outputSchema | `ToolContract` | **Exists** (JSON-schema-like records; required[] checked) | Partial deep schema — sufficient for v0.9 required-fields + JSON value checks |
| Side-effect class | `read-only` \| `mutating` \| `external-side-effect` | **Exists** | Sufficient — map “destructive” to `external-side-effect` + non-idempotent; **do not invent parallel enum** |
| Idempotency class | `idempotent` \| `non-idempotent` | **Exists** | Sufficient |
| `ToolExecutionRequest` + auth fact | Exists (`authorized: true` required) | Sufficient |
| `NormalizedToolResult` | Exists `status: 'completed'` only; failures throw | **Partial** — amend statuses or keep throw + map at Runtime |
| Tool errors | Exists: `TOOL_AUTHENTICATION` `TOOL_AUTHORIZATION` `TOOL_VALIDATION` `TOOL_RATE_LIMITED` `TOOL_CONNECTION` `TOOL_UNAVAILABLE` `TOOL_NOT_FOUND` `TOOL_CONFLICT` `TOOL_TIMEOUT` `TOOL_REJECTED` `TOOL_UNKNOWN` | **Partial** — amend additive codes: `TOOL_APPROVAL_REQUIRED`, `TOOL_RESULT_TOO_LARGE`, `TOOL_UNSAFE_RECOVERY`, `TOOL_CANCELLED` (map conflicts via `TOOL_CONFLICT` unless dedicated idempotency code preferred) |
| Tool facts | Exists only `tool.completed` \| `tool.failed` | **Partial** — amend lifecycle facts |
| AbortSignal on tool request | **Missing** | Amend (Runtime cancel propagation) |
| Plugin tool contribution | `PluginToolRegistrationAdapter` | **Exists** | Sufficient |
| `AiToolDefinition` / `NormalizedToolCall` | `ai-provider` | **Exists** | Sufficient shape; name→contract mapping must be explicit |
| Stream `tool-call` event | Exists | Sufficient type; OpenAI assembly missing |
| `AiToolCallHandoff` | Exists | Sufficient for request construction |
| Capability selection for tools | Cap Resolution | **Exists** | Sufficient if tools registered as capabilities |
| Runtime tool loop / per-call checkpoint | **Missing** | **Insufficient** |
| OpenAI tools + tool messages | **Missing** (throw) | **Insufficient** |
| Host wiring | **Missing** | **Insufficient** |
| Approval mid-loop durable wait | Human Interaction **exists**, unwired | **Partial** — fail-closed without Runtime wait amendment |
| Idempotency key stability | Request field exists; Runtime must supply stable key | Partial — Runtime amendment |
| SSE tool events | **Missing** | Product decision (selected: safe summaries) |
| Persistence `tool_calls` table | **Absent** | Preferred not required |

---

# 4. Contract Sufficiency Gate

## 4.1 Tool Framework — mostly sufficient

Reuse `@agentprodready/tool-framework`. Do **not** create `@agentprodready/tools`.

### Amendment A — Tool Framework (smallest)

Path: `docs/implementation/amendments/09-tool-calling-result-approval-amendment.md`

**Blueprint rewrite?** No.  
**ADR?** No.

Frozen intent:

1. Optional `ToolContract.approvalRequirement: 'none' | 'required'` (default `'none'`).  
2. Expand result/error surface for loop honesty:
   - Prefer additive `NormalizedToolResult.status`: `'completed' | 'failed' | 'denied' | 'approval-required' | 'cancelled' | 'timeout'` **or** keep throw-only and require Runtime to map `NormalizedToolError` — **selected: keep coordinator throw for adapter failures; add explicit non-executing terminal outcomes via typed errors/codes for deny/approval-required/cancel/timeout/size/unsafe-recovery**.  
3. Additive facts: `tool.requested` | `tool.authorized` | `tool.denied` | `tool.started` | `tool.approval-required` | existing completed/failed (+ cancelled).  
   `tool.started` only after durable Runtime `pre-tool` (post-authz); deny/approval-required never emit `tool.started`.  
4. Optional `signal?: AbortSignal` on `ToolExecutionRequest` for Runtime cancel propagation into adapters.  
5. Result size check at framework boundary using Composition-supplied max bytes constraint.

## 4.2 AI Provider / OpenAI — insufficient without amendment

### Amendment B — AI tools + continuation + stream assembly (**updated**)

Path: `docs/implementation/amendments/08-ai-provider-tool-calling-amendment.md`  
**Status:** Implemented

- OpenAI: send normalized tools; translate tool calls; continuation via Amendment B builder  
- Streaming: assemble fragments by provider tool_call id → emit complete `NormalizedToolCall` only  
- Incomplete JSON never crosses execution boundary  
- SDK types remain inside `@agentprodready/ai-provider-openai`  
- Chat execute without tools unchanged when `tools` absent  

**Public contract additions (required — cannot hide in host):**

```ts
// AiMessage gains optional toolCalls for assistant tool-proposing turns
readonly toolCalls?: readonly NormalizedToolCall[];

export interface AiToolContinuationResult {
  readonly toolCallId: string;
  readonly content: readonly AiContentPart[];
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface AiToolContinuationInput {
  readonly baseMessages: readonly AiMessage[];
  readonly toolCalls: readonly NormalizedToolCall[];
  readonly assistantContent?: readonly AiContentPart[];
  readonly results: readonly AiToolContinuationResult[];
}

export function buildToolContinuationMessages(
  input: AiToolContinuationInput,
): readonly AiMessage[];
```

Flow:

```text
Runtime durable toolLoop
  → AiToolContinuationInput
  → buildToolContinuationMessages
  → AiExecutionRequest.messages
  → provider adapter → vendor wire format
```

`platform-host` **MUST NOT** construct OpenAI `role=tool` messages.

`AiExecutionRequest.tools` / `NormalizedToolCall` **remain**; no parallel chat API.

## 4.3 Runtime — insufficient without amendment

### Amendment C — Runtime tool-loop + durable normalized tool-turn checkpoint (**corrected**)

Path: `docs/implementation/amendments/04-runtime-tool-loop-checkpoint-amendment.md`  
**Status:** Implemented

Frozen intent:

- Runtime owns bounded tool loop when capability/work mode is tool-enabled AI execution (host Composition configures).  
- Checkpoint **MUST** persist enough normalized state to resume AI continuation after `post-tool` **without** re-running the Tool or the prior AI proposing turn.

```ts
readonly toolLoop?: Readonly<{
  turn: number;
  maxTurns: number;
  /** Structural AiMessage[] JSON — never vendor SDK types. */
  baseMessages: unknown;
  /** Full ordered NormalizedToolCall[] for the current AI turn (immutable after turn accept). */
  proposedCalls: readonly Readonly<{
    id: string;
    name: string;
    arguments: Readonly<Record<string, unknown>>;
  }>[];
  /** Admitted calls only (after authz+resolution). Deny/approval/validation never appear as pre-tool. */
  calls: readonly Readonly<{
    turn: number;
    /** Complete NormalizedToolCall — required at pre-tool and post-tool. */
    toolCall: Readonly<{
      id: string;
      name: string;
      arguments: Readonly<Record<string, unknown>>;
    }>;
    toolId: string;
    sideEffect: ToolSideEffect;
    idempotency: ToolIdempotency;
    idempotencyKey: string; // `${executionId}:${toolCall.id}`
    stage: 'pre-tool' | 'post-tool';
    result?: unknown; // NormalizedToolResult when post-tool
  }>;
}>;
```

- Turn envelope (`baseMessages` + `proposedCalls`) persists **before** any authorization; does not mean started.  
- Per-call `pre-tool` **only after** validate + Security allow + approval permit + Cap/Composition resolve.  
- Stable `idempotencyKey` = `executionId + ':' + toolCall.id` (never random per retry).  
- After `post-tool`: never re-invoke; reconstruct continuation via Amendment B.  
- Duplicate `toolCall.id` within an execution: **fail closed** before `pre-tool`.  
- No claim of exactly-once external effects.  

**No** `ExecutionStage = 'tooling'` unless necessary; prefer nested toolLoop metadata under existing stages.

## 4.4 Human approval durable wait — fail-closed unless Amendment D

Human Interaction + `RuntimeInteractionPort` exist. Mid-AI-loop durable wait needs Runtime to enter `waiting`, pause tool loop, resume on `completed`.

### Amendment D (optional for full HITL) — Runtime tool-approval wait

Path: `docs/implementation/amendments/04-runtime-tool-approval-wait-amendment.md`

If **not** approved with v0.9 core: tools with `approvalRequirement: 'required'` → **fail closed** (`TOOL_APPROVAL_REQUIRED`), zero adapter invokes, audit/fact recorded. No fake durable wait.

**Selected v0.9 core:** fail-closed approval. Amendment D out of Autonomous scope unless explicitly approved.

---

# 5. Tool Ownership

Constitutional owner: **Blueprint 09 / `@agentprodready/tool-framework`**.

Owns: descriptors, validation, normalized invoke/result/errors, side-effect/idempotency metadata, plugin registration surface, diagnostics/telemetry facts for tool interaction.

Does **not** own: Security decisions, Runtime retry/timeout/recovery, Cap selection, Composition, workflow scheduling, HTTP/SSE.

---

# 6. Core Architecture (selected)

```text
Agent invoke / invokeStream
  → Runtime execute / executeStream (tool-enabled path)
  → AI Provider (tools on request)
  → NormalizedToolCall[] (complete only)
  → persist turn envelope { turn, maxTurns, baseMessages, proposedCalls }
       (proposal only — not authorized/started)
  → for each call (sequential):
        ToolRegistry lookup
        → ToolContract / input validation
        → argument-size validation
        → Security.authorize
        → approvalRequirement evaluation
        → if deny / approval-required / validation fail
             → NO pre-tool; adapter=0; facts; continue/fail per loop semantics
        → Capability Resolution
        → Composition ToolAdapter
        → persist pre-tool (complete NormalizedToolCall + idempotencyKey)
        → tool.started / SSE tool_call executing
        → ToolInvocationCoordinator.invoke (+ AbortSignal)
        → normalize + result-size validation
        → persist post-tool (same NormalizedToolCall + NormalizedToolResult)
        → Audit / Events / Metrics
  → AI continuation via Amendment B (from durable toolLoop; never re-call proposing AI turn)
  → final AI response → RuntimeResult / SSE
```

Forbidden:

- OpenAI SDK → arbitrary function  
- model tool name → dynamic import/eval/shell  

---

# 7. Tool Descriptor

Reuse `ToolContract`:

| Field | Role |
|---|---|
| `id` | Tool identity (also AI tool name for v0.9) |
| `version` | Contract version |
| `capability` | Capability id for Cap Resolution |
| `inputSchema` / `outputSchema` | JSON-schema-like records |
| `sideEffect` | `read-only` \| `mutating` \| `external-side-effect` |
| `idempotency` | `idempotent` \| `non-idempotent` |
| `pluginId` / `contributionId` | Plugin provenance |
| `metadata` | Non-secret strings |
| `approvalRequirement` | **Additive** `'none' \| 'required'` |

No separate `toolId`/`name` duplication: AI `NormalizedToolCall.name` **MUST** equal `ToolContract.id`.

---

# 8. Input Schema Strategy

Reuse existing `ToolValidator` required-field + JSON-value checks.

v0.9 also enforces:

- argument serialized size ≤ `TOOL_MAX_ARGUMENT_BYTES`  
- reject non-JSON / functions / forbidden constraint keys (already)  
- reject unknown tool id  

Deep JSON Schema validation beyond `required[]` is optional enhancement; do not block v0.9 if current validator remains fail-closed on required fields.

**Never trust model arguments.**

---

# 9. Normalized Tool Call

Existing:

```ts
NormalizedToolCall { id, name, arguments }
```

**Sufficient** if:

- `name === ToolContract.id`  
- `id` is stable provider/call id used in idempotencyKey suffix  
- arguments are complete JSON objects (post-assembly)

No OpenAI function-call types cross AI boundary.

---

# 10. Normalized Tool Result / Errors

Success path: existing `NormalizedToolResult` with `status: 'completed'`.

Non-success: `NormalizedToolError` with codes including existing set plus:

| Code | When |
|---|---|
| `TOOL_NOT_FOUND` | Unknown name/id |
| `TOOL_AUTHORIZATION` / deny mapping | Security deny |
| `TOOL_APPROVAL_REQUIRED` | approvalRequirement without durable wait |
| `TOOL_VALIDATION` | Schema/args |
| `TOOL_TIMEOUT` | Runtime timeout |
| `TOOL_CANCELLED` | Cancelled |
| `TOOL_RESULT_TOO_LARGE` | Over max bytes |
| `TOOL_UNSAFE_RECOVERY` | Unknown non-idempotent window |
| `TOOL_IDEMPOTENCY_CONFLICT` | Conflict if adapter reports |
| existing provider codes | As today |

No raw SDK stacks in messages.

---

# 11. Side-Effect Classification

**Reuse existing enum** (do not add `destructive` as a fourth class unless amending Blueprint terminology):

| Class | Meaning |
|---|---|
| `read-only` | No external mutation |
| `mutating` | State change; may be idempotent |
| `external-side-effect` | External/irreversible-risk operations (treat as highest caution; pair with non-idempotent unless proven otherwise) |

“Destructive” product language maps to `external-side-effect` + `non-idempotent`.

---

# 12. Retry Matrix (Runtime-owned)

| Side effect | Idempotency | Auto-retry (Runtime) |
|---|---|---|
| read-only | idempotent | Allowed per Runtime policy |
| mutating / external | idempotent | Allowed **only** with same stable idempotencyKey |
| any | non-idempotent | **No** automatic retry after start/unknown window |

Adapters must not implement independent retry loops.

---

# 13. Idempotency

Stable key for a logical call:

```text
idempotencyKey = `${executionId}:${toolCallId}`
```

- Same across Runtime restart for that call  
- Never regenerate per attempt  
- Forwarded on `ToolExecutionRequest.idempotencyKey`  
- Required today by validator for non-idempotent side effects (keep)

---

# 14. Runtime Recovery Interaction (corrected)

### Recovery invariant

After durable `post-tool` + crash, restart must:

```text
load checkpoint
  → reconstruct AiToolContinuationInput from baseMessages + proposedCalls/toolCall + result
  → reuse durable ToolResult (no tool re-exec)
  → AI continuation (no re-run of proposing AI turn)
  → final / next bounded response
```

without new `toolCallId` or changed idempotency identity.

### Meaning of `pre-tool`

`stage === 'pre-tool'` means: complete NormalizedToolCall durable; validation passed; Security authorized; approval policy permitted; Cap/Composition resolution succeeded; stable idempotencyKey fixed; tool **may have been invoked**. Crash from `pre-tool` = external-effect certainty unknown.

| Case | Behavior |
|---|---|
| No per-call checkpoint | Never admitted; not unknown external-effect window |
| **A.** `pre-tool` durable; tool not certainly completed | Invoke may have occurred. **read-only/idempotent:** retry with same id/args/key. **non-idempotent:** `TOOL_UNSAFE_RECOVERY` |
| **B.** `post-tool` durable | **NEVER** re-execute. Reconstruct AI continuation from durable turn + result |
| **C.** Crash during AI continuation after `post-tool` | Same durable tool turn/results; no tool re-exec; no new ids |

Deny / approval-required / validation failure: **no** `pre-tool`; adapter = 0; not `TOOL_UNSAFE_RECOVERY`. Turn envelope may remain for diagnostics.

Exactly-once external effects: **not claimed**.  
Guarantee: Runtime at-most-once terminalization for a `toolCall.id` once `post-tool` exists; idempotent downstream may make effects converge.

### Duplicate toolCallId

Within one `executionId`, `toolCall.id` uniquely identifies one logical action (= idempotency identity suffix). Conflicting reuse (same id, different name/arguments; or same id across turns): **fail closed** before `pre-tool`.

---

# 15. Tool Invocation Checkpoints

Requires **Amendment C**. Do not hide tool recovery in host locals.

```text
AI NormalizedToolCall[]
  → persist turn envelope { turn, maxTurns, baseMessages, proposedCalls }
  → for each call:
        lookup → validate → size → Security → approval → Cap → Composition
        → persist pre-tool (ONLY after above succeed)
        → tool.started / SSE executing
        → invoke → normalize → size
        → persist post-tool
  → AI continuation (Amendment B)
```

**Do not** persist per-call `pre-tool` before Security authorization.  
Arguments for admitted calls **must** survive restart on `pre-tool`/`post-tool`; turn `proposedCalls` preserves proposal args even when a call never admits.

---

# 16. Security Authorization

Every tool call:

```text
model proposes → validate tool exists/schema/size
  → Security.authorize({ action: tool invoke, resource: toolId, ... })
  → approvalRequirement
  → only if allowed: Cap → Composition → pre-tool → invoke
```

Model selection ≠ authorization.  
Adapters never authorize.  
Denied / approval-required → zero adapter calls; **no** `pre-tool`; audit + fact.

May use existing conditions: `allowed-tools`, `human-approval`, scope/tenant/principal.

---

# 17. Approval / Human-in-the-Loop

| Mode | v0.9 |
|---|---|
| `approvalRequirement: 'none'` | Proceed after Security allow |
| `approvalRequirement: 'required'` | **Fail closed** `TOOL_APPROVAL_REQUIRED` (core) |
| Durable wait/resume | **Amendment D** — out of core unless approved |

No custom approval UI. Reference delivery adapter only if Amendment D approved.

---

# 18. Tool Policy

No separate Policy Engine required for v0.9 beyond:

- Security decisions/conditions  
- Agent constraints (`maximumToolInvocations`)  
- Config limits (`TOOL_MAX_*`)  

Security remains authorization owner.

---

# 19. Tool Registry / Plugins

Reuse `ToolRegistry` + `PluginToolRegistrationAdapter`.

```text
Plugin contribution kind:'tool'
  → ToolContract registration
  → Capability Registry entries
  → Composition ToolAdapterResolver.bind(implementationId, factory)
```

No second plugin mechanism. Host seeds reference tools via Composition (may use plugin-shaped registration for consistency).

---

# 20. Capability Resolution

Each tool has `capability` string. Runtime/host resolves binding for that capability (or tool-specific capability id) before adapter resolve — same Cap → Composition pattern as AI.

Runtime does not `new` adapters.

---

# 21. Tool Adapter

Reuse `ToolAdapter.invoke`. Add AbortSignal observance (Amendment A).

v0.9 **reference only** for CI — no production OAuth/HTTP catalog.

---

# 22. Reference Tools (CI)

| Tool id | Side effect | Behavior |
|---|---|---|
| `reference.echo` | read-only / idempotent | Echo `message` string |
| `reference.counter` | mutating / idempotent | Deterministic in-memory counter keyed by idempotencyKey (same key → same value) |

No network. Enables retry/idempotency tests.

---

# 23. External production tool

**Not required** for v0.9. Prove with reference tools.

---

# 24. AI Provider Tool Specification

```text
ToolContract → AiToolDefinition { name: contract.id, description from metadata/description field, inputSchema }
  → OpenAI tools[] inside openai package only
```

Tool Framework must not import OpenAI.

---

# 25. Prompt / AI Request

Reuse `AiExecutionRequest.tools?: AiToolDefinition[]`.  
When `TOOLS_ENABLED` and tools registered, host supplies definitions.  
Do not dump tool schemas only as free text when native tools supported.

Continuation: Runtime durable tool turn → Amendment B `AiToolContinuationInput` → `buildToolContinuationMessages` → adapter vendor mapping (OpenAI `role: tool` + `tool_call_id` stays inside openai package). Prompt Builder remains owner of non-tool prompt packages.

---

# 26. Tool Calling Loop

Bounded sequential loop (defaults illustrative — freeze in config section):

1. AI call with tools  
2. If tool calls: execute sequentially  
3. Continue AI with results  
4. Stop when final text response **or** `TOOL_MAX_TURNS` / `TOOL_MAX_CALLS_PER_INVOCATION` exceeded → fail closed  

No unbounded autonomy.

---

# 27. Multiple Tool Calls

**Selected: sequential** in declaration order.  
No parallel destructive/mutating fan-out in v0.9.

After AI proposes N calls for turn T: persist turn envelope (`proposedCalls` + `baseMessages`) before any admission. Each call admits only after validate+authz+approval+resolve, then `pre-tool` embeds the complete `NormalizedToolCall`. Restart: no per-call checkpoint → never admitted; `pre-tool` without `post-tool` → unknown-window policy; all `post-tool` → continuation from durable turn + results.

---

# 28–29. Streaming

- OpenAI fragments assembled in openai adapter → complete `tool-call` events only  
- Host/Runtime executes only complete calls  
- Outward SSE may pause content during tool execution  

### SSE decision (selected, corrected)

Expose safe events on `/invoke/stream`:

| Event | When | Payload (safe) |
|---|---|---|
| `tool_call` | Only after validation + Security allow + approval permit + Cap/Composition resolution + **durable pre-tool**, immediately before/when invoke | `{ sequence, toolCallId, toolId, status: 'executing' }` |
| `tool_result` | After terminal tool outcome (success/fail/deny/approval-required/cancel/timeout/unsafe-recovery) | `{ sequence, toolCallId, toolId, status, errorCode? }` |

**Never** emit `tool_call` `executing` for: mere AI proposal, validation failure, Security denial, approval-required failure.  
Those outcomes: facts + optional `tool_result`/error status only — adapter count 0; no `pre-tool`.

**Default: no arguments, no result data, no secrets.** Checkpoint may store arguments; SSE/logs must not dump them by default.  
Ordering interleaved with content deltas; still exactly one stream terminal.

Non-stream `/invoke` returns final JSON only (tool details in evidence/diagnostics as already shaped — safe summaries only).

---

# 30. Context Continuation

Ownership:

- Tool Adapter → `NormalizedToolResult`  
- **AI Provider Framework** → `buildToolContinuationMessages` / `AiToolContinuationInput` (Amendment B)  
- AI Provider adapters → vendor assistant/tool wire messages  
- Runtime → durable normalized tool-turn checkpoint + ordering before continuation  
- Prompt Builder → non-tool prompt packages unchanged  
- platform-host → **must not** build OpenAI `role=tool` messages  

Sensitive arguments in durable checkpoints: no default logging; Audit safe summaries; `TOOL_MAX_ARGUMENT_BYTES` before checkpoint; no new KMS in v0.9.

---

# 31. Memory

No automatic ToolResult → Memory. Explicit Memory Engine use only (out of hot path / deferred).

---

# 32. Evaluation

Observational only; not in tool hot path; no score-gated retries.

---

# 33. Audit

Record safe: toolCallId, toolId/version, executionId, principal, tenant/scope, authorization decision id, approval refs if any, sideEffect, idempotencyKey, started/completed/failed/denied, diagnostic id.

Use category `tool-side-effect` where appropriate.  
Redact passwords/tokens/sensitive args/results.

---

# 34. Events (facts only)

Prefer: `tool.requested`, `tool.authorized`, `tool.denied`, `tool.started`, `tool.completed`, `tool.failed`, `tool.cancelled`, `tool.approval-required`.

`tool.started` only after durable `pre-tool` (post-authz). `tool.denied` / `tool.approval-required` never accompanied by `tool.started`.

Not commands. No per-token tool bus flood.

---

# 35. Observability

Metrics: started/completed/failed/denied/approval-required/timeouts/cancels/retries/idempotent-dedupe/unsafe-recovery stops/latency/per-tool health.

No argument body logs.

---

# 36. Persistence

**No new `tool_calls` table** for v0.9.  
Runtime checkpoint `toolLoop` + Audit are SoT for recovery/accountability.

If implementation proves durable ToolResult cannot fit checkpoint serialization limits → STOP and report.

---

# 37. Result / argument size

| Config | Purpose |
|---|---|
| `TOOL_MAX_ARGUMENT_BYTES` | Reject oversized args |
| `TOOL_MAX_RESULT_BYTES` | Fail `TOOL_RESULT_TOO_LARGE` |

Defaults: conservative (e.g. 16KiB / 64KiB) — freeze at implementation with config validation helpers matching host style.

---

# 38–39. Timeout / Cancellation

Runtime owns timeout + AbortSignal → ToolExecutionRequest.signal → adapter best-effort abort.  
No chunks/results after Runtime cancel terminal.  
External cancel best-effort limitations documented.

---

# 40. Tool Health

Adapters expose `health()`. Optional tools must not fail host readiness unless configured mandatory (default: non-blocking).

---

# 41. Error Normalization

See §10. Map Security deny → authorization error without adapter invoke.

---

# 42–44. Recovery policy / loop recovery

See §12–§14 (corrected). After durable `post-tool`, resume via Amendment B continuation from checkpointed `NormalizedToolCall` + results — never re-execute tools or the proposing AI turn.

---

# 45–46. OpenAI non-stream / stream tool calling

Non-stream: tools on request; parse tool_calls → NormalizedToolCall[]; after results, send tool messages + continue.  
Stream: assemble by id; reject/fail incomplete JSON; tool-calls finish without complete args → failed closed.

SDK private. No SDK retries (`maxRetries: 0` remains).

---

# 47. Deterministic Reference AI Tool Calling

When tools enabled + reference AI:

Convention (example):

- Objective containing `USE_TOOL_ECHO:` → request `reference.echo` with `{ message }`  
- Objective containing `USE_TOOL_COUNTER` → request `reference.counter`  
- After tool result → final text `Tool returned: …`  

Deterministic ordering/arguments/continuation for CI.

---

# 48. Limits

| Limit | Role |
|---|---|
| `TOOL_MAX_CALLS_PER_INVOCATION` | Cap total tool invokes |
| `TOOL_MAX_TURNS` | Cap AI↔tool rounds |
| Agent `maximumToolInvocations` | Agent constraint narrowing |

Exceed → fail closed, no silent truncate of security.

---

# 49. Configuration

| Variable | Default |
|---|---|
| `TOOLS_ENABLED` | `false` |
| `TOOL_MAX_CALLS_PER_INVOCATION` | `8` |
| `TOOL_MAX_TURNS` | `4` |
| `TOOL_MAX_ARGUMENT_BYTES` | `16384` |
| `TOOL_MAX_RESULT_BYTES` | `65536` |

No tool execution when disabled. Existing non-tool invoke/stream unchanged.

---

# 50. HTTP Surface

Primary: Agent `/invoke` and `/invoke/stream` with tools enabled.  
No public REST catalog of tools in v0.9.  
Prefer `scripts/tool-calling-probe.mjs`.

---

# 51. SSE Surface

See §28–29 — **yes**, safe `tool_call` / `tool_result` summaries.

---

# 52. Plugin Framework

Tools contributed via existing `kind: 'tool'` contributions. Host may seed reference tools equivalently at Composition bootstrap.

---

# 53. Package Structure (selected)

| Package | Role |
|---|---|
| `@agentprodready/tool-framework` | Amend + reference tools |
| `@agentprodready/ai-provider` | Tool continuation helpers if needed |
| `@agentprodready/ai-provider-openai` | Tools + stream assembly |
| `@agentprodready/runtime` | Tool loop + checkpoints |
| `@agentprodready/platform-host` | Wire Cap/Security/loop/SSE/config/seed |
| `@agentprodready/human-interaction` | Unchanged unless Amendment D |

**Do not create** `@agentprodready/tools` or `@agentprodready/tool-provider-reference` unless packaging clarity demands a tiny reference split — prefer keep reference adapters in tool-framework (already has `ReferenceToolAdapter`).

---

# 54. CI

- `pnpm test:tools` — secret-free reference AI + tools  
- No paid OpenAI in PR CI  
- Live OpenAI tool-calling opt-in only  
- Existing suites stay green  

---

# 55–60. Testing requirements

Must prove inventory sections: contracts, AI loop counts, recovery A–E, Security deny (adapter count 0), streaming regression + tool SSE ordering, architecture boundaries (tool-framework ↛ openai; Runtime ↛ tool authz; adapters ↛ retry policy; Agent ↛ adapter instantiation; host ↛ SDK tool execute).

---

# 61. Manual Probe

`scripts/tool-calling-probe.mjs`:

- `TOOLS_ENABLED=true`, reference AI/tools  
- Objective triggers `reference.echo`  
- Assert: 1 tool call, 1 authz allow, 1 adapter invoke, 1 result, 1 final response  
- Optional streaming variant  

---

# 62. Documentation plan

Create `docs/guides/tools.md`; update README, docs README, `.env.example`, Runtime/Streaming/AI/Security/Plugin guides as needed.

---

# 63. Versioning

Product **0.9.0**. Bump only touched packages (expected: tool-framework, ai-provider, ai-provider-openai, runtime, platform-host).

---

# 64–65. Non-goals & hard security rules

As in product doc. Explicitly prohibit: arbitrary paths, eval, shell, unrestricted FS, unconstrained model SQL.

---

# 66. Stop Conditions

STOP if implementation requires items in plan §10, or:

- Moving auth out of Security  
- Claiming exactly-once external effects  
- Faking durable approval wait without Amendment D  
- New Persistence schema without justification  
- Constitutional Blueprint/ADR changes  
- Re-running the prior AI turn after durable `post-tool` to rediscover calls/arguments  
- Persisting OpenAI SDK types in Runtime checkpoints  
- Host constructing vendor tool messages instead of Amendment B continuation  
- Emitting SSE `tool_call` executing before Security allow / before durable pre-tool  
- Persisting per-call `pre-tool` before Security authorization

---

# 67. Amendments Required Before Autonomous Code

| ID | Path | Required for core v0.9? | Changed by this final correction? |
|---|---|---|---|
| A | `09-tool-calling-result-approval-amendment.md` | **Yes** | Clarified: `tool.started` only after durable pre-tool |
| B | `08-ai-provider-tool-calling-amendment.md` | **Yes** | No (unchanged this pass) |
| C | `04-runtime-tool-loop-checkpoint-amendment.md` | **Yes** | **Yes** — `pre-tool` only after authz+resolution; turn envelope first |
| D | `04-runtime-tool-approval-wait-amendment.md` | **No** (optional HITL) | No |

**Fourth REQUIRED core amendment?** No.  
Blueprint/ADR constitutional amendment: **No**.  
New stop conditions: **Yes** — forbid per-call `pre-tool` before Security authorization.

---

# 68. Deliverables Summary

| Topic | Decision |
|---|---|
| Tool Framework exists? | **Yes** — `@agentprodready/tool-framework` |
| New tool package? | **No** |
| Amendments | A Tool, B AI/OpenAI (+ continuation), C Runtime durable tool-turn (+ optional D) |
| Descriptor | Existing `ToolContract` + `approvalRequirement` |
| ToolCall | Existing `NormalizedToolCall`; name = contract.id; **fully checkpointed** |
| ToolResult | Existing completed + expanded error codes |
| Schema | Existing validator + size limits |
| Side effects | Existing 3-class + idempotency pair |
| Authz | Security per call |
| Approval | Fail-closed unless D |
| Retry / idempotency | Runtime matrix; key `executionId:toolCall.id` |
| Recovery | Envelope ≠ admitted; `pre-tool` = may-have-invoked; `post-tool` = never re-exec + continuation |
| Loop | Sequential bounded |
| OpenAI | Tools + assembly + Amendment B continuation mapping |
| Reference | echo + counter + deterministic AI triggers |
| SSE | `tool_call` `executing` only after durable pre-tool; never for deny/approval/validation |
| Persistence | No new table; args may be in Runtime checkpoint (sensitive handling) |
| Config | TOOLS_ENABLED=false + limits |
| Autonomous safe? | **FAIL** until Review-Gated approval |

---

# 69. Architectural Deviations

None intended. v0.9 productizes BP09 + BP08 tool surfaces through Runtime/Security/Cap ownership already constitutionalized.

Honest limitation: **no exactly-once external tool effects**; durable human approval wait not in core without Amendment D.

---

# 70. Review Checklist

- [ ] Product approved  
- [ ] Plan approved  
- [ ] Specification approved  
- [ ] Amendments A/B/C approved  
- [ ] Amendment D accepted as out-of-scope fail-closed **or** approved for inclusion  
- [ ] Security hard rules acknowledged  
- [ ] Autonomous implementation authorized  

Until checked: **no production code**.
