# AgentProdReady v0.2 Real AI Provider — Implementation Specification

**Document Version:** 1.0  
**Product Version:** 0.2.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Authority and Mode

```text
Implementation Mode: Review-Gated
```

This specification records exact implementation decisions for the additive OpenAI provider. It does not authorize production code until approved.

Architectural authority order remains:

1. Blueprint 01 — Foundation  
2. Accepted ADRs  
3. Blueprint 08 (primary) and dependency blueprints  
4. Blueprint 31 — Governance  
5. This specification and the companion plan  
6. Conforming existing code  

Existing public contracts in `@agentprodready/ai-provider` are reused, not redesigned.

---

# Package Boundary

```text
Framework package (unchanged):  @agentprodready/ai-provider
Provider package (new):         @agentprodready/ai-provider-openai
Provider path:                  packages/ai-provider-openai/
Product host (wiring only):     apps/platform-host/
```

Public TypeScript exports from `@agentprodready/ai-provider-openai` may include:

- `OpenAiProviderAdapter`
- `loadOpenAiProviderConfig` / `OpenAiProviderConfig` (adapter-local config types)
- package constants such as `OPENAI_AI_ID = 'openai-ai'`

They must **not** re-export OpenAI SDK types.

---

# 1. Provider Selection

## Candidates

| Provider | Fit for first production adapter | Notes |
|---|---|---|
| **OpenAI** | **Best** | Broadest modality coverage; mature TS SDK; strong error taxonomy; Azure-compatible base URL later |
| Anthropic | Strong second | Excellent chat/tools; narrower multimodal baseline than OpenAI for a first template |
| Google Gemini | Viable | Good multimodal; SDK/error shapes differ more from OpenAI template |
| Azure OpenAI | Derivative | Usually OpenAI protocol + Azure auth/base URL; better as follow-on variant |

## Recommendation

**OpenAI** is the first production provider.

### Why

1. Best coverage for the platform’s future capability set (chat/text, embeddings, structured outputs, tool calling, vision, audio).
2. Provides the clearest normalization template for subsequent adapters.
3. Official TypeScript SDK is encapsulable behind `AiProviderAdapter`.
4. User product guidance aligns with this selection.

### Future compatibility

Additional providers implement the same `AiProviderAdapter` and register distinct implementation ids. Runtime, Planning, Workflow, Capability Resolution ownership, and Composition instantiation ownership do not change.

---

# 2. Provider Package

## Structure

```text
packages/
  ai-provider/                      # Blueprint 08 framework + ReferenceAiProviderAdapter
    src/
      contracts/
      application/
      reference/
      errors/
  ai-provider-openai/               # NEW — OpenAI production adapter
    package.json                    # name: @agentprodready/ai-provider-openai
    tsconfig.json
    README.md
    src/
      index.ts
      config.ts
      openai-ai-provider-adapter.ts
      translate-request.ts
      translate-response.ts
      translate-error.ts
      openai-ai-provider-adapter.spec.ts
      live/
        openai.live.spec.ts
```

## Ownership

| Concern | Owner |
|---|---|
| AI public contracts | `@agentprodready/ai-provider` (unchanged) |
| Reference adapter | `@agentprodready/ai-provider` (unchanged) |
| OpenAI SDK + translation | `@agentprodready/ai-provider-openai` |
| Instantiation | Composition in `apps/platform-host` |
| Selection | Capability Resolution via seeded implementation ids |

## Dependency rules

```text
@agentprodready/ai-provider-openai
  → @agentprodready/ai-provider
  → @agentprodready/foundation          (HealthResult via adapter contract)
  → openai                          (vendor SDK; private)

apps/platform-host
  → @agentprodready/ai-provider
  → @agentprodready/ai-provider-openai
  ✗ openai                          (forbidden direct dependency)
```

No other framework package may depend on `openai` or `@agentprodready/ai-provider-openai` unless it is Composition/host wiring.

---

# 3. Provider Responsibilities

Exactly what belongs inside `@agentprodready/ai-provider-openai` / `OpenAiProviderAdapter`:

| Responsibility | In adapter? | Notes |
|---|---|---|
| Authentication (API key, org/project headers) | Yes | From adapter config |
| Request translation (messages → vendor payload) | Yes | Text-only messages in v0.2 |
| Response translation → `NormalizedAiResult` | Yes | Content, usage, model metadata, finish reason |
| Stream translation | Stub only | See §8 |
| Tool-call translation | Deferred | See §9 |
| Structured output translation | Minimal | See §10 |
| Embedding generation | No (v0.2) | Future capability adapter method/path |
| Image generation | No (v0.2) | Future |
| Model metadata normalization | Yes | From config + response |
| Token usage normalization | Yes | Map prompt/completion/total tokens |
| Provider diagnostics codes | Yes | Optional `providerDiagnosticCode` on adapter failures; framework diagnostics remain Blueprint 08 |
| Provider error translation | Yes | → `ProviderAdapterError` kinds |
| Health check | Yes | Lightweight authenticated models/list or no-op configured check without mutating state |
| SDK retry / timeout / failover policy | **No** | Must disable SDK retries; no adapter execution policy |

---

# 4. Responsibilities That MUST NOT Move

| Responsibility | Owner | Adapter rule |
|---|---|---|
| Planning | Planning Engine | No plan creation |
| Workflow interpretation | Workflow Engine | No workflow control |
| Runtime operational execution | Runtime | No retry/timeout/cancel/recovery ownership |
| Capability selection | Capability Resolution | Consume binding only |
| Instantiation / lifetimes | Composition | Adapter constructed by Composition factory |
| Security authorization | Security | No authZ decisions |
| Retry | Runtime | SDK `maxRetries: 0` |
| Timeout | Runtime | No adapter timeout policy env |
| Cancellation | Runtime | Pre-call abort already checked by host port; mid-call AbortSignal wiring deferred without contract change |
| Recovery / failover | Runtime / Resolution policy | No provider failover inside adapter |
| Observability platform | Observability (22) | Adapter may throw/return; framework telemetry ports already exist |
| Audit | Audit (17) | Adapter does not write audit trails |
| Persistence | Persistence (24) | No durable writes |
| Event bus transport | Event Bus (16) | Framework publishes AI facts; adapter does not |

---

# 5. Configuration

## Host-level selection

Loaded by `apps/platform-host` config (extends existing local config loader pattern):

| Variable | Required | Default | Validation |
|---|---|---|---|
| `AI_PROVIDER` | No | `reference` | Must be `reference` or `openai` |
| Existing `HOST` / `PORT` / `LOG_LEVEL` / `REFERENCE_AGENT_ENABLED` | Unchanged | Unchanged | Unchanged |

When `AI_PROVIDER=openai`, host must also successfully load OpenAI adapter config before marking ready for AI invokes (fail fast at startup).

## Adapter-level OpenAI config

Loaded only for OpenAI binding; values remain adapter-internal (not placed into `AiExecutionRequest.metadata` / `constraints` keys that fail forbidden-field validation).

| Variable | Required | Default | Validation |
|---|---|---|---|
| `OPENAI_API_KEY` | **Yes** when `AI_PROVIDER=openai` | none | Non-empty string; never logged |
| `OPENAI_BASE_URL` | No | SDK default (`https://api.openai.com/v1`) | Absolute URL if set |
| `OPENAI_MODEL` | No | `gpt-5` | Non-empty string; v0.2 default production model |
| `OPENAI_ORGANIZATION` | No | unset | Optional non-empty string |
| `OPENAI_PROJECT` | No | unset | Optional non-empty string |

Future multi-model selection within a single provider (for example routing `gpt-5` vs a smaller OpenAI model by capability attributes or Resolution configuration) remains adapter- and Composition/Resolution-config concern and must not require Runtime, Planning, or Workflow changes.

## Explicitly rejected configuration

| Variable | Status | Reason |
|---|---|---|
| `OPENAI_MAX_RETRIES` | **Forbidden** | Retry is Runtime-owned (Blueprint 08 Appendix A.5) |
| `OPENAI_TIMEOUT` / `OPENAI_REQUEST_TIMEOUT_MS` | **Forbidden in v0.2** | Timeout is Runtime-owned; do not invent adapter policy |

## SDK construction rules

Dependency pin (exact version, no range):

```text
"openai": "7.4.0"
```

```text
new OpenAI({
  apiKey,
  baseURL?,
  organization?,
  project?,
  maxRetries: 0,   // mandatory
})
```

Model id comes from adapter config (`OPENAI_MODEL`, default `gpt-5`), not from Capability Binding attributes that would leak vendor model selection into higher layers.

## Capability / composition mapping

| `AI_PROVIDER` | Resolution default for `text-generation` | Implementation id | Adapter |
|---|---|---|---|
| `reference` | `reference-ai` | `reference-ai` | `ReferenceAiProviderAdapter` |
| `openai` | `openai-ai` | `openai-ai` | `OpenAiProviderAdapter` |

Both providers should be registerable in the provider registry. Only the selected default is used for the reference-agent path unless Resolution configuration says otherwise.

Constants:

```ts
export const OPENAI_AI_ID = 'openai-ai';
// existing
export const REFERENCE_AI_ID = 'reference-ai';
```

---

# 6. Secret Handling

| Context | Mechanism | Rules |
|---|---|---|
| Local development | `.env` (gitignored) | Copy from `.env.example`; real keys never committed |
| `.env.example` | Placeholders only | `OPENAI_API_KEY=` empty or `sk-...` placeholder comment; no real secrets |
| Source control | No secrets | Pre-commit/human review; CI must not echo keys |
| Docker images | Env at runtime | Never `ENV OPENAI_API_KEY=...` with a real value; pass via Compose/runtime |
| GitHub Actions default | No secret required | `AI_PROVIDER=reference` |
| Opt-in live tests | Local env or future Actions secret `OPENAI_API_KEY` | Only when `AI_LIVE_TESTS=1` |
| Future staging/production | External secret manager → process env | Still consumed only by OpenAI adapter config loader |

Logging/redaction:

- Never log `OPENAI_API_KEY` or Authorization headers.
- Error messages must not include the API key.

---

# 7. Request Flow

Exact constitutional chain for OpenAI mode:

```text
HTTP POST /v1/agents/reference-agent/invoke
  ↓
Security (local reference authorization)          [Blueprint 15]
  ↓
Agent Framework (reference-agent invoke)          [Blueprint 18]
  ↓
Planning Engine                                   [Blueprint 05]
  ↓
Workflow Engine                                   [Blueprint 06]
  ↓
Runtime Orchestrator                              [Blueprint 04]
  ↓
Capability Resolution → Capability Binding        [Blueprint 07]
        binding.implementationId = "openai-ai"
  ↓
Composition / AiAdapterResolver factory           [Blueprint 03]
  ↓
AiProviderFramework.execute                       [Blueprint 08]
  ↓
OpenAiProviderAdapter.execute                     [provider package]
  ↓
OpenAI SDK (vendor request)                       [internal]
  ↓
OpenAiProviderAdapter normalize                   [provider package]
  ↓
NormalizedAiResult                                [Blueprint 08 public output]
  ↓
Runtime completion
  ↓
Workflow completion
  ↓
Agent result
  ↓
HTTP success envelope (evidence.adapterId = "openai-ai")
```

### Bypass prohibitions

- Host HTTP handlers must not call OpenAI SDK.
- Capability Resolution must not instantiate adapters.
- Adapter must not select alternate implementations on failure.
- Runtime must not parse OpenAI response objects.

---

# 8. Streaming

## Decision

**Defer product streaming in v0.2.**

### Why deferred

1. Current product HTTP invoke is request/response JSON, not an SSE/stream API.
2. Framework streaming contracts already exist and are verified by the reference adapter.
3. Shipping non-stream chat first minimizes OpenAI SDK surface and review risk.

### Adapter contract obligation

`AiProviderAdapter.stream` must still exist. For v0.2 OpenAI adapter:

```text
stream(request):
  throw ProviderAdapterError(
    kind: 'invalid-request',
    message: 'Streaming is not supported by openai-ai in v0.2',
    retryable: false,
  )
```

Alternatively, if `request.streaming?.enabled !== true`, framework already rejects; when enabled, adapter returns the unsupported failure above.

### Future

v0.x follow-on may implement `NormalizedAiStreamEvent` mapping from OpenAI streaming chunks without changing Runtime/Planning/Workflow ownership.

---

# 9. Tool Calling

## Decision

**Defer tool calling in v0.2.**

### Why deferred

1. Product agent currently seeds `tools: []` and has no Tool Framework invoke loop in the local reference path.
2. Blueprint 08 normalizes tool calls but must not execute them; full product value needs Blueprint 09 orchestration wiring beyond this slice.
3. Keeping v0.2 focused on text-generation reduces architectural risk.

### Adapter behavior when tools present

If `request.tools` is non-empty:

```text
throw ProviderAdapterError(
  kind: 'invalid-request',
  message: 'Tool calling is not supported by openai-ai in v0.2',
  retryable: false,
)
```

Do not silently ignore tools.

### Future

Normalize OpenAI `tool_calls` into `NormalizedToolCall[]` and return `finishReason: 'tool-calls'` without executing tools. Runtime + Tool Framework remain executors.

---

# 10. Structured Output

## Decision

**Minimal optional support in v0.2; full strict schema platform validation deferred.**

### When `request.structuredOutput` is absent

Use normal text completion. `structuredOutput` field on result remains undefined.

### When `request.structuredOutput` is present

1. Request OpenAI JSON object mode (`response_format: { type: 'json_object' }` or equivalent current SDK API).
2. Parse response text as JSON.
3. On parse failure → `ProviderAdapterError('invalid-request', ..., false)`.
4. Place parsed value on `NormalizedAiResult.structuredOutput`.
5. Still provide normalized text content (raw JSON string as text part is acceptable).

### Schema validation

- Adapter may pass `strict` / schema to vendor APIs when straightforward with the chosen SDK call.
- Platform-wide schema validator ownership is **not** introduced in the adapter.
- Provider independence preserved: higher layers only see `structuredOutput?: unknown`.

### Product host path

v0.2 host invoke path does not require sending `structuredOutput` for the default reference-agent objective flow. Support exists for tests proving normalization.

---

# 11. Error Mapping

All vendor failures must become `ProviderAdapterError` before leaving the adapter. `AiProviderFramework` maps kinds to `NormalizedAiError` codes.

## Kind → code (existing)

| `ProviderAdapterError.kind` | `AiErrorCode` | Typical retryable |
|---|---|---|
| `authentication` | `AI_AUTHENTICATION` | false |
| `rate-limit` | `AI_RATE_LIMITED` | true |
| `context-limit` | `AI_CONTEXT_LIMIT` | false |
| `invalid-request` | `AI_INVALID_REQUEST` | false |
| `unavailable` | `AI_UNAVAILABLE` | true |
| `timeout` | `AI_PROVIDER_TIMEOUT` | true |
| `unknown` | `AI_UNKNOWN` | false |

## OpenAI → kind mapping

| OpenAI / HTTP signal | Map to | Notes |
|---|---|---|
| 401 / invalid API key | `authentication` | |
| 403 authz for key | `authentication` | |
| 429 rate limit | `rate-limit` | retryable true |
| 429 / insufficient_quota | `rate-limit` | treat quota as rate-limit class; retryable false if clearly quota exhaustion when distinguishable |
| context_length_exceeded | `context-limit` | |
| 400 invalid model / bad request | `invalid-request` | includes unknown model |
| 404 model missing | `invalid-request` | |
| 408 / SDK abort network timeout* | `timeout` | *only if naturally surfaced; do not add adapter timeout policy |
| 500 / 502 / 503 / 504 | `unavailable` | retryable true |
| content filter as finish reason | success path | `finishReason: 'content-filtered'` with empty/partial content per vendor body |
| content policy hard error | `invalid-request` | when API errors instead of returning finish reason |
| network DNS/connection reset | `unavailable` | |
| unrecognized | `unknown` | |

Vendor error objects/stacks must not be assigned onto public result types. Optional short `providerDiagnosticCode` string (e.g. OpenAI error `code`) may be attached on `AdapterFailure` if used internally before framework translation; public `NormalizedAiError` remains code/message/retryable/diagnosticId only.

---

# 12. Testing

## Unit tests (CI)

Package `@agentprodready/ai-provider-openai`:

- request translation (roles/content → vendor payload)
- response translation (usage, finish reasons, model metadata)
- error mapping matrix (table in §11)
- rejects tools / streaming / missing api key config
- structured output parse success/failure
- SDK constructed with `maxRetries: 0`
- no exports of vendor types

Use mocked OpenAI client (dependency injection seam on adapter constructor).

## Integration / host tests (CI)

- With `AI_PROVIDER=reference` (default): existing e2e/smoke continue to expect `adapterId: 'reference-ai'`.
- With mocked OpenAI adapter factory bound as `openai-ai`: composition selects OpenAI implementation id and evidence shows `openai-ai` without network.

## Framework regression (CI)

Existing `@agentprodready/ai-provider` tests remain unchanged and green.

## Real provider tests (NOT CI by default)

```text
AI_LIVE_TESTS=1
AI_PROVIDER=openai
OPENAI_API_KEY=...
```

`packages/ai-provider-openai/src/live/openai.live.spec.ts`:

- skip unless `AI_LIVE_TESTS=1`
- perform one small completion against `OPENAI_MODEL`
- assert normalized content non-empty and usage totals consistent

## Manual tests

1. `pnpm start` without key → reference behavior.  
2. `.env` OpenAI mode → invoke returns non-echo model text; evidence `openai-ai`.  
3. Invalid key → normalized authentication failure through HTTP error envelope.  
4. Docker default → reference smoke still passes.

## CI tests

Must succeed with **no** `OPENAI_API_KEY`. Reference provider remains default.

---

# 13. Docker

## Decision

**Environment variables are sufficient. No required Dockerfile redesign.**

| Item | v0.2 change |
|---|---|
| `Dockerfile` | None required |
| `compose.yaml` | Optional comment/env passthrough for `AI_PROVIDER` / `OPENAI_*` |
| `.dockerignore` | Unchanged (already excludes `.env`) |
| Image default | Reference provider |
| Runtime OpenAI | Pass env at `docker run` / Compose; never bake secrets |

HEALTHCHECK and docker-smoke remain reference-provider deterministic.

---

# 14. GitHub Actions

## Decision

**No required CI workflow change for v0.2 default green path.**

| Job | Expectation |
|---|---|
| `verify` | Lint/typecheck/test/build including new package mocked tests |
| `docker` | Unchanged smoke with reference provider |
| Live OpenAI job | Not added in v0.2 unless explicitly approved later as `workflow_dispatch` |

Real provider tests must remain opt-in and must not run on pull_request by default.

---

# 15. Documentation

| Document | Required update |
|---|---|
| `docs/product/agentprodready-v0.2-real-ai-provider.md` | Created (this slice) |
| `docs/guides/ai-providers.md` | Create — how to select reference vs OpenAI, env vars, live tests |
| `.env.example` | Add `AI_PROVIDER` and OpenAI variables (placeholders) |
| Root `README.md` | Document v0.2 optional OpenAI mode; correct stale “Implementation: Not Started” status if touched |
| `docs/README.md` | Link product/plan/spec |
| Package README `packages/ai-provider-openai/README.md` | Adapter scope, non-goals, config |
| `@agentprodready/ai-provider` README | Optional one-line pointer to OpenAI package |

Do not rewrite blueprints/ADRs.

---

# 16. Future Providers

## Extension recipe (no core ownership changes)

```text
1. Create packages/ai-provider-<vendor>/
2. Implement AiProviderAdapter (id: <vendor>-ai)
3. Normalize to NormalizedAiResult / ProviderAdapterError
4. Disable vendor SDK retries/timeouts that conflict with Runtime
5. Register implementation in host capability seed
6. Bind factory in Composition AiAdapterResolver
7. Select via AI_PROVIDER or Resolution configuration
```

## Guaranteed non-modification targets

Adding Anthropic, Gemini, or Azure OpenAI must not require modifying:

- Runtime Orchestrator ownership or public contracts
- Planning Engine
- Workflow Engine
- Capability Resolution Framework internals (only seed/config data)
- Composition Framework internals (only host composition bindings)
- `ReferenceAiProviderAdapter`

Azure OpenAI should prefer reuse of OpenAI adapter config via `OPENAI_BASE_URL` + Azure-compatible auth as a later specialization, not a Runtime change.

---

# Exact Types Reused (No Contract Changes)

From `@agentprodready/ai-provider` (already implemented):

- `AiProviderAdapter`
- `AiExecutionRequest`
- `NormalizedAiResult`
- `NormalizedAiStreamEvent`
- `ProviderAdapterError`
- `NormalizedAiError`
- `AiAdapterResolver` / `FactoryAiAdapterResolver`
- `AiErrorCode` / finish reasons / usage / model metadata

v0.2 introduces **no** new public fields on these contracts.

---

# Host Wiring Specification

## Config additions

```ts
type AiProviderSelection = 'reference' | 'openai';

interface LocalReferenceConfig {
  // existing fields...
  readonly aiProvider: AiProviderSelection;
  readonly openAi?: OpenAiProviderConfig; // present only when aiProvider === 'openai'
}
```

Startup:

1. Load config.  
2. If `aiProvider === 'openai'`, require valid `OpenAiProviderConfig` or throw before listen.  
3. Seed capabilities for both `reference-ai` and `openai-ai` (openai seed may be registration-only even when inactive).  
4. Set Resolution default implementation for `text-generation` from `aiProvider`.  
5. Bind factories:
   - always bind `reference-ai` → `ReferenceAiProviderAdapter`
   - bind `openai-ai` → `OpenAiProviderAdapter` when config present (required in openai mode)

## Evidence

Success invoke evidence must continue to expose `adapterId` equal to the selected implementation id (`reference-ai` or `openai-ai`).

## Generation defaults

Host path may keep `maximumOutputTokens: 128` for parity with v0.1 unless OpenAI mode raises a documented local default (specification default: keep 128 for cost control; live tests may override in-test only).

---

# Observability, Audit, Events

No new product audit schema in v0.2.

- `AiProviderFramework` continues to record diagnostics and publish `ai.completed` / `ai.failed`.
- Host continues existing observability wiring.
- Adapter must not emit vendor payloads into logs.

Persistence remains in-memory reference providers; OpenAI calls are ephemeral provider interactions only.

---

# Security

- Authorization path unchanged (local reference principal).
- API key is credential for vendor API, not a replacement for Blueprint 15 authorization.
- Do not accept client-supplied OpenAI keys via HTTP headers in v0.2 (host env only).

---

# Acceptance Criteria

1. `@agentprodready/ai-provider-openai` implements `AiProviderAdapter` with id `openai-ai`.  
2. Vendor SDK types do not appear in public exports or host imports.  
3. SDK retries disabled.  
4. Default config and CI use `reference-ai` without secrets.  
5. OpenAI mode fails fast on missing key.  
6. Error matrix covered by unit tests.  
7. Tools and streaming rejected per §8–§9.  
8. Live tests skipped unless `AI_LIVE_TESTS=1`.  
9. No ADR/blueprint/public contract/`ReferenceAiProviderAdapter` modifications.  
10. Docker/CI baseline remains green without OpenAI secrets.  
11. Implementation report + checklist completed before claiming done.

---

# Stop Conditions

Stop and report if:

1. Public `@agentprodready/ai-provider` contracts must change incompatibly.  
2. ADRs/blueprints require edit to proceed.  
3. Adapter cannot operate without owning retry/timeout/failover.  
4. Host must import `openai` SDK directly.  
5. Deterministic CI cannot remain green without network AI.  
6. Reference adapter or existing deterministic assertions must be removed/weakened.  
7. New cross-framework ownership transfer is required.

---

# Review End-State Summary

| Item | Decision |
|---|---|
| Recommended provider | **OpenAI** |
| Package structure | `packages/ai-provider-openai` (`@agentprodready/ai-provider-openai`) |
| Files to create | Provider package sources/tests, `docs/guides/ai-providers.md`, post-impl report/checklist |
| Files to modify | Host config/composition/seed/package.json, `.env.example`, README/docs index, lockfile |
| Environment variables | `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` (default `gpt-5`), `OPENAI_ORGANIZATION`, `OPENAI_PROJECT` |
| OpenAI SDK pin | Exact `openai@7.4.0` (no semver range) |
| GitHub secrets required | **None** for default CI; optional `OPENAI_API_KEY` only for future opt-in live workflow |
| Docker impact | Env vars sufficient; no required Dockerfile change |
| CI impact | No required workflow change; reference remains default |
| Testing strategy | Mocked unit + deterministic host/CI; live OpenAI opt-in only |
| Stop conditions | See above |
| Architectural deviations | None intended; path uses `packages/` instead of root `providers/` for workspace ergonomics |
| Autonomous implementation safe? | **Conditionally yes** after an explicit Autonomous proceed instruction, within listed scope and stop conditions |

---

# Review Decision

**Status:** Approved with the three refinements below incorporated.

1. Default `OPENAI_MODEL` is `gpt-5`.
2. Future multi-model selection within a provider is clarified (adapter/Composition/Resolution config only).
3. OpenAI SDK is pinned exactly to `7.4.0`.

**Production code:** wait for an explicit `Implementation Mode: Autonomous` proceed instruction.
