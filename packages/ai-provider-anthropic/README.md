# `@agentprodready/ai-provider-anthropic`

**First-class Anthropic Messages API adapter** for AgentProdReady (`anthropic-ai`).

Not an OpenAI-compatible gateway — use `openaiCompatible()` for Chat Completions endpoints.

| | |
|---|---|
| **Status** | Published `1.0.x` |
| **Install** | with `@agentprodready/agent-framework` |
| **Credential** | `ANTHROPIC_API_KEY` only |
| **Node** | `>=22 <25` · ESM |
| **License** | MIT |

---

## Install

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-anthropic
export ANTHROPIC_API_KEY="..."   # PowerShell: $env:ANTHROPIC_API_KEY="..."
```

---

## Simple Agent API

```js
import { createAgent, anthropic } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

Supports chat, tools, and streaming via the Anthropic Messages API.

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Anthropic Messages translation + normalized AI results | Capability selection; Security authorization; Runtime |
| Capability id `anthropic-ai` | Treating Anthropic as `openaiCompatible` |

---

## Docs

- [Anthropic guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/anthropic.md)
- Example: [examples/anthropic-agent](https://github.com/ameenmari/agentprodready/tree/main/examples/anthropic-agent)
- [AI providers](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/ai-providers.md)

## License

MIT © 2026 ameenmari
