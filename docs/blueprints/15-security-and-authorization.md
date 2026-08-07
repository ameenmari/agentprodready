# AgentProdReady

# Engineering Blueprint 15

# Security & Authorization Platform

**Version:** 2.0

**Status:** Approved

**Classification:** Core Platform Blueprint

**Audience:**

* Platform Architects
* Security Engineers
* Platform Engineers
* Runtime Engineers
* Plugin Developers
* Compliance Engineers
* Cursor AI

---

# 1. Purpose

The Security & Authorization Platform defines the standardized architecture through which AgentProdReady authenticates identities, evaluates access policies, authorizes operations, protects sensitive resources, and propagates authoritative security outcomes throughout platform execution.

Its purpose is to centralize security decisions so that individual engines, providers, plugins, tools, and integrations do not create independent authorization models.

The Security Platform determines:

> **Who or what is acting, what operation is being requested, which resource is involved, and whether that operation is permitted.**

Other platform components consume and enforce those decisions.

They must not replace, reinterpret, weaken, or bypass them.

The Security & Authorization Platform is AgentProdReady’s **central identity, policy-decision, and access-governance layer**.

---

# 2. Responsibilities

The Security Platform owns:

* Identity normalization
* Principal representation
* Authentication integration contracts
* Authorization requests
* Authorization decisions
* Policy evaluation
* Permission evaluation
* Role and claim interpretation
* Resource-scope evaluation
* Tenant-boundary enforcement policies
* Delegation policies
* Agent identity policies
* Tool-permission policies
* Plugin-permission policies
* Security-context creation
* Security-event publication
* Audit-security integration
* Security diagnostics
* Security observability
* Security-policy versioning

The Security Platform does **not** own:

* Runtime scheduling
* Workflow progression
* Business-rule validation
* Capability Resolution
* Provider selection
* Tool invocation
* Knowledge retrieval
* Memory retrieval
* Context Assembly
* Prompt construction
* Plugin discovery
* Secret persistence implementation
* User-interface authentication flows
* External identity-provider implementation

---

# 4. Blueprint Dependencies

Blueprint 15 depends upon:

* Blueprint 01 — Engineering Constitution & Platform Foundation
* Blueprint 02 — Plugin & Extension Framework
* Blueprint 03 — Dependency Injection & Composition Framework
* Blueprint 04 — Runtime Orchestration Engine
* Blueprint 07 — Capability Resolution Framework
* Blueprint 14 — Evaluation Framework where safety findings are evaluated

Future dependent blueprints include:

* Tenant Platform
* Agent Framework
* Multi-Agent Collaboration
* API Gateway
* Administration Platform
* Audit & Compliance
* Secret Management
* Governance
* Deployment and Operations

---

# 5. Consumes → Produces → Owns

## Consumes

* Authentication evidence
* Identity-provider claims
* Principal metadata
* Requested operation
* Resource reference
* Tenant, workspace, and project scope
* Execution metadata
* Security policies
* Delegation information
* Capability and tool permission requirements
* Plugin permission declarations

## Produces

**Authorization Decision**

and, where an execution is accepted:

**Security Context**

## Owns

Centralized identity interpretation, policy evaluation, authorization decision-making, and security-context production.

---

# 6. Architectural Position

```text
Authentication Source
        │
        ▼
Normalized Principal
        │
        ▼
Security & Authorization Platform
        │
        ├── Policy Evaluation
        ├── Permission Evaluation
        ├── Scope Evaluation
        └── Delegation Evaluation
        │
        ▼
Authorization Decision
        │
        ▼
ExecutionContextFactory
        │
        ▼
ExecutionContext
        │
        └── Immutable Security Context
                    │
                    ▼
                  Runtime
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
      Tools      Knowledge     Memory
        │           │            │
        └──── Enforce supplied decision ────┘
```

The Security Platform decides.

The Runtime propagates.

Domain frameworks enforce.

---

# 7. Security Philosophy

Security is a platform responsibility, not a local implementation detail.

No subsystem may authorize its own operation merely because:

* It possesses valid credentials
* It can access an external service
* A provider supports the requested operation
* A plugin declares a capability
* A resource exists
* The caller supplied an identifier
* A workflow contains a node
* A tool invocation is technically valid

Technical capability does not imply authorization.

The constitutional security flow is:

```text
Identity
    │
    ▼
Authentication Evidence
    │
    ▼
Normalized Principal
    │
    ▼
Authorization Request
    │
    ▼
Security Policy Evaluation
    │
    ▼
Authorization Decision
    │
    ▼
Runtime-Coordinated Enforcement
```

---

# 8. Authentication vs Authorization

Authentication and authorization are distinct architectural responsibilities.

## Authentication

Answers:

> **Who or what is making the request?**

Authentication may be performed by:

* Enterprise identity providers
* OAuth or OpenID Connect systems
* API-key gateways
* Service identity platforms
* Workload identity systems
* Certificate infrastructure
* External authentication plugins

The Security Platform normalizes authenticated identity evidence but does not require a particular authentication technology.

---

## Authorization

Answers:

> **Is this principal permitted to perform this operation on this resource within this scope?**

Authorization is owned exclusively by the Security Platform.

A successfully authenticated identity may still be denied authorization.

---

# 9. Principal Model

## 9.1 Purpose

A Principal is the normalized identity of the actor participating in a platform operation.

The remainder of AgentProdReady must not depend directly on identity-provider-specific claim objects or authentication SDK models.

---

## 9.2 Principal Categories

The platform may support:

* Human User
* Agent
* Service Account
* Workload Identity
* Plugin Identity
* Tool Identity
* External System Identity
* Administrative Principal
* Anonymous Principal where explicitly permitted

---

## 9.3 Conceptual Structure

```text
Principal
│
├── Principal Identifier
├── Principal Type
├── Tenant Scope
├── Identity Source
├── Roles
├── Claims
├── Attributes
├── Delegation Information
├── Authentication Strength
├── Session Reference
└── Identity Metadata
```

The Principal is normalized and provider-independent.

---

# 10. Agent Identity

Agents must operate as explicit security principals.

An agent must never inherit unrestricted access merely because it executes on behalf of a user or exists inside an authorized workflow.

Agent identity must distinguish:

* The agent itself
* The initiating user or service
* The tenant and workspace
* Delegated permissions
* Effective permissions
* Execution restrictions
* Agent-specific policies

Conceptually:

```text
Initiating Principal
        │
        ▼
Delegation Policy
        │
        ▼
Agent Principal
        │
        ▼
Effective Permission Scope
```

An agent’s effective permissions must not exceed the intersection of:

* The initiating principal’s delegated authority
* The agent’s own permitted capabilities
* Tenant and workspace policy
* Resource policy
* Execution-specific restrictions

---

# 11. Authorization Request

## 11.1 Purpose

An Authorization Request is the normalized input contract for an access decision.

Every protected operation must be represented as an explicit Authorization Request.

---

## 11.2 Characteristics

Every Authorization Request must be:

* Immutable
* Traceable
* Tenant-aware
* Resource-aware
* Operation-specific
* Serializable
* Versioned
* Observable

---

## 11.3 Conceptual Structure

```text
Authorization Request
│
├── Principal
├── Requested Action
├── Resource Reference
├── Tenant Scope
├── Workspace Scope
├── Project Scope
├── Execution Reference
├── Delegation Context
├── Capability Requirements
├── Environmental Attributes
├── Policy Context
└── Correlation Metadata
```

Authorization requests must not include provider-specific permission models as public platform contracts.

---

# 12. Resource Model

## 12.1 Purpose

Authorization decisions require a normalized representation of the resource being accessed.

Resources may include:

* Tenant
* Workspace
* Project
* Workflow
* Agent
* Tool
* Knowledge Source
* Knowledge Record
* Memory Record
* Prompt Package
* Evaluation Result
* Plugin
* Provider
* Configuration
* Secret Reference
* API Operation
* Administrative Operation

---

## 12.2 Resource Reference

A Resource Reference identifies a protected resource without exposing its underlying storage implementation.

Conceptually:

```text
Resource Reference
│
├── Resource Identifier
├── Resource Type
├── Tenant Ownership
├── Workspace Ownership
├── Project Ownership
├── Resource Classification
├── Security Labels
├── Parent Resource
├── Version
└── Resource Metadata
```

---

# 13. Action Model

Actions represent normalized operations evaluated by the Security Platform.

Examples include:

* Read
* Create
* Update
* Delete
* Execute
* Invoke
* Approve
* Publish
* Configure
* Delegate
* Administer
* Export
* Retrieve
* Consolidate
* Evaluate
* Install
* Activate
* Disable

Actions must remain explicit.

Broad permissions such as unrestricted `"manage everything"` should be avoided except for narrowly governed administrative roles.

---

# 14. Authorization Decision

## 14.1 Purpose

The **Authorization Decision** is the sole public output of policy evaluation.

It records whether an operation is permitted and any conditions under which it may proceed.

---

## 14.2 Decision Outcomes

Possible outcomes include:

* Permit
* Deny
* Conditional Permit
* Not Applicable
* Indeterminate

`Indeterminate` must never be silently interpreted as `Permit`.

The default security posture is deny unless an applicable policy explicitly permits the action.

---

## 14.3 Conceptual Structure

```text
Authorization Decision
│
├── Decision Identifier
├── Outcome
├── Principal Reference
├── Action
├── Resource Reference
├── Effective Scope
├── Applied Policies
├── Conditions
├── Restrictions
├── Obligations
├── Decision Reason
├── Policy Versions
├── Evidence References
├── Expiration
└── Correlation Metadata
```

The decision is immutable once produced.

---

# 15. Conditional Authorization

A permitted operation may include conditions or obligations.

Examples include:

* Restrict result count
* Mask sensitive fields
* Require human approval
* Limit allowed tools
* Restrict network destination
* Prohibit persistent storage
* Prevent export
* Require additional audit logging
* Apply a time limit
* Require stronger authentication
* Restrict model or provider class
* Limit spending or resource usage

The component performing the operation must enforce applicable conditions.

It must not weaken or silently ignore them.

---

# 16. Security Context

## 16.1 Purpose

A Security Context is the immutable execution-scoped representation of the authoritative security state applicable to an accepted execution.

It is produced from validated identity and authorization information.

---

## 16.2 Architectural Position

```text
Authorization Decision
        │
        ▼
Security Context
        │
        ▼
ExecutionContextFactory
        │
        ▼
ExecutionContext
```

Exactly one `ExecutionContextFactory` creates the Runtime `ExecutionContext`.

The Security Platform supplies the normalized Security Context used by that factory.

---

## 16.3 Conceptual Structure

```text
Security Context
│
├── Principal Reference
├── Effective Identity
├── Tenant Scope
├── Workspace Scope
├── Project Scope
├── Effective Permissions
├── Delegated Permissions
├── Restrictions
├── Security Labels
├── Authentication Strength
├── Authorization References
├── Policy Versions
├── Expiration
└── Security Metadata
```

The Security Context must not contain raw credentials or provider-specific authentication tokens unless represented through an authorized secure reference.

---

# 17. Policy Architecture

## 17.1 Purpose

Security Policies define the rules used to evaluate Authorization Requests.

Policies must be explicit, versioned, testable, and explainable.

---

## 17.2 Policy Sources

Policies may originate from:

* Platform defaults
* Organization policy
* Tenant policy
* Workspace policy
* Project policy
* Resource policy
* Agent policy
* Tool policy
* Plugin policy
* Compliance policy
* Execution-specific restrictions

---

## 17.3 Policy Categories

The platform may support:

* Role-Based Access Control
* Attribute-Based Access Control
* Resource-Based Access Control
* Policy-Based Access Control
* Capability restrictions
* Delegation policies
* Risk-based conditions
* Consent policies
* Data-classification policies
* Administrative policies

These models may coexist behind normalized policy contracts.

---

# 18. Policy Evaluation

Every authorization operation follows a standardized semantic pipeline.

```text
Authorization Request
        │
        ▼
Request Validation
        │
        ▼
Principal Validation
        │
        ▼
Resource Scope Resolution
        │
        ▼
Applicable Policy Resolution
        │
        ▼
Policy Evaluation
        │
        ▼
Conflict Resolution
        │
        ▼
Condition & Obligation Assembly
        │
        ▼
Authorization Decision
```

The Security Platform owns policy-evaluation semantics.

The Runtime owns operational scheduling, timeout, cancellation, and execution resources.

---

# 19. Policy Conflict Resolution

Multiple policies may apply to one request.

Conflict resolution must be deterministic and explicit.

Possible approaches include:

* Explicit deny precedence
* Most restrictive outcome
* Scope-specific precedence
* Policy priority
* Mandatory-policy precedence
* Compliance-policy precedence

AgentProdReady must not resolve conflicting security policies through undocumented behavior.

Applied conflict-resolution policy and versions must appear in decision diagnostics.

---

# 20. Authorization Enforcement

The Security Platform makes authorization decisions.

The component performing the protected operation enforces them.

Examples:

* Runtime prevents unauthorized execution.
* Tool Framework prevents unauthorized invocation.
* Knowledge Engine applies security trimming.
* Memory Engine restricts capture and recall.
* Plugin Framework prevents unauthorized activation.
* API Gateway rejects unauthorized API operations.
* Evaluation Framework prevents unauthorized evidence access.

Enforcement components must not independently reinterpret a decision.

When a decision cannot be safely enforced, the operation must fail securely.

---

# 21. Security Decision Boundary

The following distinction is constitutional:

```text
Security Platform
        │
        │ decides
        ▼
Authorization Decision
        │
        ▼
Runtime / Domain Framework
        │
        │ enforces
        ▼
Protected Operation
```

Domain frameworks may further restrict operations where required by their own valid invariants.

They must never expand permissions beyond the authoritative Authorization Decision.

---

# 22. Tool Authorization

Every tool invocation must be authorized against:

* Invoking principal
* Tool identity
* Requested operation
* Target external resource
* Tenant and workspace scope
* Tool-declared permissions
* Side-effect classification
* Execution restrictions
* Delegation limits

A tool possessing credentials for an external system does not imply that the invocation is authorized.

Tool credentials enable authentication to the external system.

The Security Platform determines whether AgentProdReady may use those credentials for the requested operation.

---

# 23. Plugin Security

Plugins must declare required permissions through their manifests.

Examples include:

* Network access
* File-system access
* Secret access
* Tool registration
* Provider registration
* Event subscription
* Configuration access
* Administrative APIs
* External service access

Permission declarations are evaluated before plugin activation.

Plugin activation does not grant unrestricted Runtime execution permissions.

Every execution initiated through a plugin remains subject to normal authorization.

---

# 24. Capability Security

A successfully resolved Capability Binding does not imply permission to execute it.

The required sequence is:

```text
Capability Requirement
        │
        ▼
Security Authorization
        │
        ▼
Capability Resolution
        │
        ▼
Capability Binding
        │
        ▼
Runtime-Coordinated Execution
```

Depending on policy, authorization may also be re-evaluated after resolution when the selected implementation introduces additional permissions, locality, data-handling, cost, or compliance constraints.

Capability Resolution determines suitability.

Security determines permission.

---

# 25. Data Security & Classification

Platform artifacts may carry security classifications and labels.

Examples include:

* Public
* Internal
* Confidential
* Restricted
* Regulated
* Tenant-private
* User-private
* Agent-private

Security labels must be preserved through normalized contracts where relevant.

This includes:

* Knowledge records
* Memory records
* Context Packages
* Prompt Packages
* Tool inputs and outputs
* AI Results
* Evaluation evidence
* Audit events

Downstream components may further restrict exposure.

They must never downgrade classification without explicit authorized policy.

---

# 26. Security Events

The Security Platform publishes immutable lifecycle events through the Event Bus.

Examples include:

* Authentication Evidence Received
* Principal Normalized
* Authorization Requested
* Authorization Permitted
* Authorization Denied
* Conditional Authorization Issued
* Delegation Granted
* Delegation Revoked
* Policy Updated
* Policy Evaluation Failed
* Suspicious Access Detected
* Plugin Permission Denied
* Tool Invocation Denied
* Security Context Created
* Security Context Expired

Security events must be versioned, correlated, tenant-aware, and protected from unauthorized access.

---

# 27. Security Observability

The Security Platform contributes security-specific telemetry.

Metrics may include:

* Authorization request count
* Permit rate
* Deny rate
* Conditional-permit rate
* Indeterminate rate
* Policy-evaluation latency
* Policy conflicts
* Delegation usage
* Tool authorization failures
* Plugin permission failures
* Cross-scope access attempts
* Expired-context usage
* Authentication-strength distribution

Security telemetry must avoid exposing secrets, raw credentials, sensitive claims, or unauthorized resource content.

---

# 28. Security Diagnostics

Security diagnostics may include:

* Decision identifier
* Applicable policy references
* Policy versions
* Conflict-resolution policy
* Decision outcome
* Conditions and obligations
* Scope evaluation
* Principal type
* Resource type
* Failure category
* Evaluation duration

Diagnostics must be carefully access-controlled.

Detailed denial reasons must not reveal resource existence, protected policy internals, secret values, or sensitive identity information to unauthorized callers.

---

# 29. Failure Normalization

Identity-provider-specific, policy-engine-specific, and security-implementation-specific failures must never cross the Security Platform boundary.

The platform reports normalized Security Errors.

Examples include:

* Authentication Evidence Invalid
* Principal Resolution Failed
* Authorization Request Invalid
* Policy Unavailable
* Policy Evaluation Failed
* Policy Conflict
* Unsupported Principal
* Unsupported Resource
* Delegation Invalid
* Security Context Expired
* Authentication Strength Insufficient
* Authorization Indeterminate
* Authorization Denied

Operational retry and recovery behavior remains Runtime-owned.

A security failure must never fail open.

---

# 30. Security Ownership Boundaries

## The Security Platform may:

* Normalize identities
* Evaluate authorization requests
* Resolve applicable security policies
* Interpret roles, claims, and attributes
* Evaluate delegation
* Produce Authorization Decisions
* Produce Security Contexts
* Publish security events
* Produce security diagnostics
* Provide security-domain observability

## The Security Platform must not:

* Schedule business execution
* Invoke tools
* Select providers
* Interpret workflows
* Retrieve Knowledge
* Retrieve Memory
* Build prompts
* Execute AI providers
* Modify evaluated business artifacts
* Own external authentication user interfaces
* Persist raw credentials in general platform contracts
* Treat technical capability as authorization

---

# Chief Architect’s Notes

The Security & Authorization Platform establishes a single authoritative decision point for access control across AgentProdReady.

The constitutional distinction is:

> **Security decides. Domain frameworks enforce. Runtime coordinates.**

This prevents every subsystem from developing its own incompatible security rules.

A Knowledge Connector may possess source credentials, but Security determines whether the current execution may retrieve the source.

A Tool Adapter may be technically capable of charging a payment, but Security determines whether the current principal may initiate that operation.

An agent may execute on behalf of a user, but its effective authority remains constrained by delegation policy, agent permissions, tenant policy, and resource policy.

Security must therefore remain explicit at every protected boundary rather than being inferred from technical access.

---


## Part II — Delegation, Isolation, Revocation & Security Governance

---

# 31. Delegation Architecture

## 31.1 Purpose

Delegation allows one authorized principal to permit another principal—such as an agent, service, workflow, or plugin—to act within a restricted scope.

Delegation must always be explicit, bounded, traceable, revocable, and policy-controlled.

Delegation never transfers unrestricted authority.

---

## 31.2 Delegation Principles

Every delegation must identify:

* Delegating principal
* Receiving principal
* Permitted actions
* Permitted resources
* Tenant, workspace, and project scope
* Delegation duration
* Delegation conditions
* Delegation restrictions
* Revocation status
* Policy references

A delegated principal may exercise only the authority explicitly granted by the delegation.

---

## 31.3 Effective Authority

The effective authority of a delegated principal is the intersection of:

```text
Delegating Principal Authority
            ∩
Delegation Grant
            ∩
Receiving Principal Permissions
            ∩
Tenant / Workspace / Project Policy
            ∩
Resource Policy
            ∩
Execution Restrictions
```

Delegation must never increase authority beyond any applicable boundary.

---

## 31.4 Delegation Chain

Nested delegation may be permitted only where explicitly allowed by policy.

Every delegation chain must remain:

* Traceable
* Bounded
* Depth-limited
* Revocable
* Auditable

If a delegation chain becomes invalid at any point, downstream delegated authority must also become invalid.

---

# 32. Impersonation Boundary

## 32.1 Purpose

Impersonation represents one principal acting explicitly as another principal.

Impersonation is different from delegation.

Delegation means:

> Act on behalf of another principal within a restricted scope.

Impersonation means:

> Assume the effective identity of another principal for an explicitly governed operation.

---

## 32.2 Impersonation Rules

Impersonation must:

* Require explicit authorization
* Be clearly identified in the Security Context
* Preserve the original principal identity
* Preserve the impersonated principal identity
* Record the reason for impersonation
* Be time-bounded
* Be fully audited
* Be revocable
* Never occur silently

---

## 32.3 Effective Identity

A Security Context involving impersonation must distinguish:

```text
Original Principal
        │
        ▼
Impersonation Authorization
        │
        ▼
Impersonated Principal
        │
        ▼
Effective Identity
```

Audit records must preserve both identities.

---

## 32.4 Administrative Use

Administrative impersonation should be narrowly restricted.

Typical uses may include:

* Support investigation
* Incident response
* Controlled testing
* Compliance review
* Authorized account recovery

Administrative convenience alone is not sufficient justification.

---

# 33. Agent Authority Model

## 33.1 Purpose

Agents must operate under explicit, bounded authority.

An agent is never trusted merely because it was created by an authorized user or loaded by an approved plugin.

---

## 33.2 Agent Authority Inputs

Agent authority may depend on:

* Agent identity
* Initiating principal
* Delegation grant
* Assigned capabilities
* Allowed tools
* Data-access scope
* Network restrictions
* Cost limits
* Runtime restrictions
* Tenant policy
* Workspace policy
* Project policy
* Human-approval requirements

---

## 33.3 Least Authority

Agents must operate according to the principle of least authority.

An agent should receive only the minimum permissions required for the current execution.

Persistent agent permissions must not automatically apply to every execution without re-evaluation.

---

## 33.4 Dynamic Authority

Execution-specific authority may be narrower than the agent’s general permitted authority.

For example:

```text
Agent General Permission
        │
        ▼
Execution-Specific Restriction
        │
        ▼
Effective Execution Authority
```

Execution-specific restrictions always take precedence where they are more restrictive.

---

## 33.5 Agent Self-Escalation

Agents must never:

* Grant themselves permissions
* Expand their own delegation
* Disable security policies
* Select unrestricted credentials
* Bypass human approval
* Reinterpret denial as permission
* Create unrestricted child agents
* Delegate authority they do not possess

Any request for elevated authority must pass through an explicit authorization workflow.

---

# 34. Multi-Agent Security Boundary

When agents collaborate, authority must remain isolated and explicit.

One agent must not automatically inherit:

* Another agent’s permissions
* Another agent’s memory access
* Another agent’s tool credentials
* Another agent’s Knowledge scope
* Another agent’s delegation grants
* Another agent’s Security Context

Shared work must occur through normalized contracts and explicit policy.

---

## 34.1 Shared Resources

Shared resources may be accessed only when:

* All required principals are authorized
* The resource policy permits sharing
* Tenant and workspace boundaries are preserved
* Security classifications are compatible
* The collaboration policy allows the operation

---

## 34.2 Authority Intersection

Where multiple agents jointly perform an operation, policy must explicitly define whether effective authority is based on:

* Initiating-agent authority
* Executing-agent authority
* Intersection of authorities
* Delegated shared authority
* Workflow-owned authority
* Human-approved authority

The default should be the most restrictive applicable authority.

---

# 35. Tenant Isolation

## 35.1 Purpose

Tenant isolation prevents identities, resources, policies, data, credentials, and execution artifacts from crossing tenant boundaries without explicit authorization.

Tenant isolation is mandatory.

---

## 35.2 Tenant-Bound Resources

The following should normally carry tenant ownership or tenant scope:

* Principals
* Workspaces
* Projects
* Agents
* Workflows
* Knowledge
* Memory
* Tools
* Plugins
* Providers
* Configuration
* Secrets
* Evaluation Results
* Audit records
* Execution artifacts

---

## 35.3 Cross-Tenant Access

Cross-tenant access must be denied by default.

It may occur only through explicit, narrowly scoped policy.

Cross-tenant authorization must identify:

* Source tenant
* Target tenant
* Principal
* Resource
* Action
* Purpose
* Duration
* Conditions
* Audit requirements

---

## 35.4 Tenant Context Authority

Tenant scope must originate from trusted platform context.

A caller-supplied tenant identifier must never be accepted as proof of tenant membership or access.

The Security Platform evaluates whether the principal may operate within the requested tenant scope.

---

# 36. Workspace & Project Isolation

Tenant authorization does not automatically grant access to every workspace or project.

Access must be evaluated at the appropriate resource scope.

Conceptually:

```text
Tenant Permission
        │
        ▼
Workspace Permission
        │
        ▼
Project Permission
        │
        ▼
Resource Permission
```

Permissions may become narrower at each level.

---

# 37. Secret Reference Boundary

## 37.1 Purpose

Security decisions may require access to external credentials, API keys, certificates, tokens, or other secrets.

Raw secret values must not become general platform data.

---

## 37.2 Secret References

Platform contracts should carry authorized Secret References rather than raw secret values.

Conceptually:

```text
Security Context
        │
        ▼
Authorized Secret Reference
        │
        ▼
Secret Management Platform
        │
        ▼
Short-Lived Secret Material
        │
        ▼
Authorized Adapter / Provider
```

---

## 37.3 Secret Access Rules

Secret access must be:

* Explicitly authorized
* Purpose-bound
* Scope-bound
* Time-limited
* Audited
* Minimally exposed
* Revocable

Secret material must not appear in:

* Logs
* Events
* Diagnostics
* Evaluation evidence
* Prompt Packages
* Context Packages
* Memory
* Knowledge
* General configuration
* Error messages

---

## 37.4 Secret Ownership

The Security Platform determines whether access to a secret is permitted.

The future Secret Management Platform owns secure storage, retrieval, rotation, and disposal of secret material.

Adapters and providers consume secrets only through authorized secure references or scoped access mechanisms.

---

# 38. Security Context Lifetime

## 38.1 Purpose

Security Contexts are execution-scoped and time-bounded.

A Security Context must not remain valid indefinitely.

---

## 38.2 Expiration

A Security Context may expire because of:

* Time limit
* Session expiration
* Credential expiration
* Delegation expiration
* Policy change
* Principal disablement
* Revocation
* Tenant restriction
* Authentication-strength change

Expired Security Contexts must never be silently reused.

---

## 38.3 Refresh & Reauthorization

Long-running executions may require reauthorization.

Reauthorization should occur when:

* The Security Context expires
* A sensitive operation is reached
* Policy requires step-up authentication
* Resource scope changes
* Delegation changes
* The selected capability introduces new restrictions
* Human approval is required

A refreshed decision produces a new immutable Authorization Decision and, where appropriate, a new Security Context version.

---

# 39. Revocation

## 39.1 Purpose

Revocation invalidates previously granted authority.

Revocation must propagate quickly enough to satisfy platform security requirements.

---

## 39.2 Revocable Artifacts

The platform may revoke:

* Sessions
* Delegation grants
* Security Contexts
* Agent authority
* Plugin permissions
* Tool permissions
* Secret access
* Administrative privileges
* Resource access
* Provider access
* API credentials

---

## 39.3 Revocation Effects

A revocation may require:

* Preventing new executions
* Cancelling active executions
* Blocking future protected operations
* Invalidating cached decisions
* Invalidating delegated authority
* Revoking secret access
* Re-evaluating long-running workflows
* Publishing security events

The Runtime executes operational responses according to revocation policy.

---

## 39.4 Revocation Boundary

The Security Platform defines revocation semantics and produces authoritative revocation state.

The Runtime owns operational cancellation, interruption, cleanup, and recovery.

---

# 40. Authorization Decision Caching

## 40.1 Purpose

Authorization Decision caching may improve latency and reduce policy-engine load.

Caching is optional and security-sensitive.

---

## 40.2 Cache Key Requirements

Cache identity must include relevant dimensions such as:

* Principal
* Effective identity
* Action
* Resource
* Tenant
* Workspace
* Project
* Delegation state
* Authentication strength
* Policy versions
* Resource version
* Security labels
* Environmental constraints

---

## 40.3 Cache Validity

A cached Authorization Decision is reusable only while all security-relevant inputs remain valid.

Changes that invalidate cached decisions may include:

* Policy updates
* Role changes
* Claim changes
* Delegation changes
* Resource ownership changes
* Security-label changes
* Revocation
* Session expiration
* Authentication-strength changes
* Tenant membership changes

---

## 40.4 Deny Caching

Permit and deny decisions may have different cache policies.

Caching must never turn an indeterminate or stale decision into permission.

---

# 41. Policy Versioning

Every Authorization Decision and Security Context must preserve sufficient policy-version information for:

* Auditing
* Reproduction
* Diagnostics
* Incident investigation
* Revocation
* Cache invalidation
* Compliance evidence

Version metadata may include:

* Security policy schema version
* Applied policy versions
* Conflict-resolution policy version
* Delegation-policy version
* Principal-model version
* Resource-model version
* Authorization-decision schema version
* Security-context schema version
* Platform version

---

# 42. Policy Updates

Policy updates must be validated before activation.

Validation should include:

* Syntax validation
* Contract validation
* Conflict detection
* Scope validation
* Regression tests
* Deny-by-default preservation
* Delegation checks
* Tenant-isolation checks
* Administrative-policy review

Invalid security-policy changes must fail safely.

---

# 43. Policy Rollout

Security policies may require controlled rollout.

Possible approaches include:

* Staged deployment
* Tenant-specific rollout
* Workspace-specific rollout
* Dry-run evaluation
* Shadow evaluation
* Mandatory approval
* Emergency activation
* Rollback

Dry-run or shadow evaluation must never silently grant authority.

Only active policy versions produce authoritative decisions.

---

# 44. Security Evaluation & Simulation

Security policy behavior may be evaluated before activation.

Simulation may test:

* Expected permit and deny outcomes
* Cross-tenant access
* Delegation chains
* Agent authority
* Tool permissions
* Plugin permissions
* Resource inheritance
* Conflict resolution
* Revocation behavior

Simulation results are descriptive and must not become live Authorization Decisions.

---

# 45. Step-Up Authentication

Sensitive operations may require stronger authentication than the current session provides.

Examples include:

* Secret access
* Payment operations
* Administrative actions
* Data export
* Cross-tenant operations
* Security-policy changes
* Plugin installation
* Provider configuration
* Destructive operations

The Authorization Decision may return a condition requiring stronger authentication.

The Security Platform defines the requirement.

The authentication integration satisfies it.

The Runtime resumes execution only after a new valid decision is produced.

---

# 46. Consent

Certain operations may require explicit user or organizational consent.

Consent may apply to:

* Personalization
* Memory retention
* Data sharing
* External provider usage
* Cross-border processing
* Sensitive tool execution
* Human review
* Training or evaluation usage

Consent records must be:

* Explicit
* Versioned
* Scoped
* Revocable
* Auditable
* Time-aware

Consent is not a substitute for authorization.

Both may be required.

---

# 47. Data Minimization

The Security Platform should support data-minimization obligations.

A permitted operation may still be restricted to:

* Minimum required fields
* Masked values
* Aggregated information
* Limited result counts
* Redacted evidence
* Restricted retention
* No export
* No persistence

Conditions must propagate through the Authorization Decision and Security Context.

---

# 48. Audit Integration

## 48.1 Purpose

Security-relevant operations must produce audit-ready records.

The Security Platform supplies normalized security information to the Audit & Compliance Platform.

---

## 48.2 Auditable Events

Examples include:

* Authentication outcome
* Authorization decision
* Delegation grant
* Delegation revocation
* Impersonation
* Agent authority use
* Tool authorization
* Secret access
* Plugin permission change
* Policy modification
* Cross-tenant access
* Administrative action
* Security-context creation
* Revocation
* Step-up authentication

---

## 48.3 Audit Boundary

The Security Platform produces authoritative security facts.

The Audit & Compliance Platform owns durable audit-record management, retention, querying, export, and compliance reporting.

---

# 49. Security Testing Requirements

Automated tests must cover:

* Authentication evidence normalization
* Principal normalization
* Permit decisions
* Deny decisions
* Conditional permits
* Indeterminate handling
* Deny-by-default behavior
* Policy conflict resolution
* Tenant isolation
* Workspace isolation
* Project isolation
* Delegation
* Delegation expiration
* Delegation revocation
* Nested delegation restrictions
* Impersonation
* Agent authority
* Agent self-escalation prevention
* Tool authorization
* Plugin permissions
* Capability authorization
* Security-context expiration
* Reauthorization
* Decision-cache invalidation
* Policy versioning
* Revocation propagation
* Secret-reference isolation
* Step-up authentication
* Consent enforcement
* Data-minimization conditions
* Security event publication
* Failure normalization
* Diagnostics protection

Contract tests must verify that identity-provider-specific claims, raw credentials, secret values, and policy-engine-specific objects do not escape the Security Platform boundary.

---

# 50. Cursor Implementation Guide

## 50.1 Objective

Cursor should implement a centralized, provider-independent Security & Authorization Platform that produces immutable Authorization Decisions and Security Contexts.

The implementation must establish contracts, policy evaluation boundaries, delegation, revocation, tenant isolation, and enforcement integration without coupling the platform to a specific identity provider or policy engine.

---

## 50.2 Required Deliverables

Implement:

* Principal model
* Principal normalization
* Authentication Evidence contract
* Authorization Request
* Resource Reference
* Action model
* Authorization Decision
* Conditional authorization
* Security Context
* Security Policy abstraction
* Policy Resolver
* Policy Evaluator
* Policy Conflict Resolver
* Delegation model
* Impersonation model
* Agent authority model
* Tenant-scope evaluation
* Workspace-scope evaluation
* Project-scope evaluation
* Revocation model
* Authorization Decision cache abstraction
* Policy-version model
* Security events
* Normalized Security Errors
* Security diagnostics
* Security observability
* Security health checks
* Audit integration contracts

---

## 50.3 Reference Implementations

Cursor may create lightweight, replaceable reference implementations for:

* In-memory Principal Provider
* Basic Role-Based Policy Evaluator
* Attribute-Based Policy Evaluator
* Explicit-Deny Conflict Resolver
* In-memory Delegation Store
* In-memory Revocation Store
* In-memory Authorization Decision Cache
* Static Authentication Evidence Normalizer
* Deterministic Security Policy Simulator

These must remain reference implementations only.

---

## 50.4 Deferred Responsibilities

Do not implement within Blueprint 15:

* Production identity-provider SDKs
* User login interfaces
* Production OAuth flows
* Production secret storage
* Production certificate infrastructure
* Hardware security modules
* Full compliance-reporting platform
* Production SIEM integration
* Production administrative UI
* Runtime scheduling
* Tool implementation
* Knowledge retrieval
* Memory persistence
* AI provider integrations
* Tenant-management UI
* Provider-specific policy engines

These belong to later blueprints, plugins, or implementation guides.

---

# 51. Acceptance Criteria

Blueprint 15 is considered complete when:

* Every protected operation can be represented as an immutable Authorization Request.
* Identity-provider-specific claims are normalized into a provider-independent Principal.
* Authentication and authorization remain distinct.
* Authorization follows deny-by-default behavior.
* Permit, deny, conditional permit, not applicable, and indeterminate outcomes are explicitly represented.
* `Indeterminate` never becomes implicit permission.
* Every successful authorization produces an immutable Authorization Decision.
* Accepted executions receive an immutable Security Context.
* Exactly one ExecutionContextFactory incorporates the Security Context into the Runtime ExecutionContext.
* Domain frameworks enforce security outcomes without redefining them.
* Delegation remains scoped, bounded, traceable, and revocable.
* Impersonation remains explicit and fully audited.
* Agents operate as constrained security principals.
* Agent authority cannot exceed valid delegated and policy-defined authority.
* Tenant, workspace, and project isolation are enforced.
* Capability Resolution does not imply execution permission.
* Tool credentials are not treated as authorization.
* Plugin permissions are evaluated before activation.
* Security labels and classifications propagate through normalized contracts.
* Security Context expiration and reauthorization are supported.
* Revocation invalidates applicable authority and cached decisions.
* Authorization Decision caching preserves all security-relevant dimensions.
* Security policies and decisions are versioned.
* Secret values do not appear in general platform contracts.
* Security failures fail closed.
* Security events, metrics, diagnostics, health information, and audit integration are available.
* Provider-specific identity and policy-engine models never cross the Security Platform boundary.

---

# 52. Ownership Boundaries

## This Blueprint Owns

* Principal normalization
* Authentication Evidence contracts
* Authorization Requests
* Resource References
* Action definitions
* Authorization Decisions
* Security Contexts
* Policy-resolution semantics
* Policy-evaluation semantics
* Policy conflict resolution
* Delegation semantics
* Impersonation semantics
* Agent authority
* Tenant-scope security
* Workspace-scope security
* Project-scope security
* Revocation semantics
* Authorization Decision caching semantics
* Security policy versioning
* Conditional authorization
* Step-up requirements
* Consent-policy integration
* Data-minimization conditions
* Security events
* Security Errors
* Security diagnostics
* Security-domain observability

---

## This Blueprint Does Not Own

* Runtime scheduling
* Workflow interpretation
* Business-rule validation
* Capability Resolution implementation
* Provider selection
* Tool execution
* Knowledge retrieval
* Memory retrieval
* Context Assembly
* Prompt construction
* AI provider execution
* External authentication interfaces
* Production secret persistence
* Compliance-report storage
* Tenant lifecycle management
* Application-specific authorization rules

---

# 53. Chief Architect’s Notes

The Security & Authorization Platform creates a single authoritative access-control model for AgentProdReady.

Every protected operation follows the same constitutional sequence:

```text
Authenticated Identity
        │
        ▼
Normalized Principal
        │
        ▼
Authorization Request
        │
        ▼
Security Policy Evaluation
        │
        ▼
Authorization Decision
        │
        ▼
Security Context
        │
        ▼
Runtime-Coordinated Enforcement
```

A key principle is that authorization remains distinct from technical capability.

A provider may support an operation.

A tool may possess valid credentials.

A plugin may register a capability.

An agent may know how to perform a task.

None of those facts establish permission.

Only an authoritative Authorization Decision permits protected execution.

Another critical principle is that agents are first-class security principals. They do not automatically inherit unrestricted user authority. Agent permissions are explicitly constrained by delegation, agent policy, tenant policy, resource policy, and execution-specific restrictions.

The resulting model is:

> **Security decides. Runtime coordinates. Domain frameworks enforce. Audit records.**

This boundary must remain stable across all future AgentProdReady blueprints and implementations.

---

# 54. Architectural Amendments & Final Clarifications

The following amendments are incorporated into Engineering Blueprint 15 to resolve final ownership, authority, lifecycle, and enforcement ambiguities identified during architectural review.

These amendments are normative and form part of the canonical security architecture.

---

## 54.1 Authorization Decision vs Security Context

The **Authorization Decision** is the sole authoritative output of policy evaluation.

The **Security Context** is a derived, execution-scoped security artifact constructed from an accepted Authorization Decision and validated execution state.

The Security Context is **not an independent policy decision** and must never override, weaken, or reinterpret the Authorization Decision.

The constitutional relationship is:

```text
Authorization Request
        │
        ▼
Policy Evaluation
        │
        ▼
Authorization Decision
        │
        │ authoritative
        ▼
Security Context
        │
        │ derived
        ▼
ExecutionContext
```

The Authorization Decision represents the authoritative result of policy evaluation.

The Security Context represents the security state applicable to an accepted execution.

---

## 54.2 Security Context Ownership

The Security Platform owns the semantic definition and creation of the Security Context.

The `ExecutionContextFactory` does not independently determine, construct, reinterpret, or modify security authority.

Its responsibility is to incorporate the authoritative Security Context supplied by the Security Platform into the Runtime `ExecutionContext`.

Therefore:

```text
Security Platform
        │
        ├── Authorization Decision
        │
        ▼
Security Context
        │
        ▼
ExecutionContextFactory
        │
        ▼
Runtime ExecutionContext
```

The `ExecutionContextFactory` may combine the Security Context with other validated execution information required by Runtime operation, but it must not expand or alter security authority.

---

## 54.3 Authentication Evidence Boundary

Authentication providers establish authentication according to their respective protocols, trust relationships, and integration contracts.

Blueprint 15 does not own:

* External credential verification
* User login flows
* OAuth exchanges
* OpenID Connect implementation
* Identity-provider sessions
* Certificate infrastructure
* Authentication user interfaces
* Production identity-provider SDKs

The Security Platform consumes trusted **Authentication Evidence** and determines whether that evidence is sufficient for the requested authorization operation.

The constitutional distinction is:

```text
Authentication Provider
        │
        ▼
Authentication Evidence
        │
        ▼
Security Platform
        │
        ▼
Authorization Decision
```

Authentication establishes identity evidence.

Security determines whether the authenticated identity is authorized to perform the requested operation.

Authentication success must never be interpreted as authorization success.

---

## 54.4 Capability Resolution Authorization Boundary

Capability Resolution determines implementation suitability.

Security determines permission.

Where the resolved capability implementation may introduce additional security-relevant properties, authorization may occur both before and after capability resolution.

The preferred execution sequence is:

```text
Capability Requirement
        │
        ▼
Initial Security Authorization
        │
        ▼
Capability Resolution
        │
        ▼
Resolved Capability Binding
        │
        ▼
Final Security Authorization
        │
        ▼
Runtime-Coordinated Execution
```

Initial authorization establishes whether the requested capability class or operation may be pursued.

Final authorization establishes whether the resolved implementation, provider, resource, locality, data handling, cost, side effects, compliance characteristics, or other execution-specific properties are permitted.

Capability Resolution must never grant execution authority.

A successfully resolved Capability Binding remains subject to the applicable Authorization Decision and any required final authorization.

---

## 54.5 Revocation Semantics

The Security Platform defines the authoritative security meaning of revocation.

Revocation determines whether previously granted authority remains valid.

The Security Platform defines:

* Revocation state
* Revocation scope
* Security-effective time
* Applicable affected authority
* Required security propagation semantics

Runtime and domain frameworks are responsible for detecting and enforcing revocation according to the platform's required propagation guarantees.

No component may knowingly continue protected execution after becoming aware that the applicable authority has been revoked.

Operational responses such as:

* Execution cancellation
* Interruption
* Cleanup
* Resource release
* Workflow recovery
* Retry handling

remain Runtime-owned.

The constitutional boundary is:

```text
Security Platform
        │
        ├── Defines revocation authority
        ├── Defines revocation state
        └── Defines security-effective validity
                    │
                    ▼
              Runtime
                    │
                    ├── Cancel
                    ├── Interrupt
                    ├── Cleanup
                    └── Recover
```

---

## 54.6 Immutable Authorization Decisions vs Current Authority Validity

An Authorization Decision is an immutable historical record of the policy evaluation performed at a specific point in time.

Revocation must never mutate the original Authorization Decision.

Instead, revocation changes the **current validity of the authority represented by that decision**.

Therefore:

```text
Authorization Decision
        │
        │ immutable historical fact
        ▼
Authority Validity
        │
        ├── Active
        ├── Expired
        ├── Revoked
        └── Superseded
```

An original decision may therefore remain:

```text
Outcome = Permit
```

while its associated authority is no longer currently valid because of:

* Revocation
* Expiration
* Delegation termination
* Principal disablement
* Policy-driven invalidation
* Security-context expiration
* Other authoritative security lifecycle events

Audit systems must preserve the original decision rather than rewriting historical security facts.

Current authority validity must always be evaluated independently of historical decision immutability.

---

## 54.7 Domain Enforcement Boundary

Domain frameworks may impose additional safety, integrity, compliance, or domain-specific invariants after Security authorization.

Such restrictions may cause an operation to be rejected even when the Security Platform has permitted it.

However, domain frameworks must not:

* Create alternative authorization models
* Grant additional authority
* Expand permissions
* Reinterpret a Deny as Permit
* Convert an Indeterminate result into Permit
* Modify the meaning of an Authorization Decision
* Bypass required Security evaluation

The distinction is:

```text
Security Platform
        │
        │ "This operation is authorized."
        ▼
Domain Framework
        │
        │ "Additional domain invariants are satisfied."
        ▼
Execution
```

or:

```text
Security Platform
        │
        │ "This operation is authorized."
        ▼
Domain Framework
        │
        │ "A domain invariant is violated."
        ▼
Operation Rejected
```

A domain rejection does not constitute a Security Deny.

Likewise, a Security Permit does not require a domain framework to execute an operation when a valid non-security domain invariant prevents it.

---

## 54.8 Final Security Authority Rule

For all protected operations, the following constitutional rule applies:

> **Security determines authority. Runtime coordinates execution. Domain frameworks enforce authorized operations and may apply additional non-authorizing invariants.**

No component may expand the authority granted by the Security Platform.

No component may treat technical capability, credential possession, implementation availability, workflow presence, or successful capability resolution as evidence of authorization.

Only an authoritative and currently valid Authorization Decision permits protected execution.

---

## 54.9 Final Security Lifecycle

The complete security lifecycle is therefore:

```text
Authentication Evidence
        │
        ▼
Normalized Principal
        │
        ▼
Authorization Request
        │
        ▼
Policy Evaluation
        │
        ▼
Authorization Decision
        │
        ├───────────────► Audit / Security Events
        │
        ▼
Authority Validity
        │
        ├── Active
        ├── Expired
        ├── Revoked
        └── Superseded
        │
        ▼
Security Context
        │
        ▼
ExecutionContextFactory
        │
        ▼
Runtime
        │
        ▼
Domain Enforcement
        │
        ▼
Protected Operation
```

For capability-driven execution:

```text
Authorization
        │
        ▼
Capability Resolution
        │
        ▼
Resolved Implementation
        │
        ▼
Final Authorization where required
        │
        ▼
Runtime Execution
```

This lifecycle is the canonical security flow for AgentProdReady.

---

## 54.10 Final Architectural Rule

The following statement is constitutional and must remain stable across all future AgentProdReady blueprints:

> **Security decides. Runtime coordinates. Domain frameworks enforce. Audit records.**

Security authority must remain centralized, explicit, traceable, revocable, and fail-closed.

No future blueprint may introduce a competing authorization authority without an explicit amendment to the Engineering Constitution and this Security & Authorization Platform.
