AgentForge
Engineering Blueprint 07
Capability Resolution Framework

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

1. Purpose

The Capability Resolution Framework is responsible for translating an abstract capability requirement into a concrete executable implementation.

It enables every platform component to depend on capabilities rather than implementations, preserving provider independence, extensibility, and tenant-specific customization.

The framework forms the bridge between Runtime orchestration and the specialized services that perform actual work.

2. Architectural Position
Workflow Engine
        │
Eligible Logical Work
        │
        ▼
Runtime
        │
Node Execution Contract
        │
        ▼
Capability Resolution Framework
        │
Capability Binding
        │
 ┌──────┼────────┬───────────┬──────────┐
 ▼      ▼        ▼           ▼          ▼
AI   Tool    Knowledge    Memory   Evaluation
Provider      Engine       Engine      Engine

The Capability Resolution Framework does not perform work itself.

It determines who should perform the work.

3. Responsibilities

The framework owns:

Capability discovery
Capability registration
Capability metadata
Capability lookup
Capability resolution
Resolution policy execution
Provider binding
Version compatibility validation
Capability diagnostics

It does not own:

Provider execution
Runtime scheduling
Workflow interpretation
Planning
Security authorization
Business logic
5. Consumes → Produces → Owns
Consumes

Node Execution Contract

ExecutionContext

Capability Identifier

Produces

Capability Binding

Owns

Provider-independent capability resolution.

6. Core Philosophy

The platform never asks for:

"Execute using OpenAI."

Instead it asks:

"Resolve Chat Completion capability."

The framework determines which implementation satisfies that capability according to platform configuration and resolution policy.

This separation is a constitutional architectural principle of AgentForge.

7. Capability Model

A capability represents what the platform requires, not how it is implemented.

Examples include:

Chat Completion
Text Embedding
Image Generation
OCR
Translation
Web Search
SQL Query
Vector Search
Memory Storage
Knowledge Retrieval
Tool Invocation
Evaluation

Capabilities define contracts that multiple providers may satisfy.

8. Core Components

The Capability Resolution Framework consists of several focused services.

Capability Registry

Maintains the catalog of all registered capabilities and their associated implementations.

Capability Resolver

Accepts a capability request and coordinates the resolution process.

Resolution Policy Engine

Applies deterministic precedence rules to determine the appropriate implementation.

Provider Registry

Maintains metadata about available providers and the capabilities they support.

Capability Validator

Ensures requested capabilities exist and that compatible implementations are available.

Resolution Diagnostics

Produces detailed diagnostics describing how and why a capability was resolved.

9. Architectural Principle

The Capability Registry stores information.

The Resolution Policy Engine decides which implementation should be selected.

The Capability Resolver coordinates the resolution process.

The Provider Registry supplies provider metadata.

Keeping these responsibilities separate prevents the resolver from becoming a monolithic service.

10. Capability Resolution Lifecycle

Every resolution request follows the same high-level lifecycle:

Node Execution Contract
        │
        ▼
Capability Request
        │
        ▼
Capability Validation
        │
        ▼
Policy Evaluation
        │
        ▼
Provider Selection
        │
        ▼
Capability Binding

The resulting Capability Binding is then returned to the Runtime for execution.

11. Capability Request
11.1 Purpose

Every resolution begins with a Capability Request.

A Capability Request expresses what functionality is required, not which implementation should satisfy it.

It is the Runtime's responsibility to submit Capability Requests whenever an eligible workflow node requires specialized functionality.

11.2 Characteristics

A Capability Request must be:

Immutable
Provider independent
Execution scoped
Serializable
Validated
Traceable

The Capability Request must never contain provider-specific configuration.

11.3 Required Information

Conceptually, a Capability Request contains:

Capability Request
│
├── Capability Identifier
├── ExecutionContext
├── Node Execution Contract
├── Requested Version (optional)
├── Resolution Constraints
└── Resolution Metadata

The concrete implementation is left to engineering, but these conceptual elements must be represented.

12. Resolution Policies
12.1 Purpose

The Resolution Policy Engine determines which implementation satisfies a capability request.

Policies ensure deterministic behavior across environments while allowing tenant-specific customization.

12.2 Resolution Order

Unless explicitly overridden by future policy extensions, capability resolution follows the platform precedence defined by the architectural decisions:

Runtime Override
        │
        ▼
Tenant Configuration
        │
        ▼
Workspace Configuration
        │
        ▼
Project Configuration
        │
        ▼
Global Configuration
        │
        ▼
Default Implementation

The first valid implementation terminates the resolution process.

No silent fallback beyond the configured precedence chain is permitted.

12.3 Deterministic Resolution

Given the same:

Capability Request
ExecutionContext
Platform Configuration

the Resolution Policy Engine must always produce the same Capability Binding.

13. Capability Binding
13.1 Purpose

The Capability Binding is the public output of the Capability Resolution Framework.

It represents the concrete implementation selected to satisfy a Capability Request.

The Runtime consumes the Capability Binding without knowledge of how it was selected.

13.2 Architectural Principle

The Runtime never communicates directly with registries or policy engines.

It communicates only through the Capability Resolver and receives a Capability Binding.

This keeps all resolution logic encapsulated.

13.3 Conceptual Structure
Capability Binding
│
├── Capability
├── Selected Implementation
├── Provider Metadata
├── Version Information
├── Resolution Metadata
└── Diagnostics Reference

The Capability Binding is immutable once produced.

14. Capability Registry
14.1 Purpose

The Capability Registry maintains the authoritative catalog of capabilities known to the platform.

It is a passive registry and performs no decision making.

14.2 Responsibilities

The registry stores:

Capability definitions
Capability metadata
Compatible implementations
Version compatibility
Registration metadata

The registry must not perform resolution.

15. Provider Registry
15.1 Purpose

The Provider Registry maintains metadata describing available implementations.

Unlike the Capability Registry, it focuses on implementations rather than abstract capabilities.

15.2 Responsibilities

Examples of stored metadata include:

Provider identifier
Supported capabilities
Version
Health status
Registration source
Plugin ownership

The Provider Registry never selects providers.

16. Capability Resolver
16.1 Purpose

The Capability Resolver is the single entry point into the Capability Resolution Framework.

All capability resolution requests pass through this service.

16.2 Responsibilities

The Capability Resolver:

Validates requests.
Coordinates registry lookups.
Invokes the Resolution Policy Engine.
Produces Capability Bindings.
Publishes diagnostics.

It delegates specialized work to other framework components.

16.3 Architectural Rule

No platform component may bypass the Capability Resolver.

Direct registry access is prohibited outside the framework.

17. Resolution Diagnostics
17.1 Purpose

Every capability resolution should be explainable.

The framework therefore produces diagnostics describing how a binding was selected.

17.2 Diagnostic Examples

Examples include:

Requested capability
Matching implementations
Applied policy
Winning implementation
Rejected implementations
Version compatibility results
Resolution duration

Diagnostics improve debugging and operational transparency without affecting runtime behavior.

18. Failure Handling

Resolution failures are explicit.

Typical failure scenarios include:

Unknown capability
No compatible implementation
Version incompatibility
Policy rejection
Invalid request

The framework returns structured failures rather than silently selecting an alternative implementation.

Failure recovery remains the responsibility of the Runtime.

19. Framework Boundaries

The Capability Resolution Framework may:

Register capabilities.
Register provider metadata.
Resolve capabilities.
Apply deterministic policies.
Produce Capability Bindings.
Validate compatibility.
Generate diagnostics.

The Capability Resolution Framework must not:

Execute providers.
Invoke tools.
Retrieve knowledge.
Access memory.
Schedule execution.
Interpret workflows.
Perform planning.
Make authorization decisions.

Those responsibilities belong to other platform components.

20. Observability

The framework integrates with the platform observability infrastructure.

It contributes:

Logging

Capability registration and resolution events.

Metrics

Examples include:

Resolution duration
Resolution success rate
Resolution failures
Registry size
Policy evaluation duration
Capability usage frequency
Distributed Tracing

Resolution operations participate in the Runtime execution trace.

Diagnostics

Capability resolution diagnostics remain accessible for operational analysis and debugging.

21. Cursor Implementation Guide
Objective

Implement a provider-independent capability resolution framework based on deterministic policy evaluation.

Required Deliverables

Implement:

Capability Request model
Capability Binding model
Capability Registry
Provider Registry
Capability Resolver
Resolution Policy Engine
Capability Validator
Resolution Diagnostics
Observability integration
Event publication
Deferred Responsibilities

Do not implement:

AI providers
Tool implementations
Knowledge engines
Memory engines
Runtime scheduling
Plugin loading
Security authorization

These are defined by later blueprints.

22. Acceptance Criteria

Blueprint 07 is considered complete when:

Every Runtime capability request is resolved exclusively through the Capability Resolver.
Capability Requests remain provider independent.
Resolution follows the deterministic platform precedence chain.
Capability Registries and Provider Registries remain passive stores.
Resolution Policies remain independent of registry implementation.
Every successful resolution produces an immutable Capability Binding.
Every failed resolution returns structured diagnostics.
The Runtime consumes Capability Bindings without knowledge of provider selection.
Resolution participates fully in logging, metrics, tracing, and diagnostics.
23. Chief Architect's Notes

The Capability Resolution Framework is one of the most strategically important components in AgentForge because it isolates intent from implementation. Every other subsystem asks for what it needs in terms of capabilities, never who should provide them. This abstraction allows providers to change, plugins to extend the platform, and tenants to customize behavior without requiring changes to Runtime, Workflow, or Planning.

Another deliberate decision is the separation of the Capability Registry, Provider Registry, Resolution Policy Engine, and Capability Resolver. Although these components collaborate closely, each has a single responsibility. Registries store information, the policy engine decides according to deterministic rules, and the resolver coordinates the process. This prevents the framework from becoming a monolithic service and keeps the architecture maintainable as new capabilities and providers are introduced.






Appendix A — Architectural Clarifications (Post-Review)

This appendix records architectural clarifications identified during design review. These clarifications strengthen the implementation boundaries of the Capability Resolution Framework without changing the intent of Blueprint 07. They are considered authoritative for implementation.

A.1 Capability Resolution vs Instantiation vs Execution

The Capability Resolution Framework is responsible only for determining which implementation should satisfy a capability request.

It does not create implementations or execute them.

These are three distinct architectural responsibilities:

Capability Resolution
        │
        ▼
Determine the appropriate implementation
        │
        ▼
Capability Binding
        │
        ▼
Runtime
        │
        ▼
Lazy Instantiation
        │
        ▼
Implementation Instance
        │
        ▼
Execution

The architectural responsibilities are therefore divided as follows:

Capability Resolution Framework

Validate capability requests
Evaluate resolution policies
Produce Capability Bindings

Runtime

Consume Capability Bindings
Coordinate execution
Manage scheduling
Apply retries
Apply timeout policies
Manage cancellation

Dependency Injection Platform

Lazily instantiate implementations
Manage implementation lifetimes
Resolve implementation dependencies

Specialized Components

Perform the requested domain operation

No component may combine these responsibilities.

A.2 Runtime Overrides

Blueprint 07 defines Runtime Overrides as the highest-precedence input during capability resolution.

Runtime Overrides represent execution-scoped constraints, not direct implementation selection.

Examples include:

latency requirements
locality requirements
compliance requirements
cost constraints
execution preferences
performance objectives

Runtime Overrides influence policy evaluation but must never directly specify concrete providers or implementations.

All implementation selection remains the responsibility of the Resolution Policy Engine.

This preserves the constitutional principle of capability-driven architecture.

A.3 Capability Binding as the Public Contract

The Capability Binding is the only public output of the Capability Resolution Framework.

All internal framework components—including registries, validators, and policy engines—remain implementation details.

The Runtime interacts exclusively with the Capability Resolver and consumes only the resulting Capability Binding.

Future platform components must not depend directly upon:

Capability Registry
Provider Registry
Resolution Policy Engine
Registration metadata

This ensures that future changes to resolution algorithms remain internal to the framework.

A.4 Capability Contract Versioning

Capability compatibility is determined by the capability contract, not solely by provider versions.

The framework distinguishes between:

Capability Contract Version

Defines the public behavioral contract expected by the platform.

Provider Implementation Version

Represents the version of a concrete implementation supplied by a provider or plugin.

Multiple provider implementations may satisfy the same capability contract version.

The Resolution Policy Engine validates compatibility against the capability contract before selecting an implementation.

This separation allows providers to evolve independently while maintaining platform compatibility.

A.5 Exclusive Resolution Authority

The Capability Resolver is the sole authority responsible for resolving platform capabilities.

No platform subsystem may resolve capabilities independently.

This restriction applies to:

Runtime
Workflow Engine
Planning Engine
Plugins
AI Providers
Tool Framework
Knowledge Engine
Memory Engine
Evaluation Framework
Future platform components

All capability requests must pass through the Capability Resolver.

This guarantees deterministic behavior, centralized policy enforcement, complete observability, and consistent diagnostics across the platform.

A.6 Capability Request Derivation

Capability Requests are not created arbitrarily by platform components.

The Runtime derives a Capability Request from:

the Node Execution Contract,
the current ExecutionContext,
and any execution-scoped constraints applicable to the current operation.

The Capability Resolution Framework assumes that incoming Capability Requests are already associated with a valid execution scope.

This preserves the separation between Runtime orchestration and capability resolution.

Chief Architect Amendment

Blueprint 07 establishes one of AgentForge's most important architectural boundaries: resolution is not execution.

The Capability Resolution Framework determines who is capable of performing work, the Dependency Injection Platform determines how implementations are instantiated, and the Runtime determines when and under what execution policies that work is performed.

Maintaining this separation is fundamental to AgentForge's provider-independent, plugin-first architecture. Future blueprints and implementations must preserve these boundaries and treat the Capability Resolver as the exclusive gateway between platform orchestration and specialized implementations.
