# Blueprint 02 — Plugin Framework Implementation Specification

**Version:** 1.0  
**Blueprint Version:** 2.0  
**Implementation Mode:** Autonomous  
**Status:** Approved

## Package

```text
@agentprodready/plugin-framework
packages/plugin-framework
src/index.ts
```

## Core Contracts

`PluginManifest` contains immutable identity, name, semantic version, publisher, supported platform versions, required/optional plugin dependencies, required permissions, and typed metadata contributions for capabilities, providers, tools, workflow nodes, configuration, and event subscriptions. It never contains live provider objects.

`PluginCandidate` combines a manifest with a stable location and integrity reference. `PluginDiscoverySource` returns candidates without loading their implementation. `PluginContributionRegistry` records one contribution category and supports removal for rollback. `PluginLifecycleHook` may run plugin-owned activation/deactivation setup but may not execute provider work. `ImplementationActivator` is a Blueprint 03 bootstrap port that Composition implements to lazily construct a selected implementation.

## Lifecycle

States are `discovered`, `validated`, `registered`, `activating`, `active`, `deactivating`, `inactive`, and `failed`. Discovery sorts by plugin id, version, and location. Dependency ordering uses lexical tie-breaking. Required missing dependencies and cycles fail; absent optional dependencies do not. Shutdown order is the reverse activation order.

Registration is metadata-only and atomic. A failure removes all contributions already registered for that plugin. Re-registering an identical active manifest is idempotent; a different manifest with the same id is rejected.

## Validation and Errors

Stable codes: `PLUGIN_INVALID_MANIFEST`, `PLUGIN_DUPLICATE`, `PLUGIN_MISSING_DEPENDENCY`, `PLUGIN_DEPENDENCY_CYCLE`, `PLUGIN_INCOMPATIBLE`, `PLUGIN_PERMISSION_DENIED`, `PLUGIN_REGISTRATION_FAILED`, `PLUGIN_INVALID_TRANSITION`, and `PLUGIN_NOT_FOUND`. Technology-specific errors are wrapped and do not cross the package boundary.

## Bootstrap Ownership

- Blueprint 03 owns `ImplementationActivator` and instance lifetimes.
- Blueprint 07 owns final capability/provider registries; Blueprint 02 contributes metadata through ports.
- Blueprint 15 owns permission authorization; validators consume its decision.
- Blueprint 16 owns transport of immutable lifecycle facts.
- Blueprint 22 owns telemetry and health aggregation.
- Blueprint 23 owns effective configuration; plugins contribute schemas only.

## Events

`PluginDiscoveredV1`, `PluginValidatedV1`, `PluginRegisteredV1`, `PluginActivatedV1`, `PluginDeactivatedV1`, and `PluginLifecycleFailedV1` are immutable completed facts with plugin id/version and correlation identifiers.

## Compatibility

The reference compatibility rule requires the current platform API version to appear in the manifest’s supported list. Semantic version strings use `major.minor.patch`. More advanced ranges may be introduced compatibly by Blueprint 31 governance.

## Security and Runtime Boundaries

Required permissions are submitted to an injected permission authorizer. The framework does not grant permissions. It schedules no work, retries nothing, and invokes no provider or tool business behavior.

## Public Exports

Only normalized contracts, error types, validator/graph/pipeline/lifecycle services, in-memory metadata registries, and the Nest module/tokens are exported. Internal graph traversal and rollback helpers remain private.

## Approval

Autonomously finalized on 2026-08-06.

