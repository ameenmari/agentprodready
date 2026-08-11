# `@agentprodready/ai-provider-gemini`

**First-class Google Gemini API adapter** for AgentProdReady (`gemini-ai`).

Not an OpenAI-compatible gateway — use `openaiCompatible()` for Chat Completions endpoints.

| | |
|---|---|
| **Status** | Published `1.0.x` |
| **Install** | with `@agentprodready/agent-framework` |
| **Credential** | `GEMINI_API_KEY` only |
| **Node** | `>=22 <25` · ESM |
| **License** | MIT |

---

## When to use

Use this package when you need the native Gemini Generative Language API (chat, tools, streaming).

Prefer `@agentprodready/agent-framework` Simple API (`gemini()`) for most applications — it wires this adapter for you.

Do **not** use this package for embeddings (deferred in v1.6) or when a generic OpenAI-compatible endpoint is sufficient.

---

## Install

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-gemini
export GEMINI_API_KEY="..."   # PowerShell: $env:GEMINI_API_KEY="..."
```

Optional: `GEMINI_MODEL` (default `gemini-2.0-flash`), `GEMINI_BASE_URL`.

---

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

Supports chat, tools, and streaming via the Gemini API. Embeddings are not included in this release.

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Gemini request/response translation + normalized AI results | Capability selection; Security authorization; Runtime |
| Capability id `gemini-ai` | Treating Gemini as `openaiCompatible` |
| Env config (`GEMINI_API_KEY`, optional model/base URL) | Embeddings (deferred) |

---

## Docs

- [Gemini guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/gemini.md)
- [AI providers](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/ai-providers.md)
- [Monorepo README](https://github.com/ameenmari/agentprodready#readme)

## License

MIT © 2026 ameenmari
