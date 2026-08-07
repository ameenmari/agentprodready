# AgentForge v0.6 Evaluation Framework — Implementation Specification

**Document Type:** Product Implementation Specification  
**Product Version:** 0.6.0  
**Specification Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# 1. Premises

1. Blueprint 14 is **package-complete** (`@agentforge/evaluation@0.1.0`, Approved report/checklist).
2. v0.6 productizes Evaluation in `apps/platform-host` and lifecycle adapters.
3. Evaluation Results are immutable descriptive facts (`descriptive: true`).
4. No Evaluation, Runtime, Persistence, or Security public contract amendments are authorized.
5. Default local/CI path remains evaluation-optional and database-free.

---

# 2. Contract Review Result

## 2.1 Evaluation public contracts — **sufficient**

Reuse without modification:

| Contract | v0.6 use |
|---|---|
| `EvaluationRequest` | Sole public input |
| `EvaluationTarget` | Opaque immutable artifact + security |
| `EvaluationCriterion` / `EvaluatorRequirement` | Explicit criteria + capability requirements |
| `EvaluationPolicy` | Strategy, executionMode, aggregation, thresholds |
| `Evaluator` / `EvaluatorDescriptor` | Five categories |
| `EvaluatorResolver` | Selection boundary |
| `EvaluatorExecutionPort` | Runtime-owned operational boundary |
| `ScoreNormalizer` / `UnitIntervalScoreNormalizer` | Normalize before aggregate |
| `NormalizedAiEvaluationPort` / `NormalizedAiAssessment` | AI-assisted only |
| `HumanEvaluationControl` / `HumanEvaluationResponse` | Wait/resume |
| `CompositeEvaluator` / `ComparativeEvaluation` | Composite + comparative |
| `EvaluationResult` | Sole public output |
| `EvaluationEvents` / `EvaluationAudit` / `EvaluationTelemetry` / `EvaluationDiagnostics` / `EvaluationResultStore` / `EvaluationHealth` | Lifecycle ports |
| `EvaluationError` / `EVALUATION_*` codes | Normalized failures |

## 2.2 Runtime public contracts — **no amendment**

v0.6 does **not** add:

- `ExecutionStage` values for evaluation  
- RuntimeOrchestrator.evaluate APIs  
- Recovery semantics for human review suspension  

Operational evaluator execution remains behind `EvaluatorExecutionPort`, implemented by a **host adapter** that respects Runtime ownership (scheduling semantics, mode recording). A future milestone may move that adapter into Runtime **without** changing Evaluation contracts.

## 2.3 Persistence / Security / Cap / AI — **no amendment**

Reuse existing providers and decision/result types. Host adapters only.

### Amendment stop condition

If Autonomous implementation cannot satisfy acceptance without changing those public contracts → **STOP** and document. Do not silently amend.

---

# 3. Ownership Matrix

| Concern | Owner | Forbidden owner |
|---|---|---|
| Criteria, scoring, evidence, aggregation, result shape | Evaluation | Runtime, Persistence, AI SDK |
| Evaluator task scheduling / timeout / retry / cancel / recover | Runtime (via port) | Evaluation |
| Capability selection for evaluators / AI judges | Capability Resolution | Evaluation hardcoding vendors |
| Instantiation | Composition | Evaluation self-new of providers |
| Prompt packages for AI judges | Prompt Builder | Evaluation |
| Provider HTTP/SDK | AI Provider | Evaluation |
| Authorization | Security | Evaluation “safety score ⇒ allow” |
| Result durability bytes | Persistence | Evaluation SQL |
| Audit durability | Audit | Evaluation rewriting history |
| Event transport | Event Bus | Evaluation commanding handlers |
| Human UI / assignment / notifications | Human Interaction | Evaluation |

---

# 4. Host Composition Design

## 4.1 Configuration

```text
EVALUATION_ENABLED=false|true          # default false
EVALUATION_RESULT_STORE=in-memory|persistent  # default in-memory
```

Load in `local-reference-config.ts`. Reject unknown values fail-closed.

Combinations:

| EVALUATION_ENABLED | RESULT_STORE | Persistence | Meaning |
|---|---|---|---|
| false | * | * | No EvaluationFramework in quality path; health optional absent |
| true | in-memory | any | Process-local results |
| true | persistent | in-memory | Persistence-backed semantics, not cross-process durable |
| true | persistent | postgres | Durable Evaluation Results |

## 4.2 Construction (when enabled)

Composition constructs exactly one `EvaluationFramework` with:

1. `EvaluatorResolver` — `EvaluatorRegistry` seeded with reference evaluators for local proofs  
2. `EvaluatorExecutionPort` — host `LocalReferenceEvaluatorExecution` (or equivalent name)  
3. `UnitIntervalScoreNormalizer`  
4. Diagnostics / Events / Telemetry / Audit / ResultStore adapters  
5. Optional AI port injected into `NormalizedAiAssistedEvaluator`  
6. Optional `InMemoryHumanEvaluator` registered for human proofs  

Host must **not** put evaluation business logic in HTTP handlers beyond assembling an `EvaluationRequest` and calling `evaluate`.

## 4.3 Seeded local policy

Provide a frozen local reference policy + criteria bundle compatible with agent seed strings:

- `evaluation-policy:local`
- `evaluation:local`

These resolve to host-owned request factories, not Runtime stages.

---

# 5. Evaluator Execution Port (host)

## 5.1 Responsibilities

```ts
// Conceptual — implement existing EvaluatorExecutionPort
execute(tasks, mode: 'sequential' | 'parallel'): Promise<readonly EvaluatorOutput[]>
```

Rules:

- Honor requested `mode` semantically (record it; sequential awaits in order; parallel may use `Promise.all` at host level).
- Do not implement Evaluation scoring inside the port.
- Do not call AI SDKs here.
- Normalize evaluator thrown errors into Evaluation external error kinds where appropriate, or let EvaluationFramework normalize.
- Do **not** claim production timeout/retry/cancel policies unless Runtime APIs are used without amending Runtime contracts; document limitation if host uses simple await.

## 5.2 Why host (not Runtime package) in v0.6

Runtime package currently has zero Evaluation dependency. Adding Runtime→Evaluation would create a package cycle with BP14’s hard dependency on Runtime. Host adapters match the v0.4 checkpoint store pattern and preserve contracts.

---

# 6. AI-Assisted Evaluator Adapter

Host implements `NormalizedAiEvaluationPort.assess`:

1. Build a Capability Request for the evaluator requirement capability (or dedicated local judge capability).  
2. Resolve binding via Capability Resolution.  
3. Build a Prompt Package via Prompt Builder from task target/criterion (normalized only).  
4. Execute via AI Provider Framework → `NormalizedAiResult`.  
5. Map to `EvaluatorOutput` + required provenance references:
   - `capabilityBindingReference`
   - `promptPackageReference`
   - `normalizedAiResultReference`

Missing provenance → `AI_EVALUATION_FAILURE` path.

When `AI_PROVIDER=reference`, adapter must remain deterministic for tests.

---

# 7. Human Evaluation

Use existing `InMemoryHumanEvaluator`:

1. First `evaluate` without resume → criterion outcome `waiting` → result status `waiting`.  
2. `resume(reviewId, HumanEvaluationResponse)` then re-evaluate request (or continue per existing BP14 test pattern).  
3. Do not implement review UI.  
4. Do not implement Runtime suspension checkpoints for human wait in v0.6 (known limitation).

Optional bridge note: `@agentforge/human-interaction` already references evaluation types; full delivery integration is later.

---

# 8. Persistence Mapping (Result Store)

When `EVALUATION_RESULT_STORE=persistent`:

| Field | Mapping |
|---|---|
| Repository | `evaluation-results` |
| Entity id | `EvaluationResult.id` |
| PersistenceScope | `{ tenantId: result.security.tenantId }` only |
| `PersistedEntity.data` | full `EvaluationResult` |
| OCC | Not required for append-only immutable results; save once; duplicate id → normalized store failure |
| Migrations | **None** |

Do not use SnapshotStore for evaluation results unless a future slice explicitly chooses immutable snapshots; entity repository is sufficient.

In-memory `InMemoryEvaluationResultStore` remains default.

---

# 9. Security

Every `EvaluationRequest.security` and `EvaluationTarget.security` must carry:

- `tenantId`, optional `workspaceId`
- `decisionId` from Security authorization
- `labels` allowed for evidence

Evidence with mismatched security → existing `EVALUATION_SECURITY_SCOPE`.

Evaluation safety category scores are **not** authorization decisions.

---

# 10. Events / Audit / Observability

## Events

Map `EvaluationFact` types to Event Bus facts (or host collector). Facts are not commands (ADR-010).

## Audit

Record only:

- `resultId`, `requestId`, `targetReference`, `assessment`, `diagnosticId`

Avoid full target artifacts / Memory content / prompt bodies.

## Telemetry

- completed(status, criteriaCount, evidenceCount)
- failed(code)

No secrets, connection strings, or full payloads.

## Diagnostics

Ids, counts, versions, error codes — already shaped by BP14.

---

# 11. Health / Readiness

When enabled:

```text
name: evaluation
status: healthy | degraded | unhealthy
details: { evaluators: "<count>", resultStore: "in-memory|persistent" }
```

If persistent store + postgres Persistence unavailable → evaluation contributor unhealthy; do not silently fall back to disabled evaluation when explicitly enabled.

Default disabled mode: omit contributor (smoke unaffected).

---

# 12. Product Surfaces

## 12.1 Default `/invoke`

Unchanged behavior when evaluation disabled.

When enabled, **default recommendation**: do not gate HTTP success on EvaluationResult. Optional observational evaluate of `ai-result` may run and be logged/stored descriptively.

## 12.2 Integration proof (required)

Host/package test:

```text
build EvaluationRequest(target=ai-result|execution-result)
→ EvaluationFramework.evaluate
→ assert immutable EvaluationResult
→ assert descriptive: true
→ assert aggregate contributors present for scored path
→ assert no provider SDK types leaked
```

## 12.3 Manual probe

`scripts/evaluation-probe.mjs`:

1. Enable evaluation against local composition or direct framework wiring.  
2. Evaluate a known artifact with deterministic criterion.  
3. If persistent store + postgres: recreate provider, load stored result id.  
4. Print ids/assessment only.

---

# 13. Five Evaluator Categories — Proof Requirements

| Category | Proof |
|---|---|
| Deterministic | Exact match pass/fail reproducible |
| Heuristic | Non-deterministic flag / heuristic descriptor path |
| AI-assisted | Provenance refs present; uses normalized AI port |
| Human | waiting → resume → completed |
| Composite | Compatible component average; incompatible schemas rejected |

---

# 14. Comparative Evaluation

Reuse `DeterministicComparativeEvaluator` for ranked/preferred/tie/no-decision proofs.  
Must **not** select production providers or mutate Capability Resolution bindings.

---

# 15. Empty / Partial / Inconclusive / Waiting

Preserve existing status semantics from BP14. Host tests should cover at least:

- empty criteria → `empty`
- waiting human → `waiting`
- allowPartial partial outputs → `partial`
- all abstained → `inconclusive`

---

# 16. Error Normalization

Host adapters must not leak:

- raw `pg` errors  
- OpenAI SDK errors  
- connection strings / API keys  
- PersistenceError internals  

Map into `EvaluationError` / `ExternalEvaluationError` kinds already defined.

---

# 17. CI / Docker / Versioning

| Item | Decision |
|---|---|
| Product version | `0.6.0` |
| Docker/CI image tags | `0.6.0` |
| Default verify/docker | evaluation disabled or in-memory only |
| Additive postgres job | Optional for durable result store; not required if store tests use InMemoryPersistenceProvider in default verify |
| `@agentforge/evaluation` version | Keep `0.1.0` if package source unchanged |
| Host dependency | Add `@agentforge/evaluation` (and Prompt Builder if AI adapter needs it and not already present) |

---

# 18. Documentation Deliverables (implementation phase)

Create/update after Autonomous approval:

- `docs/guides/evaluation.md`
- README / docs/README / `.env.example`
- `packages/evaluation/README.md` (host wiring pointer)
- Implementation report + checklist under `docs/implementation/{reports,checklists}/agentforge-v0.6-evaluation-framework-*`

Do not rewrite Blueprint 14 or ADRs.

---

# 19. Known Limitations (document in report)

1. No Runtime `ExecutionStage` for evaluation in v0.6.  
2. Human review lacks durable Runtime suspension/timeout productization.  
3. `/invoke` is not required to gate on Evaluation Results.  
4. Agent seed evaluation references are local policy strings unless resolved by host factories.  
5. Reference evaluators are examples, not enterprise quality policy packs.  
6. EvaluatorExecutionPort production timeout/retry policies may remain thin in host adapter.

---

# 20. Acceptance Mapping

| Success criterion | Spec section | Verification |
|---|---|---|
| Host can evaluate | §4, §12 | Integration test + probe |
| Five evaluator types | §13 | Host/package tests |
| AI via normalized port only | §6 | Provenance assertions + import audit |
| Immutable descriptive results | §2.1 | Frozen result + `descriptive: true` |
| Transparent aggregation | BP14 + host test | contributors/excluded |
| Human wait/resume | §7 | waiting → resume |
| Default CI DB-free | §17 | verify/docker without secrets |
| No contract amendments | §2 | Source audit |
| Optional durable results | §8 | persistence recreate test |

---

# 21. Autonomous-Safe After Approval?

**Yes**, provided implementers:

- do not amend public contracts,
- do not add Runtime stages,
- do not add SQL migrations,
- do not put SDKs in Evaluation,
- stop on any forced constitutional change.

---

# Review Gate

Await approval. Do not implement production code in Review-Gated mode.
