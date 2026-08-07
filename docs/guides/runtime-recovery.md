# Runtime Restart & Recovery (v0.4)

AgentForge Runtime owns restart detection and resume/fail decisions (ADR-006). Persistence stores opaque `ExecutionCheckpoint` rows; it never decides whether an execution resumes.

## Defaults

| Setting | Default | Notes |
|---|---|---|
| `RUNTIME_RECOVERY_ENABLED` | `false` | Boot-time `recoverIncomplete` |
| `PERSISTENCE_PROVIDER` | `in-memory` | Checkpoints are process-local |
| Recovery policy | `onRestart=resume-if-safe`, `failIfExpired=true`, `failIfCancelled=true` | Not `resume-immediately` |

Cross-process durability requires `PERSISTENCE_PROVIDER=postgres`. In-memory + recovery enabled is valid for tests, but a process restart loses checkpoints.

## Ownership

- **Runtime** — checkpoints barriers, recovery policy evaluation, resume/fail, at-most-once terminalization (OCC)
- **Persistence** — durable bytes for `runtime-executions` repository entities
- **Host composition** — wires `PersistenceExecutionCheckpointStore`, may call `recoverIncomplete` at boot
- **HTTP handlers** — must not implement recovery logic

## Checkpoint stages

```text
accepted → post-planning → post-workflow → pre-invoke → post-invoke → terminal
```

`post-invoke` always includes a JSON-serializable `capabilityResult` (the `CapabilityInvocationPort.invoke` return / `RuntimeResult.output`). `undefined` is not durable; `null` is valid.

## Resume policies

| Policy | `pre-invoke` | Notes |
|---|---|---|
| `resume-if-safe` (default) | **Fail** — no re-invoke | Safe automatic recovery |
| `resume-immediately` | May re-invoke | Explicitly unsafe; duplicate external side effects possible |
| `manual-recovery` | Leave incomplete | Emits `runtime.recovery.deferred` |

**Exactly-once external provider/tool effects are not guaranteed.** Runtime guarantees **at-most-once terminalization** via optimistic concurrency on checkpoint writes.

After durable `post-invoke`, recovery restores `capabilityResult` and must not call `capability.invoke` again.

## Host boot order

```text
configuration
→ persistence provider init / assertReady
→ Runtime + Composition
→ reference seed
→ recoverIncomplete (when RUNTIME_RECOVERY_ENABLED=true)
→ ready=true
```

When durable recovery is enabled, readiness remains false until the initial recovery scan reaches a stable outcome. If PostgreSQL is unavailable while recovery is enabled, startup fails; the host does not silently fall back to in-memory.

## Operator commands

```bash
pnpm db:up
pnpm db:migrate
pnpm test:runtime-recovery   # CI-equivalent durable suite

# Manual probe (process boundary)
node scripts/runtime-recovery-probe.mjs write-post-invoke
node scripts/runtime-recovery-probe.mjs recover
```

See also: [persistence.md](./persistence.md).
