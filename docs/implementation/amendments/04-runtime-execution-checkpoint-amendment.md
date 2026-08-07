# Blueprint 04 Implementation Contract Amendment — Execution Checkpoints for Restart Recovery

**Amendment ID:** `04-runtime-execution-checkpoint`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous (design was Review-Gated; implementation authorized)  
**Affects:** `@agentprodready/runtime` implementation contracts (not Blueprint 04 constitutional text)  
**Related:** [v0.4 Runtime Restart & Recovery specification](../specifications/agentprodready-v0.4-runtime-restart-recovery-specification.md)

---

## 1. Problem

v0.4 requires durable Runtime restart recovery. The current public port is insufficient:

```ts
export interface ExecutionSnapshotPort {
  store(executionId: string, history: readonly StateTransition[]): Promise<void>;
}
```

It is write-only and stores only transition history. Recovery also needs stage cursor, policy deadlines, cancellation, plan/workflow artifacts, and — critically — the **capability invocation result** after a successful invoke so `post-invoke` can complete without re-invoking.

---

## 2. Authority Review

| Source | Finding |
|---|---|
| Blueprint 04 | Owns recovery and resumption points; no requirement that snapshots be history-only |
| ADR-006 | Runtime owns recovery; unchanged |
| ADR-009 / ADR-010 | History immutable; events are facts — unchanged |
| Blueprint 24 | Storage only; Persistence contracts unchanged |

### Blueprint amendment required?

**No.**

### ADR required?

**No.**

---

## 3. Approved Replacement Contracts

### Capability result type (selected)

Existing Runtime surface:

```ts
CapabilityInvocationPort.invoke(...): Promise<unknown>
RuntimeResult<T>.output: T  // T is that invoke return value
```

No separate Runtime-owned normalized capability DTO exists without coupling to AI/host types.

**Selected checkpoint field type:** `unknown`  
**Meaning:** the JSON-serializable return value of `CapabilityInvocationPort.invoke` for this execution — the same value that becomes `RuntimeResult.output` on successful completion.  
**Forbidden:** provider SDK types, host-only types in the Runtime public contract.

Optional documentation alias (same meaning):

```ts
/** JSON-serializable CapabilityInvocationPort.invoke result (= RuntimeResult.output). */
export type CapabilityInvocationResult = unknown;
```

### ExecutionCheckpoint (excerpt)

```ts
export interface ExecutionCheckpoint {
  // ... identity, policy, history, plan?, workflowWork? ...
  readonly stage: ExecutionStage;
  /**
   * Required when stage === 'post-invoke' (and may remain set through terminal).
   * Must be absent or ignored for resume when stage === 'pre-invoke'.
   */
  readonly capabilityResult?: unknown;
  readonly terminal: boolean;
  readonly checkpointVersion: 1;
}
```

### Post-invoke barrier (mandatory)

```text
capability.invoke(...)
  → obtain normalized capability result (unknown / RuntimeResult.output)
  → persist checkpoint {
        stage: 'post-invoke',
        capabilityResult: <that result>,
        ...
     }
  → only then continue toward completing / completed
```

A `post-invoke` checkpoint **must never** be written without a present, JSON-serializable `capabilityResult`.

### ExecutionCheckpointPort

```ts
export interface ExecutionCheckpointPort {
  store(checkpoint: ExecutionCheckpoint): Promise<void>;
  load(executionId: string): Promise<ExecutionCheckpoint | undefined>;
  listIncomplete(options?: { readonly limit?: number }): Promise<readonly ExecutionCheckpoint[]>;
}
```

Replaces `ExecutionSnapshotPort`. No dual legacy API.

---

## 4. Post-invoke recovery algorithm

When `stage === 'post-invoke'`:

1. If `capabilityResult` is present and valid (JSON round-trip / structural presence check as defined in tests)  
   → **do not** call `capability.invoke`  
   → restore persisted `capabilityResult` as the execution output  
   → continue Runtime completion (`completing` → `completed`)  
   → terminalize exactly once via OCC  

2. If `capabilityResult` is absent or invalid  
   → **do not** re-invoke silently  
   → terminalize as normalized recovery failure (`RUNTIME_EXECUTION_FAILED`) **or** defer if `onRestart === 'manual-recovery'`  

---

## 5. ResumeImmediately vs ResumeIfSafe at `pre-invoke`

| Policy | `pre-invoke` behavior |
|---|---|
| `ResumeIfSafe` | **Fail** — no re-invoke (unchanged; must not be weakened) |
| `ResumeImmediately` | **May re-invoke** intentionally |

`ResumeImmediately` at `pre-invoke` is an **explicitly unsafe / operator-selected** policy:

- duplicate external side effects may occur;
- AgentProdReady does **not** claim exactly-once external effects;
- Runtime still guarantees at-most-once **terminalization** via OCC.

---

## 6. Exact-once wording

| Guarantee | Scope |
|---|---|
| Same execution cannot **complete twice** | Runtime terminal state + OCC — **yes** |
| External providers/tools execute exactly once | **No** — not claimed |

---

## 7. Test requirements (design)

Serialization must round-trip `capabilityResult`.

Recovery tests must prove:

1. Crash after capability success but before terminal completion  
2. Restart loads `post-invoke` checkpoint with `capabilityResult`  
3. Capability provider invocation count remains **exactly 1**  
4. Persisted result is used as `RuntimeResult.output`  
5. Execution reaches `completed` exactly once  
6. Output equals the original capability result  

Also cover malformed `post-invoke` (missing result) → fail/defer, no re-invoke.

---

## 8. Compatibility

| Dimension | Classification |
|---|---|
| Change type | Breaking pre-1.0 Runtime implementation-contract amendment |
| Package | `@agentprodready/runtime` (+ host checkpoint adapter) |
| Persistence / Postgres schema | Unchanged |
| Dual ports | None |

---

## 9. Decision Summary

| Question | Answer |
|---|---|
| `capabilityResult` type | `unknown` (= `CapabilityInvocationPort` / `RuntimeResult.output`) |
| post-invoke without result | Forbidden to write; malformed on load → fail/defer |
| ResumeIfSafe @ pre-invoke | Fail (no re-invoke) |
| ResumeImmediately @ pre-invoke | Explicitly unsafe re-invoke permitted |
| Autonomous code | Only after v0.4 design + this amendment approved |
