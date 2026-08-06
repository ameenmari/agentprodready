# Blueprint 05 — Planning Engine Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Public Model

`PlanningRequest` carries an objective and immutable `ExecutionContext`. `ExecutionPlan` contains plan id, objective, goal, intent, strategy, provider-neutral capability requirements, immutable task DAG, selected or generated workflow definition, decision points, validation result, optimization metadata, and planning metadata. All returned structures are deeply frozen and JSON-serializable.

Tasks reference capability identifiers only; provider identifiers and implementation instances are prohibited. Dependencies reference task ids and must form an acyclic graph. A plan is emitted only after validation and intent-preserving optimization.

## Services and Ports

The coordinator sequences `GoalAnalyzer`, `IntentAnalyzer`, `TaskDecomposer`, `CapabilityPlanner`, `StrategySelector`, `WorkflowPlanner`, `PlanOptimizer`, and `PlanValidator`. `WorkflowCatalog` is the Blueprint 06 bootstrap boundary; `CapabilityRequirement` is the Blueprint 07 bootstrap type. Planning events, telemetry, policy, optional assisted reasoning, and security-context consumption remain ports owned by Blueprints 16, 22, 23, 08, and 15.

`RuntimePlanningAdapter` implements Blueprint 04 `PlanningPort`, accepts Runtime input/context/signal, and returns only a validated `ExecutionPlan`. It does not schedule or execute the plan.

## Validation

Reject blank objectives, empty goals/intents, missing tasks/capabilities, duplicate ids, missing dependencies, cycles, incomplete workflows, provider-specific fields, incompatible strategies, and aborted operations using stable planning error codes.

## Verification

Tests trace every acceptance criterion and public replacement boundary. Completion requires successful `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` under Node 24 LTS, followed by the report and completed Blueprint 05 checklist.
