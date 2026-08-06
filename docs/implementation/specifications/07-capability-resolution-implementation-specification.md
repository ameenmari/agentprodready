# Blueprint 07 — Capability Resolution Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Public Contracts

`CapabilityRequest` contains a capability id, optional contract version, immutable `ExecutionContext`, Workflow `NodeExecutionContract`, execution-scoped non-provider constraints, and trace metadata. `CapabilityBinding` contains the selected implementation/plugin contribution identifiers, provider metadata, capability/implementation versions, precedence source, and diagnostic reference. Both are deeply frozen and serializable.

Capability contract versions and implementation versions are distinct. `CapabilityRegistry` stores capability definitions and compatible implementation ids. `ProviderRegistry` stores implementation metadata. Neither decides or instantiates.

## Resolution

The validator rejects blank/provider-specific requests, unknown capabilities, missing implementations, contract incompatibility, disabled/unhealthy candidates, and invalid configuration. `DeterministicResolutionPolicy` consumes eligible candidates plus configuration and evaluates runtime constraints, tenant, workspace, project, global, then default. Runtime constraints only filter; configured levels may name implementation ids. The first configured eligible selection wins; otherwise the deterministic declared default wins. A configured but ineligible selection fails explicitly rather than silently falling through.

`CapabilityResolver` is the only public resolution entry point. It validates, reads passive registries, invokes the independent policy, returns an immutable binding, and records immutable success/failure diagnostics, facts, and telemetry.

## Integrations

Plugin metadata can be normalized into registry records without loading code. `RuntimeCapabilityResolutionAdapter implements CapabilityInvocationPort` derives requests only from Workflow node contracts plus ExecutionContext and returns bindings; it neither activates nor executes them. Composition activation remains a later Runtime step through Blueprint 03.

## Verification

Tests map every acceptance criterion and boundary. Completion requires successful lint, complete typecheck, tests, and build on Node 24 LTS, an implementation report, and the completed Blueprint 07 checklist.
