# @agentprodready/ai-provider-anthropic

Anthropic Messages API adapter for AgentProdReady (`anthropic-ai`).

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
```

Requires Node.js `>=22 <25`. This is **not** an OpenAI-compatible gateway — use `openaiCompatible()` for Chat Completions endpoints.
