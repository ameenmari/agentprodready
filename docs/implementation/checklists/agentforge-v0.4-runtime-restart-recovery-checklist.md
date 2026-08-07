# AgentForge v0.4 Runtime Restart & Recovery — Checklist

**Product Version:** 0.4.0  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

## Contracts

- [x] `ExecutionSnapshotPort` removed (no dual legacy API)
- [x] `ExecutionCheckpointPort` (`store` / `load` / `listIncomplete`)
- [x] `ExecutionCheckpoint`, `ExecutionStage`, `RecoveryPolicyBundle`
- [x] `RecoverIncompleteRequest` / `RecoverIncompleteResult` / `RecoverOutcome`
- [x] `capabilityResult?: unknown` with post-invoke presence + JSON rules
- [x] Blueprint 04 / ADR-006 text unchanged

## Runtime behavior

- [x] Checkpoint barriers: accepted → post-planning → post-workflow → pre-invoke → post-invoke → terminal
- [x] Checkpoint before fact publish
- [x] Terminal `stage=terminal` + `terminal=true`; incomplete excludes terminals
- [x] `recoverIncomplete` owned by Runtime
- [x] Evaluation order: terminal → cancel → expire → manual → ResumeImmediately → ResumeIfSafe
- [x] ResumeIfSafe @ pre-invoke fails (no re-invoke)
- [x] ResumeImmediately @ pre-invoke may re-invoke (unsafe)
- [x] post-invoke restores result; invoke count stays 1
- [x] OCC at-most-once terminalization
- [x] Timeout / cancellation recovery
- [x] Injectable `now`

## Host / Persistence

- [x] `PersistenceExecutionCheckpointStore` in platform-host
- [x] Repository `runtime-executions`; no new SQL tables
- [x] Runtime package independent of `@agentforge/persistence` / `pg`
- [x] `InMemoryExecutionCheckpointPort` for deterministic tests
- [x] `RUNTIME_RECOVERY_ENABLED` default false
- [x] Boot ordering + readiness gating when recovery enabled

## Tests / CI / Docs

- [x] Runtime unit + recovery path proofs A–J
- [x] `pnpm test:runtime-recovery` + CI job `runtime-recovery-postgres`
- [x] Manual probe `scripts/runtime-recovery-probe.mjs`
- [x] `docs/guides/runtime-recovery.md` + README / persistence / `.env.example` updates
- [x] Implementation report
- [x] Amendment status → Implemented
- [x] `pnpm verify` green
- [x] `pnpm test:postgres` + `pnpm test:runtime-recovery` green
- [x] Manual recovery probe green
