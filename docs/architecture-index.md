# AgentProdReady Architecture Index

**Version:** 1.0

---

# Purpose

This document provides the master architectural map of AgentProdReady.

It describes:

* Every Engineering Blueprint
* Architectural responsibilities
* Dependency relationships
* Implementation order
* Current implementation status

This document should be considered the primary navigation document for both engineers and AI coding assistants.

Implementation dependencies and ordering are authoritative only in the [Blueprint Dependency Graph](architecture/dependency-graph.md). This index provides catalog and ownership navigation.

Constitutional anchors: [Blueprint 01 — Foundation](blueprints/01-foundation.md), [Blueprint 31 — Governance](blueprints/31-platform-governance-and-evolution.md), and the [ADR index](adrs/README.md).

The Platform Kernel is the logical composition of foundational packages. It is not an independent domain owner; a physical bootstrap package, if required, remains a thin Application Host and composition root.

---

# Architectural Layers

The AgentProdReady architecture is organized into six major layers.

```text
Constitution Layer
        │
        ▼
Core Runtime Layer
        │
        ▼
Intelligence Layer
        │
        ▼
Platform Services Layer
        │
        ▼
Infrastructure Layer
        │
        ▼
Governance Layer
```

Each blueprint belongs to exactly one primary architectural layer.

---

# Blueprint Dependency Flow

```text
01 Foundation
        │
        ▼
02 Plugin Framework
        │
        ▼
03 Dependency Injection & Composition
        │
        ▼
04 Runtime
        │
        ▼
05 Planning Engine
        │
        ▼
06 Workflow Engine
        │
        ▼
07 Capability Resolution
        │
        ▼
08 AI Provider Framework
        │
        ▼
09 Tool Framework
        │
        ▼
10 Knowledge Engine
        │
        ▼
11 Memory Engine
        │
        ▼
12 Context Assembly Engine
        │
        ▼
13 Prompt Builder
        │
        ▼
14 Evaluation Framework
        │
        ▼
15 Security Platform
        │
        ▼
16 Event Bus
        │
        ▼
17 Audit Platform
        │
        ▼
18 Agent Framework
        │
        ▼
19 Multi-Agent Collaboration
        │
        ▼
20 Human Interaction
        │
        ▼
21 Plugin Marketplace
        │
        ▼
22 Observability
        │
        ▼
23 Configuration & Policy
        │
        ▼
24 Persistence
        │
        ▼
25 Scheduler
        │
        ▼
26 API Framework
        │
        ▼
27 SDK Framework
        │
        ▼
28 CLI Framework
        │
        ▼
29 Deployment Framework
        │
        ▼
30 Testing & Verification
        │
        ▼
31 Platform Governance
```

---

# Blueprint Catalog

---

## Blueprint 01

### Foundation

**Purpose**

Defines the constitutional architecture of AgentProdReady.

**Layer**

Constitution

**Required Before**

Everything

**Status**

Architecture Complete

---

## Blueprint 02

### Plugin Framework

**Purpose**

Defines plugin contracts, registration, discovery, lifecycle, and replaceability.

**Depends On**

01

**Status**

Architecture Complete

---

## Blueprint 03

### Dependency Injection & Composition

**Purpose**

Defines dependency injection, composition, service lifetime, provider instantiation, and dependency ownership.

**Depends On**

01–02

**Status**

Architecture Complete

---

## Blueprint 04

### Runtime

**Purpose**

Owns operational execution.

Owns:

* Scheduling
* Retry
* Timeout
* Recovery
* Cancellation
* Resource coordination

**Depends On**

01–03

**Status**

Architecture Complete

---

## Blueprint 05

### Planning Engine

**Purpose**

Transforms objectives into Execution Plans.

Produces:

Execution Plan

**Status**

Architecture Complete

---

## Blueprint 06

### Workflow Engine

**Purpose**

Interprets Workflow Definitions.

Produces:

Workflow Execution State

**Status**

Architecture Complete

---

## Blueprint 07

### Capability Resolution

**Purpose**

Selects implementations that satisfy Capability Requirements.

Produces:

Capability Binding

**Status**

Architecture Complete

---

## Blueprint 08

### AI Provider Framework

**Purpose**

Normalizes interaction with AI providers.

Owns:

* Request translation
* Response normalization
* Error normalization

**Status**

Architecture Complete

---

## Blueprint 09

### Tool Framework

**Purpose**

Standardizes interaction with external systems.

Produces:

Normalized Tool Results

**Status**

Architecture Complete

---

## Blueprint 10

### Knowledge Engine

**Purpose**

Provides authoritative external knowledge.

Produces:

Knowledge Retrieval Result

**Status**

Architecture Complete

---

## Blueprint 11

### Memory Engine

**Purpose**

Stores and retrieves execution-derived memories.

Produces:

Memory Retrieval Result

**Status**

Architecture Complete

---

## Blueprint 12

### Context Assembly Engine

**Purpose**

Combines knowledge, memory, execution information, and workflow context.

Produces:

Execution Context Package

**Status**

Architecture Complete

---

## Blueprint 13

### Prompt Builder

**Purpose**

Builds provider-independent Prompt Packages.

Produces:

Prompt Package

**Status**

Architecture Complete

---

## Blueprint 14

### Evaluation Framework

**Purpose**

Evaluates AI outputs using provider-independent evaluation contracts.

Produces:

Evaluation Result

**Status**

Architecture Complete

---

## Blueprint 15

### Security Platform

**Purpose**

Owns authentication integration and authorization decisions.

Produces:

Authorization Outcome

**Status**

Architecture Complete

---

## Blueprint 16

### Event Bus

**Purpose**

Owns platform messaging.

Owns:

* Routing
* Delivery
* Replay
* Messaging reliability

Produces:

Platform Events

**Status**

Architecture Complete

---

## Blueprint 17

### Audit Platform

**Purpose**

Provides durable accountability and governance.

Produces:

Audit Records

**Status**

Architecture Complete

---

## Blueprint 18

### Agent Framework

**Purpose**

Defines agents, agent lifecycle, and execution contracts.

**Status**

Architecture Complete

---

## Blueprint 19

### Multi-Agent Collaboration

**Purpose**

Coordinates collaboration between multiple agents.

**Status**

Architecture Complete

---

## Blueprint 20

### Human Interaction

**Purpose**

Defines approvals, interventions, and human participation.

**Status**

Architecture Complete

---

## Blueprint 21

### Plugin Marketplace

**Purpose**

Provides plugin packaging, distribution, discovery, and governance.

**Status**

Architecture Complete

---

## Blueprint 22

### Observability

**Purpose**

Provides diagnostics, logging, metrics, tracing, and health.

**Status**

Architecture Complete

---

## Blueprint 23

### Configuration & Policy

**Purpose**

Provides normalized configuration and policy resolution.

Produces:

Effective Configuration

**Status**

Architecture Complete

---

## Blueprint 24

### Persistence

**Purpose**

Provides provider-independent persistence architecture.

**Status**

Architecture Complete

---

## Blueprint 25

### Scheduler

**Purpose**

Coordinates scheduled and background work.

**Status**

Architecture Complete

---

## Blueprint 26

### API Framework

**Purpose**

Provides normalized platform APIs.

**Status**

Architecture Complete

---

## Blueprint 27

### SDK Framework

**Purpose**

Provides language-specific SDKs over normalized APIs.

**Status**

Architecture Complete

---

## Blueprint 28

### CLI Framework

**Purpose**

Provides command-line tooling.

**Status**

Architecture Complete

---

## Blueprint 29

### Deployment Framework

**Purpose**

Defines provider-independent deployment architecture.

**Status**

Architecture Complete

---

## Blueprint 30

### Testing & Verification

**Purpose**

Defines testing, verification, compliance, and architectural validation.

**Status**

Architecture Complete

---

## Blueprint 31

### Platform Governance

**Purpose**

Defines architectural evolution, versioning, ADRs, compatibility, and governance.

**Status**

Architecture Complete

---

# Current Implementation Status

| Blueprint | Architecture | Implementation | Tests |
| --------- | ------------ | -------------- | ----- |
| 01–31 | Approved | Not Started | Not Started |

Documentation hardening is complete. Blueprint 01 is ready to begin after this consistency pass. Production readiness is **Not Ready**.

---

# Recommended Implementation Order

Blueprints should be implemented sequentially.

Every completed blueprint becomes a stable dependency for the next.

Implementation should follow:

```text
Read
    ↓
Inspect
    ↓
Plan
    ↓
Implement
    ↓
Test
    ↓
Report
    ↓
Next Blueprint
```

Skipping dependency order is strongly discouraged.

---

# Architectural Authority

When multiple documents discuss the same concern, the order of authority is:

1. Foundation Blueprint
2. Approved ADRs
3. Current Blueprint
4. Dependency Blueprints
5. Platform Governance
6. Implementation Guidelines and the approved Blueprint Implementation Specification
7. The approved implementation plan
8. Existing Implementation that conforms to the higher authorities

Existing source code is **not** considered authoritative when it conflicts with approved architecture.

---

# Final Principle

The Architecture Index is the master catalog and ownership navigation document for AgentProdReady. The dependency graph is authoritative for implementation ordering.

It exists to help engineers understand **where a framework belongs**, **what it owns**, **what it depends on**, and **how it fits into the complete platform**.

Every new blueprint, ADR, or architectural amendment should be reflected here so the index remains an accurate map of the platform.
