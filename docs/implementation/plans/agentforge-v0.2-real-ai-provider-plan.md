# AgentProdReady v0.2 Real AI Provider — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.2.0  
**Plan Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Objective

Add the first production-capable AI provider (OpenAI) as an additive Blueprint 08 adapter, wire it through existing Composition and Capability Resolution selection, and keep the deterministic `ReferenceAiProviderAdapter` as the default for local development and CI.

This is a **provider integration** task, not a framework redesign.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| README.md | Yes |
| docs/README.md | Yes |
| docs/cursor-start-here.md | Yes |
| docs/implementation-guidelines.md | Yes |
| docs/implementation/implementation-modes.md | Yes |
| docs/project-structure.md | Yes |
| docs/architecture/dependency-graph.md | Yes |
| docs/product/agentprodready-v0.1-local-reference-product.md | Yes |
| docs/product/agentprodready-v0.2-real-ai-provider.md | Yes (companion) |
| Blueprint 08 — AI Provider Framework | Yes |
| Blueprint 15 — Security | Yes |
| Blueprint 16 — Event Bus | Yes |
| Blueprint 17 — Audit | Yes |
| Blueprint 22 — Observability | Yes |
| Blueprint 24 — Persistence | Yes |
| Blueprints 03, 04, 07 (Composition, Runtime, Capability Resolution) | Yes |
| ADR-004, ADR-005, ADR-006, ADR-008, ADR-011, ADR-012 | Yes |
| 08-ai-provider-framework implementation plan/spec/report | Yes |
| agentprodready-v0.1-local-reference-product plan/spec/report | Yes |
| agentprodready-v0.1-container-ci plan/spec/report | Yes |
| packages/ai-provider current contracts and reference adapter | Yes |
| apps/platform-host composition, seed, config | Yes |

---

# Scope

## In Scope

- New package `@agentprodready/ai-provider-openai` implementing `AiProviderAdapter`
- OpenAI SDK encapsulation (chat completions / responses path for text generation)
- Request, response, usage, model metadata, and error normalization
- Adapter-internal authentication and model configuration
- Host configuration: `AI_PROVIDER` selection + OpenAI env vars
- Composition binding for `openai-ai` implementation id
- Capability seed/registration for OpenAI implementation alongside reference
- Unit tests with mocked SDK/network
- Opt-in live tests (never automatic in CI)
- Documentation: README notes, provider guide, `.env.example` updates
- Product version documentation bump to 0.2.0 for this slice

## Out of Scope

- Changes to approved ADRs or Engineering Blueprints
- Changes to public framework contracts in `@agentprodready/ai-provider`
- Modifications to `ReferenceAiProviderAdapter` or existing deterministic tests’ required secrets/network
- Streaming product/HTTP surface
- Tool-calling product loops and Tool Framework orchestration changes
- Embeddings, image, audio, moderation product APIs
- Anthropic, Gemini, Azure OpenAI adapters
- Adapter-owned retry, timeout, cancellation, recovery, or failover
- PostgreSQL, Redis, brokers, K8s, production secret managers
- Changing default CI to require `OPENAI_API_KEY`

---

# Recommended Provider

**OpenAI**

| Candidate | v0.2 decision |
|---|---|
| OpenAI | **Selected** — broadest coverage and best first reference for the provider ecosystem |
| Anthropic | Deferred — same adapter pattern later |
| Google Gemini | Deferred — same adapter pattern later |
| Azure OpenAI | Deferred — likely thin variant of OpenAI adapter (base URL + Azure auth) later |

---

# Package Structure

## Decision

Create a **separate workspace package** so the OpenAI SDK never becomes a dependency of `@agentprodready/ai-provider`.

```text
packages/
  ai-provider/                 ← unchanged framework + reference adapter
    src/
      contracts/
      application/
      reference/
      errors/
  ai-provider-openai/          ← NEW production provider package
    package.json               ← @agentprodready/ai-provider-openai
    src/
      index.ts
      openai-ai-provider-adapter.ts
      config.ts
      translate-request.ts
      translate-response.ts
      translate-error.ts
      openai-ai-provider-adapter.spec.ts
      live/
        openai.live.spec.ts    ← gated; skipped unless AI_LIVE_TESTS=1
```

## Why not nest under `packages/ai-provider/src/openai/`?

- Prevents OpenAI SDK dependency pollution of the framework package.
- Keeps CI/reference installs free of vendor SDK coupling.
- Matches Blueprint 08 plugin/replaceable-adapter intent and ADR-004 isolation.

## Why not root `providers/openai/` yet?

`docs/project-structure.md` allows a root `providers/` tree. The current workspace globs are `apps/*` and `packages/*`. v0.2 uses `packages/ai-provider-openai` to avoid workspace layout churn. Future alignment to root `providers/*` is optional and non-blocking.

---

# Dependencies

| Blueprint / Package | Role |
|---|---|
| 08 `@agentprodready/ai-provider` | Contracts, framework, error types (unchanged) |
| 07 `@agentprodready/capability-resolution` | Implementation selection via binding |
| 03 Composition (host wiring) | Instantiates adapter via `FactoryAiAdapterResolver` |
| 04 Runtime | Owns retry/timeout/cancellation around invoke |
| 15 Security | Unchanged authorization path |
| 16/17/22 | Existing facts/audit/diagnostics path unchanged |
| `openai@7.4.0` npm SDK | Internal only to `@agentprodready/ai-provider-openai`; exact version pin |
| `@agentprodready/platform-host` | Config + seed + Composition binding only |

---

# Proposed Files

## Create

```text
packages/ai-provider-openai/
  package.json
  tsconfig.json
  README.md
  src/index.ts
  src/config.ts
  src/openai-ai-provider-adapter.ts
  src/translate-request.ts
  src/translate-response.ts
  src/translate-error.ts
  src/openai-ai-provider-adapter.spec.ts
  src/live/openai.live.spec.ts

docs/guides/ai-providers.md
docs/implementation/reports/agentprodready-v0.2-real-ai-provider-implementation-report.md   (post-impl)
docs/implementation/checklists/agentprodready-v0.2-real-ai-provider-checklist.md           (post-impl)
```

## Modify

```text
apps/platform-host/package.json                          # depend on @agentprodready/ai-provider-openai
apps/platform-host/src/config/local-reference-config.ts  # AI_PROVIDER + OpenAI config load/validate
apps/platform-host/src/composition/local-reference-composition.ts
apps/platform-host/src/seed/reference-capabilities.seed.ts
.env.example
README.md                                                # v0.2 provider notes; fix stale "Not Started" if in scope of docs
docs/README.md                                           # link product/plan/spec
pnpm-lock.yaml
pnpm-workspace discovery                                 # automatic via packages/*
```

## Do Not Modify

```text
docs/adrs/**
docs/blueprints/**
packages/ai-provider/src/contracts/**
packages/ai-provider/src/reference/reference-adapter.ts
Existing deterministic reference/e2e tests’ assertions for default path
Public Runtime / Planning / Workflow / Capability Resolution contracts
```

---

# Configuration Summary

| Variable | Required | Default | Notes |
|---|---|---|---|
| `AI_PROVIDER` | No | `reference` | `reference` \| `openai` |
| `OPENAI_API_KEY` | Yes if `AI_PROVIDER=openai` | none | Secret; never commit |
| `OPENAI_BASE_URL` | No | OpenAI SDK default | Azure-compatible endpoints later |
| `OPENAI_MODEL` | No | `gpt-5` | Adapter-internal model id (v0.2 default production model) |
| `OPENAI_ORGANIZATION` | No | unset | Optional header |
| `OPENAI_PROJECT` | No | unset | Optional header |

Future multi-model selection within a single provider (for example routing `gpt-5` vs a smaller OpenAI model by capability attributes or Resolution configuration) remains adapter- and Composition/Resolution-config concern and must not require Runtime, Planning, or Workflow changes.

**SDK pin:** `@agentprodready/ai-provider-openai` depends on exact `openai@7.4.0` (no `^` / `~` range).

**Explicitly excluded:** `OPENAI_MAX_RETRIES`, `OPENAI_TIMEOUT` as adapter execution policy. SDK retries must be disabled (`maxRetries: 0`). Runtime owns operational timeout/retry/cancellation.

---

# Secret Handling

| Environment | Mechanism |
|---|---|
| Local | `.env` (gitignored); documented by `.env.example` without real secrets |
| CI default | No secrets; `AI_PROVIDER=reference` |
| Opt-in live CI (future optional) | GitHub Actions secret `OPENAI_API_KEY` + explicit workflow input/flag |
| Staging / production (future) | External secret manager; injected as env; never baked into images |

---

# Request Flow (Unchanged Ownership)

```text
HTTP
  → Security
  → Agent
  → Planning
  → Workflow
  → Runtime
  → Capability Resolution
  → Composition (adapter instance)
  → AiProviderFramework
  → OpenAiProviderAdapter
  → OpenAI SDK
  → Normalized AI Result
  → Runtime
  → Workflow
  → Agent
  → HTTP
```

No layer may be bypassed. Host must not call OpenAI SDK directly.

---

# Deferred Capabilities

| Concern | v0.2 decision | Reason |
|---|---|---|
| Streaming | Deferred | HTTP product is non-streaming; adapter `stream()` returns normalized unsupported failure |
| Tool calling | Deferred | No product tool loop; Tool Framework ownership unchanged |
| Structured output | Minimal optional | If request includes `structuredOutput`, use JSON object mode + parse; full schema-strict platform validation deferred |
| Embeddings / image / audio | Deferred | Outside text-generation product path |

---

# Testing Strategy

| Layer | Location | CI |
|---|---|---|
| Unit (translation/error mapping) | `packages/ai-provider-openai` with mocked SDK | Yes |
| Framework contract regression | Existing `@agentprodready/ai-provider` tests | Yes (unchanged) |
| Host default path | Existing e2e/smoke with `reference-ai` | Yes |
| Host OpenAI composition (mocked) | New host unit/integration with fake adapter or mocked SDK | Yes if no network |
| Live OpenAI | `AI_LIVE_TESTS=1` + real key | **No** — opt-in only |
| Docker smoke | Existing docker-smoke | Yes — reference only |

---

# Docker Impact

**No Dockerfile or Compose structural change required** if environment variables are sufficient.

- Default image/CI continues with reference provider.
- Optional local Compose env can set `AI_PROVIDER=openai` and pass `OPENAI_API_KEY` from host env without committing secrets.
- Do not bake keys into images.

---

# GitHub Actions Impact

**No required CI workflow change** for green default path.

- `verify` + `docker` continue without secrets.
- Live provider tests must be skipped unless an explicit opt-in flag and secret are present.
- Do not add `OPENAI_API_KEY` as a required repository secret for PRs.

---

# Risks

| Risk | Mitigation |
|---|---|
| SDK retries conflict with Runtime policy | Force `maxRetries: 0`; forbid adapter timeout/retry env policy |
| Secrets leak into git/image | `.gitignore` / `.dockerignore` / `.env.example` placeholders only |
| Contract pressure to expose model names upward | Keep model in adapter config; forbidden-key validation already rejects model-name metadata |
| Scope creep into tools/streaming | Explicit deferrals + stop conditions |
| Breaking deterministic tests | Default `AI_PROVIDER=reference`; do not rewrite existing assertions |

---

# Acceptance Mapping

| Criterion | Verification |
|---|---|
| OpenAI adapter implements `AiProviderAdapter` | Package tests |
| Vendor types never leave package | Boundary/lint + type exports review |
| Default remains reference | Config default + CI smoke/e2e |
| Composition instantiates; Capability Resolution selects | Host wiring + seed tests |
| Errors normalized | Parameterized error mapping tests |
| No ADR/blueprint/public contract change | Diff review |
| Live tests not in CI | Test gate on `AI_LIVE_TESTS` |
| Docker/CI remain green without secrets | Existing workflows unchanged |

---

# Completion Artifacts (Post-Implementation)

- `docs/implementation/reports/agentprodready-v0.2-real-ai-provider-implementation-report.md`
- `docs/implementation/checklists/agentprodready-v0.2-real-ai-provider-checklist.md`

---

# Decision Summary (Design-Time Answers)

## Recommended provider

**OpenAI**

## Package structure

`packages/ai-provider-openai` (`@agentprodready/ai-provider-openai`), separate from `@agentprodready/ai-provider`

## Files to create

See Proposed Files → Create

## Files to modify

See Proposed Files → Modify

## Environment variables

`AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_ORGANIZATION`, `OPENAI_PROJECT`

## GitHub secrets required

**None** for default CI. Optional later: `OPENAI_API_KEY` for explicitly opt-in live workflow only.

## Docker impact

Environment variables sufficient; no required Dockerfile redesign.

## CI impact

No required workflow change; reference remains default.

## Testing strategy

Mocked unit + deterministic host tests in CI; live OpenAI opt-in only.

## Stop conditions

1. Implementation requires changing ADRs, blueprints, or public `@agentprodready/ai-provider` contracts.
2. OpenAI SDK types would need to cross the Blueprint 08 boundary.
3. Adapter would need to own retry/timeout/failover to function.
4. Default CI cannot stay green without secrets or network AI calls.
5. `ReferenceAiProviderAdapter` or existing deterministic tests must be weakened/removed.
6. Host would need to call OpenAI outside Composition → AiProviderFramework.
7. A new cross-framework contract not implied by approved architecture is required.

## Architectural deviations

**None intended.** Optional note: package path uses `packages/ai-provider-openai` instead of root `providers/openai` for current workspace ergonomics; ownership remains Blueprint 08 provider adapter.

## Safe for Autonomous implementation?

**Yes — conditionally, after an explicit Autonomous proceed instruction.** Design is approved with refinements. Implementation is safe if it:

- creates only the additive package and listed host/docs wiring;
- disables SDK retries;
- keeps reference as default;
- does not modify ADRs/blueprints/public AI contracts/`ReferenceAiProviderAdapter`;
- stops on any stop condition above.

---

# Review Decision

**Status:** Approved with refinements (default model `gpt-5`, multi-model future note, SDK pin `openai@7.4.0`).

Await an explicit `Implementation Mode: Autonomous` proceed instruction before production code.

**Companion specification:** [agentprodready-v0.2-real-ai-provider-specification.md](../specifications/agentprodready-v0.2-real-ai-provider-specification.md)  
**Companion product doc:** [agentprodready-v0.2-real-ai-provider.md](../../product/agentprodready-v0.2-real-ai-provider.md)
