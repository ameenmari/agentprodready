# @agentforge/ai-provider

Blueprint 08's vendor-neutral AI interaction and normalization boundary. Runtime retains operational execution policy; Composition supplies adapter instances.

Chat (`AiProviderAdapter`) and embeddings (`AiEmbeddingAdapter`) are parallel surfaces — chat adapters are not required to embed. `ReferenceEmbeddingAdapter` is deterministic and reference-only for CI/tests (32-d, no network).

### Streaming (v0.8)

`AiProviderAdapter.stream` yields `NormalizedAiStreamEvent` (`content` / `usage` / `completed` / `failed` / `cancelled`). Requests may carry `signal?: AbortSignal`. Exactly one terminal event per stream (no throw after terminal). Reference streaming uses deterministic whitespace-preserving chunks.

### Tool calling (v0.4 / product v0.9)

- `AiMessage.toolCalls?: readonly NormalizedToolCall[]` on assistant turns
- `AiToolContinuationInput` / `AiToolContinuationResult` + `buildToolContinuationMessages(...)` (ordered: base → assistant toolCalls → tool results)
- Reference AI deterministic triggers: `USE_TOOL_ECHO:` / `USE_TOOL_COUNTER` (CI only; not real model reasoning)

Production OpenAI adapters: [`@agentforge/ai-provider-openai`](../ai-provider-openai/README.md). See [Tool Calling guide](../../docs/guides/tools.md), [Streaming guide](../../docs/guides/streaming.md), and [AI Providers guide](../../docs/guides/ai-providers.md).
