# Blueprint 04 — Runtime Orchestration Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Package and Ownership

`@agentforge/runtime` depends only on Foundation and Composition. Runtime owns operational lifecycle, state transitions, scheduling, concurrency, retry, timeout, cancellation, recovery, scope disposal, and coordination. It never implements planning, workflow, capability selection, provider/tool behavior, authorization decisions, observability processing, policy definition, or persistence strategy.

## Public Model

- `RuntimeRequest` contains the Foundation `CreateExecutionContextRequest`, immutable input, and optional cancellation signal.
- `RuntimeResult` contains execution id, terminal state, delegated output, attempt count, and immutable state history.
- States are `created`, `initializing`, `planning`, `executing`, `waiting`, `recovering`, `cancelling`, `completing`, `completed`, `failed`, and `cancelled`.
- `RuntimeError` exposes stable codes for invalid transitions, authorization, cancellation, timeout, concurrency, and execution failure.
- `RuntimePolicy` defines timeout, attempts, concurrency, and retryable error classification; Blueprint 23 owns production policy resolution.

## Future-Owned Ports

`PlanningPort` (05), `WorkflowPort` (06), `CapabilityInvocationPort` (07 coordination boundary), `SecurityAuthorizationPort` (15), `RuntimeEventPublisher` (16), `RuntimeTelemetry` (22), `RuntimePolicyProvider` (23), and `ExecutionSnapshotPort` (24) are minimal replaceable bootstraps. Runtime calls them but does not absorb their ownership. Composition's `ExecutionScopeFactory` remains the scope boundary.

## Lifecycle

The coordinator creates a scope (and therefore a factory-created context), authorizes using its security context, transitions through planning/executing/completing, delegates stages, publishes immutable facts, records telemetry/snapshots, and always disposes the scope. Cancellation and timeout are terminal; retryable failures transition through recovering and are rescheduled. Failures publish and observe terminal facts before propagating a normalized error.

## Managers

`ExecutionStateManager` exclusively validates transitions. `ExecutionScheduler` is the only work-entry point. `ConcurrencyManager` bounds active work. `RetryManager`, `TimeoutManager`, `CancellationManager`, and `RecoveryManager` coordinate policy enforcement. All state is execution-local.

## Verification

Tests must demonstrate factory-created contexts, isolated and disposed scopes, centralized scheduling/concurrency, deterministic states, retries, timeouts, cancellation, recovery, event consistency, security propagation, telemetry on all outcomes, delegated business behavior, health, and immutable diagnostics. Required gates are `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on Node 24 LTS.
