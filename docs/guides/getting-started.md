# Getting Started

**TypeScript agents you can ship this week — with a clean path to production controls when you need them.**

Production-oriented architecture with a young ecosystem.

**Simple Agent API:** `createAgent` · `reference()` · `openai()` · `openaiCompatible()` · `tool()` · `inMemory()` · `invoke()` · `stream()` · `close()`

You do **not** need Blueprints for hello-world.

## Requirements

- Node.js **`>=22 <25`**
- npm, pnpm, or yarn
- ESM (`"type": "module"` or `.mjs`)

CommonJS `require(...)` is **not** a first-class supported path.

## Fastest path — scaffold

```bash
npm create agentprodready@latest my-agent
cd my-agent
npm install
npm run dev
```

Templates: `reference` (default, zero secrets) · `openai` · `openai-compatible`.

> If the create package is not on npm yet, use the manual install below or run examples from the repo.

## Manual install (reference / zero-secret)

```bash
mkdir demo
cd demo
npm init -y
npm pkg set type=module
npm install @agentprodready/agent-framework
```

Create `index.mjs`:

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

```bash
node index.mjs
```

Expected:

```text
Hello
```

No API key, database, or Docker.

Concepts before first response: `createAgent`, `reference`, `invoke`, `close` (≤4). Blueprints required: **0**.

## OpenAI

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

```bash
# bash
export OPENAI_API_KEY="your-key"

# PowerShell
$env:OPENAI_API_KEY="your-key"
```

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});
```

The library does **not** load `.env` files.

## OpenAI-compatible

```js
import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openaiCompatible({
    baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
    model: process.env.OPENAI_COMPATIBLE_MODEL ?? "llama-3.1-70b",
  }),
  instructions: "You are a helpful assistant.",
});
```

Uses `OPENAI_COMPATIBLE_API_KEY` (never silent `OPENAI_API_KEY` fallback). See [openai-compatible.md](./openai-compatible.md).

## Tools, memory, streaming

- Tools: [simple-tools.md](./simple-tools.md) · [`examples/tools-agent`](../../examples/tools-agent)
- Memory: [simple-memory.md](./simple-memory.md) · [`examples/memory-agent`](../../examples/memory-agent)
- Full weekend path: [`examples/backend-agent`](../../examples/backend-agent)
- Streaming: library `stream()` — not HTTP SSE

## Simple mode & security

Simple mode uses embedded defaults and **application-local** Security assumptions.

Appropriate for local apps, CLIs, prototypes, embedded features.

**Not** production HTTP authentication. For internet-facing services, authenticate in your app and see [embed-agent-deployment.md](./embed-agent-deployment.md) · [security.md](./security.md).

## Common errors

| Symptom | Fix |
|---|---|
| `AGENT_MISSING_OPENAI_PACKAGE` | `npm install @agentprodready/ai-provider-openai` |
| `AGENT_MISSING_OPENAI_KEY` | Set `OPENAI_API_KEY` |
| Unsupported Node / engines warning | Use Node 22 or 24 (`>=22 <25`) |
| `ERR_REQUIRE_ESM` | Use ESM |
| `AGENT_CLOSED` | Do not reuse after `close()` |

## Next steps

- [Simple Agent API](./simple-agent-api.md) · [Why AgentProdReady](./why-agentprodready.md)
- [Embed deployment recipe](./embed-agent-deployment.md)
- [Adopting AgentProdReady](./adopting-agentprodready.md)
