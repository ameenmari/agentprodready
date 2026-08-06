# AgentForge Glossary

**Version:** 1.0

---

# Purpose

This glossary defines the canonical meaning of architectural terms used throughout the AgentForge Engineering Blueprints.

Every term has exactly one authoritative meaning.

Implementation must not redefine these terms.

Where multiple blueprints reference the same concept, this glossary serves as the common vocabulary.

---

# Reading Order

Before implementing any blueprint, review:

1. Foundation Blueprint
2. This Glossary
3. Current Blueprint
4. Dependency Blueprints
5. Related ADRs

---

# Architectural Terms

---

## Agent

**Produced By**

Agent Framework

**Purpose**

Represents an autonomous platform participant capable of pursuing objectives through workflows, capabilities, memory, knowledge, and tools.

**Consumed By**

* Runtime
* Workflow Engine
* Multi-Agent Framework

---

## Agent Definition

An immutable description of an Agent.

Contains:

* Identity
* Capabilities
* Policies
* Configuration
* Objectives
* Metadata

Does **not** contain Runtime state.

---

## Agent Instance

A Runtime realization of an Agent Definition during execution.

Created by:

Runtime

Destroyed when execution completes.

---

## Blueprint

An architectural specification describing one platform concern.

Blueprints define:

* Ownership
* Public contracts
* Dependencies
* Acceptance criteria
* Implementation guidance

Blueprints do not define implementation details.

---

## Capability

A normalized description of work the platform can perform.

Examples:

* Generate Text
* Search Knowledge
* Store Memory
* Send Email

Capabilities are implementation-independent.

---

## Capability Requirement

Produced by:

Planning

Represents work that must be satisfied.

Does not specify implementation.

---

## Capability Resolution

Produced by:

Capability Resolution Framework

Determines which implementation satisfies a Capability Requirement.

Does not instantiate implementations.

---

## Capability Binding

Produced by:

Capability Resolution Framework

Represents the selected implementation that satisfies a Capability Requirement.

Consumed by:

Composition Framework

---

## Composition Framework

Owns:

Instantiation and lifecycle of implementations.

It does not perform Capability Resolution.

---

## Context Assembly

Produced by:

Context Assembly Engine

Combines:

* Knowledge
* Memory
* Workflow context
* Execution information

Produces:

Execution Context Package

---

## Execution Plan

Produced by:

Planning Engine

Purpose:

Defines the complete logical strategy required to achieve an accepted objective.

Contains:

* Goals
* Tasks
* Dependencies
* Workflow Definition

Immutable.

Does not contain Runtime state.

---

## Workflow Definition

Produced by:

Planning Engine

Consumed by:

Workflow Engine

Represents the immutable logical workflow graph.

Contains:

* Nodes
* Dependencies
* Branches
* Loops
* Approval points

Never changes during execution.

---

## Workflow Execution State

Produced by:

Workflow Engine

Represents mutable execution progress.

Examples:

* Completed nodes
* Active branch
* Waiting approvals
* Loop iteration
* Current position

Separate from the Workflow Definition.

---

## Execution Context

Produced by:

ExecutionContextFactory

An immutable execution-scoped contract owned by Runtime after creation.

Examples:

* Cancellation references
* Timeout policy references
* Resource-scope references
* Scoped-service references
* Execution identifiers

Runtime consumes and manages the lifecycle of the Execution Context but Runtime components must not construct competing contexts. Mutable operational progress belongs in dedicated Runtime execution-state structures rather than in the Execution Context contract.

---

## Execution Reference

A stable identifier that links historical records back to the originating execution.

Unlike an Execution Context, it contains no mutable Runtime state.

Used by:

* Memory
* Audit
* Diagnostics
* Events

---

## Platform Kernel

The logical composition of AgentForge's foundational packages.

The Platform Kernel is assembled by the Application Host and Composition Framework. It has no independent domain ownership. A physical bootstrap package, if required, remains thin and contains composition and startup wiring only.

---

## Execution Context Package

Produced by:

Context Assembly Engine

Consumed by:

Prompt Builder

Represents the complete contextual information required to construct a prompt.

It is immutable.

It is not the Runtime Execution Context.

---

## Prompt Package

Produced by:

Prompt Builder

Consumed by:

AI Provider Framework

Contains:

* Prompt sections
* Formatting
* Metadata
* Consumer requirements

Provider-independent.

---

## Framework

A platform subsystem that owns exactly one architectural concern.

Examples:

* Runtime
* Security
* Workflow
* Memory
* Knowledge

Frameworks own contracts.

They do not own unrelated responsibilities.

---

## Provider

A replaceable implementation of a framework contract.

Examples:

* OpenAI Provider
* PostgreSQL Provider
* Redis Provider

Providers are technology-specific.

---

## Provider Adapter

A provider-specific implementation that translates between AgentForge contracts and an external technology.

Adapters normalize:

* Requests
* Responses
* Errors

Adapters do not own Runtime execution.

---

## Platform Event

An immutable historical fact describing something that occurred.

Examples:

* Workflow Started
* Memory Stored
* Agent Completed

Platform Events are transported by the Event Bus.

They are not commands.

---

## Event Identifier

Stable identity of a Platform Event.

Never changes.

---

## Delivery Identifier

Identifies one transport attempt of a Platform Event.

Different deliveries of the same event share the same Event Identifier.

---

## Audit Record

Produced by:

Audit Platform

Represents an immutable historical accountability record.

Governance changes do not modify Audit Records.

They create new governance records.

---

## Memory Record

Produced by:

Memory Engine

Represents normalized remembered information.

Contains:

* Content
* Metadata
* Security labels
* Execution Reference
* Origin

Memory Records are immutable at creation.

---

## Knowledge Item

Produced by:

Knowledge Engine

Represents authoritative external information available to the platform.

Knowledge is not memory.

---

## Effective Configuration

Produced by:

Configuration Framework

Represents the resolved configuration visible to an execution.

Derived from configuration hierarchy.

Immutable for the duration of the execution unless explicitly governed otherwise.

---

## Runtime

The Runtime coordinates operational execution.

Owns:

* Scheduling
* Retry
* Timeout
* Cancellation
* Recovery
* Resource management
* Execution scopes

The Runtime does not own planning, workflow semantics, security decisions, or provider interaction.

---

## Security Platform

Owns:

Authorization decisions.

Other frameworks enforce supplied authorization outcomes.

They never make independent authorization decisions.

---

## Event Bus

Owns:

* Event transport
* Routing
* Delivery
* Replay
* Messaging reliability

The Event Bus does not execute business logic.

---

## Audit Platform

Owns:

Durable accountability.

The Audit Platform preserves history.

It does not create historical facts.

---

## Architectural Decision Record (ADR)

A permanent record of a significant architectural decision.

Every ADR contains:

* Context
* Decision
* Rationale
* Consequences
* Status

ADRs evolve the architecture without rewriting history.

---

# Permanent Distinctions

The following distinctions are constitutional.

| Do Not Confuse        | With                      |
| --------------------- | ------------------------- |
| Execution Plan        | Workflow Definition       |
| Workflow Definition   | Workflow Execution State  |
| Execution Context     | Execution Reference       |
| Execution Context     | Execution Context Package |
| Memory                | Knowledge                 |
| Audit                 | Observability             |
| Platform Event        | Command                   |
| Capability Resolution | Composition               |
| Provider              | Framework                 |
| Framework             | Runtime                   |
| Authentication        | Authorization             |
| Event Identifier      | Delivery Identifier       |
| Governance State      | Historical Fact           |

---

# Final Principle

Every architectural term defined in this glossary has exactly one intended meaning.

Future blueprints, ADRs, implementation plans, implementation reports, and source code should use these terms consistently.

If a new architectural concept is introduced, it should be added to this glossary before becoming part of the platform vocabulary.
