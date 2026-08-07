# AgentProdReady v1.0 Production Release — Implementation Plan

**Document Version:** 1.0  
**Product Version:** 1.0.0 (target)  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Baseline:** v0.9.0

---

## 1. Scope

Implement only:

1. Multi-provider AI routing (Capability Resolution + Runtime + host wiring)  
2. Production readiness / release hardening  

No Blueprint redesign. No `@agentprodready/ai-router`. No Amendment D. No third paid-provider SDK unless a later amendment revises this plan after approval.

---

## 2. Architectural inspection summary

### Existing multi-provider capabilities

- Parallel chat (`AiProviderAdapter`) and embedding (`AiEmbeddingAdapter`) contracts  
- Implementations: `reference-ai`, `openai-ai` (+ evaluation.judge / embedding variants)  
- Streaming + tool calling on normalized contracts; OpenAI SDK private  
- Capability Resolution registers both providers; host selects via `AI_PROVIDER` → `StaticResolutionConfiguration.global`  
- OpenAI `maxRetries: 0`; Runtime owns operational retry  
- Embedding profiles fail-closed on dimension/model/profile mismatch  

### Gaps

| Gap | Owner |
|---|---|
| No ordered fallback candidate list | BP07 policy amendment |
| No Runtime re-resolve on provider-level failure | Runtime + Cap Resolution (ops) |
| Health descriptors static; adapters always healthy | Health sync (minimal) |
| Host binds OpenAI factories only when primary=openai | Composition always bind eligible adapters when configured |
| Stream/tool fallback safety rules not enforced | Host/Runtime policy |
| Routing observability/audit | Observability + Audit |
| Production auth / shutdown / payload limits / release CI | Host + ops |

### Stop-condition check

No stop condition hit: Capability Resolution remains selection authority; no ADR rewrite; no destructive migration required for v0.9→v1.0.

---

## 3. Contract amendments (design-only now)

| ID | Amendment | Purpose |
|---|---|---|
| A | `07-capability-resolution-ordered-fallback-amendment.md` | Explicit ordered candidates; audited fallback; no silent undocumented fallthrough |
| B | `04-runtime-provider-failover-attempt-amendment.md` | Attempt accounting: Runtime retry vs provider fallback ordering; re-resolve boundary |
| C | (docs-only if contracts sufficient) host production-mode policy | `NODE_ENV=production` + reference-auth fail-closed |

Do **not** create AiRouter package amendment.

---

## 4. Workstreams

### WS1 — Multi-provider routing

1. Author Amendment A/B (implementation phase)  
2. Extend resolution configuration shape for ordered list  
3. Runtime/host: on fallback-eligible AI failure **before unsafe boundary**, re-resolve next eligible candidate and continue same execution  
4. Enforce stream/tool safety boundaries  
5. Bind both chat adapters when fallback list includes them  
6. Deterministic CI providers: `reference-primary`, `reference-secondary`, `reference-failing`  
7. Metrics + audit facts  
8. Guide: `docs/guides/multi-provider-routing.md`

### WS2 — Configuration & secrets

1. Canonical config table → `docs/guides/configuration.md`  
2. Unify boolean/int parsing; upper bounds on tool/stream sizes  
3. Secret redaction audit (errors, logs, 500 responses, health)  
4. `.env.example` production comments  
5. Production mode policy for reference auth / insecure SSL warnings  

### WS3 — Security hardening

1. Fail closed: LocalReference as sole auth when `NODE_ENV=production` unless explicit allow flag for demos  
2. Document pluggable production auth (user/plugin-supplied) — no OAuth server in core  
3. HTTP body size limit  
4. Sanitize HTTP 500 messages  
5. Cross-tenant isolation test suite (package + host fixtures)  
6. Re-affirm v0.9 tool invariants as release gates  
7. `SECURITY.md`

### WS4 — Reliability

1. Graceful shutdown with in-flight/SSE drain + timeout  
2. `/ready` semantics for mandatory deps; Docker HEALTHCHECK guidance  
3. Fault-injection tests (AI down, Postgres down, tool timeout, stream disconnect, OCC)  
4. Startup ordering documentation (migrations remain operator-run)

### WS5 — Observability & ops

1. Metric catalog  
2. Logging defaults for production  
3. Trace continuity checklist tests where practical  
4. Guides: `production-deployment.md`, `operations.md`, `security.md`, `upgrading.md`

### WS6 — Docker / CI / supply chain

1. Align Dockerfile LABEL + compose tags to 1.0.0  
2. Release workflow on `v*` tags  
3. Dependency audit / CodeQL / secret scanning guidance  
4. Document branch protection (manual GitHub settings)  
5. Optional container scan step  

### WS7 — API stability & DX

1. Public export audit (mark private packages; trim accidental exports)  
2. Align stable packages to `1.0.0` (see versioning decision)  
3. `CHANGELOG.md`, README quickstart, configuration reference  
4. Fresh-clone proof script/checklist  
5. Fix stale docs (ai-providers.md deferred list; v0.4 product status)

### WS8 — Performance baseline

1. Deterministic load suite (reference AI)  
2. Record p50/p95/p99, TTFB, memory, concurrency — baselines not SLAs  

---

## 5. Implementation order

```text
Amendments A/B (spec freeze)
  → Cap Resolution fallback policy + tests
  → Runtime attempt accounting + host wiring
  → Stream/tool safety + embedding fail-closed tests
  → Config/security/shutdown/payload hardening
  → Observability + docs
  → Docker/CI release gates
  → Package 1.0.0 bumps + CHANGELOG
  → Full release gate matrix
  → Tag v1.0.0 (manual after gates)
```

---

## 6. Testing strategy

| Suite | Purpose |
|---|---|
| `pnpm test:routing` (new) | Deterministic multi-provider routing |
| Existing `verify` / tools / streaming / postgres / recovery / memory / eval / vector | Regression |
| Security/tenant isolation specs | Cross-tenant |
| Fault injection specs | Fail-open vs fail-closed |
| Load baseline script | Resource bounds |
| Clean-clone checklist | DX |
| Docker smoke + release workflow dry-run | Deploy |

No paid provider CI.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Fallback multiplies retries | Single attempt ledger owned by Runtime |
| Mid-stream splice | Forbidden after first content |
| Mid-tool-loop provider switch | Forbidden |
| Embedding index corruption | Profile/dimension fail-closed |
| Shipping LocalReference as prod auth | Production fail-closed |
| Scope creep (HITL, K8s, 3 vendors) | Explicit non-goals |

---

## 8. Acceptance criteria (plan level)

- [ ] Amendments A/B approved and implemented  
- [ ] Fixed mode == v0.9 behavior  
- [ ] Fallback matrix tests green  
- [ ] Stream/tool safety tests green  
- [ ] Embedding cross-profile fallback rejected  
- [ ] Production auth policy enforced  
- [ ] All readiness-review **PASS** categories (or CONDITIONAL with waived signed exceptions — none expected)  
- [ ] Docs/guides/CHANGELOG/SECURITY complete  
- [ ] Release CI green on tag  

---

## 9. Files to create (implementation phase — not now)

### Docs

- `docs/guides/multi-provider-routing.md`  
- `docs/guides/configuration.md`  
- `docs/guides/production-deployment.md`  
- `docs/guides/security.md`  
- `docs/guides/operations.md`  
- `docs/guides/upgrading.md`  
- `docs/implementation/amendments/07-capability-resolution-ordered-fallback-amendment.md`  
- `docs/implementation/amendments/04-runtime-provider-failover-attempt-amendment.md`  
- `CHANGELOG.md`, `SECURITY.md`  
- Report + checklist for v1.0  

### Likely code (implementation phase)

- `packages/capability-resolution/src/**` (ordered fallback policy)  
- `packages/runtime/src/**` (attempt accounting / re-resolve hook)  
- `packages/ai-provider/src/reference/**` (routing test doubles)  
- `apps/platform-host/src/config/**`, `composition/**`, `http/**`, `bootstrap-local.ts`  
- `scripts/run-routing-tests.mjs`, load/baseline scripts  
- `.github/workflows/ci.yml`, new `release.yml`  
- `Dockerfile`, `compose.yaml`, `.env.example`, package.json versions  

**This Review-Gated pass creates no production code.**

---

## 10. Stop conditions

Stop Autonomous implementation if any Part R condition from the product request appears (constitutional redesign, AiRouter duplication, secret-in-CI, unresolved cross-tenant flaw, etc.).
