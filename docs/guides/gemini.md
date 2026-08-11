# Gemini Provider

Named Google Gemini path for the Simple Agent API.

Production-oriented architecture with a young ecosystem.

## Install

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-gemini
export GEMINI_API_KEY="..."   # PowerShell: $env:GEMINI_API_KEY="..."
```

Optional env: `GEMINI_MODEL` (default `gemini-2.0-flash`), `GEMINI_BASE_URL`.

The library does **not** load `.env` files.

## Simple Agent API

```js
import { createAgent, gemini } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: gemini("gemini-2.0-flash"),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

Capability id: `gemini-ai`. Native Generative Language API — **not** `openaiCompatible()`.

## Features

- Chat, tools, and streaming via `@agentprodready/ai-provider-gemini`
- Host parity: `AI_PROVIDER=gemini`
- Embeddings deferred in v1.6

## Related

- [AI providers](./ai-providers.md)
- [`@agentprodready/ai-provider-gemini`](../../packages/ai-provider-gemini/README.md)
