# Blueprint 04 Implementation Contract Amendment — Tool Approval Wait / Resume

**Amendment ID:** `04-runtime-tool-approval-wait`  
**Status:** Approved for Autonomous implementation (v1.6)  
**Date:** 2026-08-11  
**Implementation Mode:** Autonomous  
**Affects:** `@agentprodready/runtime` + Simple Agent tool loop integration; uses Blueprint 20 ports  
**Related:** [v0.9 Tool Calling specification](../specifications/agentforge-v0.9-tool-calling-agent-actions-specification.md), [v1.6 Production Durability](../../product/agentprodready-v1.6-production-durability.md)  
**Companion:** [04-runtime-tool-loop-checkpoint-amendment.md](./04-runtime-tool-loop-checkpoint-amendment.md)

---

## 1. Problem

Today `approvalRequirement: 'required'` fails closed with `TOOL_APPROVAL_REQUIRED`. Complex agents need:

```text
propose tool → pause for human approval → resume and execute (or reject) → continue
```

across process restarts, without inventing a second Runtime or weakening Security authorization.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 04 / ADR-006 | Runtime owns operational wait / resume |
| Blueprint 20 | Human Interaction owns interaction lifecycle; RuntimeInteractionPort is the ack/resume seam |
| Blueprint 09 | Tool Framework owns tool contracts / invoke; does not own wait |
| v0.9 / v1.0 product | Amendment D deferred; now authorized by v1.6 |

**Blueprint rewrite required?** No.  
**ADR required?** No.

---

## 3. Normative behavior

### 3.1 Enter waiting

When a tool call is authorized by Security and `approvalRequirement === 'required'`:

1. Persist tool-loop checkpoint with call stage **`awaiting-approval`** (additive stage).
2. Issue a Human Interaction approval request (BP20) bound to `executionReference = executionId`.
3. Transition Runtime execution state to **`waiting`**.
4. Surface `TOOL_APPROVAL_REQUIRED` to the caller with stable `approvalId` (= interaction id) and `executionId`.
5. Do **not** invoke the tool adapter until approval completes with an approved outcome.

### 3.2 Resume

When Human Interaction calls `RuntimeInteractionPort.completed`:

| Completion | Runtime action |
|---|---|
| approved / conditionally-approved | Transition `waiting` → `executing`; invoke tool with same `idempotencyKey`; continue tool loop |
| rejected / cancelled / expired / escalated (non-approved) | Fail closed with `TOOL_REJECTED` (or mapped code); do not invoke tool |

Resume **must** reuse the durable `NormalizedToolCall` and `idempotencyKey` from the checkpoint. Do not re-call the AI turn that proposed the tool.

### 3.3 Restart

On `recoverIncomplete` for an execution in `waiting` with `awaiting-approval` tool-loop stage:

- Keep waiting if interaction incomplete.
- If interaction already completed while Runtime was down, apply §3.2.

---

## 4. Additive checkpoint fields

```ts
export type ToolLoopCallStage = 'pre-tool' | 'post-tool' | 'awaiting-approval';

export type ToolLoopCallCheckpoint = Readonly<{
  turn: number;
  toolCall: CheckpointNormalizedToolCall;
  toolId: string;
  sideEffect: 'read-only' | 'mutating' | 'external-side-effect';
  idempotency: 'idempotent' | 'non-idempotent';
  idempotencyKey: string;
  stage: ToolLoopCallStage;
  approvalId?: string; // interaction id when awaiting-approval
  result?: unknown;
}>;
```

---

## 5. RuntimeInteractionPort semantics (normative)

| Method | Meaning |
|---|---|
| `awaiting(interactionId, executionReference)` | Runtime accepted wait; execution is `waiting` |
| `completed(result, executionReference)` | Runtime applies §3.2; `resumedByRuntime: true` when work continues |

Ports remain ack-style; Human Interaction still owns delivery / validation.

---

## 6. Simple Agent surface

```ts
agent.approve(approvalId): Promise<void>
agent.reject(approvalId, reason?: string): Promise<void>
agent.resume(executionId): Promise<AgentResult>
```

`SimpleAgentError` for approval wait includes `approvalId` and `executionId`.

Default embedded HITL store is process-local. When Simple durable Persistence / file durability is configured for the agent run store, wait survives restart.

---

## 7. Out of scope

- Custom approval UI / email / Slack channels (reference delivery only)
- Changing Security ownership of authorization
- Exactly-once guarantees for the tool after approval (still Tool Framework + ledger rules)
- Auto-approving tools

---

## 8. Verification

- Unit: stage transitions, resume-safe, reject path
- Integration: Simple approve → resume completes tool once
- Restart: waiting checkpoint + completed interaction resumes without duplicate AI proposal
