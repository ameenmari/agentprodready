# AgentProdReady v0.4 Runtime Restart & Recovery — Implementation Specification

**Document Version:** 1.0  
**Product Version:** 0.4.0  
**Status:** In Review  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07

---

# Authority and Mode

```text
Implementation Mode: Review-Gated
```

This specification records exact design decisions for Runtime restart/recovery. It does **not** authorize production code until approved.

Architectural authority order remains Foundation → ADRs → Blueprint 04 → dependencies → Governance → this specification → conforming code.

---

# 1. Recovery Ownership Confirmation

| Concern | Owner | Must not own |
|---|---|---|
| Restart detection / incomplete scan | Runtime | Persistence, Workflow, Agent, Composition |
| Resume vs fail decision | Runtime | Event Bus subscribers |
| Retry scheduling after recover | Runtime | Providers |
| Timeout deadline evaluation at restart | Runtime | Persistence |
| Cancellation evaluation at restart | Runtime | Persistence |
| Checkpoint bytes durability | Persistence provider | Recovery policy |
| Plan creation | Planning | Runtime business planning |
| Stage ordering semantics | Workflow | Runtime workflow graphs |
| Instantiation of adapters | Composition | Recovery decisions |
| Authorization decisions | Security | Runtime |

**Rule:** Persistence stores; Runtime decides. Events announce facts; they never command recovery (ADR-010).

---

# 2. Blueprint Wording Clarification (No Constitutional Rewrite)

Blueprint 04 states the Runtime is a “Stateless Execution Engine” and “No execution state survives after completion.”

**Interpretation for v0.4 (implementation specification):**

- “Completion” means a **terminal** state: `completed` | `failed` | `cancelled`.
- Incomplete / interrupted executions **may** retain durable Runtime checkpoints until terminalized.
- After terminalization, checkpoints remain readable for audit/diagnostics but are excluded from recovery scans.
- Business components remain unaware of persistence strategies (BP04 §16.3).

This does **not** require amending Blueprint 04 text.

---

# 3. Persisted Runtime State

## 3.1 Must Persist (`ExecutionCheckpoint`)

| Field | Type (conceptual) | Purpose |
|---|---|---|
| `executionId` | string | Stable identity |
| `state` | `ExecutionState` | Last durable lifecycle state |
| `stage` | `ExecutionStage` | Resume cursor (see §5) |
| `history` | `StateTransition[]` | Immutable append-only transitions |
| `attempts` | number | Retry attempts so far |
| `maxAttempts` | number | Policy snapshot |
| `startedAt` | ISO string | Start time |
| `deadlineAt` | ISO string | `startedAt + timeoutMs` |
| `timeoutMs` | number | Policy snapshot |
| `cancelled` | boolean | Durable cancellation flag |
| `cancellationReason` | string? | Optional |
| `correlationId` | string | From ExecutionContext |
| `causationId` | string \| null | From context |
| `tenantId` / `workspaceId` / `projectId` | strings | Scope for Persistence + Security |
| `input` | unknown | Original RuntimeRequest input (JSON-serializable) |
| `contextRequest` | `CreateExecutionContextRequest` | Enough to recreate scope/context |
| `plan` | unknown? | Present after successful planning |
| `workflowWork` | unknown? | Present after workflow stage returns |
| `capabilityResult` | unknown? | Present after successful capability invoke; **required** when `stage === 'post-invoke'`. JSON-serializable return value of `CapabilityInvocationPort.invoke` (same value as `RuntimeResult.output`). No provider SDK types. |
| `recoveryPolicy` | `RecoveryPolicyBundle` | Policy snapshot at start |
| `terminal` | boolean | True when state ∈ terminal set |
| `checkpointVersion` | number | Monotonic checkpoint schema version (`1` for v0.4) |
| `updatedAt` | ISO string | Last checkpoint write |
| `leaseOwner` / `leaseExpiresAt` | optional strings | **Reserved** for future multi-instance; unused in v0.4 single-process |

## 3.2 Must Not Persist

| Item | Reason |
|---|---|
| Live `AbortSignal` / timers | Process-local only |
| Open DB clients / sockets | Infrastructure |
| Composition container graph | Rebuilt on boot |
| Security secrets / API keys | Config/env injection |
| Full Observability buffers | Operational, not SoR |
| Agent registry / audit store / event journal | Other owners; out of v0.4 |
| AI provider streams / tool sessions | Not Runtime checkpoint |
| Mutable Workflow engine internals beyond `workflowWork` artifact | Workflow redesign out of scope |

---

# 4. Restart Flow

```text
Runtime.execute(...)
  → authorize / policy snapshot
  → checkpoint(stage=accepted)
  → planning → checkpoint(post-planning, plan)
  → workflow  → checkpoint(post-workflow, workflowWork)
  → checkpoint(pre-invoke)
  → capability.invoke(...) → obtain normalized capabilityResult
  → checkpoint(post-invoke, capabilityResult)   // NEVER without capabilityResult
  → completing → completed (terminal checkpoint)

Process crash at any non-terminal point
  → durable checkpoint remains (postgres) or is lost (in-memory)

Host / Runtime boot
  → Runtime.recoverIncomplete({ now, limit? })
  → load incomplete checkpoints (terminal=false)
  → for each checkpoint, evaluate RecoveryPolicyBundle
       → FailIfCancelled / FailIfExpired → terminalize safely
       → ManualRecovery → skip auto-resume; emit fact
       → ResumeImmediately / ResumeIfSafe → resume from stage
            (post-invoke: restore capabilityResult, do NOT re-invoke)
  → resume continues delegated stages
  → terminalize exactly once (OCC)
```

Composition may invoke `recoverIncomplete` during host seed/boot when recovery is enabled. HTTP handlers do not implement recovery logic.

---

# 5. Checkpoint Strategy

## 5.1 Stages (`ExecutionStage`)

```ts
type ExecutionStage =
  | 'accepted'          // context created, pre-planning
  | 'post-planning'     // plan artifact durable
  | 'post-workflow'     // workflow work artifact durable
  | 'pre-invoke'        // about to call capability (unsafe by default)
  | 'post-invoke'       // capability returned AND capabilityResult durable (pre-completing)
  | 'terminal';         // completed | failed | cancelled
```

`post-invoke` means the normalized capability result is already durable. It is not merely “invoke returned in memory.”

## 5.2 When checkpoints occur

| Barrier | Required |
|---|---|
| Every successful `ExecutionState` transition publish | Yes — upsert checkpoint including new history item |
| After planning resolves | Yes — set `plan`, stage=`post-planning` |
| After workflow.execute resolves | Yes — set `workflowWork`, stage=`post-workflow` |
| Immediately before capability.invoke | Yes — stage=`pre-invoke` (no `capabilityResult` yet) |
| After capability.invoke resolves with a result | Yes — stage=`post-invoke` **and** `capabilityResult=<result>` in the **same** checkpoint write. Forbidden to persist `post-invoke` without `capabilityResult`. |
| Terminal transition | Yes — `terminal=true`, stage=`terminal` (may retain `capabilityResult` for completed outputs) |

### 5.2.1 Post-invoke barrier (precise)

```text
capability.invoke(...)
  → obtain normalized capability result (CapabilityInvocationPort return / RuntimeResult.output)
  → persist checkpoint:
       stage = 'post-invoke'
       capabilityResult = normalized result
  → only then continue toward completing / completed
```

If the process crashes after invoke success but before this checkpoint commit, the durable stage remains `pre-invoke` (or earlier). Recovery then follows `pre-invoke` policy — not `post-invoke`.

## 5.3 Transaction / atomicity

- Checkpoint upsert is one Persistence repository write (save with expected revision/token when updating).
- Ordering relative to Event publish: **checkpoint write succeeds before or with the same durability boundary as the corresponding Runtime fact publish**. Preferred implementation order:
  1. validate transition in memory
  2. upsert checkpoint
  3. publish Runtime fact + telemetry  
  If (2) fails, do not publish the fact. If (3) fails after (2), recovery may see state without fact — acceptable; facts are not the recovery journal.
- Do not require a multi-table Persistence transaction for v0.4 single-repository checkpoints.
- Partial process kill during upsert: OCC + restart scan must tolerate last fully committed checkpoint only.

## 5.4 Performance

- Checkpoint payload should remain JSON-serializable and bounded (reject non-serializable input at execute start with `RUNTIME_EXECUTION_FAILED` or validation error).
- Default local reference payloads are small (plan/workflow artifacts already modest).
- No checkpointing on a timer loop in v0.4 — barrier-based only.

---

# 6. Recovery Policies

```ts
type RecoveryDecision =
  | 'resume-immediately'
  | 'resume-if-safe'
  | 'fail-if-expired'
  | 'fail-if-cancelled'
  | 'manual-recovery';

interface RecoveryPolicyBundle {
  readonly onRestart: 'resume-immediately' | 'resume-if-safe' | 'manual-recovery';
  readonly failIfExpired: boolean;      // default true
  readonly failIfCancelled: boolean;    // default true
}
```

### Evaluation order (mandatory)

1. If `terminal` → ignore (should not appear in incomplete list).
2. If `failIfCancelled && cancelled` → terminalize `cancelled`.
3. If `failIfExpired && now >= deadlineAt` → terminalize `failed` / `RUNTIME_TIMEOUT`.
4. If `onRestart === 'manual-recovery'` → emit `runtime.recovery.deferred`; do not resume.
5. If `onRestart === 'resume-immediately'` → resume from stage (§6.1 for `pre-invoke`).
6. If `onRestart === 'resume-if-safe'`:
   - resume if stage ∈ {`accepted`,`post-planning`,`post-workflow`,`post-invoke`} (with §6.2 for `post-invoke`)
   - if stage === `pre-invoke` → terminalize `failed` with code `RUNTIME_EXECUTION_FAILED` (unsafe resume boundary; **no re-invoke**; must not be weakened)
7. Future policies may extend the union without changing ownership.

Host default when durable recovery enabled:

```ts
{ onRestart: 'resume-if-safe', failIfExpired: true, failIfCancelled: true }
```

### 6.1 ResumeImmediately at `pre-invoke`

`ResumeImmediately` **intentionally permits re-invocation** from `pre-invoke`.

This is an **explicitly unsafe / operator-selected** policy:

- duplicate external side effects may occur;
- AgentProdReady does **not** claim exactly-once external provider/tool effects;
- Runtime still enforces at-most-once **terminalization** via OCC.

Do **not** treat `ResumeImmediately` as the default for durable local reference recovery.

### 6.2 Recovery from `post-invoke`

When `stage === 'post-invoke'`:

| Condition | Behavior |
|---|---|
| Valid durable `capabilityResult` present | **Do not** call `capability.invoke`. Restore persisted result as execution output. Continue `completing` → `completed`. Terminalize exactly once (OCC). |
| `capabilityResult` absent or invalid | **Do not** re-invoke silently. Terminalize as normalized recovery failure (`RUNTIME_EXECUTION_FAILED`) **or** defer if `onRestart === 'manual-recovery'`. |

A checkpoint with `stage === 'post-invoke'` and missing `capabilityResult` is **malformed**.

---

# 7. Idempotency

| Guarantee | Mechanism |
|---|---|
| Same execution cannot **complete** twice (Runtime terminalization) | Terminal checkpoint write uses OCC; second terminalizer loses and stops |
| External providers/tools execute exactly once | **Not claimed** — especially across `pre-invoke` + `ResumeImmediately` |
| Incomplete list excludes terminals | Query `terminal=false` |
| Resume does not re-run finished stages | Stage cursor: skip planning if `plan` present; skip workflow if `workflowWork` present; at `post-invoke` restore `capabilityResult` and skip invoke; `ResumeIfSafe` never auto-resumes from `pre-invoke` |
| Duplicate recoverIncomplete calls | v0.4 single-process: recoverIncomplete serialized by host boot |
| Event history not rewritten | Append new transitions only (ADR-009) |

**Unsafe boundary:** crash after `pre-invoke` and before durable `post-invoke` (with `capabilityResult`) may already have produced external side effects. Under `ResumeIfSafe`, Runtime **fails** rather than guessing. Under `ResumeImmediately`, re-invoke is an explicit operator choice (§6.1).

---

# 8. Timeouts

| Topic | Decision |
|---|---|
| Deadline persistence | `deadlineAt = startedAt + timeoutMs` stored in checkpoint at start |
| In-process enforcement | Existing TimeoutManager continues |
| Restart behavior | Re-evaluate `now` vs `deadlineAt` before resume |
| Expired | Terminal `failed` with `RUNTIME_TIMEOUT`; emit facts; no resume |
| Clock source | Runtime `now()` dependency (injectable for tests) |

---

# 9. Cancellation

| Topic | Decision |
|---|---|
| Persistence | `cancelled=true` (+ optional reason) on checkpoint when cancelling path starts |
| In-process | Existing AbortSignal path |
| Restart | If cancelled flag set → terminalize cancelled (when `failIfCancelled`) |
| Partial cancellation | Cooperative: mark cancelled, attempt graceful terminalization; do not resume work |
| External cancel after crash | Future host/API may set cancelled flag on checkpoint; out of v0.4 HTTP scope unless trivial boot-only |

---

# 10. Event Bus Impact

Emit **facts** via existing `RuntimeEventPublisher` (bootstrap) / future Event Bus integration:

| Fact type | When |
|---|---|
| `runtime.execution.<state>` | Existing transition facts (unchanged pattern) |
| `runtime.recovery.started` | recoverIncomplete begins processing a checkpoint |
| `runtime.recovery.resumed` | resume path begins delegated work |
| `runtime.recovery.completed` | recovery path reaches terminal `completed` |
| `runtime.recovery.failed` | recovery path terminalizes failed/cancelled/deferred unsafe |
| `runtime.recovery.deferred` | ManualRecovery leave-in-place |

Rules:

- Never emit command-like events (`RetryExecution`, `ResumeExecution`).
- Do not re-publish the entire historical transition set on resume.
- Append only new transitions/facts for work performed after restart.

Extend `RuntimeFact.type` usage accordingly; keep payload fields stable (`executionId`, `correlationId`, `occurredAt`, `state`).

---

# 11. Audit Impact

| Evidence | Source |
|---|---|
| Recovery started/resumed/completed/failed | Runtime facts → existing host audit ingestion patterns where already wired |
| Terminal outcome | `runtime.execution.completed\|failed\|cancelled` |
| No mutation of prior audit records | ADR-009 |

v0.4 does not add a new Audit storage backend. It ensures recovery emits accountable facts with correlation/execution ids.

---

# 12. Observability Impact

| Signal | Detail |
|---|---|
| Logs | Structured operational logs: recovery started/resumed/failed with executionId (no secrets) |
| Metrics | Counters: `runtime.recovery.started`, `.resumed`, `.completed`, `.failed`, `.deferred`, `.unsafe_fail` |
| Traces | Span/attribute on recoverIncomplete batch and per-execution resume |
| Diagnostics | Extend Runtime diagnostics with `recoverable` / `recovered` counts (process-local) |
| Telemetry port | Extend `RuntimeTelemetry` with optional recovery hooks **or** map through existing `transition`/`failed` — prefer additive optional methods with no-op default |

---

# 13. PostgreSQL / Persistence Usage

## 13.1 Preferred artifacts (no new tables)

| Artifact | Use |
|---|---|
| `PersistenceProvider.repository('runtime-executions')` | Checkpoint CRUD |
| `PersistedEntity.data` | Serialized `ExecutionCheckpoint` |
| Optimistic concurrency | `revision` + `versionToken` for upsert/terminal races |
| `PersistenceFramework.begin` | Only if future multi-entity writes needed; not required for v0.4 single-row upsert |
| `SnapshotStore` | **Not used** for mutable Runtime checkpoints |
| `schema_migrations` / v0.3 tables | Unchanged |

## 13.2 Adapter ownership

```text
PersistenceExecutionCheckpointStore
  implements amended ExecutionSnapshotPort / ExecutionCheckpointPort
  uses PersistenceProvider (in-memory or postgres)
  lives in @agentprodready/runtime reference OR platform-host composition helpers
  MUST NOT live inside @agentprodready/persistence-postgres as Runtime logic
```

Recommendation: implement adapter in `packages/runtime` reference layer depending on `@agentprodready/persistence` (already a platform pattern for ports). If dependency direction forbids runtime→persistence today, place adapter in `platform-host` composition and keep Runtime depending only on the port — **preferred if package deps block runtime→persistence**.

**Dependency check (implementation time):** today `@agentprodready/runtime` depends on foundation + composition only. Adding persistence dependency may be undesirable.

**Selected resolution:** keep Runtime free of Persistence package dependency. Place `PersistenceExecutionCheckpointStore` in `apps/platform-host` (or a tiny `@agentprodready/runtime-persistence` adapter package only if host placement becomes unwieldy). Runtime continues to depend on the port alone.

## 13.3 Schema impact

| Change | v0.4 |
|---|---|
| New SQL tables | **None** |
| Migration files | **None** (unless stop condition forces otherwise) |
| Postgres provider code | Untouched except being selectable as PersistenceProvider |

If repository query filtering proves insufficient for `listIncomplete`, **stop** and propose the smallest Persistence query amendment or a dedicated index table — do not silently add Runtime SQL.

---

# 14. Runtime Implementation Contract Amendment (Required)

## 14.1 Replace write-only history port

```ts
export type ExecutionStage =
  | 'accepted'
  | 'post-planning'
  | 'post-workflow'
  | 'pre-invoke'
  | 'post-invoke'
  | 'terminal';

/** JSON-serializable CapabilityInvocationPort.invoke result (= RuntimeResult.output). */
export type CapabilityInvocationResult = unknown;

export interface ExecutionCheckpoint {
  readonly executionId: string;
  readonly state: ExecutionState;
  readonly stage: ExecutionStage;
  readonly history: readonly StateTransition[];
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly startedAt: string;
  readonly deadlineAt: string;
  readonly timeoutMs: number;
  readonly cancelled: boolean;
  readonly cancellationReason?: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly tenantId: string;
  readonly workspaceId?: string;
  readonly projectId?: string;
  readonly input: unknown;
  readonly contextRequest: CreateExecutionContextRequest;
  readonly plan?: unknown;
  readonly workflowWork?: unknown;
  /**
   * Required when stage === 'post-invoke'.
   * JSON-serializable invoke result; never provider SDK types.
   */
  readonly capabilityResult?: CapabilityInvocationResult;
  readonly recoveryPolicy: RecoveryPolicyBundle;
  readonly terminal: boolean;
  readonly checkpointVersion: 1;
  readonly updatedAt: string;
}

export interface ExecutionCheckpointPort {
  store(checkpoint: ExecutionCheckpoint): Promise<void>;
  load(executionId: string): Promise<ExecutionCheckpoint | undefined>;
  listIncomplete(options?: { readonly limit?: number }): Promise<readonly ExecutionCheckpoint[]>;
}
```

Compatibility:

- Remove/replace `ExecutionSnapshotPort.store(executionId, history)` as the canonical port.
- No dual legacy port. Update in-memory adapter and all call sites in one migration.
- Classification: **breaking pre-1.0 Runtime implementation-contract change**, localized to `@agentprodready/runtime` + host wiring.

## 14.2 Runtime API additions

```ts
export interface RecoverIncompleteRequest {
  readonly now?: Date;
  readonly limit?: number;
}

export interface RecoverIncompleteResult {
  readonly examined: number;
  readonly resumed: number;
  readonly failed: number;
  readonly deferred: number;
  readonly outcomes: readonly RecoverOutcome[];
}

// RuntimeOrchestrator
recoverIncomplete(request?: RecoverIncompleteRequest): Promise<RecoverIncompleteResult>;
```

Resume uses stored `contextRequest` + `input` + artifacts; does not accept a new client invoke payload for the same `executionId`.

## 14.3 Policy additions

Extend `RuntimePolicy` **or** adjacent provider:

```ts
interface RuntimePolicy {
  // existing fields...
  readonly recovery?: RecoveryPolicyBundle; // default ResumeIfSafe bundle when absent
}
```

---

# 15. Failure Scenarios

| Scenario | Behavior |
|---|---|
| Process killed mid-stage | Last committed checkpoint used; ResumeIfSafe applies |
| Host restart | Boot calls recoverIncomplete when enabled |
| Database unavailable | Checkpoint store fails → execution fails normalized; recovery scan fails host readiness if durable recovery required |
| Partial checkpoint write | OCC / provider atomic upsert; incomplete write not visible |
| Duplicate restart / double recoverIncomplete | Second pass sees terminal or already-resumed state; no double complete |
| Timeout during restart evaluation | FailIfExpired terminalizes before resume |
| Cancel during restart evaluation | FailIfCancelled terminalizes |
| Crash during recovery resume | New checkpoint barriers continue; eventual terminalization |
| Crash after invoke success, before `post-invoke` checkpoint | Durable stage remains `pre-invoke`; ResumeIfSafe fails; ResumeImmediately may re-invoke (unsafe) |
| Crash after durable `post-invoke` (with `capabilityResult`), before terminal | Restore result; complete without re-invoke; invoke count stays 1 |
| Malformed `post-invoke` (missing/invalid `capabilityResult`) | Fail or defer; **never** silent re-invoke |
| In-memory provider + restart | Checkpoints lost (accurate non-durable declaration); document clearly |

---

# 16. Manual Verification

Deterministic probe (Postgres):

1. `pnpm db:up && pnpm db:migrate`
2. Start host/probe with `PERSISTENCE_PROVIDER=postgres` and recovery enabled
3. Begin execution that checkpoints at `post-workflow` then waits/kills before invoke (test harness injects crash)
4. Confirm checkpoint row in `runtime-executions` repository
5. Stop process
6. Start again; `recoverIncomplete` runs
7. Assert resume or safe-fail per policy
8. Assert single terminal outcome; no duplicate `completed` facts for same executionId
9. Repeat for expired deadline and cancelled flag cases
10. Repeat **post-invoke crash**: after invoke success + durable `capabilityResult`, kill before terminal; restart; assert invoke count **1**, output equals original result, single `completed`

---

# 17. CI Impact

| Suite | Placement |
|---|---|
| Checkpoint serialize + policy unit tests (incl. `capabilityResult` round-trip) | `pnpm test` (no DB) |
| In-memory crash/resume simulation | `pnpm test` |
| Post-invoke recovery (invoke count = 1, output restored) | `pnpm test` (+ durable suite) |
| Malformed `post-invoke` checkpoint | `pnpm test` |
| Durable Postgres recovery | Additive job or extend `persistence-postgres` with `pnpm test:runtime-recovery` |
| Default `verify` / `docker` | Remain in-memory; recovery boot optional/off |
| Secrets | None for CI ephemeral Postgres |

Do not make Postgres mandatory for reference smoke.

### 17.1 Required automated recovery proofs

1. Crash after capability success but before terminal completion  
2. Restart loads `post-invoke` checkpoint with `capabilityResult`  
3. Capability provider invocation count remains **exactly 1**  
4. Persisted result is used as `RuntimeResult.output`  
5. Execution reaches `completed` exactly once  
6. Output equals the original capability result  
7. Malformed `post-invoke` → fail/defer, invoke count unchanged (no re-invoke)  
8. `ResumeIfSafe` @ `pre-invoke` → fail (no re-invoke)  
9. Serialization round-trips `capabilityResult`

---

# 18. Documentation Updates (Post-Approval Implementation)

| Doc | Update |
|---|---|
| `docs/guides/runtime-recovery.md` | Create — operator + engineer recovery guide |
| `docs/guides/persistence.md` | Cross-link: Runtime checkpoints use repository rows |
| `README.md` / `docs/README.md` | v0.4 pointers |
| `.env.example` | `RUNTIME_RECOVERY_ENABLED` (default false) |
| package READMEs | runtime + host |

Optional but recommended before/with release tagging: root `CHANGELOG.md` entries for v0.1–v0.4.

---

# 19. Future Compatibility (Non-Goals Now)

Reserve checkpoint fields `leaseOwner` / `leaseExpiresAt` for future multi-instance claiming.

Future distributed runtime may:

1. claim leases before resume,
2. run leader election outside Runtime policy ownership,
3. still keep resume/fail decisions inside Runtime.

No ownership change required then.

---

# 20. Explicit Non-Goals

- Distributed scheduling, HA clustering, Kubernetes failover  
- Redis / Kafka / NATS / RabbitMQ  
- Workflow redesign / AI redesign / Memory / vectors / streaming / tool-calling  
- New Persistence public contracts  
- New Postgres schema tables for v0.4  
- Guaranteeing external side-effect idempotency across `pre-invoke` crashes  

---

# 21. Configuration Surface (Host)

| Variable | Default | Meaning |
|---|---|---|
| `RUNTIME_RECOVERY_ENABLED` | `false` | Boot-time `recoverIncomplete` |
| `PERSISTENCE_PROVIDER` | `in-memory` | Checkpoint durability follows provider |
| Existing Postgres vars | — | Required only when postgres |

When recovery enabled + in-memory: allowed for tests; document that restart will not find checkpoints.

When recovery enabled + postgres: require migrated DB (existing readiness).

---

# 22. Files to Create / Modify (After Approval)

## Create

```text
docs/guides/runtime-recovery.md
docs/implementation/amendments/04-runtime-execution-checkpoint-amendment.md  (design recorded)
docs/implementation/reports/agentprodready-v0.4-...-report.md
docs/implementation/checklists/agentprodready-v0.4-...-checklist.md
packages/runtime checkpoint types/tests (incl. capabilityResult + post-invoke recovery)
apps/platform-host persistence-backed checkpoint store
scripts/runtime-recovery-probe.mjs
```

## Modify

```text
packages/runtime/src/contracts/runtime.ts
packages/runtime/src/application/runtime.ts
packages/runtime/src/reference/adapters.ts
packages/runtime specs
apps/platform-host composition/config/smoke/tests
README.md, docs/README.md, .env.example
CI workflow (additive recovery job optional)
```

## Do Not Modify

```text
docs/adrs/**, docs/blueprints/**
packages/persistence public contracts
packages/persistence-postgres schema
OpenAI provider package architecture
```

---

# 23. Stop Conditions

Stop and report if implementation would require:

1. Changing ADRs or Blueprint constitutional text (beyond this clarification).  
2. Changing Persistence public contracts or adding Runtime SQL tables without a new approved design delta.  
3. Event Bus commanding recovery.  
4. Silent auto-resume across `pre-invoke` under ResumeIfSafe.  
5. Writing `post-invoke` without durable `capabilityResult`, or re-invoking when a valid `capabilityResult` exists.  
6. Host HTTP handlers embedding recovery/SQL.  
7. Making default CI require Postgres secrets.  
8. Transferring recovery ownership out of Runtime.  
9. Workflow/AI/Memory redesign to make basic restart work.  
10. Coupling Runtime checkpoint contracts to AI/provider SDK result types.

---

# 24. Architectural Deviations

| Item | Status |
|---|---|
| Interpret BP04 “no state after completion” as terminal-only | Clarification in this spec — not a blueprint edit |
| Replace `ExecutionSnapshotPort` history-only API | Planned approved amendment (pre-1.0) |
| Adapter in host to avoid runtime→persistence dependency | Intentional boundary preservation |
| No new Postgres tables | Prefer existing entities repository |

---

# 25. Review End-State Summary

| Item | Decision |
|---|---|
| Recovery ownership | **Runtime only** |
| Persisted state | `ExecutionCheckpoint` in §3 including `capabilityResult?: unknown` |
| Checkpoint strategy | Barrier-based upserts §5; post-invoke requires `capabilityResult` |
| Recovery policies | §6 ordered evaluation; §6.1 ResumeImmediately@pre-invoke; §6.2 post-invoke |
| PostgreSQL impact | Uses `runtime-executions` entities; **no new tables** |
| Schema impact | None in persistence-postgres |
| Event impact | Recovery facts; no commands |
| Audit impact | Fact-driven evidence only |
| Observability impact | Logs/metrics/diagnostics for recovery lifecycle |
| CI impact | Unit+in-memory in verify; durable suite additive; §17.1 proofs |
| Files to create/modify | §22 |
| Stop conditions | §23 |
| New architectural stop from this correction? | **No** — closes a design gap; same amendment path |
| Autonomous implementation safe? | **Yes, conditionally — only after this corrected Review-Gated design is approved** |

---

# Review Decision

**Status:** Awaiting human approval of this corrected design before any production TypeScript changes.

Companion amendment: [04-runtime-execution-checkpoint-amendment.md](../amendments/04-runtime-execution-checkpoint-amendment.md)

Next approved step after acceptance:

1. Treat `04-runtime-execution-checkpoint` amendment as approved target, then  
2. Autonomous (or Review-Gated) implementation of Runtime checkpoint + `capabilityResult` + recoverIncomplete + host adapter + tests + report/checklist.
