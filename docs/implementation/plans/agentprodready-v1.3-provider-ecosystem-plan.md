# Plan — AgentProdReady v1.3 Provider Ecosystem

**Implementation Mode:** Review-Gated  
**Product:** [agentprodready-v1.3-provider-ecosystem.md](../../product/agentprodready-v1.3-provider-ecosystem.md)  
**Status:** Design — stop for approval before production code

## Problem

The Simple Agent ecosystem still presents as **reference + OpenAI**. Many adopters use OpenAI-compatible gateways. The OpenAI adapter already supports `baseUrl`, but the product surface does not make that a first-class path. Anthropic and others remain valuable but are higher-cost protocol work.

## Goal

Ship **v1.3.0** as the first Provider Ecosystem slice: first-class **OpenAI-compatible** Simple API + docs + example, without redesigning Blueprint 08 or touching Memory/Runtime/Security ownership. Sequence Anthropic as the next named-vendor track after this slice.

## Non-goals (v1.3.0)

- Anthropic / Gemini / Bedrock implementation
- New normalization architecture or `AiRouter`
- `@agentprodready/core`
- Durable memory / Context Assembly productization
- Mechanical lockstep package bumps

## Recommended approach (pending D-decisions)

**Facade-first (Option A):**

1. Add `openaiCompatible({ baseUrl, model, apiKey?, organization?, project? })` to `@agentprodready/agent-framework`
2. Bind through existing `@agentprodready/ai-provider-openai` `OpenAiProviderAdapter` with **required** `baseUrl`
3. Keep implementation id `openai-ai` unless review prefers a distinct id (see specification D3)
4. Document honesty matrix + example `examples/openai-compatible-agent`
5. Optional small helpers/docs in `ai-provider-openai` only if needed for loaders

## Workstreams

| ID | Work | Depends | Verification |
|---|---|---|---|
| W0 | Product + plan + spec + review approval | — | Human approve D1–D8 |
| W1 | Simple model type + `openaiCompatible()` + validation | W0 | Unit tests |
| W2 | Embedded platform bind path (explicit config) | W1 | Integration tests |
| W3 | Docs (ai-providers, simple-agent-api, getting-started, README) | W1 | Doc audit |
| W4 | Example + public DX (skip live without key/baseUrl) | W2 | `pnpm test:public-dx` |
| W5 | Host Composition parity (optional but preferred) | W2 | Host config tests if touched |
| W6 | Version, CHANGELOG, report, checklist | W1–W5 | `pnpm verify` + versioning |

## Package versions (expected)

| Package | Version | Why |
|---|---|---|
| `@agentprodready/agent-framework` | **1.3.0** | Public Simple model surface |
| `@agentprodready/ai-provider-openai` | bump only if public helpers/config export changes | Selective |
| `@agentprodready/ai-provider` | no bump unless contracts change | Prefer none |
| New `ai-provider-openai-compatible` | **not** in v1.3.0 if Option A approved | Deferred |

## Dependencies / ownership

- Hard reuse: Blueprint 08 contracts, existing OpenAI adapter translation
- Composition owns bind (embedded platform + optional host)
- Capability Resolution continues to select `openai-ai` (or approved distinct id)
- No Memory / Security / Tool ownership changes

## Stop conditions

Stop and re-review if:

1. Compatible path would bypass `AiProviderAdapter` / Composition bind
2. Anthropic is pulled into the same first implementation slice without a separate approved track
3. A new package is required for reasons other than discoverability and would duplicate translation
4. SSRF / baseUrl production rules would be weakened
5. `@agentprodready/core` is proposed as mandatory

## Approval gate

Do **not** start production code until the specification decisions **D1–D8** are approved (or explicitly amended in writing).
