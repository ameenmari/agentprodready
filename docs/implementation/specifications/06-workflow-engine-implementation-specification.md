# Blueprint 06 — Workflow Engine Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Public Model

`WorkflowGraph` is a deeply frozen DAG with exactly one entry, one or more exits, reachable nodes, explicit dependencies, and provider-neutral capability references. Node kinds are capability, decision, approval, loop, merge, and completion. `WorkflowExecutionState` is separate mutable execution state exposed only as immutable snapshots.

## Logical Advancement

The engine validates and initializes a graph, reports all structurally eligible nodes, marks logical node lifecycle transitions, records branch outcomes and loop iterations, pauses at approval nodes, and resumes from snapshots without changing the definition. `NodeExecutionContract` identifies eligible logical work for Runtime; it contains no provider or scheduling policy.

## Integration

`ExecutionPlanWorkflowAdapter` derives the graph solely from Blueprint 05 tasks/workflow data. `RuntimeWorkflowAdapter implements WorkflowPort` initializes and returns the immutable execution snapshot and eligible node contracts for Runtime coordination. Event, telemetry, approval, policy, and snapshot ports remain owned by Blueprints 16, 22, 20, 23, and 24.

## Validation and Verification

Validation rejects missing/multiple entries, missing exits/dependencies, cycles, unreachable nodes, provider leakage, and malformed branches/loops. Tests cover immutable graphs, dependencies, parallel eligibility, branching, bounded loops, approval pause/resume, central state transitions, events/telemetry, plan/Runtime integration, and architectural independence.
