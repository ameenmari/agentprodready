# AgentForge Implementation Guidelines

**Version:** 2.0

## 1. Purpose

This document defines how engineering agents, including Cursor, must read and implement the AgentForge Engineering Blueprints.

The blueprints are architectural contracts.

They define:

* Ownership boundaries
* Public contracts
* Dependency direction
* Lifecycle semantics
* Security responsibilities
* Execution responsibilities
* Provider boundaries
* Testing requirements
* Acceptance criteria

Implementation must conform to these contracts.

The implementation must not silently redesign the architecture.

---

# 2. Sources of Architectural Authority

The following documents govern implementation, in order of authority:

1. [Blueprint 01 — Foundation](blueprints/01-foundation.md)
2. Accepted [Architecture Decision Records](adrs/README.md)
3. The blueprint currently being implemented
4. Direct dependency blueprints
5. [Blueprint 31 — Platform Governance](blueprints/31-platform-governance-and-evolution.md)
6. These implementation guidelines and an approved Blueprint Implementation Specification
7. An approved implementation plan
8. Existing code that already conforms to the blueprints

Existing code is not authoritative when it contradicts an approved blueprint or ADR.

A contradiction must be reported before implementation continues.

---

# 3. Required Reading Before Every Implementation

Before implementing any blueprint, read:

* [Implementation Guidelines](implementation-guidelines.md)
* [Implementation Modes](implementation/implementation-modes.md)
* [Dependency Graph](architecture/dependency-graph.md)
* [Blueprint 01 — Foundation](blueprints/01-foundation.md)
* [Blueprint 31 — Platform Governance](blueprints/31-platform-governance-and-evolution.md)
* The complete current blueprint
* Every blueprint listed under its dependencies
* All accepted ADRs related to the current blueprint
* Existing implementation plans and reports for completed dependencies

Do not implement from an isolated section or copied excerpt.

Do not rely only on summaries.

---

# 4. Blueprint Implementation Sequence

Implement the blueprints in dependency order.

The default sequence is:

```text
01 → 02 → 03 → 04 → 05 → 06 → 07
   → 08 → 09 → 10 → 11 → 12 → 13 → 14
   → 15 → 16 → 17
   → 18 → 19 → 20
   → 21 → 22 → 23
   → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31
```

Some scaffolding may be created ahead of this order, but behavior must not be implemented before its required contracts and dependencies exist.

---

# 5. Implementation Workflow

Every blueprint must be implemented through the following stages.

## Stage 1 — Read

Read the current blueprint and all required architectural dependencies.

Identify:

* Public contracts
* Owned responsibilities
* Prohibited responsibilities
* Required integrations
* Lifecycle rules
* Provider boundaries
* Security boundaries
* Runtime boundaries
* Events
* Diagnostics
* Testing requirements
* Acceptance criteria

---

## Stage 2 — Inspect

Inspect the existing repository before proposing changes.

Identify:

* Existing modules
* Existing contracts
* Reusable abstractions
* Naming conventions
* Dependency direction
* Current test patterns
* Existing architectural violations
* Incomplete dependency implementations

Do not create duplicate abstractions when a compliant implementation already exists.

---

## Stage 3 — Produce an Implementation Plan

Before modifying code, create:

```text
docs/implementation/plans/<blueprint-number>-<blueprint-slug>-implementation-plan.md
```

The plan must contain:

* Blueprint name and version
* Documents reviewed
* Scope
* Explicit non-goals
* Public contracts to implement
* Internal components
* Files and modules to create or modify
* Dependency integrations
* Security integration
* Event integration
* Audit integration
* Observability integration
* Persistence needs
* Testing strategy
* Migration considerations
* Risks
* Open architectural questions
* Acceptance-criteria mapping

No major implementation should begin without this plan.

---

## Stage 4 — Scaffold Contracts First

Implement public contracts before concrete providers.

The preferred order is:

```text
Contracts
    ↓
Domain abstractions
    ↓
Application services
    ↓
Provider interfaces
    ↓
Reference providers
    ↓
Infrastructure integrations
    ↓
Tests
```

Public contracts must remain independent of:

* Database models
* Vendor SDKs
* Transport-specific objects
* Framework-specific request objects
* Provider-specific exceptions
* Raw credentials

---

## Stage 5 — Implement the Minimum Complete Slice

Implement the smallest complete and testable slice that satisfies the blueprint.

A complete slice normally includes:

* Contracts
* Core domain semantics
* Application coordinator or service
* Provider interface
* Replaceable reference provider
* Dependency Injection registration
* Configuration
* Normalized errors
* Events
* Diagnostics
* Observability
* Unit tests
* Contract tests
* Integration tests where required

Do not create empty classes merely to claim completion.

Do not implement speculative features that are outside the blueprint.

---

## Stage 6 — Verify Architectural Boundaries

Before declaring implementation complete, verify that the module does not own prohibited responsibilities.

Examples:

* A provider must not select itself.
* A domain framework must not create an `ExecutionContext`.
* A subsystem must not make authorization decisions unless Blueprint 15 assigns it that responsibility.
* The Event Bus must not execute business operations.
* The Scheduler must not become the Runtime.
* The Workflow Engine must not implement execution scheduling.
* The Agent Framework must not execute Agent objectives.
* The Prompt Builder must not call provider SDKs.
* The Persistence Framework must not contain business logic.

Any prohibited ownership is an architectural defect.

---

## Stage 7 — Test Against Acceptance Criteria

Every acceptance criterion must map to:

* An automated test
* A verifiable implementation artifact
* Or an explicitly documented deferred item

Create a traceability table in the implementation report:

| Acceptance Criterion | Implementation    | Test           | Status          |
| -------------------- | ----------------- | -------------- | --------------- |
| Criterion text       | File or component | Test reference | Passed/Deferred |

A blueprint must not be marked implemented while required acceptance criteria remain unverified.

---

## Stage 8 — Produce an Implementation Report

After implementation, create:

```text
docs/implementation/reports/<blueprint-number>-<blueprint-slug>-implementation-report.md
```

The report must contain:

* Blueprint implemented
* Blueprint version
* ADRs applied
* Files created
* Files modified
* Contracts implemented
* Reference providers implemented
* Dependency registrations
* Events implemented
* Errors implemented
* Tests added
* Test results
* Acceptance-criteria traceability
* Deferred items
* Known limitations
* Architectural deviations
* Follow-up work

---

# 6. Architectural Rules

## 6.1 Runtime Ownership

Runtime exclusively owns operational execution concerns, including:

* Scheduling
* Concurrency
* Timeout
* Retry
* Cancellation
* Recovery
* Resource allocation
* Execution scopes

Other frameworks define domain semantics and submit eligible work to Runtime.

---

## 6.2 ExecutionContext Ownership

Exactly one `ExecutionContextFactory` creates each `ExecutionContext`.

No Runtime component, Agent, Workflow, Plugin, Tool, Provider, Knowledge implementation, Memory implementation, or Evaluation implementation may construct an independent `ExecutionContext`.

Execution-specific data must be passed through the established context or scoped contracts.

---

## 6.3 Security Ownership

The Security Platform makes authorization decisions.

Other components enforce supplied decisions and restrictions.

They must not:

* Infer authorization from credentials
* Expand permissions
* Reinterpret denial
* Treat technical access as permission
* Grant themselves additional authority

---

## 6.4 Capability Resolution

Capability selection must use the centralized Capability Resolution Framework.

Frameworks must not directly select concrete implementations by vendor, class, or package.

The required sequence is:

```text
Capability Requirement
        ↓
Capability Resolver
        ↓
Capability Binding
        ↓
Composition Framework
        ↓
Selected Instance
```

---

## 6.5 Provider Instantiation

The Composition Framework owns provider instantiation and lifecycle.

Registration must not instantiate expensive providers.

Providers should be instantiated lazily when selected for execution.

---

## 6.6 Dependency Injection Lifetimes

The supported lifetimes are:

* Singleton
* Scoped
* Transient

Singleton services must not inject, retain, cache, or store execution-scoped state.

Execution-specific data must be passed explicitly or resolved through the correct scope.

---

## 6.7 Provider Independence

Public platform contracts must not expose:

* Vendor request objects
* Vendor response objects
* SDK exceptions
* Database entities
* Transport-specific messages
* Framework-specific contexts
* Infrastructure-specific health models

All such data must be normalized at the owning framework boundary.

---

## 6.8 Immutability

Normalized platform artifacts should be immutable unless a blueprint explicitly defines mutable state.

Historical facts must not be modified.

Lifecycle or governance changes should normally produce:

* New versions
* New lifecycle records
* New governance records
* New events

---

## 6.9 Events

Platform Events represent facts, not commands.

An event must describe something that occurred.

It must not instruct another component to execute work.

Business execution remains Runtime-owned.

---

## 6.10 Error Normalization

Technology-specific failures must be converted into normalized platform errors at the owning framework boundary.

Provider exceptions must not escape into higher platform layers.

Runtime decides retry, cancellation, recovery, or execution failure.

---

## 6.11 Observability

Every implementation must include appropriate:

* Logs
* Metrics
* Traces
* Diagnostics
* Health reporting

Sensitive data, raw credentials, and unauthorized content must never appear in general telemetry.

---

## 6.12 Audit

Audit-relevant facts must be published through normalized platform mechanisms.

Domain modules produce authoritative facts.

The Audit Platform preserves durable accountability.

Domain modules must not implement independent audit repositories.

---

# 7. File and Module Naming

Use lowercase kebab-case for documentation filenames.

Examples:

```text
01-foundation.md
07-capability-resolution.md
15-security-and-authorization.md
```

Use the codebase’s language conventions for source files and symbols.

Names must reflect architectural responsibility.

Prefer:

```text
CapabilityResolver
ExecutionContextFactory
ToolExecutionRequest
NormalizedToolResult
AgentDefinition
```

Avoid vague names such as:

```text
Manager
Helper
Processor
Engine
Service
Util
```

unless the architectural responsibility is obvious from the full name.

---

# 8. Dependency Direction

Dependencies must point toward stable contracts and abstractions.

A domain module must not depend directly on:

* Concrete infrastructure providers
* Vendor SDKs
* API controllers
* CLI commands
* Deployment code
* Test fixtures

Infrastructure may depend on domain contracts.

Domain contracts must not depend on infrastructure.

---

# 9. Reference Implementations

Reference providers exist to verify contracts and support local development.

They must:

* Be replaceable
* Be deterministic where possible
* Clearly document limitations
* Avoid production claims
* Avoid becoming hidden platform defaults
* Pass the same contract tests required of future providers

---

# 10. Architecture Changes During Implementation

Do not silently change architecture to make implementation easier.

When a blueprint appears incomplete, contradictory, or impractical:

1. Stop the affected architectural change.
2. Document the issue.
3. Identify the conflicting blueprint sections.
4. Propose alternatives.
5. Recommend an ADR if the decision is architectural.
6. Continue with unaffected implementation where possible.

Do not invent a new responsibility owner without an accepted ADR.

---

# 11. ADR Requirements

Create an ADR when a decision:

* Changes architectural ownership
* Changes a public contract
* Introduces a new platform abstraction
* Changes dependency direction
* Introduces a new execution model
* Changes security semantics
* Changes persistence or consistency guarantees
* Breaks compatibility
* Supersedes a blueprint rule

Small implementation decisions do not require an ADR unless they affect public architecture.

---

# 12. Completion Definition

A blueprint implementation is complete only when:

* Public contracts exist.
* Core semantics exist.
* Provider interfaces exist where required.
* At least one replaceable reference implementation exists.
* Dependency Injection registration exists.
* Configuration contracts exist.
* Errors are normalized.
* Events are published where required.
* Observability is integrated.
* Security boundaries are enforced.
* Tests pass.
* Acceptance criteria are mapped and verified.
* Documentation is updated.
* The implementation report is complete.
* No unresolved architectural contradiction remains.

---

# 13. Cursor Task Template

Use the following prompt structure for every blueprint implementation:

```text
Implementation Mode: Autonomous

Implement Engineering Blueprint <number> — <name>.

Before changing code:

1. Read:
   - docs/implementation-guidelines.md
   - docs/blueprints/01-foundation.md
   - docs/blueprints/31-platform-governance-and-evolution.md
   - docs/blueprints/<current-blueprint>.md
   - every direct dependency blueprint listed in the current blueprint
   - all related accepted ADRs
   - existing implementation reports for completed dependencies

2. Inspect the existing repository and identify:
   - reusable contracts
   - existing modules
   - dependency direction
   - architectural conflicts
   - missing prerequisite implementations

3. Create:
   docs/implementation/plans/<number>-<slug>-implementation-plan.md

The plan must map every acceptance criterion to planned code and tests.

Implementation rules:

- Implement contracts before concrete providers.
- Preserve all ownership boundaries.
- Do not create a second Runtime, Workflow Engine, Security engine, Capability Resolver, Event Bus, or Persistence abstraction.
- Do not expose vendor SDK types through public contracts.
- Do not silently change the architecture.
- Use normalized errors.
- Integrate security, events, audit, observability, and configuration where required.
- Add unit, contract, and integration tests.
- Use replaceable reference providers.

After implementation:

1. Run all relevant tests.
2. Verify every acceptance criterion.
3. Create:
   docs/implementation/reports/<number>-<slug>-implementation-report.md
4. Report:
   - files changed
   - contracts implemented
   - tests added
   - test results
   - deferred items
   - limitations
   - architectural deviations
   - ADRs required

Do not mark the blueprint complete if any required acceptance criterion is unverified.
```

---

# 14. Final Rule

Implement one blueprint at a time.

Do not ask Cursor to implement all 31 blueprints in one prompt.

Each completed blueprint must become a stable dependency for the next blueprint.

The implementation sequence is:

```text
Read
  ↓
Inspect
  ↓
Plan
  ↓
Implement contracts
  ↓
Implement core semantics
  ↓
Implement reference providers
  ↓
Integrate
  ↓
Test
  ↓
Verify acceptance criteria
  ↓
Write implementation report
  ↓
Proceed to the next blueprint
```

This process is mandatory for maintaining architectural consistency throughout AgentForge.


# Implementation Execution Modes

The canonical execution-mode definitions, autonomous contract-design authority, stop conditions, and completion obligations are defined in [docs/implementation/implementation-modes.md](implementation/implementation-modes.md). The summary below must be interpreted consistently with that document.

Every blueprint implementation must declare one execution mode before work begins.

## Review-Gated Mode

Use when architectural uncertainty is high or human review is required.

Workflow:

```text
Read
  ↓
Inspect
  ↓
Implementation Plan
  ↓
Contract Specification
  ↓
Stop for Review
  ↓
Implementation after Approval
```

In this mode, the implementation agent must not modify production code until the plan and contract specification are approved.

---

## Autonomous Mode

Use when the user explicitly authorizes unattended implementation.

Workflow:

```text
Read
  ↓
Inspect
  ↓
Implementation Plan
  ↓
Contract Specification
  ↓
Implementation
  ↓
Testing
  ↓
Implementation Report
  ↓
Completion Checklist
```

In Autonomous Mode, the implementation agent does not wait for intermediate plan approval.

It may continue automatically when all of the following are true:

* The blueprint is approved.
* Direct dependencies are implemented or suitable reference contracts exist.
* No unresolved ownership contradiction exists.
* No new architectural concept or cross-framework responsibility may be invented outside the approved blueprint and ADRs. Cursor may define exact TypeScript representations for contracts already conceptually authorized by those documents.
* No breaking change to an implemented dependency is required.
* Security, Runtime, Capability Resolution, and Composition ownership remain intact.
* The implementation plan maps every acceptance criterion to code and tests.

The implementation agent must stop and report the issue when:

* Two authoritative documents materially conflict.
* A required dependency is missing and cannot be represented by an approved temporary abstraction.
* Implementation requires changing architectural ownership.
* A public contract requires an architectural decision not covered by the blueprint or accepted ADRs.
* A destructive repository or data migration is required but not explicitly authorized.
* Security implications cannot be resolved from the approved architecture.

Minor implementation choices do not require interruption.

Examples include:

* File organization within the approved package
* Private helper methods
* Internal class names
* Test fixture design
* Reference-provider implementation details
* Non-breaking internal refactoring

---

## Scaffolding-Only Mode

Use when only the structural foundation should be created.

The implementation agent may create:

* Packages
* Directories
* Public contracts
* Provider interfaces
* Dependency-injection tokens
* Error-code declarations
* Event schemas
* Test skeletons
* Package documentation

It must not implement production behavior, external provider calls, persistence mutations, or Runtime execution.

---

# Mode Declaration

Every implementation request must declare one of:

```text
Implementation Mode: Review-Gated
```

```text
Implementation Mode: Autonomous
```

```text
Implementation Mode: Scaffolding-Only
```

When no mode is declared, the default is:

```text
Implementation Mode: Review-Gated
```

---

# Autonomous Implementation Authority

When Autonomous Mode is explicitly selected, creation of the implementation plan and contract specification remains mandatory, but intermediate human approval is not required.

The implementation agent must still:

* Preserve all architectural boundaries.
* Record assumptions.
* Create the implementation report.
* Complete the blueprint checklist.
* Report any deviations.
* Avoid claiming completion when tests or acceptance criteria fail.

Autonomous Mode authorizes execution of the approved implementation workflow.

It does not authorize architectural redesign.


# Blueprint Implementation Specification

Every blueprint implementation must produce one canonical **Blueprint Implementation Specification** before production code is written.

The specification converts the architectural blueprint into exact implementation contracts.

It must define, where applicable:

* Exact TypeScript interfaces and type aliases
* Public field names and types
* Required and optional fields
* Immutability requirements
* Public package exports
* Dependency-injection tokens
* Service lifetimes
* Stable error codes
* Event names and payload schemas
* Schema versions
* Serialization rules
* Validation rules
* Compatibility behavior
* Provider boundaries
* Runtime boundaries
* Security boundaries
* Acceptance-criteria mappings

The canonical output path is:

```text
docs/implementation/specifications/
```

The canonical filename format is:

```text
<blueprint-number>-<blueprint-slug>-implementation-specification.md
```

Example:

```text
docs/implementation/specifications/01-foundation-implementation-specification.md
```

The terms **Contract Specification**, **Implementation Specification**, and other variations must not be used as separate artifact names.

All such references mean the canonical **Blueprint Implementation Specification**.

The specification must use:

```text
docs/templates/implementation-specification-template.md
```

The required implementation workflow is:

```text
Engineering Blueprint
        ↓
Implementation Plan
        ↓
Blueprint Implementation Specification
        ↓
Implementation
        ↓
Testing
        ↓
Implementation Report
        ↓
Completion Checklist
```

In Review-Gated Mode, Cursor must stop after producing the Implementation Plan and Blueprint Implementation Specification.

In Autonomous Mode, Cursor may continue directly into implementation after creating both artifacts, provided no stop condition is encountered.


# Autonomous Contract-Design Authority

In Autonomous Mode, Cursor is authorized to design the initial TypeScript representation of contracts that are already conceptually defined by an approved Engineering Blueprint.

This authority exists so that architectural concepts can be converted into implementable TypeScript contracts without requiring approval for every field name, interface name, type alias, enum, or package export.

Autonomous contract design must remain within the semantic boundaries established by:

* The current Engineering Blueprint
* Accepted ADRs
* Direct dependency blueprints
* The canonical glossary
* Existing approved public contracts
* Repository coding and naming standards

---

## Cursor May Decide

Cursor may independently define the following implementation-level details when the blueprint clearly establishes the underlying concept:

* TypeScript interface names
* Type aliases
* Exact field names
* Field types
* Required and optional fields
* `readonly` usage
* Enums and discriminated unions
* Value-object representations
* Generic parameters
* Public package exports
* Dependency-injection tokens
* Service lifetimes where ownership makes them clear
* Stable normalized error codes
* Event payload field names
* Event schema versions
* Request and result schemas
* Serialization representations
* Validation schemas
* Internal provider interfaces
* Reference-provider contracts
* Non-breaking compatibility rules
* Internal module and file organization

Cursor should choose the smallest contract that completely represents the blueprint-defined semantics.

---

## Contract-Design Principles

When translating conceptual contracts into TypeScript, Cursor must:

1. Preserve blueprint terminology.
2. Prefer immutable public artifacts.
3. Use normalized provider-independent types.
4. Avoid embedding implementation-specific details.
5. Avoid duplicating contracts owned by another blueprint.
6. Reuse approved shared contracts where they already exist.
7. Keep public APIs minimal.
8. Prefer explicit types over unstructured objects.
9. Define stable error codes for expected failures.
10. Version serialized contracts and events where compatibility requires it.

---

## Cursor Must Not Decide Autonomously

Cursor must stop and request architectural review when exact contract design would require any of the following:

* Creating a new architectural responsibility
* Changing the owner of an existing responsibility
* Introducing a new cross-framework platform contract not implied by an approved blueprint
* Changing dependency direction
* Expanding authorization or security semantics
* Changing Runtime execution ownership
* Changing Capability Resolution ownership
* Changing Composition ownership
* Introducing a new lifecycle state with platform-wide meaning
* Introducing a new consistency or durability guarantee
* Introducing a new retry, recovery, or transaction model
* Changing an already implemented public contract incompatibly
* Creating a breaking event or stored-artifact schema
* Resolving a material contradiction between authoritative documents

These decisions require an ADR, blueprint amendment, or explicit architectural approval.

---

## Translation vs Invention

The following distinction is authoritative.

### Permitted Translation

The blueprint defines:

> A normalized AI Execution Request containing capability binding, execution reference, input content, generation requirements, and optional streaming requirements.

Cursor may define:

```ts
export interface AiExecutionRequest {
  readonly requestId: string;
  readonly capabilityBinding: CapabilityBinding;
  readonly executionReference: ExecutionReference;
  readonly input: readonly AiMessage[];
  readonly generation: GenerationRequirements;
  readonly streaming?: StreamingRequirements;
}
```

This is an implementation-level translation of an approved architectural concept.

### Prohibited Invention

Cursor may not independently decide that:

* The AI Provider Framework owns retry.
* The request selects a concrete provider.
* The provider creates an `ExecutionContext`.
* The AI Provider Framework directly executes tools.
* The request introduces a new platform-wide authorization model.

Those decisions alter architectural ownership and require review.

---

## Uncertainty Rule

When several TypeScript representations satisfy the same approved architectural meaning, Cursor may select the simplest option and record the decision in the Blueprint Implementation Specification.

Cursor should not stop merely because:

* A field name was not prescribed.
* An interface name was not prescribed.
* Optionality requires a reasonable decision.
* A normalized error code must be named.
* A package export list must be defined.
* A reference-provider interface must be created.

Cursor must stop only when uncertainty affects architectural meaning, ownership, security, compatibility, or cross-framework behavior.

---

## Specification Recording

Every autonomous contract-design decision must be recorded in the Blueprint Implementation Specification.

For each public contract, the specification must identify:

* The blueprint concept being implemented
* The selected TypeScript representation
* Public fields and types
* Immutability
* Validation requirements
* Serialization behavior
* Compatibility expectations
* Related errors and events
* Any assumptions made

This specification becomes the approved implementation-level contract for that blueprint unless later changed through governance.

---

## Autonomous Mode Rule

Autonomous Mode authorizes Cursor to convert approved conceptual architecture into exact, minimal, provider-independent TypeScript contracts.

It does not authorize Cursor to create new architecture.

The controlling distinction is:

> **Cursor may design the TypeScript shape of an approved concept. Cursor may not invent a new architectural concept, responsibility, guarantee, or ownership boundary.**

# Cross-Cutting Framework Bootstrapping

## Purpose

Several cross-cutting frameworks, including Configuration, Security, Observability, Event Bus, Audit, Capability Resolution, and Persistence, are implemented by later Engineering Blueprints.

However, Blueprint 01 establishes the platform foundation and therefore requires a minimal operational environment before those frameworks are fully implemented.

This section defines the constitutional bootstrapping rules for those dependencies.

---

# Architectural Principle

Blueprint ownership is determined by long-term architectural responsibility rather than implementation order.

Early blueprints may establish minimal contracts and reference implementations owned by later blueprints without assuming ownership of their architectural responsibilities.

The owning blueprint remains the sole authority for the complete framework.

---

# Bootstrapping Rule

Early blueprints may establish only the minimum future-owned artifacts required for startup or for their own approved stateful contracts.

These artifacts exist solely to satisfy platform dependencies until the owning blueprint is implemented.

They are temporary implementation scaffolding, not architectural ownership.

---

# Permitted Bootstrapping Artifacts

Blueprint 01 may define:

* Public interfaces
* Dependency-injection tokens
* Empty or reference implementations
* No-op implementations
* Null-object implementations
* Default providers
* Bootstrap configuration
* Placeholder lifecycle services
* Startup registration
* Health-check registration
* Minimal event definitions
* Minimal diagnostics interfaces
* Minimal Persistence contracts required by an approved blueprint
* Repository, transaction-boundary, Unit-of-Work, and snapshot-store contracts
* Optimistic version tokens
* In-memory repositories and transactions
* File-based or in-memory snapshot reference implementations

These artifacts must preserve the ownership defined by the Engineering Blueprints.

---

# Prohibited Bootstrapping

Blueprint 01 must not implement:

* Full authorization
* Complete observability
* Event routing
* Audit persistence
* Capability resolution logic
* Provider selection
* Production configuration management
* Production secret management
* Production database behavior
* Provider-specific persistence schemas
* Final consistency, isolation, or durability guarantees outside Blueprint 24
* Workflow execution
* Planning
* Memory management
* Knowledge retrieval

Those responsibilities remain owned by their respective blueprints.

---

# Reference Implementations

When a dependency is required before its owning blueprint is implemented, Cursor should create a minimal reference implementation.

Reference implementations should:

* satisfy public contracts,
* remain deterministic,
* avoid external dependencies,
* provide predictable default behavior,
* be clearly identified as temporary,
* be replaceable without changing consumers.

Examples include:

* NoOpAuthorizationProvider
* NoOpAuditProvider
* NoOpEventPublisher
* NullObservabilityProvider
* StaticCapabilityResolver
* InMemoryConfigurationProvider
* InMemoryRepository
* InMemoryTransaction
* InMemorySnapshotStore

These implementations exist solely to enable incremental platform construction.

---

# Replacement Rule

When the owning blueprint is implemented:

* the reference implementation may be replaced,
* consumers must not require modification,
* public contracts remain unchanged,
* ownership remains unchanged.

The replacement should occur through Dependency Injection and Composition rather than consumer modification.

---

# Dependency Rule

Early blueprints may depend on:

* contracts,
* interfaces,
* dependency-injection tokens,
* normalized requests,
* normalized results,

but not on the full implementation of future frameworks.

This preserves the architectural dependency direction while allowing incremental implementation.

---

# Cursor Guidance

When implementing Blueprint 01, Cursor should:

1. create only the contracts required for startup;
2. implement minimal reference providers where necessary;
3. avoid implementing responsibilities owned by later blueprints;
4. record every reference implementation in the Blueprint Implementation Specification;
5. replace those implementations when the owning blueprint is implemented.

The same rule applies when another early blueprint requires a minimal Persistence port before Blueprint 24. Every bootstrapped future-owned contract must be recorded in that blueprint's Blueprint Implementation Specification with:

* its eventual owning blueprint;
* why the bootstrap is required;
* the minimal contract surface;
* the reference implementation and its limitations;
* the replacement point;
* confirmation that no final consistency, isolation, durability, or provider-specific schema was invented.

Reference implementations are implementation scaffolding.

They are not architectural ownership.

---

# Constitutional Rule

> **Early blueprints may establish minimal contracts and replaceable reference implementations required for bootstrapping, including Persistence ports where approved state is required, but ownership remains with the designated Engineering Blueprint. Persistence ownership remains with Blueprint 24.**

---

# Final Statement

AgentForge is implemented incrementally but architected holistically.

Bootstrapping exists to enable early platform initialization without transferring architectural ownership from the frameworks that ultimately define and govern each cross-cutting concern.
