# AgentProdReady v1.0 Production Release

**Document Version:** 1.0  
**Product Version:** 1.0.0 (target)  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Baseline:** v0.9.0 (`40edefc`, tag `v0.9.0`)

---

## Purpose

v1.0 is the **final pre-stable** product cycle. It does **not** add a broad new feature family.

Exactly two major objectives:

1. **Multi-provider AI routing** — prove portable provider selection/failover using existing Capability Resolution ownership  
2. **Production readiness / release hardening** — make the existing platform suitable for a first stable, production-oriented public release

After v1.0, AgentProdReady should be honestly labeled **stable for operator-deployed production use** with documented limitations — not a hosted SaaS platform.

---

## Non-goals (explicit)

| Deferred | Reason |
|---|---|
| Amendment D durable HITL approval wait/resume | Not required for safe first production; keep fail-closed `TOOL_APPROVAL_REQUIRED` |
| Anthropic / Gemini / Azure OpenAI SDKs | Not required to prove multi-provider; see routing strategy |
| MCP / browser / arbitrary shell-filesystem tools | Safety and scope |
| Distributed Runtime / leader election / multi-region | Blueprint maturity |
| Kubernetes operator / hosted management UI | Ops complexity |
| SSE reconnect / stream replay | v0.8 limitation retained |
| Exactly-once external Tool effects | Physically unconstrained; keep honest |
| Replacing Capability Resolution with `AiRouter` | Constitutional violation |

---

## Current state (v0.9)

Blueprints 01–31 implemented; ADR-governed architecture; local reference product through tool calling; Docker + Compose + GitHub Actions; secret-free deterministic CI; OpenAI + PostgreSQL + Runtime recovery + Memory + vector/hybrid + Evaluation + SSE streaming + Tool Calling.

**Honest product maturity:** architecture-complete; runnable reference host; **not yet** a hardened multi-tenant internet-facing product without the v1.0 gates in this design.

---

## Objective 1 — Multi-provider AI routing

### Principle

Do **not** invent `AiRouter` / `ProviderRouter` / `ModelRouter`.

| Concern | Owner (unchanged) |
|---|---|
| Implementation selection | Capability Resolution (ADR-007 / BP07) |
| Adapter instantiation | Composition |
| Normalization / vendor translation | AI Provider Framework (BP08) |
| Retry / timeout / cancel / recovery / attempt accounting | Runtime |
| Routing configuration | Configuration |
| Authorization | Security |
| Telemetry / audit facts | Observability / Audit |

### Strategy

| Decision | Choice |
|---|---|
| Real providers in v1.0 | **reference-ai** + **openai-ai** only |
| Third vendor SDK | **Not required** |
| Proof vehicles | Deterministic reference variants + failing test doubles in CI |
| Default mode | `AI_ROUTING_MODE=fixed` (preserves v0.9 behavior) |
| Opt-in failover | `AI_ROUTING_MODE=fallback` with ordered primary + fallbacks |
| Selection mechanism | Extend BP07 policy with **explicit ordered candidate list** (smallest amendment) |
| Silent fallthrough of invalid configured id | Remains **forbidden** |

### Safety boundaries (product rules)

1. **Before first model output:** provider fallback may occur on fallback-eligible normalized errors.  
2. **After any SSE content delta to the client:** no silent provider switch — terminal stream error.  
3. **After normalized tool calls are proposed / any tool admitted:** no silent provider switch for that execution — fail closed or continue with same binding.  
4. **Embedding fallback across VECTOR_INDEX_PROFILE / dimensions:** forbidden — fail closed.  
5. Fallback uses **normalized** `AiErrorCode` + `retryable`, never SDK types.

---

## Objective 2 — Production readiness

Harden what exists:

- Configuration canonicalization and secret hygiene  
- Production mode policy for reference auth / reference-only unsafe defaults  
- Security review gates (auth, tools, tenant isolation, payload limits)  
- Reliability (shutdown, readiness, fault injection)  
- Observability catalog  
- Docker / CI release workflow / supply chain  
- Public API / semver stability (`1.0.0`)  
- Developer quickstart + ops guides  
- Honest production limitations

---

## Release definition of done

v1.0.0 may be tagged only when **all mandatory release gates** in the specification and readiness review are **PASS**, including multi-provider routing tests and production-hardening gates.

---

## Authority

Follow `AGENTS.md`, `docs/cursor-start-here.md`, ADRs, blueprints, and dependency graph. Stop for constitutional contradictions.

**Autonomous v1.0:** blocked until this Review-Gated design is approved.

---

## Related artifacts

- Plan: `docs/implementation/plans/agentprodready-v1.0-production-release-plan.md`  
- Specification: `docs/implementation/specifications/agentprodready-v1.0-production-release-specification.md`  
- Readiness review: `docs/implementation/reviews/agentprodready-v1.0-production-readiness-review.md`
