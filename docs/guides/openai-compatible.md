# OpenAI-compatible endpoints

First-class Simple Agent path for **OpenAI Chat Completions–compatible** HTTP APIs.

Production-oriented architecture with a young ecosystem.

## What “OpenAI-compatible” means here

An endpoint that implements the **Chat Completions** request/response (and optionally stream/tool) shapes used by `@agentprodready/ai-provider-openai`.

It does **not** mean:

- every vendor that markets itself as OpenAI-compatible
- Anthropic Messages API
- Responses API / embeddings / image / audio product surfaces
- nonstandard tool or stream protocols

If the gateway diverges, expect normalized provider/unsupported failures — AgentProdReady does not add gateway-specific hacks in v1.3.

## Simple API

```js
import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openaiCompatible({
    baseUrl: "https://api.example.com/v1",
    model: "llama-3.1-70b",
    // apiKey optional if OPENAI_COMPATIBLE_API_KEY is set
  }),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

Requires peer `@agentprodready/ai-provider-openai@^1.0.2`.

## Credential security

| Variable | Used by |
|---|---|
| `OPENAI_COMPATIBLE_API_KEY` | `openaiCompatible()` / `AI_PROVIDER=openai-compatible` |
| `OPENAI_API_KEY` | `openai()` / `AI_PROVIDER=openai` only |

**Invariant:** `OPENAI_API_KEY` is never automatically sent to an arbitrary compatible `baseUrl`.

### Auth modes

```ts
auth?: "api-key" | "none"  // default "api-key"
```

- `api-key` — require `options.apiKey` or `OPENAI_COMPATIBLE_API_KEY`
- `none` — explicit no-auth for local/self-hosted endpoints; do not omit the key and hope

## Capability identity

| Path | Implementation id |
|---|---|
| `openai()` | `openai-ai` |
| `openaiCompatible()` | `openai-compatible-ai` |

Same adapter class; distinct Capability Resolution / audit / telemetry identity. No `AiRouter`.

## SSRF

`baseUrl` must be absolute `http:` / `https:`. In production, cloud metadata / link-local destinations remain blocked. Localhost may be allowed outside production for embedded/simple demos.

## Host Composition

```bash
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_MODEL=llama-3.1-70b
OPENAI_COMPATIBLE_API_KEY=...
# optional: OPENAI_COMPATIBLE_AUTH=none
```

## Example

See [`examples/openai-compatible-agent`](../../examples/openai-compatible-agent).

## Anthropic

Not implemented. Next named provider track — separate Review-Gated adapter design.
