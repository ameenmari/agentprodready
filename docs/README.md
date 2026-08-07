# AgentForge Documentation

**Version:** 1.0

Welcome to the AgentForge documentation.

This directory contains the complete architectural specification, implementation guidance, engineering standards, and governance documentation for the AgentForge platform.

The documentation is organized so that both engineers and AI coding assistants (such as Cursor) can navigate the architecture deterministically.

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

Contains the constitutional architecture of AgentForge.

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
- [Persistence providers](guides/persistence.md)
- [Runtime restart & recovery](guides/runtime-recovery.md)

## product/

Product slice definitions.

- [v0.3 PostgreSQL persistence](product/agentforge-v0.3-postgresql-persistence.md)
- [v0.4 Runtime restart & recovery](product/agentforge-v0.4-runtime-restart-recovery.md)
- [v0.4 Runtime restart & recovery](product/agentforge-v0.4-runtime-restart-recovery.md) (design — in review)

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

This workflow applies to every framework in AgentForge.

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

Documentation is considered part of the AgentForge platform.

The documentation defines **how the platform should exist**.

The implementation defines **how the platform currently exists**.

When differences occur, they must be resolved explicitly through governance rather than silently ignored.
