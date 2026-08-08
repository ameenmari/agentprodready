# Report — AgentProdReady v1.3 Provider Ecosystem

**Implementation Mode:** Autonomous  
**Status:** V1.3 PUBLISH READY  
**Date:** 2026-08-08

## D1–D8 final decisions

| ID | Decision | Outcome |
|---|---|---|
| D1 | Facade-first; no `@agentprodready/ai-provider-openai-compatible` | Done |
| D2 | `openaiCompatible({ baseUrl, model, apiKey?, auth?, organization?, project? })` | Done |
| D3 | Distinct id `openai-compatible-ai` (same adapter class) | Done |
| D4 | Credentials: explicit → `OPENAI_COMPATIBLE_API_KEY` only; never `OPENAI_API_KEY` | Done |
| D5 | Anthropic out of scope | Done (docs/ROADMAP only) |
| D6 | Host `AI_PROVIDER=openai-compatible` parity | Done |
| D7 | Live tests optional | Done (CI secret-free) |
| D8 | `agent-framework@1.3.0`; bump openai package only as needed | Done (`ai-provider-openai@1.0.2`) |

### D3 amendment rationale

Distinct capability identity improves routing visibility, audit/telemetry clarity, health diagnostics, and future fallback without inventing a second translation stack.

### D4 security amendment rationale

An OpenAI credential must never be automatically sent to an arbitrary compatible `baseUrl`. Compatible mode uses its own key env (or explicit `apiKey`). `auth: "none"` is explicit for local/no-auth endpoints.

## Final public API

```ts
openaiCompatible({
  baseUrl: string;       // required absolute http(s)
  model: string;         // required
  apiKey?: string;       // auth=api-key
  auth?: "api-key" | "none"; // default api-key
  organization?: string;
  project?: string;
}): AgentModel // provider: "openai-compatible"
```

Exported from `@agentprodready/agent-framework`.

## Implementation id behavior

| Helper | Capability id | Adapter |
|---|---|---|
| `openai()` | `openai-ai` | `OpenAiProviderAdapter` |
| `openaiCompatible()` | `openai-compatible-ai` | same class, `implementationId` set |

## Credential precedence

1. `options.apiKey`
2. `OPENAI_COMPATIBLE_API_KEY`
3. fail if `auth === "api-key"`

`OPENAI_API_KEY` is never read on the compatible path.

## No-auth behavior

`auth: "none"` → no key required; internal non-secret SDK placeholder contained in `@agentprodready/ai-provider-openai` (`OPENAI_NO_AUTH_API_KEY_PLACEHOLDER`). Not logged as a credential.

## SSRF

`validateOpenAiBaseUrl` preserves production blocks for metadata/link-local hosts. Localhost allowed outside production for embedded/simple demos.

## Architecture path

```text
createAgent → embedded Composition → Capability Resolution (openai-compatible-ai)
  → AiProviderFramework → OpenAiProviderAdapter → HTTP endpoint → normalized result
```

No AiRouter, no direct HTTP from agent-framework, no Memory/Runtime/Security/Tool ownership changes.

## Package versions

| Package | Version | Publish? |
|---|---|---|
| `@agentprodready/agent-framework` | **1.3.0** | **Yes** |
| `@agentprodready/ai-provider-openai` | **1.0.2** | **Yes** |
| `@agentprodready/ai-provider` | 1.0.2 | No |

**Recommended publish order:** `ai-provider-openai@1.0.2` then `agent-framework@1.3.0`.

## Docs / examples

- Guide: `docs/guides/openai-compatible.md`
- Example: `examples/openai-compatible-agent`
- Updated: README, package README, getting-started, simple-agent-api, ai-providers, package-compatibility, multi-provider-routing, ROADMAP, CHANGELOG, `.env.example`

## Live-test policy

Optional only when `OPENAI_COMPATIBLE_BASE_URL` + model + auth env present. Default CI remains secret-free.

## Tests / gates

See checklist. Required suites include `pnpm verify`, versioning, public-dx, tools, streaming, routing, tenant-isolation.

## Limitations

- Chat Completions shapes only — not universal “OpenAI-compatible” guarantee
- Tools/streaming only if gateway matches current OpenAI adapter shapes
- Anthropic not implemented

## Anthropic next-track status

Documented as next named provider; requires separate Review-Gated adapter design. No SDK, package, or scaffold added.

## Architectural deviations

None material. Small additive `implementationId` / `authMode` on OpenAI adapter config; compatible config loader; host selection enum extended.

## Publish-ready

**Yes** — pending human release authorization (no npm publish/tag/release performed in this cycle).
