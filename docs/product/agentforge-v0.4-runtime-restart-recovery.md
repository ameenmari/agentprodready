# AgentProdReady v0.4 Runtime Restart & Recovery

**Version:** 0.4.0  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07

---

## Purpose

AgentProdReady v0.4 introduces **deterministic Runtime restart and recovery** over the durable PostgreSQL persistence foundation delivered in v0.3.

This milestone proves that when a process crashes mid-execution, a restarted Runtime can:

1. inspect durable Runtime execution state,
2. apply recovery policy,
3. resume or fail safely,
4. never incorrectly complete the same execution twice.

It does **not** deliver high availability, multi-instance leadership, or Kubernetes failover.

---

## Authority

| Document | Role |
|---|---|
| [Blueprint 04 — Runtime Orchestration](../blueprints/04-runtime-orchestration.md) | Recovery ownership, resumption points, lifecycle |
| [ADR-006 — Runtime Owns Operational Execution](../adrs/ADR-006%20%E2%80%94%20Runtime%20Owns%20Operational%20Execution.md) | Exclusive ownership of restart/recovery/retry/timeout/cancellation |
| [ADR-009 — Historical Facts Are Immutable](../adrs/ADR-009%20%E2%80%94%20Historical%20Facts%20Are%20Immutable.md) | Recovery must not rewrite history |
| [ADR-010 — Events Represent Facts, Not Commands](../adrs/ADR-010%20%E2%80%94%20Events%20Represent%20Facts%2C%20Not%20Commands.md) | Recovery is not event-commanded |
| Blueprint 05 / 06 | Planning & Workflow remain delegated stages |
| Blueprint 16 / 17 / 22 | Event facts, Audit evidence, Observability |
| Blueprint 24 + v0.3 PostgreSQL | Durable storage primitives only |
| [Implementation Plan](../implementation/plans/agentprodready-v0.4-runtime-restart-recovery-plan.md) | Approach (pending review) |
| [Implementation Specification](../implementation/specifications/agentprodready-v0.4-runtime-restart-recovery-specification.md) | Exact decisions (pending review) |

Blueprints and ADRs remain authoritative. Public Runtime contract changes are **not** assumed; any required change is a documented stop condition in this design package.

---

## Product Boundary

```text
apps/platform-host
  └── Composition wires RuntimeOrchestrator
        ├── ExecutionCheckpointStore (implements ExecutionSnapshotPort+)
        │     └── uses PersistenceProvider repository "runtime-executions"
        │           ├── in-memory (default CI / local)
        │           └── postgres (durable restart proof)
        └── Runtime owns recover / resume / fail decisions

@agentprodready/runtime                 ← recovery ownership + checkpoint contracts
@agentprodready/persistence             ← storage contracts only (no recovery logic)
@agentprodready/persistence-postgres    ← durable provider only (no Runtime SQL)
```

Persistence stores opaque Runtime checkpoints. Persistence never decides resume vs fail.

---

## What Exists Today

| Capability | Status |
|---|---|
| In-process retry via `recovering` | Implemented |
| Timeout / cancellation | Implemented (process-local) |
| `ExecutionSnapshotPort.store(history)` | Write-only; history only |
| Durable Runtime checkpoints | **Missing** |
| Restart load / resume API | **Missing** |
| Host Runtime snapshots | Always `InMemoryExecutionSnapshotPort` |

v0.3 proved Blueprint 24 durability for generic entities/snapshots. Runtime recovery was explicitly deferred.

---

## Recovery Ownership (Non-Negotiable)

| Concern | Owner |
|---|---|
| Restart / recovery / resumption | **Runtime** |
| Retry scheduling / timeout / cancellation evaluation | **Runtime** |
| Execution continuation decisions | **Runtime** |
| Durable checkpoint bytes | Persistence (storage only) |
| Execution order semantics | Workflow |
| Plan creation | Planning |
| Object graph construction | Composition |
| Authorization decisions | Security |

No other framework may independently recover executions.

---

## Success Definition

v0.4 succeeds when:

1. Runtime can persist enough state to survive process restart.
2. After restart, unfinished executions are loaded and evaluated by Runtime policy.
3. Safe resume or explicit fail occurs without incorrect double completion.
4. Event/Audit/Observability record recovery as **facts**, not commands.
5. Default CI remains database-optional; durable recovery proof uses PostgreSQL opt-in (as in v0.3).
6. Persistence, AI, HTTP, and Workflow public contracts remain unchanged unless a stop condition is approved.

---

## Explicit Non-Goals

- Distributed scheduling, leader election, multi-runtime HA
- Kubernetes failover / Redis / message brokers
- Workflow engine redesign / AI redesign / Memory redesign / vector DBs
- Making PostgreSQL mandatory for default `verify` / docker smoke
- Claiming capability-provider side effects are universally idempotent

---

## Contract Stop Condition (Design)

Current public Runtime surface is insufficient for crash recovery:

```ts
ExecutionSnapshotPort { store(executionId, history): Promise<void> } // write-only, history-only
```

v0.4 requires a **Runtime implementation-contract amendment** (not a Blueprint constitutional rewrite) to support load/list of richer checkpoints, a Runtime recover/resume entrypoint, and durable `capabilityResult` for safe `post-invoke` completion without re-invocation.

See: [04-runtime-execution-checkpoint-amendment.md](../implementation/amendments/04-runtime-execution-checkpoint-amendment.md).

**Autonomous production code must not begin until this corrected Review-Gated design (including that contract amendment) is approved.**

---

## Related Artifacts

- Plan: [agentprodready-v0.4-runtime-restart-recovery-plan.md](../implementation/plans/agentprodready-v0.4-runtime-restart-recovery-plan.md)
- Specification: [agentprodready-v0.4-runtime-restart-recovery-specification.md](../implementation/specifications/agentprodready-v0.4-runtime-restart-recovery-specification.md)
- Amendment: [04-runtime-execution-checkpoint-amendment.md](../implementation/amendments/04-runtime-execution-checkpoint-amendment.md)
