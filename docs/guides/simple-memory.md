# Simple Memory

Ephemeral, process-local memory for the Simple Agent API.

Production-oriented architecture with a young ecosystem.

## What `memory: true` means

`memory: true` is an alias of `inMemory()`:

| Property | Meaning |
|---|---|
| Process-local | Lives in the current Node process only |
| Instance-scoped | One `createAgent` instance; not shared with other agents |
| Ephemeral | Cleared on process exit or `agent.close()` |
| MemoryEngine-backed | Uses the existing MemoryEngine + in-memory provider |
| Not durable | No Postgres / restart persistence (use `fileMemory` / `postgresMemory` for that) |
| Not model intelligence | Retrieval/injection ≠ the model answering from memory |

Durable Simple Memory is available in v1.6 — see [Durable Memory](./durable-memory.md). The advanced Memory + Persistence path remains in [memory.md](./memory.md).

## Memory retrieval ≠ model intelligence

AgentProdReady can **retrieve** prior turns and **inject** them into the prompt.

The selected model must actually **use** that context:

- `reference()` is deterministic and intended for wiring/tests. It effectively echoes the last user message and does **not** perform natural-language reasoning over recalled memory.
- Natural-language recall demos require a reasoning-capable model such as `openai(...)`.

## Zero-key wiring demo (`reference`)

Prove capture → retrieve → inject with diagnostics (do not expect `"blue"` as `result.text`):

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  memory: true, // same as memory: inMemory()
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");

// reference() echoes the user message — that is expected.
console.log(result.text);

// Honest proof that memory was retrieved and injected into the prompt:
console.log(result.metadata?.memory);
// → { enabled: true, retrievedItemCount: ≥1, injected: true, injectedPreview: "...blue..." }

await agent.close();
```

`result.metadata.memory` is diagnostic evidence for wiring demos/tests — not a durable product contract.

## Natural-language recall (`openai`)

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "Answer using remembered user facts when present. Keep answers short.",
  memory: true,
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");
console.log(result.text); // expects a natural answer that mentions blue

await agent.close();
```

Requires `@agentprodready/ai-provider-openai` and `OPENAI_API_KEY`.

See [`examples/memory-agent`](../../examples/memory-agent).

## Optional namespace

`inMemory({ namespace: "demo" })` namespaces memory within an instance.

Same for `fileMemory({ directory, namespace })` and `postgresMemory({ connectionString, namespace })`.

## Related

- [Simple Agent API](./simple-agent-api.md)
- [Durable Memory](./durable-memory.md)
- [Memory (advanced)](./memory.md)
- [Adopting AgentProdReady](./adopting-agentprodready.md)
