# backend-agent

**Canonical wow example** — embed-style AgentProdReady path for TypeScript backend developers.

## What problem does this solve?

Shows the daily journey in one short file: `createAgent` → provider → instructions → tool → memory → `invoke` → `stream` → error handling → `close`.

## How do I run it?

```bash
npm install
npm start
```

## Env variables

None for the default `reference()` path.

Optional later: install `@agentprodready/ai-provider-openai`, set `OPENAI_API_KEY`, and change `model: openai("gpt-4o-mini")` (OpenAI selects tools from schemas — drop the `USE_TOOL:` prefix).

## Expected output

- An `invoke:` line that includes a tool result for ticket `T-42`
- A `memory:` diagnostics object (`enabled`, `retrievedItemCount`, …)
- A `stream:` line with tool result text for `T-99`

## Is it production-safe?

No — this is a local demo. Simple/embedded mode is not production HTTP auth.  
Ship path: [embed-agent-deployment.md](../../docs/guides/embed-agent-deployment.md).

## What should I read next?

- Focused tools: [`../tools-agent`](../tools-agent)
- Gateway credentials: [`../openai-compatible-agent`](../openai-compatible-agent)
- [Simple Agent API](../../docs/guides/simple-agent-api.md) · [Why AgentProdReady](../../docs/guides/why-agentprodready.md)
