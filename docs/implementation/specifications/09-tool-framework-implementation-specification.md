# Blueprint 09 — Tool Framework Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Public Contracts

`ToolContract` declares capability, input/output schemas, side-effect class (`read-only`, `mutating`, `external-side-effect`), idempotency (`idempotent`, `non-idempotent`), and normalized metadata. `ToolExecutionRequest` contains request id, selected Capability Binding, Node Execution Contract, ExecutionContext, parameters, supplied authorized decision fact, optional idempotency key, invocation metadata, validation metadata, and provider-neutral constraints.

`NormalizedToolResult` is the sole success output and contains normalized data, status, tool/execution metadata, validation result, and diagnostic reference. `NormalizedToolError` maps authentication, authorization, validation, rate-limit, connection, unavailable, not-found, conflict, timeout, rejected, and unknown external failures without retaining external error objects.

## Components

`ToolRegistry` is a passive immutable metadata store; discovery/registration never instantiate. `ToolValidator` verifies binding/capability/contract/schema metadata, supplied authorization success, JSON-compatible parameters, and required idempotency keys without making authorization or execution-policy decisions.

`ToolInvocationCoordinator` obtains the already-selected adapter through the Composition-owned `ToolAdapterResolver`, validates before exactly one adapter call, enforces/freeze-normalizes output, translates failures, and emits diagnostics/facts/telemetry. It contains no retry, timeout, scheduling, recovery, capability selection, or workflow logic.

Plugin tool contributions normalize into contracts. AI `NormalizedToolCall` values can be transformed into Tool requests by a pure handoff adapter; AI Provider never executes them. Security, Event Bus, Observability, Policy, and idempotency persistence remain future-owned replacement points.

## Verification

Tests cover validation-before-invocation, passive discovery, plugin compatibility, all semantics/error classes, private external types, authorization-fact consumption, AI handoff, adapter replacement, observability, and complete binding-to-result integration. Completion requires all four gates under Node 24 LTS plus report/checklist closure.
