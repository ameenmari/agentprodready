# Blueprint 15 — Security & Authorization Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Identity and Authorization Contracts

`AuthenticationEvidence` is a trusted, provider-independent assertion reference with normalized claims, method, strength, issuer reference, session reference, validity, and version; it contains no credential or token material. `PrincipalNormalizer` maps it into an immutable `Principal` with explicit type, tenant/workspace/project scopes, roles, claims, permissions, labels, authentication strength, delegation references, and agent constraints. Authentication success never grants authorization.

Every protected operation is an immutable `AuthorizationRequest` containing the Principal, explicit action, normalized Resource Reference, trusted requested scope, execution/correlation, delegation and impersonation context, capability/tool/plugin permission requirements, environmental attributes, policy context, and complete versions.

## Policy, Scope, and Authority

Replaceable policy resolution/evaluation produces normalized policy results only. Explicit deny has precedence; otherwise conditional permits combine conditions/restrictions/obligations, permits require an applicable permit, not-applicable remains explicit when policies apply but do not match, and evaluator failures produce indeterminate. Enforcement treats only currently valid Permit or Conditional Permit as authorized; all other outcomes fail closed.

Scope evaluation requires tenant equality and progressively narrows workspace/project access. Cross-tenant access requires an explicit active policy. Delegated and agent authority is the intersection of delegator authority, grant actions/resources/scope, receiver permissions, agent capabilities/tools, resource policy, and execution restrictions. Delegation is versioned, bounded, depth-limited, expiring, traceable, and revocable. Impersonation is explicit, reasoned, time-bounded, separately authorized, and audited.

`AuthorizationDecision` is an immutable historical fact. `AuthorityValidity` separately reports active, expired, revoked, or superseded. A successful current decision may derive an immutable execution-scoped `SecurityContext`; that context never overrides the decision. The Foundation-owned single `ExecutionContextFactory` accepts the Security Context reference and incorporates it unchanged into Runtime `ExecutionContext`.

## Cache, Revocation, Secrets, and Integrations

Decision-cache identity includes principal/effective identity, action, resource and version, every scope, delegation/impersonation state, authentication strength/session, policy set and versions, labels/classification, capability/tool/plugin permissions, and environmental constraints. Expiration, policy changes, revocation, delegation changes, or scope/security changes invalidate reuse. Historical decisions remain unchanged.

General contracts expose `AuthorizedSecretReference` identifiers and purpose/scope/expiry only—never secret values. Conditions represent step-up, consent, minimization, human approval, tool/network limits, no-export/no-persistence, and auditing requirements without implementing their external workflows.

Blueprint 16 owns event transport, 17 durable audit, 22 telemetry/diagnostics/health transport, 23 policy configuration, and 24 persistence. Normalized failures never fail open. Tests and source audits prove central authority, lifecycle correctness, integration availability, and absence of identity-provider, policy-engine, credential, or secret-value leakage.
