# Blueprint 08 Implementation Contract Amendment — Embedding Execution Surface

**Amendment ID:** `08-ai-provider-embedding`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous  
**Affects:** `@agentprodready/ai-provider` implementation contracts (not Blueprint 08 constitutional rewrite)  
**Related:** [v0.7 Vector Search & Semantic Memory specification](../specifications/agentprodready-v0.7-vector-search-semantic-memory-specification.md)

---

## 1. Problem

Blueprint 08 lists **Embedding Generation** as an AI capability category, and Blueprint 11 requires Memory enrichment/indexing embeddings via Capability Resolution → AI Provider → normalized result.

Current `@agentprodready/ai-provider` exposes only chat-shaped:

- `AiProviderAdapter.execute(AiExecutionRequest) → NormalizedAiResult` (`content` parts)

Embedding vectors cannot be represented honestly as chat content without violating ADR-011 normalization and ADR-004 provider independence.

v0.7 therefore needs a **parallel** embedding execution surface.

---

## 2. Authority Review

| Source | Finding |
|---|---|
| Blueprint 08 | Embedding Generation already named; no constitutional ban on a dedicated embed API |
| Blueprint 11 | Memory must not call AI SDKs; must use Cap → AI normalized boundary |
| ADR-003 | Public contracts before implementations — this amendment declares them |
| ADR-004 / 005 / 007 / 011 | Provider independence, Composition instantiation, Cap selection, normalize at boundary |

### Blueprint amendment required?

**No.**

### ADR required?

**No.**

---

## 3. Frozen Contracts

```ts
export type EmbeddingInput = Readonly<{
  readonly id: string;
  readonly text: string;
}>;

export interface AiEmbeddingRequest {
  readonly requestId: string;
  readonly binding: CapabilityBinding;
  readonly context: ExecutionContext;
  readonly inputs: readonly EmbeddingInput[];
  readonly model: Readonly<{ id: string; dimensions?: number }>;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface NormalizedEmbedding {
  readonly id: string;
  readonly vector: readonly number[];
  readonly dimensions: number;
}

export interface NormalizedEmbeddingResult {
  readonly requestId: string;
  readonly embeddings: readonly NormalizedEmbedding[];
  readonly model: AiModelMetadata; // capabilities include 'embedding'
  readonly usage: AiUsage;
  readonly diagnosticId: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface AiEmbeddingAdapter {
  readonly id: string;
  embed(request: AiEmbeddingRequest): Promise<NormalizedEmbeddingResult>;
  health(): Promise<HealthResult>;
}

export interface AiEmbeddingAdapterResolver {
  resolve(binding: CapabilityBinding): Promise<AiEmbeddingAdapter>;
}
```

---

## 4. Rules

1. Chat `AiProviderAdapter.execute` / `stream` remain **unchanged**.
2. Embedding is a **parallel** adapter surface — chat adapters are not required to implement `embed`.
3. Empty `inputs` → `AI_INVALID_REQUEST`.
4. Dimension mismatch vs requested/declared model dimensions → `AI_INVALID_REQUEST` (no pad/truncate).
5. Errors normalize through existing `AiErrorCode` / `AdapterFailure` kinds where applicable.
6. Capability id: `embedding`. Bindings e.g. `reference-ai:embedding`, `openai-ai:embedding`.
7. Consumers (including Memory) depend only on these provider-neutral contracts — **never** on OpenAI package/SDK types.

---

## 5. Required Execution Chain (v0.7)

```text
Memory (or other consumer)
  → Capability Resolution (capability: "embedding")
  → AiEmbeddingAdapterResolver.resolve(binding)
  → AiEmbeddingAdapter.embed(request)
  → provider implementation (Composition-instantiated)
```

Forbidden:

```text
Memory → OpenAI SDK / @agentprodready/ai-provider-openai imports
```

---

## 6. First Adapters (authorized by v0.7 product design)

| Adapter | Package | Notes |
|---|---|---|
| `ReferenceEmbeddingAdapter` | `@agentprodready/ai-provider` | Deterministic 32-d; CI/test; no network |
| `OpenAiEmbeddingAdapter` | `@agentprodready/ai-provider-openai` | `embeddings.create`; opt-in live; chat path unchanged |

---

## 7. Non-Goals

- Forcing chat adapters to return vectors inside `NormalizedAiResult.content`
- Changing Capability Resolution public contracts beyond registering `embedding` bindings in Composition/host
- Making embeddings mandatory for default CI

---

## 8. Status

**Implemented** with `@agentprodready/ai-provider@0.2.0` and `@agentprodready/ai-provider-openai@0.3.0` under AgentProdReady v0.7.
