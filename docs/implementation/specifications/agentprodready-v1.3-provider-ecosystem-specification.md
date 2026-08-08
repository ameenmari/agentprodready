# Specification — AgentProdReady v1.3 Provider Ecosystem

**Implementation Mode:** Review-Gated  
**Status:** Awaiting decision approval  
**Package focus:** `@agentprodready/agent-framework@1.3.0` (+ selective openai package only if required)

---

## 1. Decisions (approve / amend)

| ID | Topic | Proposed default | Alternatives |
|---|---|---|---|
| **D1** | Packaging | **APPROVED** Facade-first — no new npm package in 1.3.0 | — |
| **D2** | Simple helper | **APPROVED** `openaiCompatible({ baseUrl, model, apiKey?, auth?, organization?, project? })` | — |
| **D3** | Implementation id | **AMENDED APPROVED** Distinct **`openai-compatible-ai`** (same adapter class; not `openai-ai`) | — |
| **D4** | API key resolution | **AMENDED APPROVED** explicit → `OPENAI_COMPATIBLE_API_KEY` only; **never** `OPENAI_API_KEY`. `auth?: "api-key" \| "none"` (default `api-key`) | — |
| **D5** | Anthropic in 1.3.0 | **APPROVED** Out of code scope | — |
| **D6** | Host Composition | **APPROVED** `AI_PROVIDER=openai-compatible` + compatible env; bind `openai-compatible-ai` | — |
| **D7** | Live tests | **APPROVED** Optional only | — |
| **D8** | Version | **APPROVED** `agent-framework@1.3.0`; bump `ai-provider-openai` if adapter id/auth surface changes | — |

---

## 2. Public Simple API

### 2.1 Types

```ts
export type AgentModel =
  | { readonly provider: 'reference'; readonly modelId: 'reference' }
  | { readonly provider: 'openai'; readonly modelId: string }
  | {
      readonly provider: 'openai-compatible';
      readonly modelId: string;
      readonly baseUrl: string;
      readonly apiKey?: string;
      readonly organization?: string;
      readonly project?: string;
    };
```

### 2.2 Helper

```ts
function openaiCompatible(options: {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly organization?: string;
  readonly project?: string;
}): AgentModel;
```

Validation:

- `baseUrl` required, absolute `http:` / `https:` URL
- Apply existing production host blocks (localhost / metadata / link-local) consistent with `ai-provider-openai` SSRF policy
- `model` non-empty string
- `apiKey` optional at helper time; must resolve before bind or fail with clear `AGENT_INVALID_CONFIG` / existing OpenAI missing-key error

### 2.3 Exports

Export `openaiCompatible` from `@agentprodready/agent-framework` (root + simple index), same pattern as `openai` / `reference`.

---

## 3. Binding behavior

In `buildEmbeddedPlatform` / `bindOpenAiAdapter` (or sibling bind helper):

| Model provider | Adapter package | Config |
|---|---|---|
| `reference` | in-package reference | none |
| `openai` | `@agentprodready/ai-provider-openai` | env key + optional env baseUrl (unchanged) |
| `openai-compatible` | same OpenAI adapter | **required** baseUrl from model; key from options/env chain |

Do not execute vendor HTTP outside `AiProviderAdapter`.  
Do not change Memory / Security / tool-loop ownership.

---

## 4. Host Composition (if D6 approved)

Preferred parity:

- Document `OPENAI_BASE_URL` + `AI_PROVIDER=openai` as today’s compatible path
- Optionally accept `AI_PROVIDER=openai-compatible` requiring `OPENAI_BASE_URL` (or `OPENAI_COMPATIBLE_BASE_URL`) and key

No Capability Resolution algorithm changes beyond seeding/binding the same or approved implementation id.

---

## 5. Documentation

| Doc | Change |
|---|---|
| `docs/guides/ai-providers.md` | Add openai-compatible row; honesty matrix; Anthropic “next” |
| `docs/guides/simple-agent-api.md` | Helper table + example |
| `docs/guides/getting-started.md` | Link compatible path |
| `docs/guides/package-compatibility.md` | Note peer still `ai-provider-openai` for compatible |
| Root + package README | Provider ecosystem / compatible snippet |
| `ROADMAP.md` | Move compatible into Now/Done appropriately after ship; Anthropic under Next |

New guide (optional but preferred): `docs/guides/openai-compatible.md`.

---

## 6. Example

`examples/openai-compatible-agent/`:

- `npm install` / `npm start`
- Requires `OPENAI_COMPATIBLE_BASE_URL` (or `OPENAI_BASE_URL`) + API key env
- Clear README: Chat Completions compatible only; not Anthropic
- No secrets committed

---

## 7. Tests

| Case | Gate |
|---|---|
| `openaiCompatible` validation (missing baseUrl/model, bad URL) | Unit |
| Bind fails clearly without API key | Unit |
| Bind succeeds with explicit apiKey + baseUrl (mock adapter or nock-free config assert) | Unit/integration |
| `reference` + `openai` unchanged | Existing suites |
| Public DX: import helper + construct without live call | `test:public-dx` |
| Live invoke | Only if env provides key+baseUrl |

---

## 8. Compatibility matrix (product copy)

| Backend class | v1.3.0 stance |
|---|---|
| OpenAI API | Supported via `openai()` |
| OpenAI Chat Completions–compatible HTTP APIs | Supported via `openaiCompatible()` / documented env path |
| Anthropic Messages API | Not supported — next named provider |
| Non-OpenAI proprietary protocols | Not supported |

---

## 9. Files likely touched (implementation phase)

- `packages/agent-framework/src/simple/models.ts`
- `packages/agent-framework/src/simple/types.ts`
- `packages/agent-framework/src/simple/validate-options.ts`
- `packages/agent-framework/src/simple/embedded-platform.ts`
- `packages/agent-framework/src/simple/embedded-capabilities.ts` (if distinct id)
- `packages/agent-framework/src/simple/*.spec.ts`
- `packages/agent-framework/src/index.ts` / `simple/index.ts`
- Docs/guides + README + CHANGELOG + ROADMAP
- `examples/openai-compatible-agent/**`
- `scripts/test-public-dx.mjs`
- Optionally `apps/platform-host` composition + `.env.example`
- Optionally small export/helper in `packages/ai-provider-openai`

---

## 10. Acceptance

| ID | Criterion |
|---|---|
| A1 | `openaiCompatible` is public and documented |
| A2 | Required baseUrl enforced; SSRF policy preserved |
| A3 | Existing openai/reference paths unchanged in behavior |
| A4 | Example + DX gates pass; live optional |
| A5 | Anthropic not falsely claimed |
| A6 | No Memory/Runtime/Security ownership changes |
| A7 | Report + checklist before publish authorization |

---

## 11. Anthropic sequencing (design only)

After v1.3.0 ships:

1. New Review-Gated track: `@agentprodready/ai-provider-anthropic` implementing `AiProviderAdapter`
2. Simple helper `anthropic(modelId)` + optional peer dependency
3. Separate translation for messages/tools/streaming — do **not** force through OpenAI shapes

This specification does **not** authorize Anthropic production code.
