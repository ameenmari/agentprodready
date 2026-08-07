# AgentForge v1.0 Production Release — Implementation Specification

**Document Version:** 1.0  
**Product Version:** 1.0.0 (target)  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Baseline:** v0.9.0  

This specification freezes v1.0 contracts and behaviors. Production code must not change until approval.

---

## 1. Existing provider inventory (normative baseline)

### 1.1 Packages

| Package | Role |
|---|---|
| `@agentforge/ai-provider` | Chat/embedding contracts, framework, reference adapters |
| `@agentforge/ai-provider-openai` | OpenAI chat + embedding (SDK private, `maxRetries: 0`) |
| `@agentforge/capability-resolution` | Implementation selection |
| `@agentforge/composition` | Instantiation |
| `@agentforge/runtime` | Operational execution |

### 1.2 Chat contract

`AiProviderAdapter`: `execute`, `stream`, `health`  
Request: `AiExecutionRequest` (`tools?`, `streaming?`, `signal?`)  
Result: `NormalizedAiResult` (`toolCalls`, `finishReason`)  
Stream: `NormalizedAiStreamEvent` (`content` \| `tool-call` \| `usage` \| `completed` \| `failed` \| `cancelled`)  
Continuation: `buildToolContinuationMessages`

### 1.3 Embedding contract

`AiEmbeddingAdapter`: `embed`, `health` — parallel surface, not on chat adapter.

### 1.4 Seeded implementation ids

| Id | Capability |
|---|---|
| `reference-ai` | `text-generation` |
| `openai-ai` | `text-generation` |
| `reference-ai:evaluation.judge` / `openai-ai:evaluation.judge` | `evaluation.judge` |
| `reference-ai:embedding` / `openai-ai:embedding` | `embedding` |

### 1.5 Normalized AI errors

| Code | Fallback-eligible (v1.0) |
|---|---|
| `AI_UNAVAILABLE` | **Yes** (when `retryable === true`) |
| `AI_PROVIDER_TIMEOUT` | **Yes** (when `retryable === true`) |
| `AI_RATE_LIMITED` | **Yes** only when `retryable === true` (quota exhaustion = **No**) |
| `AI_AUTHENTICATION` | **No** |
| `AI_INVALID_REQUEST` | **No** |
| `AI_CONTEXT_LIMIT` | **No** |
| `AI_UNKNOWN` | **No** (fail closed; do not guess) |

Eligibility **MUST** use normalized `NormalizedAiError` / stream `failed` fields, never SDK errors.

### 1.6 What already enables substitution

Capability Resolution + Composition factories + normalized contracts. Host today maps `AI_PROVIDER` → single `global` preferred id. **No AiRouter exists; none shall be created.**

---

## 2. Routing ownership (frozen)

| Concern | Owner |
|---|---|
| Eligible candidate filtering + ordered selection | Capability Resolution |
| Instantiation | Composition |
| Vendor normalize / translate | AI Provider Framework |
| Timeout, cancel, recovery, **attempt ledger**, when to re-resolve | Runtime |
| Routing config validation | Configuration / host config loader |
| Authorization | Security |
| Metrics / traces | Observability |
| Safe audit facts | Audit |

---

## 3. Routing contract sufficiency

### Sufficient today

- `ImplementationDescriptor` (`enabled`, `health`, `priority`, attributes)  
- `DeterministicResolutionPolicy` eligibility filters  
- Precedence scopes tenant→workspace→project→global→default  
- Parallel chat/embedding capabilities  
- Normalized retryable errors  

### Insufficient today (requires Amendment A)

- Ordered **fallback list** after primary failure  
- Explicit audited fallthrough (today: configured-but-invalid → hard fail, no next candidate)  
- Resolve-time “skip unhealthy” for dynamic health updates  

`priority` exists but is unused by policy — v1.0 **MAY** use it only as a tie-break inside equal eligibility; ordered config list is authoritative for failover.

### Amendment A — Capability Resolution ordered fallback (design)

**Status:** Design — Pending Review (implement only after approval)

Add configuration shape (exact TypeScript names frozen at implementation start; conceptual fields):

```text
ResolutionRoutingConfiguration {
  mode: 'fixed' | 'fallback'
  orderedImplementationIds: readonly string[]  // primary first
}
```

Semantics:

- `fixed`: resolve exactly as v0.9 (single configured id / default). Ignore secondary ids.  
- `fallback`: try `orderedImplementationIds[0]`; on Runtime-directed failover, Cap Resolution returns **next eligible** unused id for the same capability/request.  
- Exhausted list → resolution/runtime failure (no silent default jump unless default is listed).  
- Still **no** silent fallthrough when a configured id is unknown at startup validation.  
- Preferences must not embed provider SDK keys (existing ban retained).

### Amendment B — Runtime provider failover attempts (design)

**Status:** Design — Pending Review

Frozen attempt model:

```text
attemptLedger[executionId] = {
  providerAttempts: [{ implementationId, errorCode?, outcome }],
  runtimeRetriesForCurrentProvider: number
}
```

Ordering for a single logical AI call:

```text
1. Resolve primary binding (Cap Resolution)
2. Invoke AI (execute|stream) under Runtime timeout/cancel
3. If failure AND fallback-eligible AND routing mode=fallback
     AND safety boundary allows
     AND next candidate exists:
       → record failover fact
       → re-resolve next binding
       → goto 2 with SAME logical request (normalized messages)
4. Else fail closed
```

Rules:

- Adapters **MUST NOT** implement retry loops (OpenAI `maxRetries: 0` retained).  
- Runtime in-process retry for the **same** binding remains optional and bounded (`maxAttempts` per binding).  
- Provider fallback **does not** reset unbounded retries: total provider attempts ≤ `len(orderedIds)`; per-provider Runtime retries ≤ configured max.  
- Host **MUST NOT** add a third retry layer.

---

## 4. First multi-provider strategy

| Decision | Value |
|---|---|
| Additional real vendor (Anthropic/Gemini/Azure) | **Not in v1.0** |
| Proof | `reference-ai` + `openai-ai` + CI doubles (`reference-failing`, etc.) |
| Rationale | Architecture already provider-neutral; third SDK is marketing unless product claims cross-vendor prod failover |

---

## 5. Configuration (routing)

Proposed names (align with existing `AI_*` conventions; finalize in implementation only if collision-free):

| Variable | Default | Meaning |
|---|---|---|
| `AI_ROUTING_MODE` | `fixed` | `fixed` \| `fallback` |
| `AI_PROVIDER` | `reference` | Primary chat implementation selector (retained) |
| `AI_FALLBACK_PROVIDERS` | empty | Comma-separated secondary selectors (`openai`, `reference`) when mode=fallback |

Validation:

- Unknown tokens → startup fail  
- `fallback` with empty fallbacks → equivalent to fixed (or fail validation — **prefer fail validation** if mode=fallback explicitly set with no fallbacks)  
- OpenAI in list requires `OPENAI_API_KEY` at startup when mode would allow selecting it  
- Reference CI remains: defaults, no secrets  

Embedding routing continues via `EMBEDDING_PROVIDER` + `VECTOR_INDEX_PROFILE` — **no cross-profile fallback**.

---

## 6. Fallback safety boundaries

### 6.1 Chat execute (non-stream)

| State | Fallback allowed? |
|---|---|
| Before successful `NormalizedAiResult` returned to Runtime | Yes, if eligible |
| After successful result (including `finishReason: tool-calls`) delivered into tool loop | **No** provider switch for that AI turn |

### 6.2 Tool loop

| State | Fallback allowed? |
|---|---|
| Before first AI response for the invocation | Yes |
| After AI proposed tool calls (turn envelope persisted) | **No** |
| After any `pre-tool` / `post-tool` | **No** |
| During AI continuation after tools | **No** (same binding; fail closed) |

Rationale: normalized continuation is portable, but mixing providers mid-loop risks divergent tool schemas/models and contradicts “same logical execution” simplicity for v1.0. Prefer fail closed.

### 6.3 Streaming

| State | Fallback allowed? |
|---|---|
| Failure before first outward SSE `delta`/`content` to client | Yes |
| After any client-visible content/tool_call SSE event | **No** — emit terminal stream error |

Do not splice provider outputs.

### 6.4 Embedding

| Case | Behavior |
|---|---|
| Same profile / dimensions / metric | Fallback **MAY** be allowed in future; **v1.0: embedding routing remains fixed** (no embedding failover) |
| Different `VECTOR_INDEX_PROFILE` / dimensions | **Fail closed** always |

---

## 7. Health-aware routing

v1.0 minimal:

- Retain descriptor `health` filter (`unhealthy` ineligible; `degraded` remains eligible unless config says otherwise — **default: degraded eligible**)  
- Adapters **MAY** implement real health probes; reference remains always healthy  
- Optional providers **MUST NOT** block `/ready` unless configured mandatory  
- Mandatory OpenAI (primary=openai or listed without reference alternative in fixed mode) **MUST** fail ready/startup when key missing  

Dynamic live health flipping mid-traffic is **best-effort**; not a distributed consensus feature.

---

## 8. Observability & audit (routing)

### Metrics (minimum)

- `ai.routing.selected`  
- `ai.routing.fallback_attempted`  
- `ai.routing.fallback_succeeded`  
- `ai.routing.fallback_exhausted`  
- `ai.routing.stream_fallback_prevented`  
- `ai.routing.tool_fallback_prevented`  
- Provider latency / failures by `AiErrorCode`  

No prompts, keys, or raw content.

### Audit facts (safe)

`executionId`, capability, from/to `implementationId`, reason/`errorCode`, diagnostic id, routing mode.

---

## 9. Multi-provider tests (mandatory)

Deterministic suite `pnpm test:routing`:

1. Primary success (fixed)  
2. Primary transient fail → secondary success  
3. Primary `AI_INVALID_REQUEST` → no fallback  
4. Fallback exhausted  
5. Unhealthy candidate skipped  
6. Stream fail before first delta → fallback  
7. Stream fail after delta → no fallback  
8. Tool turn envelope exists → no fallback  
9. Embedding profile mismatch rejected  
10. Exact attempt counts (no multiplied hidden retries)  
11. Architecture: no `AiRouter` package; Cap Resolution remains selector  

---

## 10. Configuration audit (canonical table — summary)

Full table lands in `docs/guides/configuration.md` during implementation. Normative classes:

| Class | Examples |
|---|---|
| Required always | none (reference defaults work) |
| Required when selected | `OPENAI_API_KEY`, `DATABASE_URL` |
| Optional feature flags | `TOOLS_ENABLED`, `EVALUATION_ENABLED`, `VECTOR_SEARCH_ENABLED`, `RUNTIME_RECOVERY_ENABLED` |
| Dev-only | `PERSISTENCE_ALLOW_RESET`, `VECTOR_ALLOW_RESET`, `AI_LIVE_TESTS` |
| Sensitive | API keys, `DATABASE_URL`, passwords |
| New in v1.0 | `AI_ROUTING_MODE`, `AI_FALLBACK_PROVIDERS`, production auth allow flag |

### Parsing rules (v1.0)

- Booleans: strict `true`/`false` only (unify loose flags)  
- Integers: reject partial parses (`8abc` invalid)  
- Tool/stream byte/time limits: enforce documented maxima  

### Production mode

`NODE_ENV=production` is sufficient primary signal.

When `NODE_ENV=production`:

1. LocalReference auth as **sole** HTTP auth → **startup fail** unless `AGENTFORGE_ALLOW_REFERENCE_AUTH=true` (demo escape hatch; documented unsafe).  
2. Log warn if `POSTGRES_SSL=false` with non-local DB URL.  
3. Default log level ≥ `info`.  

Do **not** invent a second parallel production flag unless `NODE_ENV` is proven insufficient during implementation (record in spec then).

---

## 11. Secret handling (normative)

Secrets **MUST NOT** appear in:

- logs, metrics labels, traces attributes (values)  
- Audit payloads  
- `/health` or `/ready` bodies  
- client error messages  
- checkpoints (beyond necessary connection-free config references)  

OpenAI redaction retained/extended. HTTP 500 **MUST** return stable public codes/messages, not raw `Error.message`.

Environment-injected secrets are the supported v1.0 secret mechanism. Vault/AWS SM integrations are **out of scope**.

---

## 12. Security hardening requirements

### 12.1 Auth

- LocalReference = **development/demo only**  
- Production: fail closed (above)  
- Production auth adapter remains **user/plugin-supplied**; core does not ship OAuth/OIDC server  

### 12.2 Tool gates (from v0.9 — release blockers if regressed)

- No eval / Function / arbitrary shell / model-selected paths / unrestricted FS / raw SQL tool  
- Security before pre-tool  
- approval-required → `TOOL_APPROVAL_REQUIRED`  
- non-idempotent unknown recovery → `TOOL_UNSAFE_RECOVERY`  

### 12.3 HTTP

- Max JSON body size (frozen at implementation; suggested 1 MiB default, configurable)  
- No CORS widen-to-* by default  

### 12.4 Tenant isolation tests

Mandatory tests proving tenant A cannot read B’s:

Persistence entities, Runtime checkpoints, Memory, Vector rows, Evaluation results, Audit records (where tenant-scoped).

Host may remain single-tenant in reference product, but package-level isolation **MUST** be proven.

### 12.5 OPENAI_BASE_URL

Document SSRF risk; v1.0 **SHOULD** reject link-local/metadata hosts when `NODE_ENV=production` (implementation detail in hardening WS).

---

## 13. Reliability

### Graceful shutdown

On SIGTERM/SIGINT:

1. stop accepting new requests  
2. drain in-flight invoke + SSE up to `SHUTDOWN_TIMEOUT_MS` (new, default 30000)  
3. cancel remaining via AbortSignal  
4. dispose composition / pools  
5. exit  

Document: checkpoint durability follows existing Runtime semantics; no claim of zero aborted executions.

### Startup order (normative)

```text
config → secret presence checks → persistence assertReady →
composition → seed → optional recoverIncomplete →
readiness true → listen
```

Migrations **remain operator-run** (`pnpm db:migrate`, `pnpm db:migrate:vector`). Startup does not auto-migrate.

### Readiness

| Check | Mandatory when |
|---|---|
| Composition/security/runtime/agent seed | always (reference product) |
| Postgres | `PERSISTENCE_PROVIDER=postgres` or persistent memory/eval/vector/recovery needing it |
| OpenAI key | primary openai (fixed) or openai required by routing |
| Vector store | vector search enabled |

Optional degraded contributors must not flip ready=false unless mandatory.

Docker: document that orchestration readiness should probe `/ready`; HEALTHCHECK may remain liveness `/health` with note in ops guide.

---

## 14. Performance & resources

### Concurrency

Audit and document:

- Runtime `maxConcurrency`  
- HTTP server limits  
- Postgres pool min/max  
- Max concurrent streams (new bound if missing)  

### Payload limits

Bound: invoke body, tool args/results (existing), AI message assembly warnings, Memory content where applicable.

### Load baseline

Deterministic reference-AI suite records requests/sec, latency percentiles, stream TTFB, RSS — **baselines**, not contractual SLAs.

---

## 15. Observability catalog (minimum)

HTTP rate/errors/latency; active executions; Runtime terminal outcomes; recovery outcomes; AI latency/errors; routing fallback; active streams/TTFB; tool outcomes; Memory/vector; Postgres pool; Evaluation; readiness.

Tracing: preserve correlationId/executionId across Agent→Runtime→AI→Tool. No SDK trace types in public contracts.

---

## 16. Database & migrations

- Inventory Persistence + pgvector migrations; keep idempotent migrators  
- Upgrade path **v0.9 → v1.0**: non-destructive; vector profile rebuild remains explicit operator action  
- Production Postgres: document SSL, pool, timeouts; no cloud hardcoding  

---

## 17. Docker / deployment

Harden:

- LABEL version = product version  
- compose image tag aligned  
- non-root retained  
- no secrets in image  
- signal-aware node  
- Compose = local only; not production orchestrator  
- K8s example deferred; publish generic container requirements  

---

## 18. CI/CD

### Existing jobs (retain)

verify (+ tools), docker, postgres, runtime-recovery, memory-persistence, evaluation-persistence, vector-search

### Add

- `pnpm test:routing` in verify or dedicated job  
- Release workflow on tags `v*`: full gates + docker smoke  
- Document: dependency review, CodeQL, secret scanning (GitHub-native)  

No publish during design. Implementation may add workflow files but must not publish packages/images without explicit human approval.

---

## 19. Public API & semver

### Endpoints (reference product)

| Method | Path |
|---|---|
| GET | `/health` |
| GET | `/ready` |
| POST | `/v1/agents/reference-agent/invoke` |
| POST | `/v1/agents/reference-agent/invoke/stream` |

No broad Tool REST API.

### Versioning decision (recommended)

**Align stable public packages to 1.0.0** at the v1.0.0 tag for:

`foundation`, `plugin-framework`, `composition`, `runtime`, `capability-resolution`, `ai-provider`, `ai-provider-openai`, `tool-framework`, `memory`, `evaluation`, `security`, `event-bus`, `audit`, `observability`, `persistence`, `persistence-postgres`, `vector-store`, `vector-store-pgvector`, `agent-framework`, `platform-host` (product), and other shipped `@agentforge/*` packages that form the supported surface.

Rationale: first stable public release should not leave consumers on `0.x` for core contracts.

Mark packages `"private": true` **or** publish intentionally — decide in implementation; default recommendation: keep private until npm publish is explicitly approved (Docker/GitHub Release first).

### Compatibility policy (v1.x)

- PATCH: fixes  
- MINOR: backward-compatible additions  
- MAJOR: breaking public contracts  
- Deprecations: announce ≥1 minor before removal in 1.x when practical  

### Export audit

Implementation must inventory `export *` surfaces; move test-only/reference internals behind clear subpaths or leave undocumented as `@internal` in docs. No silent removals before audit list is published in the v1.0 report.

---

## 20. Amendment D decision

**Recommendation: Option A — defer durable HITL wait to v1.x.**

Keep `approvalRequirement='required'` → fail closed `TOOL_APPROVAL_REQUIRED`.

Rationale: Human Interaction delivery + Runtime waiting/resume is a large vertical; first production release remains safe without executing approval-required tools. Document as known limitation.

---

## 21. Known production limitations (must publish)

- No distributed Runtime / multi-region  
- No exactly-once external tools  
- No durable HITL approval wait  
- No SSE reconnect/replay  
- Limited provider catalog (reference + OpenAI)  
- Operator-managed migrations  
- No hosted management UI  
- Reference auth not production-safe (blocked in production mode)  
- Single reference-agent HTTP product surface  

---

## 22. Release gates (pass/fail)

Mandatory green before `v1.0.0`:

Architecture boundaries; lint; typecheck; unit; build; postgres; runtime recovery; memory; evaluation; vector; streaming; tools; **routing**; security/tenant; fault injection; graceful shutdown tests; docker smoke; clean-clone checklist; docs (config, deploy, upgrade, security, changelog); dependency audit strategy executed; no Critical readiness FAIL items.

---

## 23. Stop conditions

Same as product request Part R. Any hit → STOP Autonomous implementation and report.
