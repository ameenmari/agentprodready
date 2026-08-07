# @agentforge/ai-provider-openai

Additive Blueprint 08 provider adapter for OpenAI.

- Implements `AiProviderAdapter` with id `openai-ai` (chat)
- Implements `AiEmbeddingAdapter` with id `openai-embedding` (parallel embedding surface; chat path unchanged)
- Encapsulates the OpenAI SDK (`openai@7.4.0` exact pin)
- Default chat model: `gpt-5` via `OPENAI_MODEL`
- Default embedding model: `text-embedding-3-small` (1536 dimensions)
- SDK retries disabled (`maxRetries: 0`); Runtime owns retry/timeout/cancellation
- Chat streaming is supported in v0.4 (normalized `AiProviderAdapter.stream`; OpenAI SDK stream types are not exported)
- Tool calling remains unsupported
- SDK retries disabled (`maxRetries: 0`); Runtime owns retry/timeout/cancellation

Higher layers must depend only on `@agentforge/ai-provider` contracts. See [Streaming guide](../../docs/guides/streaming.md).
