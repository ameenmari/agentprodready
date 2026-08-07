AgentProdReady
Engineering Blueprint 03
Dependency Injection & Composition Framework

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

Audience:

Platform Architects
Platform Engineers
Plugin Developers
Cursor AI
1. Purpose

The Dependency Injection & Composition Framework defines how every component within AgentProdReady is created, composed, configured, and managed throughout its lifecycle.

Rather than treating Dependency Injection as merely a mechanism for resolving services, AgentProdReady considers composition to be a fundamental architectural capability that governs the construction of the entire platform.

Every service, engine, provider, plugin, workflow component, and infrastructure module is composed through this framework.

No platform component is permitted to construct or manage shared dependencies independently.

2. Responsibilities

The Composition Framework owns:

Application composition
Service registration
Dependency resolution
Service lifetime management
Execution scope creation
Module registration
Plugin registration
Factory registration
Lazy service resolution
Cross-cutting service composition
Composition validation
Container lifecycle
Dependency graph validation

The framework does not execute business logic.

Its responsibility ends once correctly composed objects are delivered.

4. Blueprint Dependencies

Blueprint 03 depends upon:

Blueprint 01 — Engineering Constitution & Platform Foundation
Blueprint 02 — Plugin & Extension Framework

Future blueprints depending upon Blueprint 03 include every functional subsystem of AgentProdReady.

5. Composition Philosophy

AgentProdReady follows five core composition principles.

Explicit Dependencies

Every dependency must be declared explicitly.

Hidden dependencies are prohibited.

Consumers should immediately understand what a component requires by inspecting its constructor.

Composition Over Construction

Business components should never manually create their collaborators.

Construction belongs exclusively to the Composition Framework.

Interface First

Components depend upon contracts rather than implementations.

Implementations remain replaceable without modifying consumers.

Immutable Composition

Once the platform starts, the composition graph is considered immutable.

Dynamic service registration during execution is prohibited unless explicitly supported by the Plugin Framework.

Platform-Owned Composition

Composition belongs to the Platform Kernel.

Individual modules, workflows, providers, and plugins must never own container construction.

6. Composition Architecture

The Composition Framework sits between the Platform Kernel and every executable subsystem.

                Application Host
                        │
                        ▼
               Composition Root
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
 Module Registrars  Plugin Registrars  Infrastructure
        │               │                │
        └───────────────┼────────────────┘
                        ▼
              Dependency Injection Container
                        │
                        ▼
               Execution Scope Creation
                        │
                        ▼
          Runtime • Workflow • Planning
                        │
                        ▼
     Providers • Tools • Knowledge • Memory

The Composition Framework owns the object graph.

The Runtime owns execution.

7. Composition Root
7.1 Purpose

AgentProdReady defines a single Composition Root.

The Composition Root is the exclusive location where platform services are registered and the dependency graph is assembled.

No other component may build or configure the service container.

7.2 Responsibilities

The Composition Root is responsible for:

Registering platform modules
Registering infrastructure services
Registering plugin contributions
Building the service container
Validating registrations
Starting the platform

After construction completes, the container becomes read-only.

7.3 Registration Flow
Application Host
        │
        ▼
Composition Root
        │
        ▼
Platform Module Registration
        │
        ▼
Infrastructure Registration
        │
        ▼
Plugin Registration
        │
        ▼
Composition Validation
        │
        ▼
Container Build
        │
        ▼
Runtime Startup

Every deployment follows this deterministic sequence.

8. Service Registration
8.1 Purpose

Every platform capability must be registered before it can participate in application composition.

Registration defines:

Lifetime
Contract
Implementation
Factory (if applicable)
Metadata
Decorators (if applicable)

Registration never executes business logic.

8.2 Registration Categories

The Composition Framework supports registration of:

Platform services
Infrastructure services
Runtime services
Workflow services
Planning services
Provider factories
Tool factories
Plugin services
Configuration services
Observability services
Security services

Each category remains isolated within its own module.

9. Service Lifetimes

AgentProdReady defines exactly three service lifetimes.

Singleton

A Singleton exists once for the lifetime of the application.

Examples include:

Capability Registry
Capability Resolver
Configuration Manager
Event Bus
Logger Factory
Security Manager
Plugin Registry

Singletons represent stable platform infrastructure.

Scoped

A Scoped service exists only for the lifetime of a single execution.

Each ExecutionContext creates a new scope.

Examples include:

ExecutionContext
Planning Session
Authorization Context
Prompt Builder
Workflow Session
Context Assembly Session

Scoped services are isolated from every other execution.

Transient

Transient services are created whenever requested.

Examples include:

Validators
Converters
Mappers
Builders
Parsers

Transient services should remain stateless.

10. Lifetime Rules

The following lifetime rules are mandatory.

Singleton → Singleton

Allowed.

Scoped → Singleton

Allowed.

Transient → Any

Allowed.

Singleton → Scoped

Prohibited.

Singleton services must never inject or retain scoped dependencies.

Execution-specific information must instead be provided through method parameters or factories.

Singleton → Execution State

Prohibited.

ExecutionContext must never be cached or retained by Singleton services.

Scoped → ExecutionContext

Every scoped service participating in execution receives the same immutable ExecutionContext.

11. Execution Scopes
Purpose

Every execution creates its own dependency injection scope.

The Execution Scope provides complete isolation between concurrent executions.

Scope Creation

Execution follows this sequence:

Request
      │
      ▼
ExecutionContextFactory
      │
      ▼
ExecutionContext
      │
      ▼
Create DI Scope
      │
      ▼
Resolve Scoped Services
      │
      ▼
Execute Runtime
      │
      ▼
Dispose Scope

The Runtime never creates the ExecutionContext.

It receives one created by the ExecutionContextFactory and opens a corresponding execution scope.

Scope Disposal

When execution completes:

Scoped services are disposed.
Disposable resources are released.
Telemetry is flushed.
Cancellation tokens are cleaned up.
Memory is reclaimed.

No scoped state survives execution.

12. Module Registration

Platform modules are responsible for registering only their own services.

Examples include:

Runtime Module
Workflow Module
Planning Module
Tool Module
Knowledge Module
Memory Module
Evaluation Module

Modules must not register services belonging to other modules.

This preserves architectural ownership and prevents hidden coupling.

13. Plugin Registration Integration

The Composition Framework integrates with the Plugin & Extension Framework defined in Blueprint 02.

After plugin validation and metadata registration, plugins contribute service registrations through the Composition Root.

Plugin registrations follow the same lifetime rules and validation process as platform services.

Plugins must never build their own dependency injection containers.


14. Factory Pattern
14.1 Purpose

Some platform components require runtime information before they can be created.

These components must be created through factories rather than direct dependency injection.

Factories provide controlled object creation while preserving dependency injection principles.

Factories are part of the Composition Framework and participate in dependency injection like any other service.

14.2 When to Use Factories

Factories should be used when object creation depends on:

Execution-specific information
Capability resolution
Runtime configuration
Tenant configuration
Dynamic provider selection
External resources
Conditional implementation selection

Factories should not be used as a replacement for dependency injection.

14.3 Platform Factories

Examples include:

ExecutionContextFactory
ProviderFactory
ToolFactory
WorkflowFactory
PromptBuilderFactory
PlannerFactory
MemoryProviderFactory
KnowledgeProviderFactory

Each factory owns the creation of a single family of related components.

14.4 Factory Principles

Factories must:

Respect service lifetimes
Participate in dependency injection
Avoid hidden dependencies
Never build nested containers
Remain stateless whenever possible
15. Lazy Resolution
15.1 Purpose

Not every registered service should be instantiated during application startup.

The Composition Framework supports lazy resolution for expensive or optional services.

Lazy resolution minimizes startup time and resource consumption.

15.2 Lazy Components

Examples include:

AI providers
Embedding providers
Vector databases
External API clients
Tool implementations
Plugin providers
Workflow executors

Registration occurs during startup.

Instantiation occurs only when required by the Runtime.

15.3 Resolution Flow
Capability Requested
        │
        ▼
Capability Resolver
        │
        ▼
Provider Metadata
        │
        ▼
Provider Factory
        │
        ▼
Lazy Provider Creation
        │
        ▼
Provider Initialization
        │
        ▼
Execution

This ensures unused providers consume no runtime resources.

15.4 Architectural Rule

The Composition Framework never eagerly creates expensive infrastructure solely because it is registered.

Registration and instantiation are separate architectural concerns.

16. Decorator Pattern
16.1 Purpose

Cross-cutting behavior should be composed through decorators rather than embedded into business logic.

Decorators allow additional behavior to be applied transparently without modifying existing implementations.

16.2 Suitable Decorator Responsibilities

Examples include:

Logging
Metrics
Distributed tracing
Retry
Timeout
Circuit breaker
Caching
Authorization checks
Validation
Rate limiting
16.3 Decorator Ordering

Decorator execution must be deterministic.

For example:

Validation
      │
      ▼
Authorization
      │
      ▼
Logging
      │
      ▼
Metrics
      │
      ▼
Tracing
      │
      ▼
Retry
      │
      ▼
Actual Service

The ordering should be defined centrally and applied consistently.

16.4 Transparency

Decorators must preserve the original contract.

Consumers remain unaware of decoration and continue interacting with the service through its public interface.

17. Cross-Cutting Service Composition
17.1 Purpose

Certain platform capabilities support every subsystem without belonging to any single business module.

These capabilities are composed once and shared across the platform.

17.2 Examples

Cross-cutting services include:

Logging
Configuration
Security
Observability
Telemetry
Event Bus
Health Monitoring
Secret Management
Capability Resolution

These services are registered during application startup and consumed through dependency injection.

17.3 Ownership

Cross-cutting services remain independent of business modules.

Business modules consume them through public contracts and never own their implementation.

18. Composition Validation
18.1 Purpose

Before the Runtime starts, the Platform Kernel validates the entire composition graph.

Validation ensures the platform can execute safely without runtime composition failures.

18.2 Validation Responsibilities

The Composition Framework validates:

Missing registrations
Circular dependencies
Invalid service lifetimes
Duplicate service registrations
Duplicate capabilities
Duplicate provider identifiers
Invalid decorators
Factory registrations
Plugin service registrations
Configuration dependencies

The platform must fail startup if critical validation errors are detected.

18.3 Validation Sequence
Service Registration
        │
        ▼
Dependency Graph Analysis
        │
        ▼
Lifetime Validation
        │
        ▼
Factory Validation
        │
        ▼
Plugin Validation
        │
        ▼
Decorator Validation
        │
        ▼
Container Build
        │
        ▼
Platform Ready

No functional subsystem should start before validation completes successfully.

19. Diagnostics
19.1 Purpose

The Composition Framework exposes diagnostics that assist operators and developers in understanding the application's object graph.

19.2 Diagnostic Information

Diagnostics may include:

Registered services
Service lifetimes
Dependency graphs
Registered factories
Decorator chains
Plugin registrations
Capability registrations
Provider registrations

Diagnostics are intended for troubleshooting and operational visibility.

19.3 Observability

Composition events participate in the platform's observability infrastructure.

Examples include:

Registration duration
Container build duration
Scope creation time
Scope disposal time
Resolution failures
Validation failures

These metrics support operational monitoring and performance analysis.

20. Error Handling

The Composition Framework is responsible for reporting composition-related failures clearly and consistently.

Typical error categories include:

Missing dependency
Circular dependency
Invalid lifetime
Duplicate registration
Invalid factory
Invalid decorator
Plugin registration conflict
Container initialization failure

Errors should be descriptive and actionable while avoiding exposure of sensitive implementation details.

21. Cursor Implementation Guide
Objective

Cursor should implement the platform's composition infrastructure rather than application-specific registrations.

Required Deliverables

Implement:

Composition Root
Service registration infrastructure
Module registration pipeline
Plugin registration integration
Lifetime management
Execution scope creation
Factory registration support
Lazy resolution infrastructure
Decorator pipeline
Composition validation
Dependency graph diagnostics
Container diagnostics
Scope disposal
Composition observability
Deferred Responsibilities

Do not implement:

Runtime behavior
Workflow execution
Planning logic
AI provider logic
Tool execution
Knowledge retrieval
Memory persistence

These responsibilities belong to their respective blueprints.

22. Acceptance Criteria

Blueprint 03 is considered complete when:

A single Composition Root exists.
All platform modules register through the Composition Root.
Plugin registrations integrate into the same composition pipeline.
Exactly three service lifetimes are supported: Singleton, Scoped, and Transient.
Each execution creates an isolated dependency injection scope.
ExecutionContext is created exclusively by the ExecutionContextFactory.
Singleton services do not retain scoped state.
Lazy resolution is supported for providers and other expensive services.
Decorators compose cross-cutting concerns consistently.
The composition graph is validated before Runtime startup.
Diagnostics expose registrations, lifetimes, factories, and dependency graphs.
Composition failures prevent platform startup.
23. Chief Architect's Notes

The Dependency Injection & Composition Framework defines how AgentProdReady is assembled, not how it behaves. By separating composition from execution, the platform achieves deterministic startup, explicit dependencies, and strong module isolation.

The Composition Root serves as the single authority for constructing the application, while execution scopes ensure that each request or workflow operates within an isolated dependency graph rooted in a single immutable ExecutionContext. This approach prevents hidden dependencies, lifetime violations, and service locator anti-patterns.

Factories and lazy resolution enable dynamic behavior—such as provider selection—without compromising startup performance or architectural clarity. Decorators provide a consistent mechanism for applying cross-cutting concerns like logging, resilience, and telemetry without polluting business logic.

Every subsequent blueprint assumes the existence of this composition model. Runtime, Workflow, Planning, Tools, Knowledge, Memory, and AI Providers should rely on the Composition Framework for object creation and lifecycle management rather than introducing their own construction mechanisms.
