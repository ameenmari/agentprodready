# Blueprint 15 — Security & Authorization Implementation Plan

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Objective

Implement `@agentprodready/security` as AgentProdReady’s centralized, fail-closed, provider-independent identity normalization, authorization policy, delegation, revocation, authority-validity, decision-cache, and Security Context boundary.

## Work

1. Finalize the Foundation bootstrap boundary so the existing sole `ExecutionContextFactory` can incorporate—but never create or reinterpret—an immutable Security-owned context reference.
2. Define authentication evidence, principal/agent identity, delegation/impersonation, resource/action, request, policy/evaluation, decision, authority validity, Security Context, secret reference, consent/step-up/data-minimization, revocation/cache, enforcement, event, audit, diagnostics, telemetry, and health contracts.
3. Implement trusted-evidence normalization, deterministic policy resolution/evaluation/conflict handling, deny-by-default and fail-closed decisions, scope isolation, bounded delegation and agent authority, immutable decisions/contexts, expiration/reauthorization, revocation without historical mutation, complete cache identity/invalidation, and domain adapters for Runtime/plugin enforcement.
4. Add tests for every listed Security requirement, including authentication separation, every outcome, conflict resolution, tenant/workspace/project isolation, delegation chains, impersonation, agent self-escalation, capability/tool/plugin boundaries, labels, secrets, conditions, policy versions, cache/revocation, lifecycle integrations, and provider-model isolation.
5. Run repository lint, dependency boundaries, complete typecheck, full tests with coverage, and build under Node 24 LTS before report/checklist closure.

## Boundaries

Security decides authority. Runtime coordinates execution. Domain frameworks enforce supplied decisions and may impose additional non-authorizing invariants. Audit records. Authentication providers establish trusted evidence; Security does not implement login or credential verification. Secret Management owns secret material. Security never schedules, invokes, retrieves, composes, selects providers, or mutates historical decisions.
