# Simple Memory

Ephemeral, process-local memory for the Simple Agent API.

Production-oriented architecture with a young ecosystem.

## Important

`memory: true` and `inMemory()` mean **ephemeral memory**:

- process-local
- scoped to one `createAgent` instance
- cleared when the process ends or `close()` runs
- **not** durable Postgres / production persistence

Durable memory requires the advanced Memory + Persistence path (see [memory.md](./memory.md)).

## Install

```bash
npm install @agentprodready/agent-framework
```

## Example

```js
import { createAgent, reference, inMemory } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "Use remembered facts when they help.",
  memory: true, // same as memory: inMemory()
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");
console.log(result.text);

await agent.close();
```

`inMemory({ namespace: "demo" })` is supported for optional namespacing within an instance.

## Semantics

| Question | Answer |
|---|---|
| Survives restart? | No |
| Shared across `createAgent` instances? | No |
| Uses MemoryEngine? | Yes |
| Equals host Postgres memory? | No |

## Related

- [Simple Agent API](./simple-agent-api.md)
- [Memory (advanced)](./memory.md)
- [Adopting AgentProdReady](./adopting-agentprodready.md)
