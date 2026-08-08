# AgentProdReady v1.3 — Provider Ecosystem

**Document type:** Product design  
**Product version:** 1.3.0 (target)  
**Implementation Mode:** Review-Gated  
**Status:** Implemented (Autonomous) — publish pending human authorization  
**Baseline:** AgentProdReady v1.2.1 (`@agentprodready/agent-framework` published; Simple chat/tools/memory shipped)  
**Scope:** Grow the **provider ecosystem** without disturbing architecture ownership — start with a first-class **OpenAI-compatible** path, then sequence Anthropic and others.

---

## 1. Product principle

Build an agent in minutes. Add production controls when you need them.

v1.1–v1.2 made the Simple Agent path real. The ecosystem is still thin: effectively **reference** + **OpenAI**. External and roadmap feedback agree the highest-leverage next step is broader model connectivity — especially OpenAI-compatible endpoints — without inventing a second AI stack.

Maturity wording remains:

> Production-oriented architecture with a young ecosystem.

---

## 2. Why “Provider Ecosystem” now

| Weakness today | Why it matters |
|---|---|
| Official Simple API only names `reference()` and `openai()` | Adopters on Groq, Together, local gateways, Azure-ish OpenAI APIs, Ollama OpenAI mode, etc. feel locked out |
| `OPENAI_BASE_URL` already works on the OpenAI adapter | Capability exists but is **undiscoverable** as a product story |
| Anthropic / Gemini not present | Real demand, but different protocols — higher cost than compatible-first |
| No ecosystem framing | ROADMAP “Next” already points at OpenAI-compatible; this cycle makes it the product track |

---

## 3. Target experiences

### 3.1 OpenAI-compatible (v1.3.0 — proposed)

```js
import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openaiCompatible({
    baseUrl: "https://api.example.com/v1",
    model: "llama-3.1-70b",
    // apiKey optional if OPENAI_COMPATIBLE_API_KEY is set (never OPENAI_API_KEY)
  }),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);
await agent.close();
```

**Meaning:** Same Chat Completions–shaped wire protocol as today’s OpenAI adapter, with an explicit **required** `baseUrl` and a first-class Simple helper. Not a new normalization architecture.

### 3.2 Existing OpenAI path stays

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});
```

`openai()` remains the ergonomic path for api.openai.com (env `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`).

### 3.3 Anthropic (sequenced after compatible — not v1.3.0 code)

Design acknowledgment only in this cycle: Anthropic is the strongest **named-vendor** follow-on after OpenAI-compatible ships. It requires a distinct adapter (messages/tools/streaming shapes), not a baseUrl tweak.

Proposed later Simple helper (not implemented in 1.3.0):

```js
// FUTURE — not in v1.3.0
// import { createAgent, anthropic } from "@agentprodready/agent-framework";
// model: anthropic("claude-sonnet-4-20250514")
```

---

## 4. What v1.3 is / is not

| Is | Is not |
|---|---|
| First-class OpenAI-compatible Simple API + docs + example | A second AI Provider Framework |
| Reuse of existing `AiProviderAdapter` / OpenAI translation | Redesign of Runtime, Security, Memory, Tool ownership |
| Clear sequencing: compatible → Anthropic → others | Implementing Anthropic/Gemini in the same first slice |
| Honest compatibility matrix (what “compatible” means) | Claim that every OpenAI-ish gateway is fully supported |
| Optional host Composition wiring parity | New `AiRouter` or Capability Resolution rewrite |

---

## 5. Architecture constraints (non-negotiable)

Per ADRs 004 / 005 / 007 / 011 and Blueprint 08:

- Vendor SDKs and wire formats stop at adapters
- Composition instantiates adapters
- Capability Resolution selects implementation ids
- Runtime owns retry / timeout / cancel
- Simple facade must not become a parallel provider stack

v1.3 **must not** disturb Memory, Security authorization ownership, or ToolInvocationCoordinator paths.

---

## 6. Packaging options (for review)

| Option | Summary | Recommendation |
|---|---|---|
| **A. Facade-first** | `openaiCompatible(...)` in `agent-framework`; bind existing `@agentprodready/ai-provider-openai` with required `baseUrl` | **Preferred for v1.3.0** |
| **B. Thin package** | New `@agentprodready/ai-provider-openai-compatible` wrapping the same adapter / distinct implementation id | Optional later if npm discoverability demands a named package |
| **C. Docs-only** | Document `OPENAI_BASE_URL` only | Insufficient as a “provider ecosystem” release |

---

## 7. Compatibility honesty

“OpenAI-compatible” means: endpoints that accept the OpenAI **Chat Completions** request/response/stream shapes used by the current adapter (including tools where the gateway supports them).

Not guaranteed:

- Every vendor quirk / non-standard tool protocol
- Embeddings / audio / image product surfaces in this cycle
- Anthropic Messages API via the same helper

Document known good patterns (official OpenAI, common gateways) and how to verify with a live smoke (key-gated).

---

## 8. Success criteria

1. Developer can point Simple Agent at a compatible endpoint with `baseUrl` + key + model without reading host env folklore
2. Existing `openai()` / `reference()` paths remain green
3. Public DX + optional live smoke cover the new path
4. Docs state Anthropic as next named provider, not silently “supported”
5. No ownership / ADR amendments required

---

## 9. Out of scope for v1.3.0

- Anthropic / Gemini / Bedrock adapters (implementation)
- `@agentprodready/core`
- Durable memory / Context Assembly product changes
- Node engines widen (unless already green independently)
- Hosted SaaS / multi-tenant provider marketplace

---

## 10. Related docs

- ROADMAP Next: OpenAI-compatible provider
- [AI Providers guide](../guides/ai-providers.md)
- [Multi-provider routing](../guides/multi-provider-routing.md)
- Blueprint 08 — AI Provider Framework
- ADR-004 Provider Independence, ADR-005 Composition Owns Instantiation
