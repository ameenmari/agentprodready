# Simple Tools

Add tools to the Simple Agent API without hand-wiring ToolRegistry, Security, or Runtime checkpoints.

Production-oriented architecture with a young ecosystem.

## Install

```bash
npm install @agentprodready/agent-framework
```

For OpenAI models also install `@agentprodready/ai-provider-openai` and set `OPENAI_API_KEY`.

## Example

```js
import { createAgent, reference, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
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

// Deterministic reference trigger for CI / demos (no network):
const result = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
console.log(result.text);

await agent.close();
```

With OpenAI, the model chooses tools from the schemas you provide — you do not use `USE_TOOL:`.

## API

```ts
tool({
  name: string,
  description: string,
  parameters: { type: "object", ... }, // JSON Schema object
  execute: (args) => unknown | Promise<unknown>,
  sideEffect?: "read-only" | "mutating" | "external-side-effect", // default: "mutating"
  idempotency?: "idempotent" | "non-idempotent",                 // default: "non-idempotent"
  approvalRequirement?: "none" | "required",                     // default: "none"
})
```

Defaults are **conservative**: the framework does **not** assume arbitrary `execute` functions are idempotent.

## What runs underneath

```text
AI tool call
  → Tool Framework validation
  → Security authorize
  → approval check (fail closed if required)
  → Capability Resolution
  → Composition ToolAdapter (your execute)
  → Runtime checkpoints
  → ToolInvocationCoordinator
  → AI continuation
```

You do not configure those systems for the simple path. Advanced Tool Framework APIs remain available.

## Streaming

`agent.stream(...)` may emit additive safe events:

- `tool_call` — `{ toolCallId, toolId, status: "executing" }`
- `tool_result` — `{ toolCallId, toolId, status: "succeeded" | "failed" }`

Raw arguments and results are **not** included by default.

## Limitations

- `approvalRequirement: "required"` **fails closed** (no durable HITL wait)
- External side effects are **not** exactly-once
- Simple mode is **not** production multi-tenant HTTP authentication
- Reference provider tool demos use `USE_TOOL:<name>:<json>` for deterministic CI

## Related

- [Simple Agent API](./simple-agent-api.md)
- [Simple Memory](./simple-memory.md)
- [Tools (advanced)](./tools.md)
