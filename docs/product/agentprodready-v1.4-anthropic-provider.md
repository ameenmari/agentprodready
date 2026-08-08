# AgentProdReady v1.4 — Anthropic Provider

**Implementation Mode:** Autonomous  
**Baseline:** v1.3.1 Adoption Sprint published  
**Promise unchanged:** TypeScript agents you can ship this week — with a clean path to production controls when you need them.  
**Maturity:** Production-oriented architecture with a young ecosystem.

## Goal

Ship a first-class **Anthropic** named-vendor path (Messages API) for Simple Agent + host parity — without redesigning AI Provider ownership or pretending Anthropic is OpenAI-compatible.

## Target API

```js
import { createAgent, anthropic } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: "You are a helpful assistant.",
});
```

Requires `@agentprodready/ai-provider-anthropic` and `ANTHROPIC_API_KEY`.

## Scope

- New package `@agentprodready/ai-provider-anthropic@1.0.0` — `AnthropicProviderAdapter`, id `anthropic-ai`
- Simple `anthropic(modelId)` + bind path
- Chat, tools, streaming via Anthropic Messages API
- Host `AI_PROVIDER=anthropic`
- Example + docs
- `@agentprodready/agent-framework@1.4.0`

## Non-goals

- Gemini / Bedrock
- Treating Anthropic as openaiCompatible
- Embeddings
- Weakening Security / Runtime ownership
