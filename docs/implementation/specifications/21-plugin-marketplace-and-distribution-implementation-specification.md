# Blueprint 21 — Plugin Marketplace & Distribution Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Contract Decisions

`DistributionPackage` and `PackageManifest` are deeply frozen, content-addressed, provider-neutral declarations. A package carries an artifact reference and integrity digest, never executable bytes, credentials, Runtime state, or provider-specific package-manager data. Dependencies and compatibility requirements use normalized identifiers, semantic versions/ranges, and contract references.

`PublisherIdentity` records identity and verification metadata independently from `PackageTrustResult`. Trust evaluation combines integrity, signature evidence, publisher verification, certifications, and policy into a descriptive result with `authorizationImplied`, `activationImplied`, `executionImplied`, and `safetyImplied` fixed to `false`.

Every marketplace operation consumes an exact active Security authorization outcome scoped to tenant/workspace and operation. Discovery filters authorized scope and returns summaries with installation/execution authorization fixed to false. Installation validates manifest, integrity, compatibility, dependencies, trust policy, and authorization before immutable registration; duplicate installation is idempotent.

Update and rollback append immutable, deterministic history records. Pinning, manual/approved-automatic/canary policies, and compatibility are descriptive distribution semantics. No method imports code, invokes plugins/providers, activates registrations, instantiates dependencies, schedules Runtime work, or mutates Agent lifecycle.

Registry, integrity, compatibility, dependency, trust, events, audit, diagnostics, configuration, and persistence are replaceable ports. The in-memory registry is a reference provider; production filesystem/remote/package-manager adapters are deferred.

## Package

- `@agentforge/plugin-marketplace`
- `src/index.ts`: public contracts, package builder, installation/discovery/version/lifecycle service, and errors.
- `src/reference.ts`: deterministic validators and in-memory/reference adapters.
- `src/plugin-marketplace.spec.ts`: acceptance, contract, and integration tests.
