# AgentForge Project Structure

**Version:** 1.0

---

# Purpose

This document defines the physical repository structure of AgentForge.

The repository structure mirrors the constitutional architecture defined by the Engineering Blueprints.

Every directory has a clearly defined responsibility.

The repository structure is part of the architecture.

---

# Architectural Principles

The repository follows these principles:

* Architecture drives folder structure.
* One framework per package.
* Explicit ownership.
* Replaceable providers.
* Technology-independent domain contracts.
* Infrastructure separated from domain logic.
* Tests located alongside owned modules where appropriate.
* Public contracts isolated from implementations.

---

# Repository Layout

The Platform Kernel is a logical composition of foundational packages, not a separate domain framework. If implementation requires a physical bootstrap package, it must contain only Application Host, composition-root, and startup wiring and must not own business or cross-cutting semantics.

```text
AgentForge/
│
├── apps/
├── packages/
├── plugins/
├── providers/
├── examples/
├── tools/
├── tests/
├── docs/
├── scripts/
├── .github/
│
├── package.json
├── tsconfig.base.json
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

# apps/

Applications built using AgentForge.

Examples:

```text
apps/

agentforge-server/

agentforge-cli/

playground/

documentation/
```

Applications compose packages.

Applications do not contain reusable platform logic.

---

# packages/

Contains the core platform.

Every Engineering Blueprint becomes one package wherever practical.

```text
packages/

foundation/

plugin-framework/

composition/

runtime/

planning/

workflow/

capability-resolution/

ai-provider/

tool-framework/

knowledge/

memory/

context/

prompt-builder/

evaluation/

security/

event-bus/

audit/

agent/

multi-agent/

human/

marketplace/

observability/

configuration/

persistence/

scheduler/

api/

sdk-core/

deployment/

testing/

governance/
```

Each package owns one architectural concern.

---

# Package Structure

Every package should follow the same structure.

```text
package/

src/

contracts/

domain/

application/

providers/

events/

errors/

diagnostics/

configuration/

testing/

index.ts

README.md
```

This structure should remain consistent across all packages.

---

# contracts/

Contains public platform contracts.

Examples:

* Interfaces
* Public DTOs
* Value Objects
* Events
* Errors
* Contracts

Contracts must never expose vendor-specific types.

---

# domain/

Contains platform semantics.

Examples:

* Domain Models
* Policies
* Validation Rules
* Immutable Objects

Domain logic must not depend on infrastructure.

---

# application/

Coordinates domain behavior.

Examples:

* Services
* Coordinators
* Use Cases

Application services orchestrate domain components.

---

# providers/

Contains provider implementations.

Examples:

```text
providers/

in-memory/

postgres/

redis/

openai/

anthropic/

ollama/
```

Providers implement contracts.

Providers remain replaceable.

---

# events/

Contains Platform Events owned by the package.

Examples:

```text
WorkflowStarted

MemoryStored

ToolCompleted

EvaluationFinished
```

Events remain immutable.

---

# errors/

Contains normalized platform errors.

Examples:

```text
CapabilityResolutionError

ToolExecutionError

KnowledgeLookupError
```

Vendor exceptions remain internal.

---

# diagnostics/

Contains diagnostics specific to the package.

Examples:

* Logs
* Metrics
* Traces
* Health Indicators

Observability integrates through Blueprint 22.

---

# configuration/

Contains configuration contracts owned by the package.

Configuration values are consumed from Blueprint 23.

Packages must not define independent configuration systems.

---

# testing/

Contains package-local tests.

Examples:

* Unit Tests
* Contract Tests
* Provider Tests

Integration tests may live at higher levels.

---

# plugins/

Contains external plugins.

Examples:

```text
plugins/

email/

jira/

slack/

github/

salesforce/
```

Plugins remain independent from the core platform.

---

# providers/

Contains reusable provider implementations shared across packages.

Examples:

```text
providers/

openai/

anthropic/

ollama/

postgres/

mongodb/

redis/

filesystem/

local-memory/
```

Provider implementations must never define platform contracts.

---

# examples/

Contains example projects demonstrating platform usage.

Examples:

```text
examples/

simple-agent/

multi-agent/

rag/

workflow/

tool-calling/
```

Examples are not production code.

---

# tools/

Contains engineering utilities.

Examples:

* Code generators
* Documentation generators
* Migration tools
* Validation tools

These tools assist development.

They are not Runtime components.

---

# tests/

Contains repository-wide tests.

Examples:

```text
tests/

integration/

performance/

compatibility/

regression/

security/
```

Package-local tests remain inside packages.

Repository-wide tests belong here.

---

# docs/

Contains architecture and engineering documentation.

Includes:

* Blueprints
* ADRs
* Standards
* Templates
* Reports

Documentation is version-controlled.

---

# scripts/

Contains development automation.

Examples:

* Build scripts
* Release scripts
* Documentation generation
* Local setup

Scripts must not contain platform logic.

---

# Dependency Direction

Dependencies should always move inward toward stable contracts.

```text
Application
      │
      ▼
Package Contracts
      │
      ▼
Domain
      │
      ▼
Application Services
      │
      ▼
Provider Interfaces
      │
      ▼
Provider Implementations
```

Reverse dependencies are prohibited.

---

# Package Independence

Each package should be independently understandable.

A package should expose:

* Public contracts
* Public API
* Configuration
* Events
* Errors

Internal implementation remains private.

---

# Shared Code

Shared utilities belong only in dedicated shared packages.

Avoid creating generic utility folders that gradually become architectural dumping grounds.

If a shared abstraction represents a new architectural concern, it should become its own package.

---

# Repository Evolution

New packages may be introduced only when they represent a genuinely new architectural responsibility.

Packages must not be created merely to organize files.

---

# Cursor Guidance

Before creating a new module, determine:

1. Which blueprint owns this responsibility?
2. Which package corresponds to that blueprint?
3. Does the package already expose the required contract?
4. Is a new provider implementation sufficient?
5. Would a new package violate existing ownership boundaries?

If ownership is unclear, stop and review the relevant blueprint before continuing.

---

# Final Principle

The repository structure is a direct reflection of the AgentForge architecture.

Folders exist because architectural responsibilities exist.

If a folder cannot be mapped to a constitutional responsibility, its necessity should be questioned before implementation proceeds.
