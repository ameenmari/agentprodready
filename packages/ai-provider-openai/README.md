# @agentprodready/ai-provider-openai

Additive Blueprint 08 provider adapter for OpenAI.

- Implements `AiProviderAdapter` with id `openai-ai` (chat)
- Implements `AiEmbeddingAdapter` with id `openai-embedding` (parallel embedding surface; chat path unchanged)
- Encapsulates the OpenAI SDK (`openai@7.4.0` exact pin)
- Default chat model: `gpt-5` via `OPENAI_MODEL`
- Default embedding model: `text-embedding-3-small` (1536 dimensions)
- SDK retries disabled (`maxRetries: 0`); Runtime owns retry/timeout/cancellation
- Chat streaming is supported (normalized `AiProviderAdapter.stream`; OpenAI SDK stream types are not exported)
- Native tool calling (v0.5 / product v0.9): `AiToolDefinition[]` → OpenAI tools; vendor tool_calls → `NormalizedToolCall[]`; continuation messages → assistant `tool_calls` + `role=tool`; streamed fragments assembled before emission
- SDK retries disabled (`maxRetries: 0`); Runtime owns retry/timeout/cancellation

Higher layers must depend only on `@agentprodready/ai-provider` contracts. Hosts must not construct OpenAI tool messages directly. See [Tool Calling guide](../../docs/guides/tools.md) and [Streaming guide](../../docs/guides/streaming.md).
