# AgentForge v0.6 Evaluation Framework — Implementation Plan

**Document Type:** Product Implementation Plan  
**Product Version:** 0.6.0  
**Plan Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Objective

Productize the **already-Approved Blueprint 14** Evaluation Framework into the local reference host so AgentForge can measure AI/artifact quality through Composition-wired evaluation, without amending Evaluation or Runtime public contracts, without AI SDKs in Evaluation, and without making evaluation mandatory for default CI/smoke.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| AGENTS.md / docs/cursor-start-here.md / implementation-modes.md | Yes |
| docs/implementation-guidelines.md | Yes |
| docs/architecture/dependency-graph.md (BP14) | Yes |
| Blueprint 14 (complete) + BP14 plan/spec/report/checklist | Yes |
| ADR-002, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013 | Yes |
| `packages/evaluation` contracts, reference adapters, tests | Yes |
| Runtime package (no evaluation imports / stages) | Yes |
| AI Provider / Capability Resolution / Prompt Builder | Yes |
| Human Interaction evaluation adjacency | Yes |
| Security / Event Bus / Audit / Observability / Persistence | Yes |
| platform-host composition (opaque evaluation* strings only) | Yes |
| v0.1–v0.5 product implementation reports | Yes |

---

# Recommended Approach

**Selected: Host Composition productization of existing `@agentforge/evaluation` (no package rewrite, no Runtime contract amendment).**

```text
EvaluationFramework.evaluate(EvaluationRequest)
  → EvaluatorResolver.resolve(requirement)          # Cap-oriented boundary
  → EvaluatorExecutionPort.execute(tasks, mode)     # Runtime-owned ops boundary
  → ScoreNormalizer → aggregate → EvaluationResult  # descriptive fact
  → EvaluationResultStore / Audit / Events / Telemetry
```

| Option | Decision |
|---|---|
| **A. Wire existing EvaluationFramework in platform-host with host adapters** | **Selected** — BP14 package complete; matches v0.3–v0.5 productization pattern |
| B. Re-implement Evaluation inside host | Rejected — duplicates Blueprint 14 |
| C. Amend Runtime with mandatory `evaluation` ExecutionStage | Rejected for v0.6 — Runtime public contract change / stop condition |
| D. Put AI SDK calls inside Evaluation package | Forbidden by Blueprint 14 / ADR-004 |
| E. New `@agentforge/evaluation-postgres` with SQL | Rejected — use Blueprint 24 repository rows like Memory/Runtime |

---

# Contract Sufficiency (Stop Condition Review)

### Status: **Cleared — no public contract amendment required**

| Surface | Already present in `@agentforge/evaluation` |
|---|---|
| `EvaluationRequest` / `EvaluationTarget` / criteria / policy | Yes |
| `Evaluator` + five `EvaluatorCategory` values | Yes |
| `EvaluatorResolver` / `EvaluatorExecutionPort` | Yes |
| `NormalizedAiEvaluationPort` + provenance refs | Yes |
| `HumanEvaluationControl` wait/resume | Yes |
| `UnitIntervalScoreNormalizer` + aggregation transparency | Yes |
| `EvaluationResult` with `descriptive: true` | Yes |
| Diagnostics / Events / Telemetry / Audit / ResultStore / Health | Yes |
| Comparative evaluation helper | Yes |
| Normalized `EVALUATION_*` errors | Yes |

| Potential amendment | v0.6 decision |
|---|---|
| Add Runtime `ExecutionStage = 'evaluation'` | **Do not** — out of scope; would be Runtime contract change |
| Change Evaluation public types | **Do not** — already sufficient |
| Change Persistence public types | **Do not** — reuse repository entity pattern |
| Change Security public types | **Do not** — consume existing decision scope |

**If Autonomous implementation discovers a forced public contract change, STOP and report.**

---

# Scope

## In Scope

1. **Host Composition wiring** of `EvaluationFramework` behind `EVALUATION_ENABLED` (default `false`).
2. **Host adapters** (Composition-owned instantiation):
   - `EvaluatorExecutionPort` adapter (Runtime-owned boundary; host implements until a future Runtime-owned class is introduced **without** amending Runtime public execute contracts in v0.6)
   - Event Bus / Audit / Observability / ResultStore adapters
   - Optional Persistence-backed `EvaluationResultStore` on repository `evaluation-results`
3. **Evaluator registry** seeding reference deterministic + heuristic evaluators; optional AI-assisted + human + composite registrations for proofs.
4. **`NormalizedAiEvaluationPort` host adapter** that uses Capability Resolution → Prompt Builder → AI Provider Framework only (no SDK in Evaluation).
5. **Security scope** on every request/evidence from authoritative Security decision ids already used by host.
6. **Health contributor** when evaluation enabled.
7. **Integration tests** + manual probe proving evaluate → immutable result → optional durability.
8. **CI / Docker / docs / config** updates; product version `0.6.0`.
9. **Implementation report + checklist** after Autonomous execution.

## Out of Scope

- Rewriting `@agentforge/evaluation` core
- Mandatory evaluation on every `/invoke`
- Runtime recovery redesign for human suspension (semantic `waiting` only; operational suspend deferred)
- Production human review UI
- Auto-remediation from scores
- New PostgreSQL migrations/tables
- Vector/embedding quality models
- Broad Evaluation REST API surface (probe/composition proof sufficient)

---

# Architecture Design

## 1. Evaluator types (existing)

| Category | v0.6 host usage |
|---|---|
| Deterministic | `ExactMatchEvaluator` (or host-seeded equivalent) |
| Heuristic | Same family with `deterministic: false` descriptor |
| AI-assisted | `NormalizedAiAssistedEvaluator` + host AI port |
| Human | `InMemoryHumanEvaluator` wait/resume (in-process) |
| Composite | `WeightedCompositeEvaluator` for multi-component criteria |

## 2. Normalized scoring

Reuse `UnitIntervalScoreNormalizer`. Raw schemas normalize to `unit-interval` before aggregation. Incompatible schema/policy/normalization versions → `SCORE_INCOMPATIBLE`.

## 3. Transparent aggregation

Reuse framework aggregation (`weighted-average` / `pass-all` / `pass-any` / `no-aggregate`). Results must retain `contributors`, `excluded`, versions, and assessment.

## 4. Evaluator compatibility

Reuse `ensureCompatible` rules: category, determinism, supported targets/criteria must match requirement + target.

## 5. Evaluator capability resolution

`EvaluatorRequirement.capability` remains the selection key. v0.6 host may:

- register evaluators in `EvaluatorRegistry` keyed by requirement id (bootstrap), and/or
- resolve via Capability Resolution bindings that Composition maps to evaluator instances.

Never hardcode vendor/provider selection inside Evaluation.

## 6. Runtime boundary

```text
EvaluationFramework
  → EvaluatorExecutionPort.execute(tasks, sequential|parallel)
       └── Host adapter (v0.6)
            ├── records requested mode
            ├── executes evaluator.evaluate per Runtime ownership rules
            └── does NOT implement Recovery/timeout policy inside Evaluation
```

**Do not** add evaluation as a Runtime `ExecutionStage` in v0.6. Runtime still owns operational execution of evaluator tasks through the port. Future Runtime-native adapter may replace the host class without Evaluation contract changes.

## 7. AI-assisted path

```text
NormalizedAiAssistedEvaluator
  → NormalizedAiEvaluationPort.assess
       → Capability Resolution binding
       → Prompt Builder package
       → AI Provider Framework NormalizedAiResult
       → NormalizedAiAssessment (output + three provenance references)
```

No OpenAI SDK import in `@agentforge/evaluation`.

## 8. Human review

- Semantic outcome `waiting` owned by Evaluation.
- Resume via `HumanEvaluationControl.resume`.
- Runtime suspension/timeout/cancel for long-lived human review is **not** productized in v0.6 (document limitation).
- Optional later bridge to `@agentforge/human-interaction` type `evaluation` without Evaluation owning UI.

## 9. Persistence integration

| Item | Value |
|---|---|
| Repository | `evaluation-results` |
| Entity id | `EvaluationResult.id` |
| Scope | `{ tenantId }` from `result.security.tenantId` (tenant-only, same rationale as Memory) |
| Data | Full immutable `EvaluationResult` JSON |
| New SQL | **None** |
| Default | In-memory store when evaluation enabled + persistence in-memory; postgres when Persistence postgres selected |

## 10. Events / Audit / Observability

| Port | Host wiring |
|---|---|
| `EvaluationEvents` | Publish platform facts to Event Bus (or in-memory collector in tests) |
| `EvaluationAudit` | Record ids/assessment/diagnosticId only — not full artifact payloads |
| `EvaluationTelemetry` | Counters via Observability metrics (status, failures by code) |
| Diagnostics | Safe ids/counts/versions — no secrets / full AI content |

## 11. Configuration

| Variable | Default | Values |
|---|---|---|
| `EVALUATION_ENABLED` | `false` | `true` \| `false` |
| `EVALUATION_RESULT_STORE` | `in-memory` | `in-memory` \| `persistent` |

`EVALUATION_RESULT_STORE=persistent` requires Persistence provider (in-memory or postgres). Cross-process durable results require postgres Persistence.

Do **not** invent `EVALUATION_PROVIDER=openai`.

## 12. Host product flow (v0.6)

Default `/invoke` remains unchanged when `EVALUATION_ENABLED=false`.

When enabled, Composition exposes evaluation for:

1. **Package/host integration proof** — construct `EvaluationRequest` from a normalized AI/execution artifact and call `evaluate`.
2. **Manual probe** — `scripts/evaluation-probe.mjs`.
3. **Optional post-invoke hook** (if implemented): evaluate the invoke AI result as `ai-result` target — must remain descriptive; must not fail the invoke unless a **separate** host policy explicitly chooses to (default: do not gate invoke success on evaluation).

Agent seed fields `evaluationPolicyReferences` / `evaluationReference` may be resolved into a local reference policy bundle, but must not invent Runtime orchestration.

## 13. Health / readiness

When `EVALUATION_ENABLED=true`, contribute Evaluation health. If result store is persistent+postgres and Persistence unavailable, do not silently disable evaluation — fail closed for readiness of the evaluation contributor (host remains coherent with Memory/Runtime patterns).

## 14. Docker / CI

- Default compose/smoke: evaluation disabled (or enabled with in-memory only) — **no DB secrets**.
- Additive CI job optional: `evaluation-persistence-postgres` only if durable store tests are in scope; otherwise host unit/integration tests in default `verify` suffice.
- Product version tags → `0.6.0`.

## 15. Testing strategy

| Layer | Coverage |
|---|---|
| Existing package tests | Keep green (BP14) |
| Host unit/integration | Wire framework; deterministic evaluate; AI port provenance; human wait/resume; security scope rejection; aggregation transparency; persistence recreate (if persistent store) |
| Contract substitution | In-memory vs Persistence-backed result store |
| Probe | Manual durability/quality proof |
| Regression | `pnpm verify`, postgres suites, docker smoke |

## 16. Versioning

| Package | Expected |
|---|---|
| `@agentforge/platform-host` | `0.6.0` |
| `@agentforge/evaluation` | Remain `0.1.0` unless production code inside the package must change; prefer host-only changes |
| Unrelated framework packages | Do not bump |

---

# Work Breakdown (post-approval Autonomous)

1. Add host config + Composition wiring for EvaluationFramework and adapters.
2. Implement Persistence-backed result store (host) if selected.
3. Implement AI evaluation port adapter.
4. Seed reference evaluators; prove five categories.
5. Add integration tests + probe.
6. Update CI/Docker tags/docs/`.env.example`/guides.
7. Run full regression gates.
8. Write implementation report + checklist.

---

# Stop Conditions

STOP and report (do not invent workarounds) if implementation would require:

- Evaluation public contract changes  
- Runtime public contract / `ExecutionStage` changes  
- Persistence public contract changes  
- New PostgreSQL schema/migrations  
- Evaluation importing `pg` or AI SDKs  
- Evaluation owning authorization, prompt construction, or Runtime recovery  
- Default CI requiring production DB secrets  
- Blueprint/ADR constitutional rewrites  

---

# Review Gate

Await approval of product doc + this plan + specification before any production code.
