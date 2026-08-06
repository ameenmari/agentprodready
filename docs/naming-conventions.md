# AgentForge Naming Conventions

**Version:** 1.0

---

# Purpose

This document defines the official naming conventions used throughout the AgentForge platform.

Consistent naming is essential for:

* Architectural clarity
* Maintainability
* Discoverability
* Cursor implementation consistency
* Documentation alignment

Every public symbol should communicate its architectural responsibility through its name.

---

# General Principles

Names should be:

* Explicit
* Descriptive
* Consistent
* Technology-independent
* Architecture-driven

Avoid abbreviations unless they are universally understood.

Prefer clarity over brevity.

---

# Package Naming

Package names use:

```text id="pkgname"
lowercase-kebab-case
```

Examples:

```text id="pkgexamples"
runtime

workflow

capability-resolution

prompt-builder

event-bus

memory

security

configuration
```

Avoid:

```text id="pkgbad"
RuntimeEngine

WorkflowPackage

WFEngine
```

---

# Folder Naming

Folders use:

```text id="foldercase"
lowercase-kebab-case
```

Examples:

```text id="folderexamples"
contracts/

providers/

events/

configuration/

diagnostics/

application/

domain/
```

---

# File Naming

TypeScript files use:

```text id="filename"
kebab-case.ts
```

Examples:

```text id="fileexamples"
execution-context.ts

capability-binding.ts

tool-provider.ts

memory-record.ts
```

---

# Interface Naming

Public interfaces begin with:

```text id="interfaceprefix"
I
```

Examples:

```text id="interfaceexamples"
IAIProvider

IToolProvider

IKnowledgeProvider

IMemoryRepository

IEventPublisher
```

Interfaces describe capabilities rather than implementations.

---

# Class Naming

Classes use:

```text id="classcase"
PascalCase
```

Examples:

```text id="classexamples"
Runtime

WorkflowEngine

CapabilityResolver

ExecutionContextFactory

PromptBuilder

MemoryEngine
```

Avoid unnecessary suffixes.

Bad:

```text id="classbad"
RuntimeManager

WorkflowProcessor

MemoryUtility

ToolHelper
```

---

# Abstract Classes

Prefix with:

```text id="abstractprefix"
Abstract
```

Examples:

```text id="abstractexamples"
AbstractProvider

AbstractWorkflowNode

AbstractMemoryProvider
```

---

# Provider Naming

Providers follow:

```text id="providerpattern"
<Technology>Provider
```

Examples:

```text id="providerexamples"
OpenAIProvider

AnthropicProvider

OllamaProvider

PostgresProvider

RedisProvider
```

---

# Adapter Naming

Adapters follow:

```text id="adapterpattern"
<Technology>Adapter
```

Examples:

```text id="adapterexamples"
OpenAIAdapter

SlackAdapter

GitHubAdapter

SMTPAdapter
```

---

# Repository Naming

Repositories follow:

```text id="repositorypattern"
<Entity>Repository
```

Examples:

```text id="repositoryexamples"
MemoryRepository

AuditRepository

WorkflowRepository
```

Repositories should represent persistence contracts rather than database technologies.

---

# Factory Naming

Factories follow:

```text id="factorypattern"
<Entity>Factory
```

Examples:

```text id="factoryexamples"
ExecutionContextFactory

ProviderFactory

WorkflowFactory
```

Factories create objects.

They do not coordinate workflows.

---

# Resolver Naming

Resolvers determine selections.

Examples:

```text id="resolverexamples"
CapabilityResolver

ConfigurationResolver

PolicyResolver
```

Resolvers never instantiate implementations.

---

# Builder Naming

Builders construct immutable artifacts.

Examples:

```text id="builderexamples"
PromptBuilder

ContextBuilder

ExecutionPlanBuilder
```

Builders should not execute business logic.

---

# Strategy Naming

Strategies encapsulate replaceable algorithms.

Examples:

```text id="strategyexamples"
RetryStrategy

RankingStrategy

SelectionStrategy
```

---

# Validator Naming

Validators perform validation.

Examples:

```text id="validatorexamples"
WorkflowValidator

PromptValidator

ConfigurationValidator
```

Validators return validation results.

They do not throw business exceptions for expected validation failures.

---

# Event Naming

Platform Events use the past tense.

Examples:

```text id="eventexamples"
WorkflowStarted

MemoryStored

ToolExecuted

EvaluationCompleted

PromptBuilt
```

Avoid imperative names.

Bad:

```text id="eventbad"
ExecuteWorkflow

RunPrompt

StoreMemory
```

Events describe facts.

---

# Request Naming

Requests follow:

```text id="requestpattern"
<Entity>Request
```

Examples:

```text id="requestexamples"
ToolExecutionRequest

MemorySearchRequest

PromptBuildRequest
```

---

# Response Naming

Responses follow:

```text id="responsepattern"
<Entity>Response
```

Examples:

```text id="responseexamples"
PromptResponse

KnowledgeResponse

WorkflowResponse
```

---

# Result Naming

Results represent normalized platform outcomes.

Examples:

```text id="resultexamples"
EvaluationResult

KnowledgeRetrievalResult

MemoryRetrievalResult

ToolExecutionResult
```

---

# Error Naming

Errors follow:

```text id="errorpattern"
<Entity>Error
```

Examples:

```text id="errorexamples"
ProviderError

CapabilityResolutionError

WorkflowError

ValidationError
```

Technology-specific exceptions remain internal.

---

# Configuration Naming

Configuration classes follow:

```text id="configpattern"
<Entity>Configuration
```

Examples:

```text id="configexamples"
RuntimeConfiguration

MemoryConfiguration

ProviderConfiguration
```

---

# Policy Naming

Policies follow:

```text id="policypattern"
<Entity>Policy
```

Examples:

```text id="policyexamples"
RetentionPolicy

RetryPolicy

AuthorizationPolicy

ExecutionPolicy
```

---

# Test Naming

Test files follow:

```text id="testpattern"
<component>.spec.ts
```

Examples:

```text id="testexamples"
runtime.spec.ts

workflow.spec.ts

prompt-builder.spec.ts
```

Integration tests may use:

```text id="integrationpattern"
.integration.spec.ts
```

---

# Constants

Constants use:

```text id="constantpattern"
UPPER_SNAKE_CASE
```

Examples:

```text id="constexamples"
DEFAULT_TIMEOUT

MAX_RETRY_COUNT

DEFAULT_PROVIDER
```

---

# Variables

Variables use:

```text id="variablepattern"
camelCase
```

Examples:

```text id="variableexamples"
executionContext

memoryRecord

providerResult

workflowState
```

Names should be descriptive.

Avoid:

```text id="variablebad"
obj

tmp

data

value

item
```

unless the scope is extremely small.

---

# Boolean Variables

Boolean names should read naturally.

Examples:

```text id="booleanexamples"
isAuthorized

hasMemory

canRetry

shouldExecute

isComplete
```

---

# Enumeration Naming

Enums use:

```text id="enumpattern"
PascalCase
```

Values use:

```text id="enumvalues"
PascalCase
```

Example:

```text id="enumexample"
ExecutionStatus

Pending

Running

Completed

Failed
```

---

# Acronyms

Use common acronyms consistently.

Examples:

```text id="acronyms"
API

SDK

CLI

ADR

DTO

URL

HTTP

JSON
```

Do not invent new abbreviations.

---

# Avoid Generic Names

Avoid:

* Manager
* Processor
* Utility
* Helper
* Common
* Misc
* Base
* Stuff
* Temp

Every name should communicate responsibility.

---

# Final Principle

Names are part of the architecture.

A developer should be able to understand a component's responsibility from its name before reading its implementation.

When in doubt:

1. Use the terminology defined in `glossary.md`.
2. Follow the corresponding Engineering Blueprint.
3. Prefer explicit architectural names over generic software terms.
