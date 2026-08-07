# @agentprodready/runtime

Blueprint 04's provider-neutral operational execution coordinator. Specialized platform work is delegated through replaceable ports.

## v0.4 Execution checkpoints

Canonical port: `ExecutionCheckpointPort` (`store` / `load` / `listIncomplete`).

- Reference adapter: `InMemoryExecutionCheckpointPort` (database-free tests)
- Host durable adapter: `PersistenceExecutionCheckpointStore` (platform-host; Blueprint 24 `runtime-executions`)
- Recovery API: `RuntimeOrchestrator.recoverIncomplete`
- Default policy: `resume-if-safe` (fails safely at `pre-invoke`; restores `capabilityResult` at `post-invoke`)

See [docs/guides/runtime-recovery.md](../../docs/guides/runtime-recovery.md).

## v0.8 Streaming delivery

Additive `RuntimeOrchestrator.executeStream` yields `RuntimeStreamEvent` deltas then exactly one terminal event (`completed` | `failed` | `cancelled`) carrying the final `RuntimeResult` (or failed/cancelled result). Optional `CapabilityInvocationPort.stream` supplies capability deltas. No `ExecutionStage = streaming`. Chunks are not checkpointed; final capability result remains post-invoke. See [Streaming guide](../../docs/guides/streaming.md).

## v0.6 Tool-loop checkpoints (product v0.9)

Additive durable `ExecutionCheckpoint.toolLoop` (Amendment C): normalized `turn` / `maxTurns` / `baseMessages` / `proposedCalls` / `calls[]` with `pre-tool` / `post-tool` stages. No provider SDK types. Capability control exposes `persistToolLoop` / `loadToolLoop`. See [Tool Calling guide](../../docs/guides/tools.md).
