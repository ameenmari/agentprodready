# AgentForge Blueprint Dependency Graph

**Version:** 2.0

This document is the authoritative source for implementation dependencies and ordering. A bootstrap edge permits only an approved future-owned contract and, when necessary, a minimal replaceable reference implementation. Bootstrapping never transfers ownership, authorizes production behavior, or marks the future owning blueprint complete.

## Edge Types

- **Hard Implementation Dependency:** the named contract or behavior must be implemented before the dependent blueprint can be completed. Contract-only bootstrap is not sufficient.
- **Bootstrap Dependency:** the future-owned port and minimal replaceable reference behavior may be created early to avoid an ordering cycle. Contract-only bootstrap is sufficient unless the blueprint specification documents why deterministic reference behavior is also required.
- **Optional or Later Integration Dependency:** the integration may follow core completion without violating ownership. Contract-only bootstrap is sufficient.

## Blueprint 01 — Foundation

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Hard | None; establishes the repository and constitutional baseline. | Not applicable |

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 02 | Plugin Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 03 | Dependency Injection & Composition | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 04 | Runtime Orchestration | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 07 | Capability Resolution | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 17 | Audit & Compliance | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 30 | Testing & Verification | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 02 Plugin Framework (extension ports); 03 Dependency Injection & Composition (DI ports); 04 Runtime Orchestration (Runtime and ExecutionContext ports); 07 Capability Resolution (registry/resolver ports); 15 Security & Authorization (authorization port); 16 Event Bus (event publisher); 17 Audit & Compliance (audit publisher); 22 Observability & Diagnostics (telemetry/health ports); 23 Configuration & Policy (configuration and secret-reference ports); 24 Persistence (minimal repository/transaction/snapshot ports); 30 Testing & Verification (test infrastructure).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 02 | Plugin Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 03 | Dependency Injection & Composition | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 04 | Runtime Orchestration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 05 | Planning Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 06 | Workflow Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 07 | Capability Resolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 08 | AI Provider Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 15 | Security & Authorization | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 16 | Event Bus & Platform Messaging | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 17 | Audit & Compliance | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 21 | Plugin Marketplace & Distribution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 22 | Observability & Diagnostics | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 23 | Configuration & Policy | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 24 | Persistence Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 25 | Scheduler & Background Jobs | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 29 | Deployment Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 30 | Testing & Verification | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Concrete providers and domain behavior from 02–30.

## Blueprint 02 — Plugin Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation (host, metadata, and extension baseline).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 03 | Dependency Injection & Composition | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 07 | Capability Resolution | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 03 Dependency Injection & Composition (registration/lifecycle port); 07 Capability Resolution (capability/provider registries); 15 Security & Authorization (plugin permissions); 16 Event Bus (lifecycle facts); 22 Observability & Diagnostics (telemetry/health); 23 Configuration & Policy (extension configuration).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 06 | Workflow Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 08 | AI Provider Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 21 | Plugin Marketplace & Distribution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 06 Workflow Engine (node contributions); 08 AI Provider and 09 Tool Framework (contribution contracts); 21 Plugin Marketplace (distribution).

## Blueprint 03 — Dependency Injection & Composition

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation (startup baseline); 02 Plugin Framework (plugin registration model).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 04 | Runtime Orchestration | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 04 Runtime Orchestration (execution-scope ports); 22 Observability & Diagnostics (composition diagnostics).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 04 | Runtime Orchestration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 05 | Planning Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 06 | Workflow Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 07 | Capability Resolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 08 | AI Provider Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 15 | Security & Authorization | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 16 | Event Bus & Platform Messaging | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 17 | Audit & Compliance | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 21 | Plugin Marketplace & Distribution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 22 | Observability & Diagnostics | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 23 | Configuration & Policy | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 24 | Persistence Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 25 | Scheduler & Background Jobs | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 29 | Deployment Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 30 | Testing & Verification | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 31 | Platform Governance, Versioning & Evolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Module registrars and providers from 04–31.

## Blueprint 04 — Runtime Orchestration

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation (ExecutionContext); 02 Plugin Framework (extension metadata); 03 Dependency Injection & Composition (scopes and instance lifecycle).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 05 | Planning Engine | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 06 | Workflow Engine | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 07 | Capability Resolution | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 05 Planning (planning port); 06 Workflow (logical progression port); 07 Capability Resolution (binding port); 15 Security & Authorization (authorization outcome); 16 Event Bus (Runtime facts); 22 Observability & Diagnostics (telemetry); 23 Configuration & Policy (execution configuration); 24 Persistence (execution snapshots).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 08 | AI Provider Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Owning execution frameworks 08–14 and agent/human frameworks 18–20.

## Blueprint 05 — Planning Engine

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration (constitutional, extension, construction, and execution boundaries).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 06 | Workflow Engine | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 07 | Capability Resolution | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 08 | AI Provider Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 06 Workflow Engine (Workflow Definition); 07 Capability Resolution (Capability Requirement); 08 AI Provider (optional assisted-planning port); 15 Security & Authorization; 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 12 Context Assembly, 13 Prompt Builder, and 14 Evaluation.

## Blueprint 06 — Workflow Engine

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration; 05 Planning Engine (Execution Plan input).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 07 | Capability Resolution | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 20 | Human Interaction & Approval | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 07 Capability Resolution; 15 Security & Authorization; 16 Event Bus; 20 Human Interaction (approval port); 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (workflow-state repository/snapshots).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 09 Tool, 10 Knowledge, and 11 Memory node integrations.

## Blueprint 07 — Capability Resolution

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework (registered metadata); 03 Dependency Injection & Composition (instance boundary); 04 Runtime Orchestration (requester); 06 Workflow Engine (eligible work).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization (constraints); 16 Event Bus (resolution facts); 22 Observability & Diagnostics; 23 Configuration & Policy (precedence).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 08 | AI Provider Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Provider-owning frameworks 08–14.

## Blueprint 08 — AI Provider Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration; 07 Capability Resolution (selected binding).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 09 | Tool Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 13 | Prompt Builder | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 09 Tool Framework (normalized tool-call handoff); 13 Prompt Builder (Prompt Package port); 15 Security & Authorization; 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Concrete vendor adapters. | Not applicable |

## Blueprint 09 — Tool Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration; 05 Planning; 06 Workflow; 07 Capability Resolution; 08 AI Provider.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization; 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (idempotency state).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: External-system adapters and 10 Knowledge connectors.

## Blueprint 10 — Knowledge Engine

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 09 Tool Framework (established platform, execution, AI, and Tool contracts).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization (trimming); 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (source/index repositories).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 11 Memory and 12 Context Assembly consumers.

## Blueprint 11 — Memory Engine

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 10 Knowledge Engine.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization; 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (memory repositories).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 12 Context Assembly and 13 Prompt Builder consumers.

## Blueprint 12 — Context Assembly Engine

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 11 | Memory Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 11 Memory Engine (normalized execution, Knowledge, and Memory inputs).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization; 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 13 Prompt Builder and 14 Evaluation.

## Blueprint 13 — Prompt Builder

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 11 | Memory Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 12 | Context Assembly Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 12 Context Assembly (Execution Context Package input).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization; 16 Event Bus; 22 Observability & Diagnostics; 23 Configuration & Policy.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 14 Evaluation and 18 Agent Framework.

## Blueprint 14 — Evaluation Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 11 | Memory Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 12 | Context Assembly Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 13 | Prompt Builder | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 13 Prompt Builder (normalized artifacts and assisted-evaluation pipeline).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 17 | Audit & Compliance | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 15 Security & Authorization; 16 Event Bus; 17 Audit & Compliance; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 18 Agent and 19 Multi-Agent quality governance.

## Blueprint 15 — Security & Authorization

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 14 | Evaluation Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration; 07 Capability Resolution; 14 Evaluation (safety findings).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 16 | Event Bus & Platform Messaging | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 17 | Audit & Compliance | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 16 Event Bus; 17 Audit & Compliance; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 21 | Plugin Marketplace & Distribution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 22 | Observability & Diagnostics | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 23 | Configuration & Policy | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 24 | Persistence Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 25 | Scheduler & Background Jobs | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 29 | Deployment Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Enforcement integrations in 18–29.

## Blueprint 16 — Event Bus & Platform Messaging

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 11 | Memory Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 12 | Context Assembly Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 13 | Prompt Builder | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 14 | Evaluation Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 15 Security & Authorization (event producers, facts, Runtime boundary, and security decisions).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 17 | Audit & Compliance | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 17 Audit & Compliance; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (outbox/replay/dead-letter stores).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 21 | Plugin Marketplace & Distribution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 22 | Observability & Diagnostics | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 23 | Configuration & Policy | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 24 | Persistence Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 25 | Scheduler & Background Jobs | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 29 | Deployment Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 30 | Testing & Verification | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 31 | Platform Governance, Versioning & Evolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Event consumers in 18–31 and distributed transports.

## Blueprint 17 — Audit & Compliance

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration; 15 Security & Authorization; 16 Event Bus.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (durable audit repositories).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 05 | Planning Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 06 | Workflow Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 07 | Capability Resolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 08 | AI Provider Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 09 | Tool Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 10 | Knowledge Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 11 | Memory Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 12 | Context Assembly Engine | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 13 | Prompt Builder | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 14 | Evaluation Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 18 | Agent Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 21 | Plugin Marketplace & Distribution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 22 | Observability & Diagnostics | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 23 | Configuration & Policy | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 24 | Persistence Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 25 | Scheduler & Background Jobs | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 29 | Deployment Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 30 | Testing & Verification | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 31 | Platform Governance, Versioning & Evolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Normalized artifacts from 05–14 and governance consumers in 18–31.

## Blueprint 18 — Agent Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 11 | Memory Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 12 | Context Assembly Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 13 | Prompt Builder | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 14 | Evaluation Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01 Foundation through 17 Audit & Compliance (single-agent execution and governance foundation).

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 21 | Plugin Marketplace & Distribution | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 21 Plugin Marketplace; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence (registry/lifecycle state).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 19 | Multi-Agent Collaboration | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 20 | Human Interaction & Approval | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 19 Multi-Agent and 20 Human Interaction.

## Blueprint 19 — Multi-Agent Collaboration

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 14 | Evaluation Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 18 | Agent Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 04 Runtime; 05 Planning; 06 Workflow; 07 Capability Resolution; 14 Evaluation; 15 Security; 16 Event Bus; 17 Audit; 18 Agent Framework.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 20 | Human Interaction & Approval | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 20 Human Interaction; 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Specialized coordination strategies and distributed providers. | Not applicable |

## Blueprint 20 — Human Interaction & Approval

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 14 | Evaluation Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 18 | Agent Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 19 | Multi-Agent Collaboration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 04 Runtime; 06 Workflow; 14 Evaluation; 15 Security; 16 Event Bus; 17 Audit; 18 Agent; 19 Multi-Agent.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | UI and notification delivery adapters. | Not applicable |

## Blueprint 21 — Plugin Marketplace & Distribution

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 18 | Agent Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 02 Plugin Framework; 03 Dependency Injection & Composition; 15 Security; 16 Event Bus; 17 Audit; 18 Agent Framework.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 22 | Observability & Diagnostics | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 22 Observability & Diagnostics; 23 Configuration & Policy; 24 Persistence.

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 28 CLI package-management commands and remote registries.

## Blueprint 22 — Observability & Diagnostics

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 18 | Agent Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 04 Runtime; 15 Security; 16 Event Bus; 17 Audit; 18 Agent Framework.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 23 Configuration & Policy; 24 Persistence (optional diagnostic storage).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Vendor telemetry providers and integrations from all frameworks. | Not applicable |

## Blueprint 23 — Configuration & Policy

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 18 | Agent Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 15 Security; 16 Event Bus; 17 Audit; 18 Agent Framework; 22 Observability & Diagnostics.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 24 | Persistence Framework | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 24 Persistence (configuration and policy stores).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 24 | Persistence Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 25 | Scheduler & Background Jobs | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 29 | Deployment Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 30 | Testing & Verification | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 31 | Platform Governance, Versioning & Evolution | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: Consumers in 24–31 and production secret providers.

## Blueprint 24 — Persistence Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 03 Dependency Injection & Composition; 15 Security; 16 Event Bus; 17 Audit; 22 Observability; 23 Configuration & Policy.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. Blueprint 24 replaces approved earlier persistence bootstrap implementations without changing consumers. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Production database providers and framework-specific repository adapters. | Not applicable |

## Blueprint 25 — Scheduler & Background Jobs

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 24 | Persistence Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 04 Runtime; 15 Security; 16 Event Bus; 17 Audit; 22 Observability; 24 Persistence.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 23 | Configuration & Policy | Bootstrap | Provides a future-owned port or minimal replaceable reference behavior needed to break implementation ordering. | Yes |

Category rationale: 23 Configuration & Policy (schedule and dispatch policies).

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 26 | API Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 26 API management surfaces and production queue providers.

## Blueprint 26 — API Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 24 | Persistence Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 25 | Scheduler & Background Jobs | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 15 Security; 16 Event Bus; 17 Audit; 22 Observability; 23 Configuration & Policy; 24 Persistence; 25 Scheduler.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Product resource adapters for Planning, Workflow, Knowledge, Memory, Agent, Human, and Marketplace frameworks. | Not applicable |

## Blueprint 27 — SDK Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 26 | API Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 22 Observability; 23 Configuration & Policy; 26 API Framework.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Additional language SDKs beyond the smallest reference client. | Not applicable |

## Blueprint 28 — CLI Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 21 | Plugin Marketplace & Distribution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 26 | API Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 27 | SDK Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 21 Plugin Marketplace; 22 Observability; 23 Configuration & Policy; 26 API; 27 SDK.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Interactive extensions and product-specific commands. | Not applicable |

## Blueprint 29 — Deployment Framework

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 24 | Persistence Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 25 | Scheduler & Background Jobs | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 26 | API Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 22 Observability; 23 Configuration & Policy; 24 Persistence; 25 Scheduler; 26 API.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 27 | SDK Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 28 | CLI Framework | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |
| 30 | Testing & Verification | Optional/Later | May be integrated after core completion without changing this blueprint's ownership. | Yes |

Category rationale: 27 SDK; 28 CLI; production cloud providers; 30 release verification.

## Blueprint 30 — Testing & Verification

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 24 | Persistence Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 26 | API Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 27 | SDK Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 29 | Deployment Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 22 Observability; 23 Configuration & Policy; 24 Persistence; 26 API; 27 SDK; 29 Deployment.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. Blueprint 01 may bootstrap test tooling; Blueprint 30 owns the complete verification framework. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Contract and compliance suites for every implemented blueprint. | Not applicable |

## Blueprint 31 — Platform Governance, Versioning & Evolution

### Hard Implementation Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| 01 | Foundation | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 02 | Plugin Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 03 | Dependency Injection & Composition | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 04 | Runtime Orchestration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 05 | Planning Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 06 | Workflow Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 07 | Capability Resolution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 08 | AI Provider Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 09 | Tool Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 10 | Knowledge Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 11 | Memory Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 12 | Context Assembly Engine | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 13 | Prompt Builder | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 14 | Evaluation Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 15 | Security & Authorization | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 16 | Event Bus & Platform Messaging | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 17 | Audit & Compliance | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 18 | Agent Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 19 | Multi-Agent Collaboration | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 20 | Human Interaction & Approval | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 21 | Plugin Marketplace & Distribution | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 22 | Observability & Diagnostics | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 23 | Configuration & Policy | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 24 | Persistence Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 25 | Scheduler & Background Jobs | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 26 | API Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 27 | SDK Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 28 | CLI Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 29 | Deployment Framework | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |
| 30 | Testing & Verification | Hard | Provides an upstream contract or behavior required before this blueprint can be completed. | No |

Category rationale: 01–30, all approved framework blueprints, because their artifacts are governance and compatibility inputs.

### Bootstrap Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Bootstrap | None. Governance rules are read before implementation; the governance framework implementation remains last. | Not applicable |

### Optional or Later Integration Dependencies

| Blueprint | Name | Edge type | Short reason | Contract-only bootstrap sufficient? |
|---:|---|---|---|---|
| — | None | Optional/Later | Future blueprints, ADRs, migrations, and release policies. | Not applicable |

## Recommended Implementation Order and Phases

1. **Phase 0 — Documentation and Repository Baseline**
2. **Phase 1 — Foundation, Plugin, Composition, Runtime:** 01–04
3. **Phase 2 — Planning, Workflow, Capability Resolution:** 05–07
4. **Phase 3 — AI, Tools, Knowledge, Memory:** 08–11
5. **Phase 4 — Context, Prompt, Evaluation:** 12–14
6. **Phase 5 — Security, Event Bus, Audit:** 15–17
7. **Phase 6 — Agent, Multi-Agent, Human Interaction:** 18–20
8. **Phase 7 — Marketplace, Observability, Configuration:** 21–23
9. **Phase 8 — Persistence, Scheduler, API:** 24–26
10. **Phase 9 — SDK, CLI, Deployment:** 27–29
11. **Phase 10 — Testing, Governance, Release Hardening:** 30–31

The [implementation roadmap](../implementation-roadmap.md) defines phase artifacts and exit criteria. This graph controls dependency order when the documents overlap.

## Cycle Analysis

No hard-dependency cycle exists in the recommended order.

Forward references to later cross-cutting frameworks are bootstrap edges. They provide only approved ports and deterministic reference behavior. When the owning blueprint is implemented, Composition replaces the reference implementation without changing consumers.

Bootstrap edges prevent implementation cycles; they never transfer ownership, authorize production behavior, or mark the future owning blueprint complete.

