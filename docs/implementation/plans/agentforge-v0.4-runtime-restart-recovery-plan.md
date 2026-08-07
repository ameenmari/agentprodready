# AgentProdReady v0.4 Runtime Restart & Recovery — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.4.0  
**Plan Version:** 1.0  
**Status:** In Review  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07

---

# Objective

Add deterministic **process-restart recovery** to `@agentprodready/runtime`, storing Runtime-owned checkpoints through existing Blueprint 24 persistence repositories (in-memory by default; PostgreSQL for durable proof), without transferring recovery ownership to Persistence, Workflow, Agent, or Composition.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| AGENTS.md / docs/cursor-start-here.md | Yes |
| docs/implementation-guidelines.md / implementation-modes.md | Yes |
| Blueprint 04 Runtime (+ 05, 06, 16, 17, 22, 24) | Yes |
| ADR-006, ADR-009, ADR-010 | Yes |
| packages/runtime contracts + RuntimeOrchestrator | Yes |
| packages/persistence + persistence-postgres (v0.3) | Yes |
| platform-host Runtime wiring | Yes |
| v0.3 product/plan/spec/report | Yes |
| 24-persistence-async-io amendment pattern | Yes |

---

# Recommended Approach

**Runtime-owned checkpoints persisted as Blueprint 24 `PersistedEntity` rows** in repository name `runtime-executions`.

| Option | Decision |
|---|---|
| **A. Repository-backed Runtime checkpoint adapter** | **Selected** — uses existing durable entities; OCC via revision/versionToken; no new SQL tables required for v0.4 |
| B. New Postgres `runtime_*` tables in persistence-postgres | Rejected for v0.4 — couples Runtime schema to one provider; violates “prefer Blueprint 24 concepts” |
| C. Reuse `persistence_snapshots` for mutable checkpoints | Rejected — create-once immutable snapshots are the wrong semantic |
| D. Store only `StateTransition[]` as today | Rejected — insufficient for resume |

Composition wires an `ExecutionCheckpointStore` that implements the amended Runtime snapshot/checkpoint port and talks to `PersistenceProvider` / `PersistenceFramework`. Runtime never imports `pg` or SQL.

---

# Scope

## In Scope

- Runtime checkpoint model (richer than transition history alone), including durable `capabilityResult`
- Amend Runtime implementation contracts for checkpoint load/list + recover/resume
- Checkpoint write on approved lifecycle barriers (post-invoke **requires** capabilityResult)
- Restart scan of incomplete executions
- Recovery policies: ResumeImmediately, ResumeIfSafe, FailIfExpired, FailIfCancelled, ManualRecovery
- Post-invoke resume restores result without re-invoke; ResumeIfSafe fails at pre-invoke; ResumeImmediately may re-invoke (explicitly unsafe)
- Idempotent Runtime terminalization via OCC (not a claim of exactly-once external side effects)
- Timeout deadline + cancellation flag durability
- Recovery facts (Event), audit references, observability signals
- In-memory + PostgreSQL-backed checkpoint adapter
- Deterministic recovery tests + opt-in Postgres recovery suite
- Docs: runtime/recovery guides, README pointers

## Out of Scope

- Multi-instance leader election / distributed locks as a product feature
- Kubernetes / Redis / brokers / HA clustering
- Full Workflow engine durable wait/approval redesign
- Making capability adapters universally idempotent
- AI / Memory / vector / streaming changes
- Changing Persistence public contracts
- Changing HTTP invoke API shape (host may call Runtime recover at boot only)

---

# Stop Condition — Runtime Checkpoint Contracts

### Status: Blocks Autonomous code until this design is approved

Current public port:

```ts
export interface ExecutionSnapshotPort {
  store(executionId: string, history: readonly StateTransition[]): Promise<void>;
}
```

Required for v0.4 (exact shapes in the specification):

- richer `ExecutionCheckpoint` value object
- `store` / `load` / `listIncomplete` (names finalized in spec)
- Runtime entrypoints to recover on restart
- optional recovery policy fields on `RuntimePolicy` (or adjacent provider)

| Question | Answer |
|---|---|
| Blueprint 04 constitutional rewrite required? | **No** — BP04 already owns recovery and resumption points; “no state after completion” means after **terminal** completion |
| ADR required? | **No** — ADR-006 already assigns recovery to Runtime |
| Implementation contract change? | **Yes** — Runtime TypeScript surface |
| Persistence contract change? | **No** |
| Dual legacy snapshot APIs? | **Rejected** — one canonical checkpoint port |

Pattern: same governance style as `24-persistence-async-io` — document amendment in the specification; approve before code.

---

# Package / File Impact (Planned)

## Create (after approval)

```text
docs/guides/runtime-recovery.md
docs/implementation/amendments/04-runtime-execution-checkpoint-amendment.md
docs/implementation/reports/agentprodready-v0.4-runtime-restart-recovery-implementation-report.md
docs/implementation/checklists/agentprodready-v0.4-runtime-restart-recovery-checklist.md
packages/runtime/... checkpoint types + recover path + tests
apps/platform-host/... composition wiring + optional boot recover
scripts/runtime-recovery-probe.mjs (manual durability/restart proof)
```

## Modify (after approval)

```text
packages/runtime/src/contracts/runtime.ts
packages/runtime/src/application/runtime.ts
packages/runtime/src/reference/adapters.ts
packages/runtime/src/application/runtime.spec.ts (+ recovery specs)
apps/platform-host composition / config / smoke (recover wiring; default still safe)
README.md / docs/README.md / .env.example (recovery flags)
.github/workflows/ci.yml (optional additive recovery-postgres job or extend persistence-postgres)
```

## Do Not Modify

```text
docs/adrs/**
docs/blueprints/**
@agentprodready/persistence public contracts
@agentprodready/persistence-postgres schema (no new tables in v0.4)
OpenAI provider architecture
Default deterministic AI path
```

---

# Checkpoint Strategy (Summary)

| When | What |
|---|---|
| After each validated state transition | Upsert checkpoint (atomic with fact publish ordering defined in spec) |
| After planning succeeds | Persist plan artifact + stage=`post-planning` |
| After workflow stage returns | Persist workflow work artifact + stage=`post-workflow` |
| Before capability invoke | Persist stage=`pre-invoke` (unsafe resume boundary) |
| After capability invoke returns | Persist stage=`post-invoke` **with** `capabilityResult` (never without) |
| On terminal state | Persist terminal checkpoint; exclude from incomplete scans |

Use Persistence transactions when multiple repository writes are required; single-entity upserts use optimistic concurrency.

---

# Recovery Policies (Summary)

| Policy | Behavior |
|---|---|
| `ResumeImmediately` | Resume from last durable stage if non-terminal; at `pre-invoke` **may re-invoke** (explicitly unsafe; possible duplicate side effects) |
| `ResumeIfSafe` | Resume `accepted`…`post-workflow` and valid `post-invoke`; **fail** at `pre-invoke` (no re-invoke; must not weaken) |
| `FailIfExpired` | If `deadlineAt <= now`, terminal `failed` (`RUNTIME_TIMEOUT`) |
| `FailIfCancelled` | If cancellation recorded, terminal `cancelled` |
| `ManualRecovery` | Leave incomplete; emit recovery fact; operator/API later (future host surface) |

Default for local reference durable mode: `ResumeIfSafe` + `FailIfExpired` + `FailIfCancelled`.

`capabilityResult` type: `unknown` — JSON-serializable `CapabilityInvocationPort.invoke` return (= `RuntimeResult.output`). See amendment `04-runtime-execution-checkpoint`.

---

# Testing Strategy

| Layer | Content | Default CI |
|---|---|---|
| Unit | policy evaluation, idempotent terminalization, checkpoint serialization incl. `capabilityResult` | Yes |
| Integration (in-memory) | crash simulation; post-invoke restore (invoke count = 1); malformed post-invoke | Yes |
| Integration (Postgres) | durable checkpoint survive adapter reopen | Opt-in / additive job |
| Manual probe | write checkpoint → kill → restart → recover (incl. post-invoke) | Local |
| Regression | existing runtime + host + verify | Yes |

---

# Decision Summary

| Item | Decision |
|---|---|
| Recovery owner | Runtime only |
| Storage | Blueprint 24 repository `runtime-executions` |
| New SQL tables | **None** in v0.4 |
| Contract amendment | Required for Runtime checkpoint port + recover API |
| Default CI DB | Still optional |
| Autonomous safe? | **Only after this Review-Gated design is approved** |

---

# Review Decision

**Status:** Awaiting approval of companion specification.

**Companion specification:** [agentprodready-v0.4-runtime-restart-recovery-specification.md](../specifications/agentprodready-v0.4-runtime-restart-recovery-specification.md)  
**Companion product doc:** [agentprodready-v0.4-runtime-restart-recovery.md](../../product/agentprodready-v0.4-runtime-restart-recovery.md)
