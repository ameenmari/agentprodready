# AgentForge v0.2 Real AI Provider

**Version:** 0.2.0  
**Status:** Implemented — Complete  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentForge v0.2 introduces the first production-capable AI provider while preserving the constitutional architecture proven in v0.1.

v0.1 remains the deterministic local reference product. v0.2 adds an **additive** OpenAI provider adapter that can be selected by configuration. The reference provider stays the default for local development and CI.

This product slice is **not** a framework redesign. It is a provider plugin plus host composition wiring.

---

## Authority

| Document | Role |
|---|---|
| [Blueprint 08 — AI Provider Framework](../blueprints/08-ai-provider-framework.md) | Provider boundary and normalization ownership |
| [ADR-004 — Provider Independence](../adrs/ADR-004%20%E2%80%94%20Provider%20Independence.md) | Vendor SDK encapsulation |
| [ADR-005 — Composition Owns Instantiation](../adrs/ADR-005%20%E2%80%94%20Composition%20Owns%20Instantiation.md) | Adapter lifetime and binding |
| [ADR-006 — Runtime Owns Operational Execution](../adrs/ADR-006%20%E2%80%94%20Runtime%20Owns%20Operational%20Execution.md) | Retry, timeout, cancellation, recovery |
| [Implementation Plan](../implementation/plans/agentforge-v0.2-real-ai-provider-plan.md) | Approved approach (pending review) |
| [Implementation Specification](../implementation/specifications/agentforge-v0.2-real-ai-provider-specification.md) | Exact contracts before code (pending review) |

Framework blueprints, ADRs, and existing public framework contracts remain authoritative and unchanged.

---

## Product Boundary

```text
HTTP Client
    │
    ▼
apps/platform-host                 ← composition / transport / config selection only
    │
    ├── Security → Agent → Planning → Workflow → Runtime
    ├── Capability Resolution      ← selects implementation id
    ├── Composition                ← instantiates selected adapter
    ├── AiProviderFramework        ← validates + normalizes boundary
    │       ├── ReferenceAiProviderAdapter   (default, unchanged)
    │       └── OpenAiProviderAdapter        (new, additive)
    └── Normalized AI Result → Runtime → HTTP
```

The host may select which adapter factory Composition binds. It must not translate OpenAI SDK types, own retry/timeout, or bypass Security.

---

## Recommended First Provider

**OpenAI**

Rationale:

- Broadest practical coverage for later capability expansion (chat, embeddings, structured outputs, tool calling, vision, audio).
- Mature official TypeScript SDK suitable for encapsulation behind Blueprint 08.
- Strong ecosystem documentation for error/rate-limit patterns.
- Excellent reference shape for Anthropic, Gemini, and Azure OpenAI adapters later.

Future providers remain compatible through the existing `AiProviderAdapter` contract. No Runtime, Planning, Workflow, Capability Resolution, or Composition ownership changes are required to add them.

---

## Local Surface

HTTP surface remains the v0.1 product surface:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Process liveness |
| `GET` | `/ready` | Application readiness |
| `POST` | `/v1/agents/reference-agent/invoke` | Invoke the built-in reference agent |

When `AI_PROVIDER=reference` (default), invoke remains deterministic echo behavior with `adapterId: "reference-ai"`.

When `AI_PROVIDER=openai` and a valid key is present, invoke returns model-generated text with `adapterId: "openai-ai"` evidence. The constitutional chain is unchanged.

---

## Provider Selection

| Setting | Default | Meaning |
|---|---|---|
| `AI_PROVIDER` | `reference` | `reference` or `openai` |

Capability Resolution continues to select by implementation id. Composition binds:

| `AI_PROVIDER` | Implementation id | Adapter |
|---|---|---|
| `reference` | `reference-ai` | `ReferenceAiProviderAdapter` |
| `openai` | `openai-ai` | `OpenAiProviderAdapter` |

Both implementations may be registered. Resolution configuration selects the active default for `text-generation`.

Default OpenAI model is `gpt-5` via `OPENAI_MODEL` (overridable). Future multi-model selection within a single provider (for example routing `gpt-5` vs a smaller OpenAI model by capability attributes or Resolution configuration) remains adapter- and Composition/Resolution-config concern and must not require Runtime, Planning, or Workflow changes.

The OpenAI SDK is pinned exactly to `openai@7.4.0` inside `@agentforge/ai-provider-openai`.

---

## Explicit Non-Goals (v0.2)

- Changing ADRs, blueprints, or public framework contracts
- Modifying `ReferenceAiProviderAdapter` behavior
- Changing deterministic CI tests to require network or secrets
- Streaming HTTP responses
- Tool-calling product loops
- Embeddings, image, audio, moderation product APIs
- Anthropic / Gemini / Azure OpenAI adapters (architecture-ready, not implemented)
- PostgreSQL, Redis, brokers, Kubernetes, production secret managers
- New Runtime retry/timeout ownership inside the adapter

---

## Developer Experience

| Mode | Command / setup | AI used |
|---|---|---|
| Default local | `pnpm start` (no secrets) | Reference |
| OpenAI local | `.env` with `AI_PROVIDER=openai` + `OPENAI_API_KEY` | OpenAI |
| CI | GitHub Actions (no secrets) | Reference |
| Live opt-in tests | Explicit env flag + secret | OpenAI |

---

## Success Definition

v0.2 is successful when:

1. OpenAI adapter produces only `NormalizedAiResult` / `NormalizedAiError` at the Blueprint 08 boundary.
2. Default and CI paths remain deterministic with `reference-ai`.
3. Selecting OpenAI requires only Composition registration, capability seed/config, and secrets outside source control.
4. No layer in the constitutional chain is bypassed.
5. Future providers can be added without modifying Runtime, Planning, Workflow, Capability Resolution ownership, or public framework contracts.

---

## Related Artifacts

- Plan: [agentforge-v0.2-real-ai-provider-plan.md](../implementation/plans/agentforge-v0.2-real-ai-provider-plan.md)
- Specification: [agentforge-v0.2-real-ai-provider-specification.md](../implementation/specifications/agentforge-v0.2-real-ai-provider-specification.md)
- Prior product: [agentforge-v0.1-local-reference-product.md](agentforge-v0.1-local-reference-product.md)
- Prior baseline: v0.1 container/CI at tag `v0.1.0`
