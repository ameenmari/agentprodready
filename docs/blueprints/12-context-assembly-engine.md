AgentForge
Engineering Blueprint 12
Context Assembly Engine

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

1. Purpose

The Context Assembly Engine defines the standardized architecture through which AgentForge composes execution-ready context from multiple platform information sources.

Its purpose is to transform normalized platform information into a coherent Execution Context Package suitable for downstream consumers while remaining independent of prompt construction, AI providers, storage technologies, and retrieval implementations.

The Context Assembly Engine does not retrieve information.

It assembles information that has already been retrieved and normalized by other platform services.

The Context Assembly Engine is the platform's execution-context composition layer.

2. Responsibilities

The Context Assembly Engine owns:

Context composition
Context prioritization
Context filtering
Context ordering
Context budgeting
Context packaging
Context diagnostics
Context observability

The Context Assembly Engine does not own:

Knowledge retrieval
Memory retrieval
Prompt construction
AI provider interaction
Runtime scheduling
Workflow interpretation
Tool execution
Capability resolution
Security authorization
4. Blueprint Dependencies

Depends upon:

Blueprint 01–11

Future dependent blueprints:

Prompt Builder
Evaluation Framework
Agent Framework
5. Consumes → Produces → Owns
Consumes
ExecutionContext
Execution Plan
Workflow State
Knowledge Retrieval Result
Memory Retrieval Result
Runtime Metadata
Assembly Policies
Produces

Execution Context Package

Owns

Provider-independent context composition and packaging.

6. Architectural Position
Knowledge Engine
        │
Knowledge Retrieval Result
        │
        ├─────────────┐
        ▼             │
Memory Engine         │
        │             │
Memory Retrieval      │
Result                │
        │             │
        ▼             ▼
ExecutionContext   Workflow State
        │             │
        └──────┬──────┘
               ▼
      Context Assembly Engine
               │
               ▼
    Execution Context Package
               │
               ▼
        Prompt Builder

The Context Assembly Engine is intentionally positioned between retrieval and prompt construction.

It knows nothing about prompt syntax or AI provider APIs.

7. Context Philosophy

Context represents execution-specific information assembled for a single execution.

Unlike Knowledge, which represents externally acquired information, or Memory, which represents execution-derived experience, Context exists only to support a specific execution.

Context is therefore:

Execution-derived and execution-scoped
Immutable once assembled
Deterministic for identical inputs and policies
Independent of prompt formatting

The Execution Context Package is the only public output of the Context Assembly Engine.

Architectural Rationale

Blueprint 12 establishes an important architectural separation: Context is neither Knowledge nor Memory. Knowledge answers what the platform knows, Memory answers what the platform has experienced, and Context answers what information is relevant for this execution. By introducing the Execution Context Package as a normalized platform contract, the architecture prevents prompt construction concerns from leaking into retrieval services while allowing future consumers—such as evaluation, simulation, workflow inspection, and debugging—to reuse assembled context without depending on AI-specific prompt formats.

Architectural Consequences

Every major subsystem exposes a single, stable public contract while encapsulating its internal complexity. The Context Assembly Engine is intentionally pure—it retrieves nothing, stores nothing, executes nothing, and invokes no AI providers. It composes normalized platform information into an immutable execution context. This purity keeps the component easy to reason about, test, and evolve while giving the Prompt Builder a clean, technology-independent input contract.



## Part II — Context Composition & Assembly Architecture

---

# 8. Context Assembly Request

## 8.1 Purpose

A Context Assembly Request represents a standardized request to compose execution-specific context from previously retrieved and normalized platform information.

It is the public input contract of the Context Assembly Engine.

The request describes the execution for which context is required without prescribing prompt formats, AI-provider requirements, or presentation structures.

---

## 8.2 Request Derivation

The Runtime coordinates creation of the Context Assembly Request from:

* ExecutionContext
* Node Execution Contract
* Workflow State
* Execution Plan
* Assembly Policies


Conceptually:

```text
ExecutionContext
        │
        ▼
Node Execution Contract
        │
        ▼
Workflow State
        │
        ▼
Context Assembly Request
        │
        ▼
Context Assembly Engine
```

The Context Assembly Engine consumes the request.

It does not create execution scopes or Runtime execution policies.

---

## 8.3 Characteristics

Every Context Assembly Request must be:

* Immutable
* Execution-scoped
* Tenant-aware
* Serializable
* Observable
* Traceable
* Deterministic

---

# 9. Context Sources

The Context Assembly Engine composes context from normalized platform contracts.

Primary context sources include:

### ExecutionContext

Execution identity and execution-scoped metadata.

---

### Workflow State

Current workflow position.

Execution progress.

Active branch.

Execution history.

---

### Execution Plan

Objective.

Execution strategy.

Execution requirements.

---

### Knowledge Retrieval Result

Relevant external knowledge.

---

### Memory Retrieval Result

Relevant execution-derived experience.

---

### Runtime Metadata

Execution metadata.

Cancellation state.

Resource information.

Execution diagnostics.

Runtime metadata is consumed by the Context Assembly Engine but remains owned and controlled by the Runtime.

---

### Assembly Policies

Policies governing context composition.

Additional context sources may be introduced without modifying the architectural responsibilities of the Context Assembly Engine.

---

# 10. Context Composition

## 10.1 Purpose

Context Composition combines normalized information from multiple platform sources into a coherent execution view.

Composition does not modify the source information.

It organizes it.

---

## 10.2 Composition Principles

Composition must preserve:

* Traceability
* Source identity
* Security boundaries
* Ownership metadata
* Ordering metadata

Composition must never lose the origin of assembled information.

---

## 10.3 Composition Independence

The Context Assembly Engine does not interpret knowledge.

It does not reinterpret memory.

It does not transform prompts.

It assembles.

---

# 11. Context Prioritization

Multiple information sources may compete for limited execution context.

The Context Assembly Engine applies prioritization policies to determine which information contributes most effectively to the current execution.

Possible prioritization signals include:

* Relevance
* Importance
* Confidence
* Source authority
* Execution objective
* Workflow state
* User policy
* Tenant policy

Prioritization policies remain configurable.

---

# 12. Context Filtering

Not every retrieved item belongs in the execution context.

Filtering removes information that is:

* irrelevant
* duplicated
* obsolete
* expired
* outside execution scope
* outside security scope

Filtering never changes source information.

It affects only the assembled context.

---

# 13. Context Budgeting

## 13.1 Purpose

Execution context is a bounded resource.

The Context Assembly Engine applies budgeting policies before producing an Execution Context Package.

Budgeting remains independent of any particular AI provider.

---

## 13.2 Budget Dimensions

Budgets may consider:

* Maximum context size
* Information priority
* Memory allocation
* Knowledge allocation
* Workflow allocation
* Metadata allocation
* Future consumer requirements

Budgeting policies remain configurable.

---

## 13.3 Architectural Boundary

The Context Assembly Engine manages logical context budgets.

Prompt Builder later converts logical budgets into provider-specific prompt budgets.

This separation prevents provider-specific token limits from leaking into the Context Assembly Engine.

---

# 14. Context Ordering

The order of assembled information influences downstream consumers.

Ordering policies determine the sequence of context elements.

Possible ordering dimensions include:

* Execution priority
* Workflow order
* Temporal order
* Relevance
* Source grouping
* Policy

Ordering remains deterministic for identical inputs and policies.

---

# 15. Context Assembly Pipeline

Every assembly operation follows the same conceptual pipeline.

```text
Context Assembly Request
        │
        ▼
Request Validation
        │
        ▼
Source Collection
        │
        ▼
Security Scope Enforcement
        │
        ▼
Composition
        │
        ▼
Filtering
        │
        ▼
Prioritization
        │
        ▼
Budgeting
        │
        ▼
Ordering
        │
        ▼
Execution Context Package
```

The Context Assembly Engine owns the semantic stages.

The Runtime owns execution scheduling, timeout, retry, cancellation, and recovery.

---

# 16. Execution Context Package

## 16.1 Purpose

The Execution Context Package is the sole public output of the Context Assembly Engine.

It contains execution-ready information assembled from multiple normalized platform contracts.

The Runtime-owned `ExecutionContext` and the Execution Context Package are distinct contracts. `ExecutionContext` is an immutable execution-scoped contract carrying stable identity, authority, and snapshot references; mutable operational progress lives in dedicated Runtime execution-state structures. The Execution Context Package is an immutable Context Assembly artifact.

It is intentionally independent of:

* Prompt syntax
* AI providers
* Chat message formats
* LLM APIs

---

## 16.2 Characteristics

Every Execution Context Package is:

* Immutable
* Execution-scoped
* Provider-independent
* Security-filtered
* Traceable
* Serializable
* Observable

Downstream services may persist an Execution Context Package for replay, audit, evaluation, or diagnostics without transferring persistence ownership to the Context Assembly Engine.

---

## 16.3 Conceptual Structure

```text
Execution Context Package
│
├── Execution Information
├── Workflow Information
├── Knowledge Context
├── Memory Context
├── Runtime Context
├── Context Metadata
├── Diagnostics Reference
└── Assembly Metadata
```

The implementation may evolve while preserving the normalized contract.

---

# 17. Context Diagnostics

The Context Assembly Engine produces diagnostics describing:

* Sources used
* Sources omitted
* Budget decisions
* Filtering decisions
* Prioritization decisions
* Ordering policy
* Assembly duration
* Policy versions

Diagnostics must never expose unauthorized information.

---

# 18. Context Observability

The Context Assembly Engine contributes context-specific telemetry.

Examples include:

* Assembly duration
* Context size
* Knowledge contribution
* Memory contribution
* Filter rate
* Budget utilization
* Policy usage
* Assembly failures

Execution-level telemetry remains owned by the Runtime.

---

# 19. Context Ownership Boundaries

The Context Assembly Engine may:

* Compose context
* Filter context
* Prioritize context
* Budget context
* Order context
* Produce Execution Context Packages
* Produce diagnostics
* Publish context events

The Context Assembly Engine must not:

* Retrieve knowledge
* Retrieve memory
* Build prompts
* Execute AI providers
* Execute tools
* Schedule Runtime work
* Make authorization decisions
* Modify source information
* Persist assembled context as platform memory

---

# Chief Architect Notes

Part II establishes the Context Assembly Engine as a **pure composition service**.

One of the most important architectural decisions is the separation between **logical context** and **prompt representation**.

The Context Assembly Engine determines *what information belongs to an execution*.

The Prompt Builder later determines *how that information is represented for a particular AI provider*.

This distinction prevents provider-specific concerns from leaking into context composition and allows the same Execution Context Package to support AI execution, evaluation, debugging, workflow inspection, simulation, and future platform capabilities without modification.

Another important principle is that the Context Assembly Engine never changes its inputs. Knowledge remains Knowledge. Memory remains Memory. Workflow remains Workflow. The engine simply composes those normalized contracts into a coherent execution view while preserving traceability, security boundaries, and source identity.







## Part III — Context Packaging, Policies & Platform Contracts

---

# 20. Context Policies

## 20.1 Purpose

Context Policies govern how normalized platform information is assembled into an Execution Context Package.

Policies influence composition behavior without changing the architectural responsibilities of the Context Assembly Engine.

---

## 20.2 Policy Categories

Examples include:

* Composition Policy
* Filtering Policy
* Prioritization Policy
* Budget Policy
* Ordering Policy
* Security Policy
* Consumer Policy
* Tenant Policy

Policies remain configurable and versioned.

---

## 20.3 Policy Independence

Policies describe **how context should be assembled**.

They do not retrieve information, invoke AI providers, or modify source information.

---

# 21. Context Consumers

The Execution Context Package is intentionally reusable.

Possible consumers include:

* Prompt Builder
* Evaluation Framework
* Agent Framework
* Workflow Diagnostics
* Execution Inspection
* Simulation
* Testing
* Future platform services

The Context Assembly Engine remains independent of every consumer.

Consumers determine how context is interpreted.

---

# 22. Consumer Independence

Different consumers may require different representations.

The Context Assembly Engine always produces the same normalized Execution Context Package.

Consumers remain responsible for adapting that package to their own requirements.

Examples:

Prompt Builder

↓

Prompt

Evaluation Framework

↓

Evaluation Dataset

Simulation

↓

Simulation State

Workflow Diagnostics

↓

Diagnostic View

The Context Assembly Engine never produces consumer-specific outputs.

---

# 23. Security Boundary

The Context Assembly Engine consumes authorization outcomes supplied through the ExecutionContext and Security Platform.

The Security Platform determines authorization. The Context Assembly Engine only enforces the supplied security constraints.

It does not interpret authorization policies.

It does not expand permissions.

It does not bypass security.

It simply preserves the security boundaries already established by upstream platform services.

If multiple context sources contain incompatible security scopes, only information authorized for the current execution may be assembled.

---

# 24. Context Immutability

Once assembled, an Execution Context Package becomes immutable.

Consumers must treat the package as read-only.

Any modification requires creation of a new Execution Context Package through the Context Assembly Engine.

This guarantees:

* Determinism
* Traceability
* Reproducibility
* Consistent diagnostics
* Reliable auditing

---

# 25. Context Versioning

Every Execution Context Package shall carry sufficient version metadata to identify:

* Assembly Policy Version
* Knowledge Version
* Memory Version
* Workflow Version
* Execution Plan Version
* Platform Version
* Context Package Schema Version
* Source Contract Versions

Versioning supports reproducibility, diagnostics, replay, and future auditing.

---

# 26. Empty & Partial Context

Context assembly may legitimately produce:

* Minimal context
* Partial context
* Empty knowledge contribution
* Empty memory contribution

These outcomes are not automatically failures.

The Runtime determines whether execution may continue under the applicable execution policies.

---

# 27. Context Events

The Context Assembly Engine publishes lifecycle events.

Examples include:

* Context Assembly Started
* Context Sources Collected
* Context Filtered
* Context Prioritized
* Context Budget Applied
* Context Ordered
* Context Assembled
* Context Assembly Failed

Events remain immutable, correlated through the ExecutionContext, and versioned.

---

# 28. Failure Normalization

Technology-specific failures must never cross the Context Assembly Engine boundary.

Failures originating from upstream platform services remain normalized according to their respective subsystem contracts.

The Context Assembly Engine reports only normalized Context Assembly Errors.

Examples include:

* Context Assembly Failed
* Invalid Context Request
* Policy Evaluation Failed
* Context Budget Exceeded
* Context Validation Failed
* Assembly Pipeline Failure

Operational decisions regarding retry, timeout, cancellation, recovery, and execution continuation remain Runtime responsibilities.

---

# 29. Cursor Implementation Guide

## 29.1 Objective

Cursor should implement a deterministic, provider-independent Context Assembly Engine that composes normalized platform contracts into immutable Execution Context Packages.

The implementation should establish contracts and reference implementations rather than consumer-specific behavior.

---

## 29.2 Required Deliverables

Implement:

* Context Assembly Request
* Context Composition Pipeline
* Context Policy abstractions
* Context Filtering
* Context Prioritization
* Context Budgeting
* Context Ordering
* Execution Context Package
* Context Diagnostics
* Context Events
* Normalized Context Errors
* Observability integration

---

## 29.3 Reference Implementations

Cursor may create lightweight reference implementations for:

* Default Context Policy
* Deterministic Ordering Policy
* Priority-based Filtering Policy
* Fixed Budget Policy

Reference implementations must remain replaceable.

---

## 29.4 Deferred Responsibilities

Do not implement within Blueprint 12:

* Prompt templates
* Prompt rendering
* AI provider requests
* Chat message generation
* Tool execution
* Knowledge retrieval
* Memory retrieval
* Runtime scheduling
* Workflow interpretation
* Security policy engine

These responsibilities belong to other blueprints.

---

# 30. Testing Requirements

The Context Assembly Engine must include automated tests covering:

* Deterministic assembly
* Policy evaluation
* Filtering
* Prioritization
* Budget enforcement
* Ordering
* Source traceability
* Security preservation
* Immutability
* Serialization
* Empty context
* Partial context
* Diagnostics
* Event publication
* Error normalization

Contract tests should verify that consumer-specific behavior cannot leak into the Context Assembly Engine.

---

# 31. Acceptance Criteria

Blueprint 12 is complete when:

* Context is assembled only from normalized platform contracts.
* Knowledge retrieval remains external to the Context Assembly Engine.
* Memory retrieval remains external to the Context Assembly Engine.
* Source information is never modified during assembly.
* Context policies remain configurable and versioned.
* Security boundaries are preserved throughout assembly.
* Execution Context Packages are immutable.
* Consumer-specific representations are not produced.
* Technology-specific failures are normalized.
* Context diagnostics, telemetry, and events are available.
* Prompt construction does not exist within the Context Assembly Engine.

---

# 32. Ownership Boundaries

## The Context Assembly Engine may:

* Compose execution context
* Filter context
* Prioritize context
* Budget context
* Order context
* Produce Execution Context Packages
* Publish context events
* Produce diagnostics

## The Context Assembly Engine must not:

* Retrieve knowledge
* Retrieve memory
* Execute tools
* Execute AI providers
* Build prompts
* Schedule Runtime execution
* Make authorization decisions
* Persist execution memory
* Modify normalized source contracts

---

# Chief Architect's Notes

Blueprint 12 establishes one of AgentForge's most important architectural principles:

**Context is a first-class platform contract, not an AI artifact.**

The Context Assembly Engine exists solely to compose execution-relevant information from normalized platform services into a reusable Execution Context Package.

By separating context assembly from retrieval, prompt construction, execution orchestration, and AI provider interaction, the platform ensures that the same assembled context can support multiple downstream consumers without modification.

This architectural decision makes Context a reusable platform capability rather than a transient step in an AI request.

---

# Platform Architecture

```text
                 Planning
                     │
             Execution Plan
                     │
              Workflow Engine
                     │
                 Runtime
                     │
             ExecutionContext
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
 Knowledge       Memory        Workflow State
 Retrieval       Retrieval
   Result          Result
      │              │
      └──────┬───────┘
             ▼
     Context Assembly Engine
             │
     Execution Context Package
             │
      ┌──────┼──────────────┐
      ▼      ▼              ▼
 Prompt   Evaluation     Simulation
 Builder  Framework      Framework
```

---

