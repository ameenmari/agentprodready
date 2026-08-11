# `@agentprodready/runtime`

**Operational execution engine for AgentProdReady** — run work, cancel it, checkpoint it, recover it, and stream results.

| | |
|---|---|
| **Status** | Production contracts published (`1.1.x`) |
| **Install** | `npm install @agentprodready/runtime` |
| **Module** | ESM |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

Usually installed automatically with `@agentprodready/agent-framework`.

---

## Installation

```bash
npm install @agentprodready/runtime

# Typical stack
npm install @agentprodready/agent-framework @agentprodready/composition @agentprodready/foundation
```

---

## Features

| Feature | Description |
|---|---|
| **Execution orchestration** | Coordinate capability invocations end-to-end |
| **Cancellation** | Cooperative cancel with terminal results |
| **Checkpoints** | Durable `ExecutionCheckpointPort` for restart safety |
| **Recovery** | `recoverIncomplete` with `resume-if-safe` defaults |
| **Streaming** | `executeStream` → deltas + exactly one terminal event |
| **Tool-loop checkpoints** | Optional multi-turn tool state (`pre-tool` / `post-tool` / `awaiting-approval`) |
| **Stream event log** | Durable `StreamEventLog` for Simple replay (`resumeFrom` / `replayStream`) |
| **Provider failover ledger** | Attempt tracking for multi-provider routing (host-wired) |
| **Ports, not vendors** | No OpenAI / Postgres imports in this package |

---

## What Runtime owns vs does not own

| Owns | Does **not** own |
|---|---|
| Start / complete / fail / cancel | Choosing which AI vendor (Capability Resolution) |
| Checkpoints & recovery | Instantiating adapters (Composition) |
| Stream delivery semantics | Authorization allow/deny (Security) |
| Operational timeouts / retries (policy) | Agent identity / lifecycle (Agent Framework) |

---

## Usage overview

```ts
import type { RuntimeOrchestrator } from '@agentprodready/runtime';

// Obtained from Composition in a real host — not constructed ad hoc in apps.
declare const runtime: RuntimeOrchestrator;

// Non-stream
const result = await runtime.execute(/* ExecutionRequest */);

// Stream
for await (const event of runtime.executeStream(/* ExecutionRequest */)) {
  if (event.type === 'delta') {
    // process chunk
  } else {
    // terminal: completed | failed | cancelled
    console.log(event.type, event.result);
  }
}
```

Agent Framework handoff:

```ts
// AgentFramework.invoke  → AgentRuntimePort.accept
// AgentFramework.invokeStream → AgentRuntimePort.acceptStream
```

Your host implements `AgentRuntimePort` by forwarding into `RuntimeOrchestrator`.

---

## Checkpoints & recovery

```text
store(checkpoint) → process crash → recoverIncomplete() → resume-if-safe
```

| Piece | Role |
|---|---|
| `ExecutionCheckpointPort` | `store` / `load` / `listIncomplete` |
| `InMemoryExecutionCheckpointPort` | Tests / local |
| Host Postgres adapter | Durable (via Persistence in platform-host) |

Guide: [Runtime recovery](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/runtime-recovery.md)

---

## Streaming rules

- Chunks are **not** individually checkpointed  
- Final capability result remains post-invoke  
- Exactly one terminal stream event  

Guide: [Streaming](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/streaming.md)

---

## Tool-loop checkpoints

Additive `ExecutionCheckpoint.toolLoop` for multi-turn tool calling (`pre-tool` / `post-tool` / `awaiting-approval`).  
Guide: [Tools](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/tools.md) · [HITL Approval](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/hitl-approval.md)

---

## Stream event log

`StreamEventLog` appends normalized stream events during execution. Simple `stream({ resumeFrom })` and `replayStream(executionId)` read from this log.

Guide: [Stream Replay](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/stream-replay.md)

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) | Agent identity + invoke handoff |
| [`@agentprodready/capability-resolution`](https://www.npmjs.com/package/@agentprodready/capability-resolution) | Implementation selection |
| [`@agentprodready/composition`](https://www.npmjs.com/package/@agentprodready/composition) | Wiring |
| [`@agentprodready/ai-provider`](https://www.npmjs.com/package/@agentprodready/ai-provider) | AI contracts |

---

## Documentation

- [Blueprint 04](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/04-runtime-orchestration.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Changelog](https://github.com/ameenmari/agentprodready/blob/main/CHANGELOG.md)

---

## License

MIT © 2026 ameenmari
