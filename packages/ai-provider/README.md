# @agentforge/ai-provider

Blueprint 08's vendor-neutral AI interaction and normalization boundary. Runtime retains operational execution policy; Composition supplies adapter instances.

Chat (`AiProviderAdapter`) and embeddings (`AiEmbeddingAdapter`) are parallel surfaces — chat adapters are not required to embed. `ReferenceEmbeddingAdapter` is deterministic and reference-only for CI/tests (32-d, no network).

Production OpenAI adapters: [`@agentforge/ai-provider-openai`](../ai-provider-openai/README.md). See [AI Providers guide](../../docs/guides/ai-providers.md).
