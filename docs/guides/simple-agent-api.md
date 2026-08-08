# Simple Agent API

Short reference for the embedded facade on `@agentprodready/agent-framework` (v1.5+).

Production-oriented architecture with a young ecosystem.

## Three paths

### A. Simple chat

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

### B. Agent with tools

```js
import { createAgent, reference, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are helpful.",
  tools: [
    tool({
      name: "getWeather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => ({ city, forecast: "sunny" }),
    }),
  ],
});

const result = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
console.log(result.text);
await agent.close();
```

See [Simple Tools](./simple-tools.md).

### C. Agent with memory

`memory: true` ≡ `inMemory()` — ephemeral only. See [Simple Memory](./simple-memory.md).

The reference provider is deterministic and intended for wiring/tests. It does **not** perform natural-language reasoning over recalled memory.

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  memory: true, // or memory: inMemory()
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");
console.log(result.text); // reference echoes the question — expected
console.log(result.metadata?.memory); // wiring proof: injected / retrievedItemCount
await agent.close();
```

For natural-language recall, use `openai(...)` + `OPENAI_API_KEY` ([`examples/memory-agent`](../../examples/memory-agent)).

---

## Helpers

| Export | Role |
|---|---|
| `createAgent(options)` | Create embedded agent |
| `reference()` | Deterministic local model for wiring/tests (no API key / network; not NL reasoning) |
| `openaiCompatible({ baseUrl, model, … })` | OpenAI Chat Completions–compatible endpoint (`openai-compatible-ai`) |
| `openai(modelId)` | OpenAI descriptor (optional peer package + `OPENAI_API_KEY`) |
| `tool(definition)` | Declare a simple tool |
| `inMemory()` | Ephemeral memory descriptor |
| `agent.invoke(text)` | One-shot → `result.text` |
| `agent.stream(text)` | AsyncIterable stream (not HTTP SSE) |
| `agent.close()` | Dispose instance |

## createAgent options

```ts
{
  model: reference() | openai("..."),
  instructions: string,
  name?: string,
  description?: string,
  tools?: SimpleTool[],
  memory?: true | SimpleMemory,
}
```

## Invoke diagnostics

Successful `invoke` results include `result.metadata` with `provider`, `modelId`, `durationMs`, and `tools` counts (plus optional `memory`). See [Simple Diagnostics](./simple-diagnostics.md).

## Stream events

`start` | `text` | `tool_call` | `tool_result` | `usage` | `complete`

`tool_call` / `tool_result` are safe lifecycle events (no raw args/results by default). Structured post-turn diagnostics live on **invoke** metadata, not on stream events.

## Errors

`SimpleAgentError` with codes such as:

- `AGENT_INVALID_CONFIG` / `AGENT_INVALID_MODEL`
- `AGENT_MISSING_OPENAI_KEY` / `AGENT_MISSING_OPENAI_PACKAGE`
- `AGENT_MISSING_ANTHROPIC_KEY` / `AGENT_MISSING_ANTHROPIC_PACKAGE`
- `AGENT_TOOL_AUTHORIZATION` / `AGENT_TOOL_APPROVAL_REQUIRED` / `AGENT_TOOL_REJECTED`
- `AGENT_PROVIDER_UNAVAILABLE` / `AGENT_TIMEOUT`
- `AGENT_CLOSED` / `AGENT_INVOKE_FAILED` / `AGENT_STREAM_FAILED`

Use `error.code` and optional `error.diagnosticId` when debugging.

## Limitations (honest)

- Simple mode ≠ production multi-tenant HTTP authentication
- `memory: true` is not durable
- Approval-required tools fail closed
- External tool side effects are not exactly-once
- OpenAI is optional; reference mode needs no key

## Advanced APIs

Blueprints, manifests, ToolRegistry, MemoryEngine, Security facts, Capability Resolution, and Runtime checkpoints still operate underneath. Use advanced packages when you outgrow the facade — they are not deprecated.
