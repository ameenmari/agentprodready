# @agentforge/ai-provider-openai

Additive Blueprint 08 provider adapter for OpenAI.

- Implements `AiProviderAdapter` with id `openai-ai` (chat)
- Implements `AiEmbeddingAdapter` with id `openai-embedding` (parallel embedding surface; chat path unchanged)
- Encapsulates the OpenAI SDK (`openai@7.4.0` exact pin)
- Default chat model: `gpt-5` via `OPENAI_MODEL`
- Default embedding model: `text-embedding-3-small` (1536 dimensions)
- SDK retries disabled (`maxRetries: 0`); Runtime owns retry/timeout/cancellation
- Streaming and tool calling are not supported in v0.2

Higher layers must depend only on `@agentforge/ai-provider` contracts. The host may wire this package through Composition.
