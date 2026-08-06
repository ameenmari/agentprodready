# Blueprint 07 — Capability Resolution Implementation Plan

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Objective

Implement `@agentforge/capability-resolution` as the exclusive provider-independent selection authority between Runtime node contracts and Composition-owned implementation activation.

## Work

1. Define immutable request, capability/implementation metadata, binding, policy input, diagnostics, events, and telemetry contracts.
2. Implement separate passive capability/provider registries, compatibility validator, deterministic precedence policy, and coordinating resolver.
3. Integrate Plugin contribution metadata registration and Runtime capability invocation without loading or executing implementations.
4. Test exclusive resolution, provider-independent requests, precedence, compatibility, passive stores, immutable bindings, structured failures, diagnostics, and Runtime boundary.
5. Run lint, complete typecheck, tests, and build under Node 24 LTS; then report and close the checklist.

## Boundaries

Resolution selects implementation metadata only. Composition instantiates lazily; Runtime schedules and invokes; specialized frameworks execute. Runtime overrides are constraints, never implementation/provider identifiers. Security authorization and production configuration remain future-owned ports.
