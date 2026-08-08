# AgentProdReady Documentation

**Build an agent in minutes. Add production controls when you need them.**

Production-oriented architecture with a young ecosystem.

**New in v1.2 — Simple Agent API:** chat (`createAgent`), tools (`tool()`), ephemeral memory (`memory: true` / `inMemory()`) on [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework).

This directory contains product guides, architectural specification, implementation guidance, and governance documentation.

---

# Public navigation (start here)

1. [Getting Started](guides/getting-started.md)
2. [Simple Agent API](guides/simple-agent-api.md)
3. [Why AgentProdReady](guides/why-agentprodready.md)
4. [Simple Tools](guides/simple-tools.md) · [Simple Memory](guides/simple-memory.md)
5. [Examples](../examples/hello-agent) · [**backend-agent**](../examples/backend-agent) · [tools-agent](../examples/tools-agent) · [openai-compatible-agent](../examples/openai-compatible-agent)
6. [Embed agent deployment](guides/embed-agent-deployment.md) · [Production Deployment](guides/production-deployment.md)
7. [Streaming](guides/streaming.md)
8. [Security](guides/security.md)
9. [Package compatibility](guides/package-compatibility.md)
10. [Adopting AgentProdReady](guides/adopting-agentprodready.md)
11. [Community](community/content-plan.md) · [demo script](community/demo-script.md) · [labels](community/labels.md)
12. [Architecture index](architecture-index.md)
13. [Blueprints](blueprints/) · [ADRs](adrs/)

**Beginner path:** Getting Started → backend-agent → Why / Embed deploy → Architecture only if needed.

Blueprints and ADRs are under **Architecture / Advanced** — you do not need them for hello-world.

---

# Start here by role

| You want to… | Go to |
|---|---|
| **Build your first agent** | [Getting Started](guides/getting-started.md) · [Simple Agent API](guides/simple-agent-api.md) |
| Evaluate for a larger project | [Adopting AgentProdReady](guides/adopting-agentprodready.md) · [ROADMAP](../ROADMAP.md) |
| Install packages in your app | [Repository README](../README.md) · [npm distribution](guides/npm-distribution.md) · [package compatibility](guides/package-compatibility.md) |
| Streaming (library API) | [Getting Started](guides/getting-started.md#stream) · [examples/streaming-agent](../examples/streaming-agent) |
| Tools / Memory / Evaluation (advanced) | [tools](guides/tools.md) · [memory](guides/memory.md) · [evaluation](guides/evaluation.md) |
| Production deployment | [production-deployment.md](guides/production-deployment.md) · [security.md](guides/security.md) |
| Local performance baseline | [benchmarks](benchmarks/README.md) *(local baseline — not an SLA)* |
| Understand architecture | [architecture-index.md](architecture-index.md) · [dependency-graph.md](architecture/dependency-graph.md) · [blueprints/](blueprints/) |
| Change code in this monorepo | [cursor-start-here.md](cursor-start-here.md) · [CONTRIBUTING.md](../CONTRIBUTING.md) · [implementation-modes.md](implementation/implementation-modes.md) |
| Trace decisions (ADRs) | [adrs/](adrs/) · [glossary.md](glossary.md) |
| Support / security | [SUPPORT.md](../SUPPORT.md) · [SECURITY.md](../SECURITY.md) |

---

# Documentation Structure

```text
docs/
│
├── README.md
├── architecture-index.md
├── implementation-guidelines.md
├── implementation-roadmap.md
├── coding-standards.md
├── naming-conventions.md
├── glossary.md
├── project-structure.md
│
├── blueprints/
├── adrs/
├── templates/
├── implementation/
│   ├── implementation-modes.md
│   ├── plans/
│   ├── specifications/
│   ├── reports/
│   ├── checklists/
│   └── reviews/
└── diagrams/
```

---

# Purpose of Each Directory

## blueprints/

Contains the constitutional architecture of AgentProdReady.

Each blueprint defines one architectural concern and establishes:

* Responsibilities
* Public Contracts
* Ownership
* Dependencies
* Acceptance Criteria
* Cursor Implementation Guidance

Blueprints are the highest engineering authority after the Foundation Blueprint and approved ADRs.

---

## adrs/

Contains Architectural Decision Records.

An ADR records significant architectural decisions that modify or clarify the platform.

Every ADR includes:

* Context
* Decision
* Rationale
* Consequences
* Related Blueprints

ADRs preserve architectural history.

---

## templates/

Reusable templates for:

* ADRs
* Blueprint revisions
* Implementation plans
* Implementation reports

These ensure engineering consistency.

---

## implementation/plans/

Before implementing any blueprint, an implementation plan must be created.

The implementation plan defines:

* Scope
* Dependencies
* Modules
* Contracts
* Risks
* Testing strategy
* Acceptance mapping

Implementation must not begin before the plan exists.

---

## implementation/specifications/

Every blueprint implementation must define its exact public TypeScript contracts and implementation-level decisions before production code.

---

## implementation/amendments/

Versioned implementation-contract amendments that refine TypeScript contract shapes without rewriting Engineering Blueprints or ADRs.

Examples:

- [24-persistence-async-io-contract-amendment.md](implementation/amendments/24-persistence-async-io-contract-amendment.md)
- [04-runtime-execution-checkpoint-amendment.md](implementation/amendments/04-runtime-execution-checkpoint-amendment.md) (v0.4 design — in review)

---

## guides/

Operator-facing guides for product slices.

- [AI providers](guides/ai-providers.md)
- [OpenAI-compatible](guides/openai-compatible.md)
- [Persistence providers](guides/persistence.md)
- [Runtime restart & recovery](guides/runtime-recovery.md)
- [Memory providers](guides/memory.md)
- [Evaluation Framework](guides/evaluation.md)
- [Vector Search & Semantic Memory](guides/vector-search.md)
- [Streaming Responses](guides/streaming.md)
- [Tool Calling & Agent Actions](guides/tools.md)

## product/

Product slice definitions.

- [v0.3 PostgreSQL persistence](product/agentprodready-v0.3-postgresql-persistence.md)
- [v0.4 Runtime restart & recovery](product/agentprodready-v0.4-runtime-restart-recovery.md)
- [v0.5 Persistent Memory](product/agentprodready-v0.5-persistent-memory.md)
- [v0.6 Evaluation Framework](product/agentprodready-v0.6-evaluation-framework.md)
- [v0.7 Vector Search & Semantic Memory](product/agentprodready-v0.7-vector-search-semantic-memory.md)
- [v0.8 Streaming Responses](product/agentprodready-v0.8-streaming-responses.md)

---

## implementation/reports/

Every completed blueprint implementation produces an implementation report.

Reports document:

* Files created
* Files modified
* Tests added
* Known limitations
* Deferred work
* Acceptance verification

---

## diagrams/

Architecture diagrams.

These diagrams explain:

* Layer relationships
* Component interaction
* Dependency direction
* Data flow
* Execution flow

Diagrams supplement the blueprints.

They do not replace them.

---

# Documentation Reading Order

Every engineer (human or AI) should follow this reading order before implementing any blueprint.

```text
[Repository README](../README.md)
    │
    ▼
[architecture-index.md](architecture-index.md)
    │
    ▼
[dependency-graph.md](architecture/dependency-graph.md)
    │
    ▼
[implementation-guidelines.md](implementation-guidelines.md)
    │
    ▼
[implementation-modes.md](implementation/implementation-modes.md)
    │
    ▼
[glossary.md](glossary.md)
    │
    ▼
[Current Blueprint](blueprints/01-foundation.md)
    │
    ▼
Dependency Blueprints
    │
    ▼
[Relevant ADRs](adrs/README.md)
```

Skipping this sequence increases the likelihood of architectural inconsistencies.

---

# Engineering Workflow

Every blueprint implementation follows the same engineering lifecycle.

```text
Read Documentation
        │
        ▼
Study Architecture
        │
        ▼
Inspect Existing Code
        │
        ▼
Implementation Plan
        │
        ▼
Implement Contracts
        │
        ▼
Implement Core Logic
        │
        ▼
Implement Providers
        │
        ▼
Testing
        │
        ▼
Implementation Report
```

This workflow applies to every framework in AgentProdReady.

---

# Documentation Categories

The documentation consists of five categories.

## 1. Constitutional Documents

Examples:

* Foundation Blueprint
* Platform Governance Blueprint
* Approved ADRs

These define permanent architectural rules.

---

## 2. Architectural Documents

Examples:

* Runtime
* Workflow
* Security
* Memory
* Event Bus

These define platform frameworks.

---

## 3. Engineering Documents

Examples:

* Coding Standards
* Naming Conventions
* Project Structure

These guide implementation quality.

---

## 4. Planning Documents

Examples:

* Implementation Plans
* Roadmaps

These describe future work.

---

## 5. Historical Documents

Examples:

* ADRs
* Implementation Reports

These preserve engineering history.

---

# Architectural Authority

The order of architectural authority is:

```text
01 Foundation Blueprint
        │
        ▼
Approved ADRs
        │
        ▼
Current Blueprint
        │
        ▼
Dependency Blueprints
        │
        ▼
31 Platform Governance Blueprint
        │
        ▼
Implementation Guidelines and Approved Blueprint Implementation Specification
        │
        ▼
Approved Implementation Plan
        │
        ▼
Existing Code
```

If code conflicts with the architecture, the architecture takes precedence.

The implementation should be corrected rather than the architecture silently ignored.

---

# Documentation Rules

Every document should:

* Be versioned.
* Be traceable.
* Be deterministic.
* Be technology-independent where appropriate.
* Use consistent terminology.
* Avoid implementation ambiguity.
* Preserve architectural ownership.

---

# Working with Cursor

Cursor should never implement directly from isolated prompts.

Before implementing any blueprint, Cursor should read:

* implementation-guidelines.md
* architecture-index.md
* glossary.md
* The current blueprint
* Every dependency blueprint
* Related ADRs
* Previous implementation reports

Persistent agent instructions are defined in [AGENTS.md](../AGENTS.md), and implementation behavior is governed by [Implementation Modes](implementation/implementation-modes.md).

---

# Current Status

| Area | Status |
|---|---|
| Architecture | Approved — 31 blueprints |
| Documentation Hardening | Complete |
| Implementation | Not Started |
| Tests | Not Started |
| Blueprint 01 | Ready after documentation consistency pass |
| Production Readiness | Not Ready |

This ensures implementation remains consistent with the constitutional architecture.

---

# Documentation Maintenance

Documentation evolves through controlled governance.

Changes require:

* Blueprint revision
* ADR (where applicable)
* Version update
* Review
* Approval

Documentation must remain synchronized with implementation.

---

# Final Principle

Documentation is considered part of the AgentProdReady platform.

The documentation defines **how the platform should exist**.

The implementation defines **how the platform currently exists**.

When differences occur, they must be resolved explicitly through governance rather than silently ignored.
