# AgentForge v1.0 Production Release — Checklist

**Product Version:** 1.0.0  
**Status:** Complete — RELEASE READY (no tag/publish)  
**Date:** 2026-08-08  
**Baseline:** `v0.9.0` / product slice v0.9  

---

## Design

- [x] Product doc approved (Review-Gated → Autonomous)
- [x] Plan approved
- [x] Specification approved
- [x] Production readiness review accepted
- [x] Amendment A authorized (`07-capability-resolution-ordered-fallback-amendment.md`)
- [x] Amendment B authorized (`04-runtime-provider-failover-attempt-amendment.md`)
- [x] Amendment D deferred (HITL wait out of scope)
- [x] No AiRouter / no third-vendor SDK required (accepted)

## Amendment A — Capability Resolution ordered fallback

- [x] `ResolutionRoutingMode` / `ResolutionRoutingConfiguration` contracts
- [x] Optional `routing` on resolution configuration
- [x] `CapabilityResolver.resolveNext` with exclude list
- [x] `validateResolutionRouting` (unknown / duplicate / fallback length)
- [x] `fixed` preserves v0.9 single-primary behavior
- [x] `fallback` ordered list authoritative; unhealthy skipped
- [x] Host config: `AI_ROUTING_MODE`, `AI_FALLBACK_PROVIDERS`
- [x] Amendment A status marked **Implemented**

## Amendment B — Runtime provider failover attempt ledger

- [x] `ProviderAttemptLedger` + snapshot types
- [x] `isFallbackEligibleAiError` (normalized codes only)
- [x] Same-binding retries tracked separately from provider attempts
- [x] OpenAI `maxRetries: 0` retained
- [x] No host third retry layer
- [x] Amendment B status marked **Implemented**

## Routing architecture & proofs

- [x] Cap Resolution selects; Runtime owns ledger; host `executeAiWithRouting` / `streamAiWithRouting`
- [x] No `@agentforge/ai-router` package or `AiRouter` class
- [x] Fallback-eligible codes: retryable `AI_UNAVAILABLE` / `AI_PROVIDER_TIMEOUT` / `AI_RATE_LIMITED` only
- [x] Exact attempt counts: providers ≤ ordered unique; retries separate
- [x] Streaming: fallback before first visible content; none after
- [x] Tool loop: fallback **turn 0 only**; later turns fail closed
- [x] Embedding fixed; no cross-profile failover
- [x] Proof 1 — fixed primary success
- [x] Proof 2 — primary transient → secondary success
- [x] Proof 3 — `AI_INVALID_REQUEST` no fallback
- [x] Proof 4 — fallback exhausted
- [x] Proof 5 — unhealthy skipped
- [x] Proof 6 — stream fail before delta → fallback
- [x] Proof 7 — stream fail after delta → no fallback
- [x] Proof 8 — tool envelope / allowFallback=false → no fallback
- [x] Proof 9 — embedding profile mismatch rejected
- [x] Proof 10 — exact attempt counts
- [x] Proof 11 — no AiRouter; Cap Resolution selector
- [x] Proof 12 — same logical execution identity
- [x] `pnpm test:routing` script + CI job

## Hardening B1–B10

- [x] B1 — Production auth fail-closed + `AGENTFORGE_ALLOW_REFERENCE_AUTH`
- [x] B2 — Ordered fallback + Runtime ledger
- [x] B3 — `MAX_JSON_BODY_BYTES` default 1 MiB + HTTP 500 sanitize
- [x] B4 — Graceful shutdown (`SHUTDOWN_TIMEOUT_MS`, SIGTERM race)
- [x] B5 — Tenant isolation suite (`pnpm test:tenant-isolation`)
- [x] B6 — Docker LABEL 1.0.0 + guides/CHANGELOG/SECURITY
- [x] B7 — Strict boolean/int parsing + configuration guide
- [x] B8 — `release.yml` validate-only + routing in CI
- [x] B9 — DX / quickstart docs path (`pnpm build` + `pnpm smoke` + README)
- [x] B10 — Stale guide/product status updates

## Additional production controls

- [x] Secret hygiene policy (SECURITY.md + guides)
- [x] `OPENAI_BASE_URL` production link-local/metadata reject
- [x] Fault injection classifications suite
- [x] Observability `ai.routing.*` metrics
- [x] Migrations: no destructive v0.9→v1.0 reset required
- [x] Docker demo image `AGENTFORGE_ALLOW_REFERENCE_AUTH=true`
- [x] Compose documented as local-dev only

## Documentation

- [x] `docs/guides/multi-provider-routing.md`
- [x] `docs/guides/configuration.md`
- [x] `docs/guides/production-deployment.md`
- [x] `docs/guides/security.md`
- [x] `docs/guides/operations.md`
- [x] `docs/guides/upgrading.md`
- [x] `CHANGELOG.md`
- [x] `SECURITY.md`
- [x] Implementation report written

## Versions / release artifacts

- [x] All `@agentforge/*` and `platform-host` at **1.0.0**
- [x] `release.yml` validate-only (**no publish**)
- [x] **Git tag `v1.0.0` NOT created** (intentional this cycle)
- [x] **npm publish NOT performed** (intentional this cycle)

## Verification

- [x] Full `pnpm verify` equivalent: lint, typecheck, test (571 pass), build, smoke
- [x] `pnpm test:routing`, `test:tenant-isolation`, `test:tools`, `test:streaming` green
- [x] Recommendation finalized in report: **RELEASE READY**
- [x] Tag `v1.0.0` — **not created** (human-controlled; intentional)
- [x] npm / Docker registry / GitHub Release — **not published** (intentional)

## Explicit non-goals confirmed

- [x] No AiRouter package
- [x] No Amendment D HITL wait/resume
- [x] No third paid-provider SDK
- [x] No npm publish in this cycle
- [x] No git tag creation in this cycle
- [x] No destructive migration requirement for v0.9→v1.0
