# create-agentprodready

**Scaffold a TypeScript AgentProdReady agent in under a minute.**

Part of [AgentProdReady](https://github.com/ameenmari/agentprodready) — *TypeScript agents you can ship this week — with a clean path to production controls when you need them.*

| | |
|---|---|
| **npm** | `npm create agentprodready@latest` |
| **Node** | `>=22 <25` |
| **License** | MIT |

---

## Quick start

```bash
npm create agentprodready@latest my-agent
cd my-agent
npm install
npm run dev
```

Non-interactive default: **reference** template (zero API keys, zero Docker).

---

## Templates

```bash
npm create agentprodready@latest my-agent -- --template reference
npm create agentprodready@latest my-agent -- --template openai
npm create agentprodready@latest my-agent -- --template openai-compatible
```

| Template | Secrets | Use when |
|---|---|---|
| `reference` | none | Local wiring / CI / first success |
| `openai` | `OPENAI_API_KEY` | Real OpenAI Chat Completions |
| `openai-compatible` | `OPENAI_COMPATIBLE_API_KEY` or `auth: "none"` | Gateways / local OpenAI-compatible servers |

Generated projects are **ESM + TypeScript** with `tsx` (`npm run dev`) and depend only on public npm packages (`@agentprodready/agent-framework`, optional `@agentprodready/ai-provider-openai`).

---

## What you get

```ts
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

Next: add `tool()`, `memory: true`, `stream()`, or swap in `openai()` / `anthropic()` / `openaiCompatible()`.

---

## Docs

- [Getting Started](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/getting-started.md)
- [Simple Agent API](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-agent-api.md)
- [Why AgentProdReady](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/why-agentprodready.md)
- Monorepo: [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready)

## License

MIT © 2026 ameenmari
