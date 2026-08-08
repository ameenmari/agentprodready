# Anthropic (Simple Agent)

First-class Anthropic Messages API path — **not** an OpenAI-compatible gateway.

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-anthropic
export ANTHROPIC_API_KEY="..."
```

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

## Environment

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required for Simple + host paths |
| `ANTHROPIC_MODEL` | Host default model (`AI_PROVIDER=anthropic`) |
| `ANTHROPIC_BASE_URL` | Optional override (advanced / proxies) |

Credential isolation: this path never reads `OPENAI_API_KEY`.

## Host

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Honesty

- Capability id: `anthropic-ai`
- Tools and streaming use Anthropic Messages shapes
- Embeddings are not provided by this adapter
- Young ecosystem — do not claim battle-tested Anthropic production fleets

Example: [`examples/anthropic-agent`](../../examples/anthropic-agent)
