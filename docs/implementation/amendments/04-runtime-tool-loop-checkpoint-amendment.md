# Blueprint 04 Implementation Contract Amendment — Tool Loop Checkpoint & Recovery

**Amendment ID:** `04-runtime-tool-loop-checkpoint`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Review-Gated  
**Affects:** `@agentprodready/runtime` implementation contracts (not Blueprint 04 constitutional rewrite)  
**Related:** [v0.9 Tool Calling specification](../specifications/agentprodready-v0.9-tool-calling-agent-actions-specification.md)  
**Companion:** [08-ai-provider-tool-calling-amendment.md](./08-ai-provider-tool-calling-amendment.md)

---

## 1. Problem

v0.9 requires a bounded AI ↔ Tool loop with restart recovery. Persisting only `toolCallId` + `toolId` + `result` is insufficient: after a durable `post-tool` checkpoint, restart must resume **AI continuation** without re-running the completed Tool **or** the prior AI turn that proposed the call. That requires durable provider-neutral `NormalizedToolCall` (including arguments), turn order, and the normalized message base used for continuation.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 04 / ADR-006 | Runtime owns operational execution, retry, recovery |
| ADR-011 | Normalize at boundaries; no vendor SDK types in Runtime |
| v0.4 checkpoint pattern | pre-invoke / post-invoke at-most-once capability result |
| v0.9 specification (corrected) | Durable normalized tool-turn state |

**Blueprint amendment required?** No.  
**ADR required?** No.

---

## 3. Recovery invariant (normative)

After:

```text
AI proposes tool call(s)
  → Runtime executes tool(s)
  → ToolResult durably checkpointed (post-tool)
  → process crashes
```

restart **MUST**:

```text
load checkpoint
  → reconstruct normalized AI continuation input
  → reuse durable ToolResult(s)
  → call AI continuation
  → produce final response (or next bounded tool turn)
```

without:

- executing any completed tool again;
- calling the prior AI turn again to rediscover tool calls;
- generating a new `toolCallId`;
- changing the idempotency identity (`executionId:toolCallId`).

---

## 4. Frozen `toolLoop` checkpoint shape

Additive optional field on `ExecutionCheckpoint` (or nested under existing JSON-serializable metadata owned by Runtime). Types below are **JSON-serializable** and provider-neutral. Runtime does **not** import OpenAI SDK types. Shapes mirror `@agentprodready/ai-provider` `NormalizedToolCall` / `AiMessage` / Tool Framework `NormalizedToolResult` without requiring Runtime to depend on those packages for the public checkpoint DTO (document equivalence; implementation may share types via careful dependency direction approved at code time, or duplicate structural types as `unknown`-validated JSON).

```ts
/** Structural mirror of NormalizedToolCall — provider-neutral. */
export type CheckpointNormalizedToolCall = Readonly<{
  id: string;
  name: string;
  arguments: Readonly<Record<string, unknown>>;
}>;

export type ToolLoopCallStage = 'pre-tool' | 'post-tool';

export type ToolLoopCallCheckpoint = Readonly<{
  /** AI tool-loop turn index that proposed this call (1-based or 0-based — freeze at implement: 0-based). */
  turn: number;
  /** Complete normalized tool call (id + name + arguments). Required at pre-tool and post-tool. */
  toolCall: CheckpointNormalizedToolCall;
  /** Resolved ToolContract.id (equals toolCall.name in v0.9). */
  toolId: string;
  sideEffect: 'read-only' | 'mutating' | 'external-side-effect';
  idempotency: 'idempotent' | 'non-idempotent';
  /** Stable: `${executionId}:${toolCall.id}` — never regenerated. */
  idempotencyKey: string;
  stage: ToolLoopCallStage;
  /** Required when stage === 'post-tool'; JSON-serializable NormalizedToolResult. */
  result?: unknown;
}>;

export type ToolLoopCheckpoint = Readonly<{
  turn: number;
  maxTurns: number;
  /**
   * Normalized AI messages preceding the assistant tool-proposing turn for the active loop.
   * Structural AiMessage[] JSON (roles/content/toolCallId/toolCalls) — never vendor SDK types.
   * Required on the turn envelope (persisted before any per-call pre-tool).
   * Turn envelope alone does NOT mean any tool was authorized or started.
   */
  baseMessages: unknown;
  /**
   * Complete ordered NormalizedToolCall list proposed by the current AI turn.
   * Fixed at turn acceptance (before any authorization or tool execution);
   * ids/order/arguments immutable thereafter.
   */
  proposedCalls: readonly CheckpointNormalizedToolCall[];
  /**
   * Per-call progress ONLY for calls admitted to execution (after authz + resolution).
   * Denied / approval-required / validation-failed calls MUST NOT appear here as pre-tool.
   */
  calls: readonly ToolLoopCallCheckpoint[];
}>;

// On ExecutionCheckpoint:
readonly toolLoop?: ToolLoopCheckpoint;
```

### Field rules

| Field | Rule |
|---|---|
| `toolCall` | Full `NormalizedToolCall` shape at **pre-tool** and **post-tool**; arguments required |
| `proposedCalls` | Entire AI turn’s calls in declaration order; never regenerated |
| `baseMessages` | Enough to rebuild continuation without re-invoking the proposing AI turn |
| `idempotencyKey` | `${executionId}:${toolCall.id}` only |
| `result` | Present iff `stage === 'post-tool'` |
| OpenAI / SDK types | **Forbidden** in checkpoint |

---

## 5. Checkpoint ordering (normative)

### 5.1 Turn envelope first (not admission)

```text
AI returns complete ordered NormalizedToolCall[] for turn T
  → persist toolLoop turn envelope {
        turn: T,
        maxTurns,
        baseMessages,
        proposedCalls: <full ordered list>,
        calls: <prior admitted calls only>
     }
```

This preserves the proposing AI turn for restart recovery.  
It does **NOT** mean any tool was authorized or started.

### 5.2 Per-call order (exact)

For each proposed call, in declaration order:

```text
ToolRegistry lookup
  → ToolContract / input validation
  → argument-size validation
  → Security authorization
  → approvalRequirement evaluation
  → Capability Resolution
  → Composition resolves ToolAdapter
  → persist per-call stage='pre-tool' checkpoint
       (complete NormalizedToolCall + stable idempotencyKey)
  → emit tool.started / SSE tool_call status='executing'
  → ToolInvocationCoordinator.invoke
  → normalize ToolResult
  → result-size validation
  → persist stage='post-tool' checkpoint (same toolCall + result)
  → emit completed/failure facts as appropriate
  → next call / AI continuation
```

**Forbidden:** persist per-call `stage='pre-tool'` before Security authorization (or before validation / approval policy / Cap+Composition resolution succeed).

### 5.3 Meaning of `pre-tool` (frozen)

`stage === 'pre-tool'` means **all** of:

- the complete `NormalizedToolCall` is durable;
- validation passed;
- Security authorized execution;
- approval policy permitted execution;
- implementation resolution succeeded;
- stable `idempotencyKey` is fixed;
- the tool **may have been invoked** after this checkpoint.

Therefore a crash from `pre-tool` legitimately represents the  
**external-effect certainty unknown** recovery boundary.

### 5.4 Denied / approval-required / validation (no pre-tool)

| Outcome | Per-call `pre-tool`? | Adapter invoke | Facts / SSE |
|---|---|---|---|
| Security deny | **No** | 0 | `tool.denied` + audit; normalized authz outcome per loop semantics; **no** SSE `tool_call` executing |
| `approvalRequirement='required'` without Amendment D | **No** | 0 | `tool.approval-required`; `TOOL_APPROVAL_REQUIRED`; fail closed; **no** execution window |
| Unknown tool / bad args / oversize args / schema / duplicate conflicting `toolCallId` | **No** | 0 | Fail before pre-tool; **not** `TOOL_UNSAFE_RECOVERY` |

Turn envelope (`proposedCalls` + `baseMessages`) **may** remain durable for diagnostics / deterministic recovery evidence.

---

## 6. Multi-call turn reconstruction

When one AI turn proposes multiple calls:

- Persist turn envelope (`proposedCalls` order) before admitting any call.
- Preserve every `toolCall.id` / `name` / `arguments` on the envelope; admitted calls gain `pre-tool`/`post-tool` entries only after authz+resolution.
- After restart: no per-call checkpoint → call was never admitted (re-run admission from envelope; do not treat as unknown external effect).
- Skip any `post-tool` calls; for `pre-tool` without `post-tool` apply §7 unknown-window policy.
- When all required results exist: reconstruct continuation from `baseMessages` + `proposedCalls` + durable results — **never** re-call the proposing AI turn.

---

## 7. Recovery matrix

| Case | Meaning | Behavior |
|---|---|---|
| No per-call checkpoint | Tool never admitted to execution | Not an unknown external-effect window; may re-attempt admission from envelope subject to loop/deny/policy |
| **A.** `pre-tool` durable; tool not certainly completed | Invocation **may** have occurred | **read-only / idempotent:** may retry per Runtime policy with **same** `toolCall.id`, arguments, `idempotencyKey`. **non-idempotent:** `TOOL_UNSAFE_RECOVERY` — no silent execution |
| **B.** `post-tool` durable | Durable normalized result exists | **NEVER** re-execute. Reconstruct AI continuation from durable turn + result |
| **C.** Crash during AI continuation after `post-tool` | Same as B for tools | Reuse durable results; do not regenerate ids |

Exactly-once external effects: **not claimed**.

### SSE alignment

`tool_call` with `status='executing'` only after validation + authorization + approval policy + resolution + **durable pre-tool** checkpoint, immediately before/when Tool execution starts.

Never for: mere AI proposal, validation failure, Security denial, approval-required failure.

---

## 8. Duplicate `toolCallId` protection

Within one `executionId`, `toolCall.id` uniquely identifies one logical Tool action and therefore one `idempotencyKey`.

| Emission | Behavior |
|---|---|
| Duplicate id with identical call (same name + arguments) | Fail closed or treat as idempotent no-op — **selected: fail closed** (`TOOL_VALIDATION` / Runtime conflict) to avoid ambiguous ordering |
| Duplicate id with different name/arguments | **Fail closed** |
| Same id reused across different turns | **Fail closed** |

Two different logical actions **MUST NOT** share `executionId:toolCallId`.

---

## 9. Sensitive arguments

Normalized ToolCall arguments are durable checkpoint state:

- never log by default;
- never emit via SSE `tool_call` by default;
- Audit uses safe summaries/references only;
- persistence follows existing Runtime/Persistence sensitive-data handling;
- `TOOL_MAX_ARGUMENT_BYTES` applies during validation **before** per-call `pre-tool`;
- no new encryption/KMS in v0.9 unless already required elsewhere.

---

## 10. Continuation handoff

Runtime supplies durable normalized tool-turn state to the AI Provider continuation contract defined in Amendment B. Runtime / platform-host **MUST NOT** construct OpenAI `role=tool` messages directly.

---

## 11. Non-goals

- New `tool_calls` Persistence table  
- Vendor SDK types in checkpoints  
- Claiming exactly-once external side effects  
- Re-running the proposing AI turn to recover arguments  

---

## 12. Status

**Implemented** after v0.9 verification (`pnpm verify`, `pnpm test:tools`, tool-calling probe).
