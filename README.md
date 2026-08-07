# AgentForge

> **A Modular, Provider-Independent AI Agent Framework**

**Version:** 1.0.0 (production-ready local reference product)

---

# Quickstart

Requires **Node 24** and **pnpm** (`packageManager` in root `package.json`).

```bash
pnpm install
pnpm verify
pnpm start
```

Then:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
curl -X POST http://127.0.0.1:3000/v1/agents/reference-agent/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: LocalReference principalId=local-user;tenantId=local-tenant" \
  -d "{\"objective\":\"hello\"}"
```

Reference path needs no database and no API key. Opt-in: OpenAI, Postgres, recovery, Memory, vector, Evaluation, streaming, tools, and AI routing — see [docs/guides/configuration.md](docs/guides/configuration.md) and [docs/guides/multi-provider-routing.md](docs/guides/multi-provider-routing.md).

Production notes: [docs/guides/production-deployment.md](docs/guides/production-deployment.md), [SECURITY.md](SECURITY.md), [CHANGELOG.md](CHANGELOG.md).

---

# Vision

AgentForge is a provider-independent framework for building intelligent agents, workflows, AI applications, automation systems, and multi-agent platforms.

Its architecture separates planning, workflow interpretation, runtime execution, provider interaction, security, persistence, observability, and governance into independent, replaceable platform frameworks.

The goal is to create a long-lived engineering platform where individual technologies can evolve without requiring architectural redesign.

---

# Philosophy

AgentForge follows several constitutional principles.

* Single Responsibility
* Explicit Ownership
* Provider Independence
* Replaceable Components
* Technology Independence
* Deterministic Contracts
* Immutable Platform Artifacts
* Explicit Governance
* Architectural Traceability

Every framework owns one architectural concern.

No framework silently assumes responsibilities that belong to another.

---

# Architecture

AgentForge is composed of 31 engineering blueprints.

These blueprints collectively define the platform architecture.

```text
Foundation
    ↓
Plugin Framework
    ↓
Dependency Injection & Composition
    ↓
Runtime
    ↓
Planning
    ↓
Workflow
    ↓
Capability Resolution
    ↓
AI Provider Framework
    ↓
Tool Framework
    ↓
Knowledge Engine
    ↓
Memory Engine
    ↓
Context Assembly
    ↓
Prompt Builder
    ↓
Evaluation Framework
    ↓
Security Platform
    ↓
Event Bus
    ↓
Audit Platform
    ↓
Agent Framework
    ↓
Multi-Agent Collaboration
    ↓
Human Interaction
    ↓
Plugin Marketplace
    ↓
Observability
    ↓
Configuration
    ↓
Persistence
    ↓
Scheduler
    ↓
API
    ↓
SDK
    ↓
CLI
    ↓
Deployment
    ↓
Testing
    ↓
Platform Governance
```

---

# Repository Structure

```text
AgentForge/
│
├── docs/
│   ├── blueprints/
│   ├── adrs/
│   ├── implementation/
│   │   ├── plans/
│   │   ├── specifications/
│   │   ├── reports/
│   │   ├── checklists/
│   │   └── reviews/
│   ├── templates/
│   └── diagrams/
│
├── packages/
├── apps/
├── tests/
└── README.md
```

---

# Documentation

The documentation is organized into several sections.

Start with the [documentation index](docs/README.md), [architecture index](docs/architecture-index.md), [dependency graph](docs/architecture/dependency-graph.md), and [Cursor/Codex start guide](docs/cursor-start-here.md).

Architectural anchors are [Blueprint 01](docs/blueprints/01-foundation.md), [Blueprint 31](docs/blueprints/31-platform-governance-and-evolution.md), the [ADR index](docs/adrs/README.md), and the [glossary](docs/glossary.md). Implementation uses the canonical [modes](docs/implementation/implementation-modes.md), [templates](docs/templates/), [plans](docs/implementation/plans/), [specifications](docs/implementation/specifications/), [reports](docs/implementation/reports/), [checklists](docs/implementation/checklists/), and [reviews](docs/implementation/reviews/).

## Blueprints

The Engineering Blueprints define the constitutional architecture of the platform.

Every implementation must comply with these documents.

---

## ADRs

Architectural Decision Records document significant architectural decisions that affect the platform.

They provide historical traceability for architectural evolution.

---

## Implementation Plans

Each blueprint is implemented through a dedicated implementation plan before code changes begin.

Implementation plans identify:

* Scope
* Contracts
* Dependencies
* Risks
* Testing strategy
* Acceptance criteria

---

## Implementation Reports

Every completed implementation produces an implementation report documenting:

* Files created
* Files modified
* Tests added
* Acceptance criteria
* Known limitations
* Deferred work

---

# Implementation Process

Every blueprint follows the same implementation workflow.

```text
Read Blueprint
        │
        ▼
Inspect Existing Code
        │
        ▼
Create Implementation Plan
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

No blueprint should be implemented without an implementation plan.

---

# Current Status

| Area                    | Status                             |
| ----------------------- | ---------------------------------- |
| Architecture            | Approved — 31 blueprints           |
| Documentation Hardening | Complete                            |
| Implementation          | Blueprints 01–31 + v0.1–v0.9 product slices |
| Tests                   | Deterministic CI green; OpenAI/Postgres tests opt-in |
| Local reference product | v0.1 complete (`reference-ai` default) |
| Real AI provider        | v0.2 OpenAI (`AI_PROVIDER=openai`) |
| Durable persistence     | v0.3 PostgreSQL (`PERSISTENCE_PROVIDER=postgres`, default in-memory) |
| Runtime recovery        | v0.4 checkpoints + `recoverIncomplete` (`RUNTIME_RECOVERY_ENABLED`, default false) |
| Production Readiness    | Not Ready (no staging/secrets manager yet) |

---

# Implementation Order

Blueprints should be implemented in dependency order.

The recommended sequence is:

```
01 → 02 → 03 → 04 → 05 → 06 → 07
→ 08 → 09 → 10 → 11 → 12 → 13 → 14
→ 15 → 16 → 17
→ 18 → 19 → 20
→ 21 → 22 → 23
→ 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31
```

Completed blueprints become stable dependencies for subsequent implementations.

---

# Architectural Principles

AgentForge follows these permanent principles.

* Every framework owns exactly one architectural concern.
* Runtime exclusively owns operational execution.
* Security exclusively owns authorization decisions.
* Planning produces Execution Plans.
* Workflow interprets Workflow Definitions.
* Capability Resolution selects implementations.
* Composition instantiates implementations.
* Providers implement technology-specific behavior.
* Events represent historical facts.
* Audit preserves accountability.
* Configuration is declarative.
* Public contracts remain technology-independent.

These principles must not be violated without an approved Architectural Decision Record (ADR).

---

# Contributing

All architectural and implementation contributions should follow:

1. Engineering Blueprints
2. Architectural Decision Records
3. Implementation Guidelines
4. Coding Standards
5. Naming Conventions

Architectural changes should never be introduced directly into the implementation without appropriate review and documentation.

---

# License

License information will be added as the project enters public release.

---

# Project Status

**AgentForge v1.0**

**Architecture:** Approved

**Blueprints:** 31 Approved

**Documentation Hardening:** Complete

**Implementation:** Blueprints 01–31 complete; v0.1–v0.9 product slices (local reference, OpenAI, PostgreSQL, Runtime recovery, Persistent Memory, Evaluation Framework, Vector Search & Semantic Memory, Streaming Responses, Tool Calling & Agent Actions)

**Tests:** Deterministic CI; optional live OpenAI via `AI_LIVE_TESTS=1`; optional Postgres via `pnpm test:postgres` / `pnpm test:runtime-recovery` / `pnpm test:memory-persistence`; tools via `pnpm test:tools`

**AI providers:** `reference-ai` (default) · `openai-ai` (`AI_PROVIDER=openai`, see [docs/guides/ai-providers.md](docs/guides/ai-providers.md))

**Persistence:** `in-memory` (default) · `postgres` (`PERSISTENCE_PROVIDER=postgres`, see [docs/guides/persistence.md](docs/guides/persistence.md))

**Memory:** `in-memory` (default) · `persistent` (`MEMORY_PROVIDER=persistent`, see [docs/guides/memory.md](docs/guides/memory.md))

**Evaluation:** disabled by default; `EVALUATION_ENABLED=true` wires Blueprint 14 in the host (see [docs/guides/evaluation.md](docs/guides/evaluation.md))

**Vector search:** disabled by default; `VECTOR_SEARCH_ENABLED=true` enables semantic/hybrid Memory (see [docs/guides/vector-search.md](docs/guides/vector-search.md))

**Streaming:** `POST .../invoke/stream` (see [docs/guides/streaming.md](docs/guides/streaming.md))

**Tool calling:** disabled by default; `TOOLS_ENABLED=true` (see [docs/guides/tools.md](docs/guides/tools.md))

**Runtime recovery:** disabled by default; see [docs/guides/runtime-recovery.md](docs/guides/runtime-recovery.md)

**Production Readiness:** Not Ready

**Current Phase:** Product slices after architecture implementation
