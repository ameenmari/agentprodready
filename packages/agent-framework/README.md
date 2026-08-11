# @agentprodready/agent-framework

**TypeScript agents you can ship this week — with a clean path to production controls when you need them.**

Production-oriented architecture with a young ecosystem.

**Simple Agent API:** `createAgent` · `reference()` · `openai()` · `openaiCompatible()` · `anthropic()` · `gemini()` · `tool()` · `inMemory()` · `fileMemory()` · `postgresMemory()` · `invoke()` · `stream()` · `replayStream()` · `approve()` · `reject()` · `resume()` · `close()`

**What this package is:** an **agent + Runtime execution** entrance — **not** a graph DSL. Full evaluator FAQ: [What is AgentProdReady?](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/what-is-agentprodready.md).

| Question | Short answer |
|---|---|
| Core abstraction | `createAgent` agent loop over Runtime — not LangGraph-style graphs |
| Durable state | Runtime checkpoints; `fileMemory` / `postgresMemory`; HITL park/resume; stream replay (`memory: true` stays ephemeral) |
| Retries / idempotency / HITL | Runtime owns retries; tool idempotency + ledger; `approve` / `reject` / `resume` |
| Provider routing | Simple helpers pick one model; hosts use Capability Resolution failover |
| “Production ready” | Architecture for production controls; **young ecosystem** — not a huge-fleet claim |

Guides: [What is AgentProdReady?](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/what-is-agentprodready.md) · [Getting Started](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/getting-started.md) · [Simple Diagnostics](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-diagnostics.md) · [Anthropic](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/anthropic.md) · [Gemini](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/gemini.md) · [OpenAI-compatible](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/openai-compatible.md) · [Simple Tools](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-tools.md) · [Simple Memory](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-memory.md) · [Durable Memory](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/durable-memory.md) · [HITL Approval](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/hitl-approval.md) · [Stream Replay](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/stream-replay.md)

Star / contribute: [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready)

---

## Install

```bash
npm install @agentprodready/agent-framework
```

Requires **Node.js `>=22 <25`** and an **ESM** project.

Scaffold:

```bash
npm create agentprodready@latest my-agent
```

---

## Quick start (zero secrets)

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

### OpenAI-compatible

```js
import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openaiCompatible({
    baseUrl: "https://api.example.com/v1",
    model: "llama-3.1-70b",
  }),
  instructions: "You are a helpful assistant.",
});
```

Capability id `openai-compatible-ai`. Credentials: `OPENAI_COMPATIBLE_API_KEY` (never silent `OPENAI_API_KEY` fallback).

### Anthropic

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-anthropic
```

```js
import { createAgent, anthropic } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: "You are a helpful assistant.",
});
```

Set `ANTHROPIC_API_KEY`. Messages API — not `openaiCompatible()`.

### Gemini

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-gemini
```

```js
import { createAgent, gemini } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: gemini("gemini-2.0-flash"),
  instructions: "You are a helpful assistant.",
});
```

Set `GEMINI_API_KEY`. Native Generative Language API — not `openaiCompatible()`.

---

## Tools

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

## Memory

**Ephemeral:** `memory: true` ≡ `inMemory()` — process-local, cleared on exit.  
**Durable (v1.6):** `fileMemory({ directory })`, `postgresMemory({ connectionString })` — survives restart.

The reference provider is deterministic and does **not** perform natural-language reasoning over recalled memory. Use `openai()` for NL recall demos. See [Simple Memory](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-memory.md) and [Durable Memory](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/durable-memory.md).

---

## Streaming & replay

```js
for await (const event of agent.stream("Hello", { resumeFrom: 0 })) {
  if (event.type === "text") process.stdout.write(event.text);
}

for await (const event of agent.replayStream(executionId)) {
  // log-only replay
}
```

Embedded library stream — not HTTP SSE. See [Stream Replay](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/stream-replay.md).

---

## HITL

`approve(approvalId)`, `reject(approvalId)`, `resume(executionId)` for approval-required tools. See [HITL Approval](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/hitl-approval.md).

---

## Diagnostics

Successful `invoke` results include `result.metadata` (`provider`, `modelId`, `durationMs`, `tools` counts, optional `memory`). See [Simple Diagnostics](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-diagnostics.md).

---

## Production path

When you outgrow the weekend path: [embed deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/embed-agent-deployment.md) · [production deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/production-deployment.md) · [adopting](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/adopting-agentprodready.md).

Simple/embedded mode is **not** production HTTP authentication.

---

## Advanced APIs

This package also exports the advanced Agent Framework. Simple helpers do not deprecate it. Production multi-tenant hosts should use advanced Security, Runtime, Composition, and durable Memory/Persistence as documented in the repository.
