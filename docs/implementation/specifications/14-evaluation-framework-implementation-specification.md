# Blueprint 14 — Evaluation Framework Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Requests, Targets, and Criteria

Every evaluation begins with an immutable `EvaluationRequest`. It contains a copied normalized `EvaluationTarget`, expected outcome where supplied, explicit versioned criteria, a versioned policy, evaluator requirements, authoritative security scope, correlation metadata, and request/platform versions. Targets are opaque normalized artifacts identified by public artifact type, reference, version, provenance, and labels; the framework never repairs, rewrites, retrieves, or executes them.

Criteria identify category, description, weight, threshold, severity, evidence requirements, evaluator requirement, scoring schema, and version. Missing, abstained, not-applicable, waiting, and inconclusive outcomes remain distinct from failure and a numeric zero.

## Evaluator and Execution Boundaries

`EvaluatorResolver` accepts requirements and returns replaceable normalized evaluators; a Blueprint 07 adapter owns capability-driven selection. `EvaluatorExecutionPort` receives evaluator tasks and the declared sequential/parallel semantic mode; Runtime supplies the production implementation and owns actual scheduling/concurrency/retry/timeout/cancellation/recovery. The Evaluation Framework does not implement those operational policies.

Evaluator descriptors support deterministic, heuristic, AI-assisted, human, and composite categories. `NormalizedAiEvaluationPort` represents the Blueprint 07 → Blueprint 13 → Blueprint 08 chain and returns only normalized evaluator output plus capability-binding, Prompt Package, and normalized-AI-result references. Human contracts expose waiting and explicit resumption without owning UI, notification, assignment, authentication, suspension, or timeout infrastructure.

## Scores, Evidence, and Results

Evaluator scores carry explicit schema, bounds, value, confidence, semantics, evaluator, criterion, and version. `ScoreNormalizer` maps compatible numeric schemas to the platform `unit-interval` schema before aggregation. Aggregation rejects mixed normalization, policy, or criterion semantics; excludes abstained, not-applicable, waiting, and inconclusive outputs; and records contributors, weights, exclusions, abstentions, and strategy.

Evidence contains references and summaries only, plus provenance, version, and authoritative security scope. It cannot expose provider/evaluator response models or unauthorized target content. Every completed framework call returns a deeply immutable, serializable, provider/evaluator-independent `EvaluationResult` with explicit complete/partial/empty/waiting/inconclusive status and pass/fail/inconclusive/no-outcome assessment.

## Integration and Failure Contracts

Blueprint 15 owns authorization, Blueprint 16 event transport, Blueprint 17 durable audit, Blueprint 22 telemetry/diagnostics/health transport, Blueprint 23 policy resolution, and Blueprint 24 result persistence. Their bootstrap ports are narrow and replaceable. Failures normalize to stable `EVALUATION_*` errors; results never trigger retries, remediation, workflow changes, provider selection, deployment, or authorization changes.

Tests verify request/target immutability, criteria/evaluator compatibility, deterministic/heuristic/AI/human/composite contracts, Runtime delegation including parallel semantics, normalization and incompatibility rejection, transparent aggregation, all explicit non-score outcomes, comparative evaluation, evidence provenance/security, immutable versioned results, events/audit/store/telemetry/diagnostics/health, error normalization, and provider-model isolation.
