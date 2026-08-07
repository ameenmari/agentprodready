# AgentForge v0.4 Runtime Restart & Recovery — Implementation Report

**Product Version:** 0.4.0  
**Runtime Package Version:** `@agentforge/runtime@0.4.0`  
**Platform Host Version:** `@agentforge/platform-host@0.4.0`  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07  
**Status:** Complete

---

## Summary

v0.4 replaces write-only `ExecutionSnapshotPort` with canonical `ExecutionCheckpointPort`, adds barrier checkpoints (including durable `capabilityResult` at `post-invoke`), implements `RuntimeOrchestrator.recoverIncomplete`, and wires a host `PersistenceExecutionCheckpointStore` over Blueprint 24 repository `runtime-executions` (no new PostgreSQL tables). Recovery ownership remains Runtime-only (ADR-006).

---

## Contracts replaced / added

| Item | Change |
|---|---|
| `ExecutionSnapshotPort` | **Removed** (no legacy alias) |
| `ExecutionCheckpointPort` | Added: `store` / `load` / `listIncomplete` |
| `ExecutionCheckpoint`, `ExecutionStage` | Added (`checkpointVersion: 1`) |
| `CapabilityInvocationResult` | Alias for `unknown` (= invoke / `RuntimeResult.output`) |
| `RecoveryPolicyBundle` | Added; default `resume-if-safe` + fail expired/cancelled |
| `RecoverIncompleteRequest/Result/Outcome` | Added |
| `RuntimeOrchestrator.recoverIncomplete` | Added |
| `RuntimeDependencies.checkpoints` | Replaces `snapshots` |
| Blueprint 04 / ADR-006 | **Unchanged** |

### capabilityResult representation

- Type: `unknown` (JSON-serializable invoke result)
- Required when `stage === 'post-invoke'`
- `undefined` rejected; `null` accepted
- Non-JSON values fail before writing `post-invoke`

---

## Impacted consumers

| Consumer | Update |
|---|---|
| `@agentforge/runtime` reference adapters | `InMemoryExecutionCheckpointPort` |
| `apps/platform-host` composition | `PersistenceExecutionCheckpointStore`, boot recovery, config |
| Runtime unit tests | Full lifecycle + recovery A–J |
| CI | Additive job `runtime-recovery-postgres` |
| Docs / `.env.example` | `RUNTIME_RECOVERY_ENABLED`, recovery guide |

---

## Checkpoint barriers (proved)

| Barrier | Proven by |
|---|---|
| accepted / post-planning / post-workflow / pre-invoke / post-invoke / terminal | Unit execute + recovery tests |
| Checkpoint before fact publish | Orchestrator `#transitionAndCheckpoint` order |
| No `post-invoke` without result | Unit rejection + malformed recovery test G |

---

## Recovery behavior results

| Scenario | Result |
|---|---|
| ResumeIfSafe @ accepted / post-planning / post-workflow | Resume; skip completed stages |
| ResumeIfSafe @ pre-invoke | Fail `RUNTIME_EXECUTION_FAILED`; invoke count 0 |
| ResumeImmediately @ pre-invoke | Invoke permitted (unsafe); completes |
| post-invoke crash/recovery | Invoke count **0** after restart; output restored; single completed |
| Malformed post-invoke | Fail; no re-invoke |
| Expired | Terminal failed `RUNTIME_TIMEOUT` |
| Cancelled | Terminal cancelled |
| Terminal exclusion | `listIncomplete` omits terminals |
| OCC race | Loser `CheckpointConflictError`; no second terminal |
| ManualRecovery | Deferred; remains incomplete |

---

## PostgreSQL durability

| Proof | Result |
|---|---|
| `pnpm test:runtime-recovery` | Passed (provider recreate → load → recover → OCC → terminal exclusion) |
| Manual `scripts/runtime-recovery-probe.mjs` | Passed: post-invoke (invokeCount=0), pre-invoke fail, expired, cancelled |
| Schema migrations | **None** — uses `runtime-executions` entity rows |

---

## Host / configuration

| Item | Value |
|---|---|
| `RUNTIME_RECOVERY_ENABLED` | Default `false` |
| Boot order | persistence ready → seed → `recoverIncomplete` (if enabled) → `ready=true` |
| Durable recovery + DB down | Startup fails; no silent in-memory fallback |
| In-memory + recovery | Allowed for tests; restart loses checkpoints |

---

## Events / Audit / Observability

| Signal | Implementation |
|---|---|
| Facts | `runtime.recovery.started\|resumed\|completed\|failed\|deferred` + existing `runtime.execution.*` |
| Audit | Existing host audit ingestion of Runtime facts (no new Audit schema) |
| Metrics | Host telemetry records counters `runtime.recovery.*` |
| Diagnostics | Extended Runtime diagnostics recovery counters |

---

## CI / regression

| Suite | Result |
|---|---|
| `pnpm lint` | Passed |
| `pnpm boundaries` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed (includes Runtime recovery unit suite) |
| `pnpm build` | Passed |
| `pnpm smoke` | Passed (`PRODUCT_VERSION` 0.4.0) |
| `pnpm verify` | Passed |
| `pnpm test:postgres` | Passed |
| `pnpm test:runtime-recovery` | Passed |
| Manual recovery probe | Passed (post-invoke / pre-invoke / expired / cancelled) |
| `docker compose up --build` + `docker-smoke` | Passed (image `0.4.0`) |
| CI job `runtime-recovery-postgres` | Added (ephemeral Postgres; no production secrets) |

---

## Known limitations

- Single-process recovery; no leader election / distributed leases (`leaseOwner` reserved unused)
- External provider/tool exactly-once **not** guaranteed (especially `ResumeImmediately` @ `pre-invoke`)
- AbortSignal/timers remain process-local
- Agents/audit/events/memory/knowledge remain non-durable beyond Runtime checkpoints
- `listIncomplete` scans the host-configured Persistence scope

---

## Architectural deviations

**None.** No Blueprint/ADR constitutional edits; no Persistence public contract changes; no new SQL tables; Runtime does not import `pg`/SQL; HTTP handlers do not own recovery.

---

## Next milestone

v0.4 Runtime restart & recovery is complete. The next product milestone may begin when authorized. Do not start distributed Runtime clustering under this report.
