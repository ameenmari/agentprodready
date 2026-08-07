# Blueprint 03 — Dependency Injection and Composition Implementation Plan

**Document Version:** 1.0  
**Blueprint Version:** 2.0  
**Implementation Mode:** Autonomous  
**Status:** Approved

## Objective

Implement the single architecture-neutral Composition Root that registers, validates, constructs, scopes, decorates, diagnoses, and disposes AgentProdReady services. Adopt Blueprint 02's `ImplementationActivator` while preserving Runtime ownership of execution and Observability ownership of telemetry.

## Documents and Dependencies

Blueprints 01 and 02, their specifications/reports, Blueprint 03, Blueprint 31, accepted ADRs, implementation modes/guidance, and the canonical dependency graph were reviewed. Blueprints 01 and 02 are verified hard dependencies. Blueprint 04 execution-scope interaction and Blueprint 22 composition telemetry remain bootstrap ports only.

## Scope

- `@agentprodready/composition` package with no NestJS dependency;
- one mutable-before-build, immutable-after-build Composition Root;
- module, infrastructure, plugin, factory, and implementation registration through one pipeline;
- exactly `singleton`, `scoped`, and `transient` lifetimes;
- deterministic graph, missing dependency, cycle, duplicate, and lifetime validation;
- isolated execution scopes whose context is created only by `ExecutionContextFactory`;
- lazy construction and cached singleton/scoped lifetimes;
- deterministic decorator ordering;
- synchronous and asynchronous disposal in reverse creation order;
- Blueprint 02 `ImplementationActivator` adapter;
- immutable diagnostics and composition telemetry port;
- unit, contract, integration, architecture, and failure-path tests.

## Non-Goals

No Runtime scheduling/execution, capability selection, authorization decision, workflow/planning/provider/tool behavior, nested container, service locator in domain contracts, or production telemetry backend is implemented.

## Package Mapping

```text
packages/composition/src/contracts
packages/composition/src/application
packages/composition/src/errors
packages/composition/src/reference
packages/composition/src/index.ts
```

## Acceptance Mapping

| Blueprint criterion | Component | Verification |
|---|---|---|
| Single Composition Root | `CompositionRoot` | build-once/root tests |
| All module registration | `ModuleRegistrar` pipeline | module integration test |
| Plugin registration | `PluginCompositionRegistrar` | Blueprint 02 integration test |
| Three lifetimes | `ServiceLifetime` | compile/runtime assertion |
| Isolated execution scopes | `ExecutionScope` | two-scope integration test |
| Factory-only context | root execution-scope factory flow | factory spy/integration test |
| Singleton/scoped safety | graph validator | lifetime rejection test |
| Lazy resolution | container resolution | construction-count tests |
| Decorators | ordered decorator descriptors | order/contract test |
| Pre-Runtime validation | `build()` validation | invalid graphs reject build |
| Diagnostics | immutable snapshot | diagnostics test |
| Fail-fast composition | build and resolution errors | failure-path tests |

## Risks and Controls

- Type erasure: opaque typed tokens carry stable descriptions and unique symbol identity.
- Hidden construction: only registered factories can create services; factories receive a restricted dependency resolver.
- Scope leakage: root resolution rejects scoped services and singleton-to-scoped edges are rejected before build.
- Premature Runtime ownership: Runtime receives a future-owned `ExecutionScopeFactory` port; Composition only creates/disposes scopes.

## Approval

Autonomously finalized on 2026-08-06 after verified completion of Blueprints 01 and 02.

