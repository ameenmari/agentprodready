AgentForge
Engineering Blueprint 13
Prompt Builder

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

1. Purpose

The Prompt Builder defines the standardized architecture through which AgentForge transforms an Execution Context Package into a structured, consumer-ready Prompt Package.

Its purpose is to organize execution context into a presentation suitable for downstream AI consumers while remaining independent of AI providers, model APIs, transport protocols, and provider-specific message formats.

The Prompt Builder does not retrieve information, assemble context, select models, or invoke AI providers.

It is the platform's prompt composition and presentation layer.

2. Responsibilities

The Prompt Builder owns:

Prompt composition
Prompt organization
Instruction composition
Prompt section ordering
Variable substitution
Prompt formatting
Prompt diagnostics
Prompt observability

The Prompt Builder does not own:

Knowledge retrieval
Memory retrieval
Context assembly
AI provider selection
Capability resolution
Runtime execution
Workflow interpretation
Tool execution
Security authorization
4. Blueprint Dependencies

Depends upon:

Blueprint 01–12

Future dependent blueprints:

Evaluation Framework
Agent Framework
Multi-Agent Collaboration
5. Consumes → Produces → Owns
Consumes
Execution Context Package
Prompt Policies
Consumer Requirements
Produces

Prompt Package

Owns

Provider-independent prompt composition and presentation.

6. Architectural Position
Context Assembly Engine
          │
Execution Context Package
          │
          ▼
     Prompt Builder
          │
     Prompt Package
          │
          ▼
 AI Provider Framework
          │
          ▼
 Provider Adapter
          │
          ▼
 Provider-specific Request

The Prompt Builder is intentionally positioned between Context Assembly and the AI Provider Framework.

It never communicates directly with provider SDKs or external APIs.

7. Prompt Philosophy

A Prompt is not knowledge.

It is not memory.

It is not context.

A Prompt is a structured presentation of execution context for a particular class of consumer.

The Prompt Builder therefore owns representation, not information.

The Prompt Package is the only public output of the Prompt Builder.

Architectural Rationale

Blueprint 13 introduces one of the final major separations in the AgentForge architecture: Context answers what information is relevant; Prompt answers how that information should be presented.

This distinction prevents prompt templates, provider-specific message formats, and model limitations from leaking backward into the Context Assembly Engine, Knowledge Engine, or Memory Engine.

The Prompt Builder does not determine what information belongs to an execution—that responsibility was completed by Blueprint 12. Likewise, it does not determine which AI provider will ultimately consume the prompt—that responsibility belongs to the AI Provider Framework.

Instead, the Prompt Builder acts as a pure presentation layer that transforms an immutable Execution Context Package into an immutable Prompt Package, preserving the platform's consistent pattern of normalized contracts.

Architectural Consequences

This blueprint continues a pattern that is now becoming one of AgentForge's defining characteristics:

Planning Engine
        │
Execution Plan

Workflow Engine
        │
Workflow Definition

Knowledge Engine
        │
Knowledge Retrieval Result

Memory Engine
        │
Memory Retrieval Result

Context Assembly Engine
        │
Execution Context Package

Prompt Builder
        │
Prompt Package

AI Provider Framework
        │
Normalized AI Result

Every subsystem exposes one stable public contract and hides its internal implementation.


## Part II — Prompt Composition & Presentation Architecture

---

# 8. Prompt Build Request

## 8.1 Purpose

A Prompt Build Request represents a standardized request to transform an immutable Execution Context Package into a consumer-ready Prompt Package.

It is the public input contract of the Prompt Builder.

The request specifies the execution context, consumer requirements, and prompt composition policies without exposing provider-specific request formats or transport protocols.

---

## 8.2 Request Derivation

The Runtime coordinates creation of the Prompt Build Request from:

* Execution Context Package
* Consumer Requirements
* Prompt Policies
* Correlation Metadata

Correlation Metadata may identify the execution for tracing, diagnostics, and event correlation. It must not expose, duplicate, or replace the Runtime's operational `ExecutionContext`.

Conceptually:

```text
Execution Context Package
          │
          ▼
Consumer Requirements
          │
          ▼
Prompt Policies
          │
          ▼
Prompt Build Request
          │
          ▼
Prompt Builder
```

The Prompt Builder consumes the request.

It does not retrieve additional information, invoke AI providers, or modify execution state.

---

## 8.3 Characteristics

Every Prompt Build Request must be:

* Immutable
* Execution-scoped
* Provider-independent
* Consumer-aware
* Serializable
* Observable
* Traceable

---

# 9. Prompt Sources

The Prompt Builder composes prompts exclusively from normalized platform contracts.

Possible sources include:

* Execution Context Package
* Consumer Requirements
* Prompt Policies
* Platform Instructions
* Execution Metadata

Prompt Builder never retrieves Knowledge or Memory directly.

All information must already exist inside the Execution Context Package or supplied build request.

---

# 10. Prompt Composition

## 10.1 Purpose

Prompt Composition determines **what information appears in a prompt** and **how that information is logically organized**.

Composition is independent of formatting.

---

## 10.2 Composition Principles

Composition must preserve:

* Traceability
* Source provenance
* Security boundaries
* Execution intent
* Information ordering

Composition must never modify the semantic meaning of the source information.

---

## 10.3 Composition Independence

The Prompt Builder:

* does not retrieve information
* does not summarize information
* does not reinterpret information
* does not generate new information

It organizes existing normalized information into a coherent prompt structure.

The Prompt Builder may perform presentation transformations such as section wrapping, canonical serialization, escaping, ordering, omission, and formatting. It must not perform semantic transformations such as summarization, inference, rewriting, interpretation, or generation of new information unless a separate capability and blueprint explicitly authorize such behavior.

---

# 11. Prompt Sections

Prompt composition organizes information into logical sections.

Possible sections include:

* System Instructions
* Execution Objective
* Workflow Context
* Knowledge Context
* Memory Context
* Operational Constraints
* User Input
* Supporting Information

Not every consumer requires every section.

Section selection remains policy-driven.

---

# 12. Prompt Prioritization

When prompt size is constrained, the Prompt Builder applies prioritization policies.

Signals may include:

* Execution importance
* Information priority
* Consumer requirements
* Workflow phase
* Policy configuration

The Prompt Builder prioritizes presentation only.

Information selection has already occurred during Context Assembly.

---

# 13. Prompt Budgeting

## 13.1 Purpose

Different consumers may impose different prompt-size limitations.

Prompt Builder applies presentation budgets without changing the semantic content of the Execution Context Package.

---

## 13.2 Budget Categories

Budgets may consider:

* Prompt length
* Section allocation
* Instruction allocation
* Context allocation
* Metadata allocation
* Consumer limits

Budget policies remain configurable.

---

## 13.3 Architectural Boundary

Prompt Builder manages logical presentation budgets.

Provider-specific token accounting remains the responsibility of the AI Provider Framework.

This prevents provider-specific model limitations from leaking into Prompt Builder.

Prompt budgeting may omit, truncate, or reduce presentation elements only through explicit, deterministic policies. It must not silently rewrite semantic content. When information cannot fit without changing its meaning, the Prompt Builder must report an explicit budget outcome rather than inventing or semantically compressing the source material.

---

# 14. Prompt Ordering

The sequence of prompt sections affects downstream consumers.

Prompt Ordering determines the presentation order of composed sections.

Possible ordering strategies include:

* Instruction-first
* Objective-first
* Context-first
* Policy-driven
* Consumer-specific

Ordering remains deterministic for identical inputs and policies.

---

# 15. Prompt Composition Pipeline

Every prompt composition operation follows a deterministic pipeline.

```text
Prompt Build Request
        │
        ▼
Request Validation
        │
        ▼
Source Collection
        │
        ▼
Policy Evaluation
        │
        ▼
Composition
        │
        ▼
Section Selection
        │
        ▼
Budgeting
        │
        ▼
Ordering
        │
        ▼
Prompt Package
```

The Prompt Builder owns the semantic stages.

The Runtime owns execution scheduling, timeout, retry, cancellation, and recovery.

---

# 16. Prompt Package

## 16.1 Purpose

The Prompt Package is the sole public output of the Prompt Builder.

It represents a structured, provider-independent prompt suitable for downstream consumer adaptation.

The Prompt Package is intentionally **not** a provider request.

---

## 16.2 Characteristics

Every Prompt Package is:

* Immutable
* Provider-independent
* Consumer-aware
* Traceable
* Serializable
* Observable

---

## 16.3 Conceptual Structure

```text
Prompt Package
│
├── Prompt Instructions
├── Prompt Sections
├── Context References
├── Presentation Metadata
├── Consumer Metadata
├── Diagnostics Reference
└── Prompt Metadata
```

The concrete representation may evolve while preserving the normalized contract.

---

# 17. Consumer Adaptation

Different consumers may require different prompt representations.

Examples include:

* Conversational AI
* Reasoning Models
* Multimodal Models
* Evaluation Systems
* Simulation Engines
* Future platform consumers

The Prompt Builder produces one canonical Prompt Package.

Consumer-specific adaptation occurs after Prompt Builder.

---

# 18. Prompt Diagnostics

Prompt Builder produces diagnostics describing:

* Sections included
* Sections omitted
* Ordering decisions
* Budget decisions
* Policy versions
* Build duration
* Consumer profile

Diagnostics must never expose unauthorized information.

---

# 19. Prompt Observability

Prompt Builder contributes domain-specific telemetry.

Examples include:

* Prompt build duration
* Prompt size
* Section distribution
* Budget utilization
* Policy usage
* Consumer usage
* Prompt build failures

Execution-level telemetry remains owned by the Runtime.

---

# Chief Architect Notes

Part II establishes Prompt Builder as a **presentation engine**, not a retrieval engine and not an AI engine.

One of the most important architectural decisions is the separation between **prompt composition** and **provider adaptation**.

The Prompt Builder decides **how execution context should be represented logically**.

The AI Provider Framework later decides **how that representation is translated into provider-specific requests**.

This keeps provider-specific concerns outside Prompt Builder while preserving a single canonical Prompt Package for every downstream consumer.

Another important principle is that Prompt Builder never creates knowledge, memory, or execution context.

It presents already-assembled information in a structured form while preserving provenance, traceability, and execution intent.


## Part III — Prompt Policies, Consumer Adaptation & Platform Contracts

---

# 20. Prompt Policies

## 20.1 Purpose

Prompt Policies govern how an Execution Context Package is transformed into a Prompt Package.

Policies influence prompt composition without changing the responsibilities of the Prompt Builder.

---

## 20.2 Policy Categories

Examples include:

* Composition Policy
* Section Selection Policy
* Ordering Policy
* Budget Policy
* Instruction Policy
* Consumer Policy
* Formatting Policy
* Tenant Policy

Policies remain configurable, deterministic, and versioned.

---

## 20.3 Policy Independence

Prompt Policies define **how prompts are composed**.

They do not:

* retrieve information
* invoke AI providers
* execute tools
* assemble context
* determine authorization
* modify source information

---

# 21. Prompt Formatting

## 21.1 Purpose

Prompt Formatting converts the logical Prompt Package into a canonical presentation structure.

Formatting is intentionally independent of provider-specific request models.

---

## 21.2 Formatting Principles

Formatting must preserve:

* Semantic meaning
* Section ordering
* Source provenance
* Security boundaries
* Instruction hierarchy

Formatting must never modify the meaning of composed information.

---

## 21.3 Formatting Independence

Formatting is distinct from provider translation.

Examples:

Prompt Package

↓

Canonical Prompt Representation

↓

AI Provider Framework

↓

Provider-specific Request

The Prompt Builder never produces provider-native request objects.

---

# 22. Consumer Profiles

Different consumers may require different prompt structures.

Consumer Profiles describe presentation requirements without exposing provider implementations.

Examples include:

* Conversational AI
* Reasoning Models
* Coding Assistants
* Evaluation Systems
* Simulation Engines
* Multimodal Consumers
* Future platform consumers

Profiles remain provider-independent.

Consumer Profiles may define presentation requirements, section preferences, supported modalities, formatting constraints, and logical budget requirements. They must not retrieve information, invoke capabilities, select models or providers, determine authorization, introduce business logic, or alter the semantics of source information.

---

# 23. Provider Translation Boundary

The Prompt Builder does not translate prompts into provider-specific formats.

Translation belongs exclusively to the AI Provider Framework.

Conceptually:

```text id="vf7o3u"
Prompt Builder
        │
Prompt Package
        │
        ▼
AI Provider Framework
        │
Provider Adapter
        │
        ▼
Provider-native Request
```

Examples include:

* OpenAI message arrays
* Claude message structures
* Gemini request payloads
* Ollama request models
* Azure AI payloads

These remain implementation details of the AI Provider Framework.

---

# 24. Prompt Immutability

Once produced, a Prompt Package becomes immutable.

Consumers must treat it as read-only.

Any modification requires creation of a new Prompt Package through the Prompt Builder.

This guarantees:

* Determinism
* Reproducibility
* Traceability
* Reliable diagnostics
* Consistent evaluation

---

# 25. Prompt Versioning

Every Prompt Package shall include sufficient version metadata to identify:

* Prompt Package Schema Version
* Prompt Policy Version
* Context Package Version
* Consumer Profile Version
* Platform Version

Version metadata supports:

* Replay
* Evaluation
* Diagnostics
* Testing
* Reproducibility

---

# 26. Empty & Partial Prompt Packages

Prompt Builder may legitimately produce:

* Minimal prompts
* Partial prompt sections
* Consumer-specific omissions

These outcomes are not automatically failures.

The Runtime determines whether execution continues according to platform policies.

---

# 27. Prompt Events

Prompt Builder publishes lifecycle events.

Examples include:

* Prompt Build Started
* Prompt Composition Completed
* Prompt Budget Applied
* Prompt Ordered
* Prompt Built
* Prompt Build Failed

Events remain immutable, correlated through the ExecutionContext, and versioned.

---

# 28. Failure Normalization

Technology-specific failures must never cross the Prompt Builder boundary.

Prompt Builder reports only normalized Prompt Errors.

Examples include:

* Prompt Build Failed
* Invalid Prompt Request
* Policy Evaluation Failed
* Budget Policy Failure
* Formatting Failure
* Prompt Validation Failure

Failures originating from Context Assembly, Knowledge, Memory, or AI Providers remain normalized by their own respective subsystems.

Operational decisions regarding retry, timeout, cancellation, recovery, and execution continuation remain Runtime responsibilities.

---

# 29. Cursor Implementation Guide

## 29.1 Objective

Cursor should implement a deterministic, provider-independent Prompt Builder capable of transforming Execution Context Packages into immutable Prompt Packages.

The implementation should establish platform contracts and reference implementations rather than provider-specific behavior.

---

## 29.2 Required Deliverables

Implement:

* Prompt Build Request
* Prompt Composition Pipeline
* Prompt Policy abstractions
* Prompt Section model
* Prompt Formatting
* Prompt Ordering
* Prompt Budgeting
* Consumer Profile abstraction
* Prompt Package
* Prompt Diagnostics
* Prompt Events
* Normalized Prompt Errors
* Observability integration

---

## 29.3 Reference Implementations

Cursor may create lightweight reference implementations for:

* Default Prompt Policy
* Default Consumer Profile
* Deterministic Ordering Strategy
* Fixed Budget Strategy
* Canonical Formatter

Reference implementations must remain replaceable.

---

## 29.4 Deferred Responsibilities

Do not implement within Blueprint 13:

* Knowledge retrieval
* Memory retrieval
* Context Assembly
* AI Provider SDK integration
* Provider-specific request serialization
* Tool execution
* Runtime scheduling
* Security policy evaluation
* Prompt persistence
* Model selection

These responsibilities belong to other platform components.

---

# 30. Testing Requirements

The Prompt Builder must include automated tests covering:

* Deterministic prompt composition
* Policy evaluation
* Section selection
* Formatting
* Budget enforcement
* Ordering
* Consumer profile application
* Immutability
* Serialization
* Diagnostics
* Event publication
* Error normalization

Contract tests must verify that provider-specific request formats cannot leak into the Prompt Builder.

---

# 31. Acceptance Criteria

Blueprint 13 is complete when:

* Prompt Builder consumes only normalized platform contracts.
* Prompt Packages remain provider-independent.
* Prompt composition remains deterministic.
* Prompt formatting preserves semantic meaning.
* Provider translation remains external.
* Consumer profiles remain configurable.
* Prompt Packages are immutable.
* Prompt diagnostics, telemetry, and events are available.
* Technology-specific failures are normalized.
* Provider-specific request models never appear outside the AI Provider Framework.

---

# 32. Ownership Boundaries

## The Prompt Builder may:

* Compose prompts
* Organize prompt sections
* Apply prompt policies
* Budget prompts
* Order prompt content
* Format canonical prompts
* Produce Prompt Packages
* Publish prompt events
* Produce diagnostics

## The Prompt Builder must not:

* Retrieve Knowledge
* Retrieve Memory
* Assemble execution context
* Execute AI providers
* Execute Tools
* Schedule Runtime execution
* Select AI providers
* Translate prompts into provider-native formats
* Modify Execution Context Packages
* Persist execution memory

---

# Chief Architect's Notes

Blueprint 13 establishes the Prompt Builder as a **pure presentation service**.

The Prompt Builder determines **how execution context should be represented**, while preserving the semantic meaning established by upstream platform services.

A critical architectural decision is the introduction of the **Prompt Package** as the platform's canonical prompt representation. This allows downstream consumers to adapt prompts for different providers, model families, or future execution environments without requiring changes to the Prompt Builder itself.

Equally important is the separation between **Prompt Composition** and **Provider Translation**. The Prompt Builder owns logical presentation; the AI Provider Framework owns provider-specific translation. This boundary prevents provider APIs, message formats, and SDK models from influencing prompt construction and preserves the provider-independent architecture established throughout AgentForge.

---

# Platform Architecture

```text id="gshc5l"
Knowledge Engine ───────────────┐
        │                       │
        ▼                       │
Knowledge Retrieval Result     │
                                ▼
                         Context Assembly Engine
                                ▲
Memory Retrieval Result        │
        ▲                       │
        │                       │
Memory Engine ─────────────────┘
                                │
                                ▼
                   Execution Context Package
                                │
                                ▼
                         Prompt Builder
                                │
                                ▼
                         Prompt Package
                                │
                                ▼
                    AI Provider Framework
                                │
                                ▼
                      Provider Adapter
                                │
                                ▼
                    Provider-native Request
                                │
                                ▼
                           AI Model
                                │
                                ▼
                    Normalized AI Result
```






# Appendix A — Architectural Clarifications

These clarifications strengthen the constitutional boundaries of the Prompt Builder without changing its core responsibility. They are authoritative for all present and future Prompt Builder implementations.

---

# A.1 Prompt Composition & Semantic Immutability Boundary

The Prompt Builder may transform the presentation of normalized information but must never alter its semantic meaning.

Permitted presentation operations include:

* Organizing information into prompt sections
* Selecting sections according to explicit policy
* Ordering sections
* Applying canonical formatting
* Escaping or encoding content for safe representation
* Attaching presentation metadata
* Applying deterministic presentation budgets
* Omitting information according to explicit policy
* Preserving source references and provenance

The Prompt Builder must never independently:

* Summarize source information
* Rewrite source information
* Infer new facts
* Generate new knowledge
* Reinterpret upstream information
* Resolve contradictions between sources
* Modify authorization outcomes
* Change the meaning of instructions
* Convert uncertain information into asserted facts

Information originating from the Execution Context Package remains semantically owned by its upstream source.

Prompt composition changes only how that information is represented.

When a presentation budget cannot be satisfied without changing semantic meaning, the Prompt Builder must produce an explicit budget or validation outcome rather than silently rewriting, compressing, or inventing content.

Any semantic transformation required by the platform must occur through a separately defined capability under Runtime coordination and must produce a new normalized artifact with its own provenance.

This boundary ensures that the Prompt Builder remains a deterministic presentation service rather than becoming a hidden reasoning, summarization, or content-generation engine.

---

# A.2 Provider Translation Boundary

The Prompt Package is a canonical, provider-independent platform contract.

The Prompt Builder must never contain or produce:

* Provider SDK objects
* Provider-native request models
* Provider-specific message structures
* Vendor authentication logic
* Transport protocols
* Provider API parameters
* Provider-specific streaming formats
* Vendor-specific model identifiers
* Model-selection logic
* Capability-resolution logic
* Provider fallback behavior
* Provider-specific tokenization assumptions

The AI Provider Framework is the exclusive architectural boundary responsible for translating a Prompt Package into a provider-native request.

The Prompt Builder may consume normalized Consumer Requirements describing logical presentation needs, but those requirements must not expose provider identity or vendor-specific implementation details.

Consumer Profiles must remain provider-independent and may define only presentation-oriented characteristics such as:

* Supported content modalities
* Logical section preferences
* Instruction hierarchy requirements
* Canonical formatting expectations
* Presentation budget characteristics
* Structured-output presentation requirements

Provider Adapters remain responsible for translating the canonical Prompt Package into the exact request structure required by a selected AI implementation.

This boundary prevents provider-specific assumptions from leaking backward into prompt composition and preserves the vendor-independent architecture established by the Capability Resolution and AI Provider Framework blueprints.

---

# Chief Architect Amendment

The Prompt Builder owns presentation, not meaning and not provider translation.

It transforms an immutable Execution Context Package into an immutable Prompt Package while preserving source semantics, provenance, authorization scope, and execution intent.

The AI Provider Framework remains solely responsible for converting that canonical Prompt Package into provider-native requests.

These boundaries ensure that prompt composition can evolve independently of AI vendors, models, SDKs, and transport protocols while preventing the Prompt Builder from becoming an implicit reasoning or provider-integration subsystem.
