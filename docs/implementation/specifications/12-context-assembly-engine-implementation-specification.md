# Blueprint 12 — Context Assembly Engine Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Public Input and Output

`ContextAssemblyRequest` is an immutable, execution-scoped contract containing an existing `ExecutionContext`, `NodeExecutionContract`, `ExecutionPlan`, `WorkflowSnapshot`, `KnowledgeRetrievalResult`, `MemoryRetrievalResult`, normalized Runtime metadata, a supplied authorization outcome, and a versioned `ContextAssemblyPolicy`. These are inputs only: the engine neither retrieves nor mutates them.

The sole public result is `ExecutionContextPackage`. It contains normalized context elements, source and omission summaries, execution/security scope, source-contract and policy versions, logical-budget evidence, a diagnostic reference, and an explicit `complete`, `partial`, or `empty` status. It is deeply immutable, serializable, provider-independent, and contains no prompts, messages, provider token models, or consumer-specific projections.

## Deterministic Pipeline

The engine validates the request; copies normalized source contracts into traceable internal elements; enforces tenant, workspace, supplied-label, and supplied-source constraints; deduplicates without changing sources; filters by configured priority; prioritizes deterministically; enforces total and per-source logical-unit budgets; orders by the configured deterministic policy; and packages copied public elements. Identical inputs and policies produce identical semantic output. Time and durations enter only through an injected clock and telemetry/diagnostic metadata and do not influence element selection.

`ContextAssemblyPolicy` carries a non-empty version, schema version, minimum priority, total logical-unit budget, optional per-source budgets, and ordering mode. Policy evaluation is synchronous and replaceable through `ContextPolicyEvaluator`; the reference evaluator remains technology-neutral.

## Security and Ownership

`ContextAuthorization` is a future Blueprint 15-owned authorization outcome. Context Assembly checks it but never derives permissions or interprets security policy. Unauthorized elements are omitted before prioritization and packaging. Knowledge/Memory security scopes must match the current execution and supplied decision. Source labels and traceability are preserved.

Blueprint 16 eventually owns event transport, Blueprint 22 owns observability/diagnostic transport, and Blueprint 23 owns policy resolution. Their bootstrapped ports are replaceable at Composition. Runtime retains retry, timeout, cancellation, scheduling, and continuation decisions.

## Failures and Verification

Validation, policy evaluation, security-scope, budget, serialization, and pipeline failures normalize to stable `CONTEXT_*` errors with safe diagnostic identifiers. Tests prove deterministic assembly, normalized-only input, source immutability, policy versioning, filtering, priority, budgets, ordering, traceability, security preservation, immutable and serializable packages, empty/partial results, event/diagnostic/telemetry output, normalized failures, and absence of retrieval/prompt/provider behavior.
