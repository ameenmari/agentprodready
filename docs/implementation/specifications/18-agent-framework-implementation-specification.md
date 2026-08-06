# Blueprint 18 — Agent Framework Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Public Decisions

`AgentManifest` is declarative and bounded. It distinguishes logical `agentId` from semantic `version`, declares an explicit Security principal, capability/tool/knowledge/memory requirements, planning/workflow/context/prompt/evaluation policy references, immutable configuration, constraints, scope, compatibility, governance, dependencies, and provenance. Forbidden secret/provider SDK/runtime-state fields are rejected recursively.

`AgentDefinition` is a deterministic deep-frozen normalized version artifact. It contains no `ExecutionContext`, execution progress, retry, scheduling, current node, provider binding, or final execution artifact. Provenance includes manifest/package/publisher/builder/validation-policy/source-configuration references.

Validation produces immutable findings across structural, compatibility, dependency, constraint, security-requirement, and governance categories. Blocking findings prevent registration/activation; validation never approves, authorizes, registers, or activates.

Registry and lifecycle providers are replaceable. Registration keys logical Agent + version + scope and is idempotent. Multiple versions coexist. Lifecycle is derived from immutable versioned transition records. Allowed transitions are explicit; suspension/quarantine/deactivation/retirement prevent new invocation and do not decide active-execution fate.

`AgentAuthorizationOutcome` consumes Blueprint 15 `AuthorityState`, exact operation/scope, allowed capabilities/tools/knowledge/memory, restrictions, obligations, and policy version. Discovery cannot imply invocation. Effective resolution intersects declarations with invocation/security/delegation constraints and only narrows authority/resource limits.

Invocation accepts an immutable request, deterministically selects an explicit/pinned/default/latest compatible active version, preserves resolution policy/candidates/diagnostics, creates an immutable effective definition, and sends a normalized request to a Runtime-owned port. The acceptance result contains a Runtime execution reference but no final business result or `ExecutionContext`.

Packages are inspected/hashed via replaceable providers; installation is independent of registration/activation. Integrity/signature/trust are descriptive inputs, never authorization/safety. Evaluation references remain Blueprint 14 descriptive results. Certification is versioned/scoped/expirable. Self-improvement creates immutable proposals only.

## Package

- `@agentforge/agent-framework`
- `src/index.ts`: contracts and coordinators.
- `src/reference.ts`: deterministic/in-memory replaceable providers.
- `src/agent-framework.spec.ts`: contract/unit/integration verification.

The package declares all Blueprint 01–17 hard dependencies. It consumes normalized Security, Runtime, Event Bus, Audit, Evaluation, Capability, Plugin, and Composition boundaries without taking ownership. Production Marketplace, persistence, configuration, and observability adapters remain future-owned.

## Limitations

Reference stores are in-memory and non-durable. Package integrity uses a deterministic test digest, not production signature verification. Runtime handoff is a contract adapter only. Multi-agent coordination and human approvals remain Blueprints 19/20.

