# `@agentprodready/ai-provider-openai`

**OpenAI adapter** for AgentProdReady. Implements `@agentprodready/ai-provider` contracts and keeps the OpenAI SDK encapsulated in this package.

| | |
|---|---|
| **Status** | Production adapter published (`1.0.x`) |
| **Install** | `npm install @agentprodready/ai-provider-openai` |
| **Peer / dep** | Uses `openai@7.4.0` (exact pin) |
| **License** | MIT |

### Simple Agent path (most apps)

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
export OPENAI_API_KEY="..."
```

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});
```

Also powers `openaiCompatible({ baseUrl, model, … })` with capability id `openai-compatible-ai`.

---

## Installation

```bash
npm install @agentprodready/ai-provider @agentprodready/ai-provider-openai
```

### Environment

| Variable | Purpose | Default |
|---|---|---|
| `OPENAI_API_KEY` | Required for live calls | — |
| `OPENAI_MODEL` | Chat model | platform default (see host config) |

---

## Features

| Feature | Description |
|---|---|
| Chat adapter | id `openai-ai` → `AiProviderAdapter` |
| Embedding adapter | id `openai-embedding` → `AiEmbeddingAdapter` |
| Streaming | Normalized stream events (SDK stream types not exported) |
| Tool calling | OpenAI tools ↔ `NormalizedToolCall[]` |
| No SDK retries | `maxRetries: 0` — Runtime owns retry/timeout/cancel |
| Encapsulation | Higher layers never import `openai` package types |

---

## Usage

Wire through Composition / Capability Resolution (recommended). Conceptual:

```ts
import type { AiProviderAdapter } from '@agentprodready/ai-provider';
// Concrete factory is provided by this package — resolve via Composition in hosts

declare const openaiChat: AiProviderAdapter;

const result = await openaiChat.generate({
  messages: [
    { role: 'system', content: 'Be concise.' },
    { role: 'user', content: 'What is AgentProdReady?' },
  ],
});
```

**Do not** build raw OpenAI `tool` / `tool_calls` messages in your app. Use normalized AI Provider types and continuation helpers from `@agentprodready/ai-provider`.

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/ai-provider`](https://www.npmjs.com/package/@agentprodready/ai-provider) | Contracts you should import in app code |
| [`@agentprodready/runtime`](https://www.npmjs.com/package/@agentprodready/runtime) | Operational policy |
| [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) | Agent lifecycle |

---

## Documentation

- [AI providers](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/ai-providers.md)
- [Tools](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/tools.md)
- [Streaming](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/streaming.md)

---

## License

MIT © 2026 ameenmari
