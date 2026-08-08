# @agentprodready/agent-framework

Build an AI agent in minutes. Add production controls when you need them.

Production-oriented architecture with a young ecosystem.

**v1.2 Simple Agent API:** `createAgent` · `reference()` · `openai()` · `tool()` · `inMemory()` · `invoke()` · `stream()` · `close()`

Guides: [Getting Started](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/getting-started.md) · [Simple Tools](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-tools.md) · [Simple Memory](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-memory.md)

---

## Install

```bash
npm install @agentprodready/agent-framework
```

Requires **Node.js 24** (see repo CI for Node 22 status) and an **ESM** project.

---

## A. Simple chat

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

No API key. No database. No Docker.

### OpenAI

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

Set `OPENAI_API_KEY` in the environment (the library does not load `.env` files).

---

## B. Agent with tools

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

Defaults are conservative (`mutating` / `non-idempotent`). See the Simple Tools guide.

---

## C. Agent with memory (ephemeral)

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "Remember user facts when helpful.",
  memory: true,
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");
console.log(result.text);
await agent.close();
```

`memory: true` is process-local and instance-scoped — not durable Postgres memory.

---

## Streaming

```js
for await (const event of agent.stream("Hello")) {
  if (event.type === "text") process.stdout.write(event.text);
  if (event.type === "tool_call") {
    /* safe lifecycle only */
  }
}
```

Embedded library stream — not HTTP SSE.

---

## Advanced APIs

This package also exports the advanced Agent Framework. Simple helpers do not deprecate it. Production multi-tenant hosts should use advanced Security, Runtime, Composition, and durable Memory/Persistence as documented in the repository.
