# `@agentprodready/ai-provider`

**Vendor-neutral AI contracts** for AgentProdReady — chat, embeddings, streaming, and tool-calling shapes without locking your app to a single model vendor.

| | |
|---|---|
| **Status** | Production contracts published (`1.0.x`) |
| **Install** | `npm install @agentprodready/ai-provider` |
| **Module** | ESM |
| **License** | MIT |

---

## Installation

```bash
npm install @agentprodready/ai-provider

# OpenAI adapter (optional)
npm install @agentprodready/ai-provider-openai
```

Set `OPENAI_API_KEY` when using the OpenAI adapter.

---

## Features

| Feature | Description |
|---|---|
| **Chat adapter contract** | `AiProviderAdapter` — generate / stream |
| **Embedding adapter contract** | `AiEmbeddingAdapter` — parallel surface (chat adapters need not embed) |
| **Normalized messages** | `AiMessage`, roles, tool calls |
| **Streaming events** | `content` / `usage` / `completed` / `failed` / `cancelled` |
| **Tool calling shapes** | `NormalizedToolCall`, continuation message builders |
| **Reference adapters** | Deterministic CI adapters (no network) |
| **AbortSignal** | Cancellation on requests |

---

## Why use this instead of the OpenAI SDK directly?

```text
Your app / Runtime
        ↓
@agentprodready/ai-provider  (contracts)
        ↓
@agentprodready/ai-provider-openai | reference | future Anthropic…
```

Swap providers in Composition / Capability Resolution without rewriting business logic.

---

## Usage (conceptual)

```ts
import type { AiProviderAdapter, AiMessage } from '@agentprodready/ai-provider';

declare const ai: AiProviderAdapter; // from Composition

const messages: AiMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
];

const result = await ai.generate({
  messages,
  // model, tools, signal, … per contract
});

console.log(result);
```

### Streaming

```ts
for await (const event of ai.stream({ messages, signal: controller.signal })) {
  switch (event.type) {
    case 'content':
      process.stdout.write(event.text);
      break;
    case 'completed':
    case 'failed':
    case 'cancelled':
      // exactly one terminal event
      break;
  }
}
```

### Tool calling

- Assistant turns may include `toolCalls?: NormalizedToolCall[]`
- Use `buildToolContinuationMessages(...)` for ordered continuations  
- Guide: [Tools](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/tools.md)

---

## Reference adapters (CI)

| Adapter | Role |
|---|---|
| Reference chat | Deterministic responses; tool triggers like `USE_TOOL_ECHO:` |
| `ReferenceEmbeddingAdapter` | Deterministic 32-d vectors, no network |

Never treat reference adapters as production models.

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/ai-provider-openai`](https://www.npmjs.com/package/@agentprodready/ai-provider-openai) | OpenAI implementation |
| [`@agentprodready/runtime`](https://www.npmjs.com/package/@agentprodready/runtime) | Retries, timeouts, cancel |
| [`@agentprodready/capability-resolution`](https://www.npmjs.com/package/@agentprodready/capability-resolution) | Provider selection / fallback |

---

## Documentation

- [AI providers guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/ai-providers.md)
- [Streaming guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/streaming.md)
- [Multi-provider routing](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/multi-provider-routing.md)
- [Blueprint 08](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/08-ai-provider-framework.md)

---

## License

MIT © 2026 ameenmari
