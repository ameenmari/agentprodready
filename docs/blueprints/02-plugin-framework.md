AgentForge
Engineering Blueprint 02
Plugin & Extension Framework

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

Audience:

Platform Architects
Platform Engineers
Plugin Developers
Extension Developers
Cursor AI
Third-Party Integrators
1. Purpose

The Plugin & Extension Framework provides the standardized mechanism for extending AgentForge without modifying the Platform Kernel.

It enables platform capabilities to evolve independently through deployable plugins that contribute providers, tools, workflow nodes, integrations, event handlers, and other extensible components.

The framework ensures that extensions remain secure, version-compatible, discoverable, observable, and provider-independent while preserving the architectural integrity defined by Blueprint 01.

Rather than treating plugins as optional add-ons, AgentForge considers extensibility a fundamental architectural capability.

Every non-core capability should be designed to be extensible through this framework.

2. Responsibilities

The Plugin & Extension Framework owns the complete lifecycle of platform extensions.

Its responsibilities include:

Plugin discovery
Plugin validation
Dependency resolution
Compatibility verification
Metadata registration
Capability registration
Provider metadata registration
Tool registration
Workflow node registration
Configuration extension registration
Event subscription registration
Plugin activation
Plugin deactivation
Plugin lifecycle management
Plugin health monitoring
Plugin isolation
Plugin observability

The framework does not execute providers, tools, workflows, or business logic.

Execution remains the responsibility of the Runtime.

4. Blueprint Dependencies

Blueprint 02 depends upon:

Blueprint 01 — Engineering Constitution & Platform Foundation

Future blueprints depending upon Blueprint 02 include:

Runtime
Workflow Engine
Tool Framework
AI Provider Framework
Knowledge Engine
Memory Engine
Evaluation Engine
5. Design Principles

The Plugin & Extension Framework follows six guiding principles.

Plugin First

Whenever functionality may reasonably vary between deployments, it should be implemented as a plugin rather than embedded into the Platform Kernel.

Examples include:

AI providers
Embedding providers
Vector databases
Storage providers
Authentication providers
Tool libraries
Knowledge connectors
Monitoring integrations

The Platform Kernel should remain intentionally small and stable.

Metadata Before Implementation

The platform reasons about plugin metadata before creating plugin instances.

Metadata describes:

Identity
Version
Dependencies
Supported capabilities
Configuration schema
Permissions
Compatibility

Metadata registration occurs during startup.

Implementation remains dormant until required.

Lazy Activation

Plugins contribute capabilities immediately after registration.

Provider implementations are instantiated only when requested by the Runtime through the Capability Resolver.

This minimizes startup time and resource consumption.

Provider Independence

Consumers never reference plugin implementations directly.

All interaction occurs through platform contracts and capabilities.

Plugins remain interchangeable without affecting business logic.

Isolation

Plugins execute within well-defined architectural boundaries.

Plugins may extend the platform.

They must never modify Platform Kernel behavior.

Deterministic Behavior

Plugin loading must be deterministic.

Given the same deployment and configuration, the platform must always discover, validate, and register plugins in the same order.

6. Extension Architecture
6.1 Architectural Overview

The Plugin Framework acts as the bridge between the Platform Kernel and deployable extensions.

                 Platform Kernel
                        │
                        ▼
             Plugin & Extension Framework
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
 Plugin Registry   Capability Registry   Provider Registry
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                Registered Metadata
                        │
                        ▼
              Runtime + Capability Resolver
                        │
                        ▼
            Lazy Plugin Instance Creation
                        │
                        ▼
                Provider Execution

The Plugin Framework owns plugin discovery and plugin lifecycle semantics. The logical Platform Kernel only composes the framework through its public contracts.

Runtime owns execution.

Capability Resolution selects implementations.

Plugins supply functionality.

6.2 Extension Categories

The framework supports multiple extension categories.

AI Providers

Examples:

OpenAI
Azure OpenAI
Anthropic
Gemini
Ollama
Local models
Knowledge Providers

Examples:

Elasticsearch
Pinecone
Weaviate
Azure AI Search
PostgreSQL pgvector
Memory Providers

Examples:

Redis
PostgreSQL
Cosmos DB
MongoDB
Tool Plugins

Examples:

Email
Calendar
File System
GitHub
Slack
REST APIs
Workflow Extensions

Examples:

Custom Nodes
Conditional Nodes
Approval Nodes
Scheduling Nodes
Integration Plugins

Examples:

CRM Systems
ERP Systems
Identity Providers
Cloud Platforms
Messaging Platforms

The framework is intentionally extensible and allows additional extension categories without changing the Platform Kernel.

7. Plugin Lifecycle

Every plugin follows a deterministic lifecycle managed by the Plugin Framework.

Plugin Package
      │
      ▼
Discovery
      ▼
Validation
      ▼
Dependency Resolution
      ▼
Compatibility Verification
      ▼
Metadata Registration
      ▼
Capability Registration
      ▼
Provider Registration
      ▼
Activation
      ▼
Ready
      │
      ▼
Lazy Instance Creation
      ▼
Execution
      ▼
Deactivation
      ▼
Unload

Each lifecycle stage has a single responsibility.

No stage performs responsibilities belonging to another.

8. Plugin Discovery
Purpose

Discovery identifies all deployable plugins available to the platform.

Discovery is performed exclusively during platform startup.

Plugins may originate from:

Local directories
Installed packages
Enterprise repositories
Remote catalogs
Platform-managed deployments

Discovery identifies candidate plugins only.

No plugin code executes during discovery.

Discovery Responsibilities

Discovery collects:

Plugin identity
Manifest
Version
Location
Digital signature
Metadata

Discovered plugins proceed to validation.

9. Plugin Validation

Validation ensures discovered plugins satisfy platform requirements.

Validation includes:

Manifest Validation

Required metadata exists.

Version Validation

Plugin version satisfies platform compatibility.

Dependency Validation

Required dependencies are present.

No dependency cycles exist.

Security Validation

Plugin permissions are acceptable.

Digital signatures are verified where required.

Compatibility Validation

Plugin targets the current Platform API version.

Incompatible plugins are rejected before registration.

10. Dependency Resolution

Plugins may depend upon other plugins.

The Plugin Framework constructs a dependency graph before activation.

The dependency graph determines:

Activation order
Registration order
Shutdown order

Dependency cycles are prohibited.

Missing mandatory dependencies prevent activation.

Optional dependencies may be ignored when unavailable.

Resolution Rules

Dependency resolution follows these principles:

Mandatory dependencies must exist.
Optional dependencies are evaluated dynamically.
Circular dependencies are prohibited.
Activation order follows dependency hierarchy.
Shutdown occurs in reverse dependency order.

The dependency graph must remain deterministic.

11. Registration Pipeline

After validation succeeds, plugins enter the registration pipeline.

Registration is a metadata operation.

It must never instantiate provider implementations.

The registration pipeline consists of:

Plugin Metadata
        ▼
Capability Registration
        ▼
Provider Metadata Registration
        ▼
Tool Metadata Registration
        ▼
Workflow Node Registration
        ▼
Configuration Extension Registration
        ▼
Event Subscription Registration
        ▼
Plugin Ready

Each registration step contributes metadata through the Plugin Framework to the appropriate platform registry.

Runtime-visible functionality becomes available only after successful registration.

Registration Principles

The registration pipeline follows five rules:

Metadata Only

Registration records metadata.

No expensive infrastructure is initialized.

Idempotent

Repeated registration produces the same platform state without duplication.

Observable

Every registration stage emits logs, metrics, and trace events.

Fail Fast

Registration failures prevent plugin activation.

Partially registered plugins are rolled back.

Atomic

A plugin is either fully registered or not registered at all.

Partial registration is prohibited.

12. Plugin Manifest

Every plugin must expose a manifest describing its capabilities.

The manifest represents the plugin's public contract with the Plugin Framework and the logical platform composition.

Typical manifest information includes:

Plugin Identifier
Name
Version
Publisher
Platform Compatibility
Dependencies
Contributed Capabilities
Contributed Providers
Contributed Tools
Configuration Schema
Required Permissions
Supported Features

The Plugin Framework relies on the manifest for discovery, validation, registration, and compatibility checks.

The manifest must remain independent of implementation details.


13. Public Plugin Contracts
13.1 Purpose

Plugins communicate with the Platform Kernel exclusively through well-defined public contracts.

The Platform Kernel never interacts with plugin implementations directly.

Instead, it relies on stable interfaces that define the behavior and metadata exposed by each plugin.

This separation ensures that plugins remain replaceable, testable, and version-compatible.

13.2 Core Contracts

Every plugin participates in the platform through one or more public contracts.

Typical contracts include:

Plugin Contract
Provider Contract
Capability Contributor
Tool Contributor
Workflow Node Contributor
Configuration Contributor
Event Subscriber
Health Contributor

Each contract represents a specific extension point within the platform.

Plugins should implement only the contracts required for their responsibilities.

13.3 Contract Stability

Public contracts are considered part of the Platform API.

Changes to public contracts must follow semantic versioning and architectural governance.

Breaking changes require:

Architectural review
Updated Engineering Blueprint (if the contract changes)
Updated ADR (if the architecture changes)
Migration guidance for plugin developers
14. Provider Registration Model
14.1 Purpose

Provider registration makes implementations available to the Capability Resolver without exposing them directly to consumers.

Providers are registered as metadata during startup and instantiated only when selected for execution.

14.2 Provider Metadata

Each provider contributes metadata such as:

Provider Identifier
Supported Capabilities
Version
Priority
Configuration Requirements
Supported Features
Health Check Support
Compatibility Information

The Plugin Framework registers this metadata in the Provider Registry through the registry's public contract.

14.3 Provider Lifecycle

A provider progresses through the following lifecycle:

Registered
      ▼
Resolved by Capability Resolver
      ▼
Lazy Instantiation
      ▼
Initialization
      ▼
Execution
      ▼
Dispose

The Runtime requests capabilities.

The Capability Resolver selects a provider.

The Composition Framework creates the selected provider instance only when required and manages its lifecycle. The owning Provider Framework interacts with that selected instance through its approved contract.

15. Tool Extension Model
15.1 Purpose

The Tool Framework allows plugins to contribute executable tools without modifying the Runtime.

Tools represent external capabilities that can be invoked during workflow execution.

Examples include:

File operations
Email
Calendar
HTTP APIs
Databases
Cloud services
Enterprise systems
15.2 Tool Registration

Tool plugins register:

Tool Identifier
Name
Description
Input Schema
Output Schema
Permissions
Supported Capabilities

Registration exposes tool metadata to the Tool Framework.

Execution remains the responsibility of the Runtime.

15.3 Tool Execution

Tool execution follows the standardized Tool Execution Contract defined in the Tool Framework blueprint.

Plugins execute only after:

Security validation
Capability resolution
ExecutionContext creation
Authorization

Tool implementations never manage their own execution lifecycle.

16. Workflow Extension Model
16.1 Purpose

Plugins may contribute reusable workflow nodes.

Workflow nodes become building blocks that the Workflow Engine can compose into executable workflows.

Examples include:

Approval Nodes
Delay Nodes
AI Prompt Nodes
Tool Invocation Nodes
Decision Nodes
Integration Nodes
16.2 Registration

Workflow extensions contribute:

Node Identifier
Display Name
Configuration Schema
Supported Inputs
Supported Outputs
Validation Rules

Registration makes nodes discoverable without executing them.

16.3 Execution

Workflow nodes execute only when orchestrated by the Workflow Engine.

Nodes must remain stateless between executions.

Execution-specific information is obtained from the current ExecutionContext.

17. Configuration Extensions
17.1 Purpose

Plugins may extend the platform's configuration model.

Configuration extensions allow plugins to define their own configuration sections without modifying the Platform Kernel.

17.2 Configuration Schema

Each plugin may contribute:

Configuration Schema
Validation Rules
Default Values
Secret Definitions
Environment Variable Bindings

Configuration is validated during startup.

17.3 Secret Handling

Sensitive values such as API keys and credentials must be resolved through the Security Platform.

Plugins must never read secrets directly from configuration files.

18. Plugin Execution Context
18.1 Purpose

Plugins participate in platform executions through the immutable ExecutionContext.

The ExecutionContext provides execution-scoped information while preserving isolation and consistency.

18.2 Available Context

Plugins may access information such as:

Execution Identifier
Correlation Identifier
Tenant
Workspace
Project
User Identity
Authorization Context
Configuration Snapshot
Cancellation Token
Telemetry Context

The exact shape of the ExecutionContext is defined in Blueprint 01 and its dedicated blueprint.

18.3 Restrictions

Plugins must not:

Create a new ExecutionContext
Modify the current ExecutionContext
Persist execution-specific state outside the execution scope
Share execution state across executions

These restrictions preserve execution isolation.

19. Security Integration
19.1 Principle

Plugins operate under the governance of the Security Platform.

Security responsibilities remain centralized.

19.2 Permissions

Plugins declare the permissions they require.

Examples include:

Network Access
File System Access
Database Access
External API Access
Secret Access

Permissions are evaluated during validation and enforced during execution.

19.3 Trust Boundaries

Plugins are considered extensions of the platform but remain isolated from the Platform Kernel.

Sensitive platform operations require explicit authorization.

20. Observability Integration
20.1 Logging

Plugins use the platform logging infrastructure.

Log entries are automatically correlated with the current ExecutionContext.

20.2 Metrics

Plugins may emit custom metrics through the Observability Platform.

Metrics should describe behavior rather than implementation details.

20.3 Tracing

Plugin operations automatically participate in distributed traces.

Runtime propagates execution trace context, and Observability owns trace collection and diagnostics.

20.4 Health

Plugins may expose health information.

Health checks allow operators to determine whether a plugin is operational without executing business workflows.

21. Versioning & Compatibility
21.1 Semantic Versioning

Plugins follow semantic versioning.

Major: Breaking changes
Minor: Backward-compatible functionality
Patch: Fixes and optimizations
21.2 Platform Compatibility

Plugins declare the Platform API versions they support.

The Plugin Framework rejects incompatible plugins during validation.

21.3 Dependency Compatibility

Plugin dependencies are validated before activation.

Incompatible dependency graphs prevent plugin activation.

22. Plugin Isolation
22.1 Purpose

Plugin isolation protects the Platform Kernel from failures within individual plugins.

22.2 Isolation Principles

Plugins should not:

Modify Platform Kernel behavior
Access another plugin's internal implementation
Share mutable global state
Circumvent Capability Resolution
Bypass Security or Observability
22.3 Failure Isolation

A plugin failure should affect only the current execution unless explicitly configured otherwise.

The Runtime determines recovery behavior.

23. Cursor Implementation Guide
Objective

Cursor should implement the extensibility infrastructure rather than specific plugins.

Required Deliverables

Implement:

Plugin manifest model
Plugin discovery service
Validation pipeline
Dependency graph builder
Compatibility validator
Plugin registry
Provider registry integration
Capability registration pipeline
Tool registration pipeline
Workflow node registration pipeline
Configuration extension pipeline
Plugin lifecycle manager
Plugin activation/deactivation
Health integration
Logging integration
Metrics integration
Tracing integration
Deferred Responsibilities

Do not implement:

OpenAI plugin
Anthropic plugin
Pinecone plugin
Redis plugin
GitHub plugin
Slack plugin
Database plugins

Only build the extensibility platform. Individual plugins belong in separate implementations.

24. Acceptance Criteria

Blueprint 02 is considered complete when:

Plugins can be discovered deterministically.
Plugin manifests are validated.
Dependency graphs are resolved.
Compatibility checks are enforced.
Metadata is registered without instantiating providers.
Capabilities are registered with the Capability Registry.
Providers are registered with the Provider Registry.
Tools and workflow nodes are discoverable.
Configuration extensions are supported.
Plugin activation and deactivation are managed by the Plugin Framework.
Provider instances are created lazily.
Plugins participate in platform logging, metrics, tracing, and health monitoring.
Plugins operate through public contracts without direct Platform Kernel modification.
25. Chief Architect's Notes

The Plugin & Extension Framework is one of the defining characteristics of AgentForge. It enables the platform to evolve without requiring continual modification of the Platform Kernel.

A successful implementation should result in a Platform Kernel that remains small, stable, and focused on shared infrastructure, while most functional capabilities are introduced through plugins. This separation encourages modularity, simplifies testing, and allows organizations to customize deployments by selecting only the extensions they require.

The framework is intentionally metadata-driven. Discovery, validation, dependency resolution, compatibility checks, and registration occur before any provider is instantiated. This design minimizes startup costs, improves operational visibility, and ensures deterministic platform behavior.

Future blueprints—such as the AI Provider Framework, Tool Execution Framework, Knowledge Engine, and Memory Engine—should build upon this extensibility model rather than introducing their own independent extension mechanisms.
