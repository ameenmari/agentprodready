# AgentProdReady Implementation Roadmap

**Version:** 2.0

This roadmap defines milestone sequencing. The [Blueprint Dependency Graph](architecture/dependency-graph.md) is authoritative for individual hard, bootstrap, and later-integration dependencies.

Every blueprint produces:

- docs/implementation/plans/<number>-<slug>-implementation-plan.md
- docs/implementation/specifications/<number>-<slug>-implementation-specification.md
- implementation and tests
- docs/implementation/reports/<number>-<slug>-implementation-report.md
- docs/implementation/checklists/<number>-<slug>-checklist.md

## Phase 0 — Documentation and Repository Baseline

- **Blueprints:** none.
- **Hard prerequisites:** approved architecture, consistent ADRs, canonical paths, Git safety baseline.
- **Permitted bootstrap:** none.
- **Expected artifacts:** hardening review, navigation/governance updates, dependency graph, implementation guidance, checklists, and Git safety baseline.
- **Exit:** documentation hardening passes; Blueprint 01 can enter Autonomous Mode.

## Phase 1 — Foundation, Plugin, Composition, Runtime

- **Blueprints:** 01 Foundation; 02 Plugin Framework; 03 Dependency Injection & Composition; 04 Runtime Orchestration.
- **Hard prerequisites:** Phase 0; each preceding blueprint in this phase.
- **Permitted bootstrap:** Configuration, Security, Event Bus, Audit, Observability, Capability Resolution, Persistence, and Testing ports under the bootstrapping rule.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** the host starts and shuts down; composition and execution scopes work; Runtime boundaries pass contract tests.

## Phase 2 — Planning, Workflow, Capability Resolution

- **Blueprints:** 05 Planning; 06 Workflow; 07 Capability Resolution.
- **Hard prerequisites:** Phase 1.
- **Permitted bootstrap:** later-owned cross-cutting ports, human approval port, and workflow-state Persistence reference provider.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** objectives produce validated plans; workflows advance logically under Runtime control; capabilities resolve deterministically.

## Phase 3 — AI, Tools, Knowledge, Memory

- **Blueprints:** 08 AI Provider; 09 Tool; 10 Knowledge; 11 Memory.
- **Hard prerequisites:** Phases 1–2.
- **Permitted bootstrap:** Prompt Package and normalized tool-call ports; Security, Event, Observability, Configuration, and Persistence reference providers.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** each framework exposes normalized contracts, a replaceable reference provider, and passing boundary tests.

## Phase 4 — Context, Prompt, Evaluation

- **Blueprints:** 12 Context Assembly; 13 Prompt Builder; 14 Evaluation.
- **Hard prerequisites:** Phases 1–3.
- **Permitted bootstrap:** later-owned Security, Event, Audit, Observability, Configuration, and Persistence ports.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** immutable context and prompt packages are produced; evaluation remains descriptive and Runtime-controlled.

## Phase 5 — Security, Event Bus, Audit

- **Blueprints:** 15 Security & Authorization; 16 Event Bus & Platform Messaging; 17 Audit & Compliance.
- **Hard prerequisites:** Phases 1–4 and approved bootstrap contracts.
- **Permitted bootstrap:** Observability, Configuration, and Persistence reference providers.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** authorization is deny-by-default; messaging meets the declared delivery baseline; durable accountability contracts pass.

## Phase 6 — Agent, Multi-Agent, Human Interaction

- **Blueprints:** 18 Agent; 19 Multi-Agent Collaboration; 20 Human Interaction & Approval.
- **Hard prerequisites:** Phases 1–5.
- **Permitted bootstrap:** Marketplace, Observability, Configuration, and Persistence ports.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** agent lifecycle, collaboration, and human-interaction contracts work without creating competing execution or authorization engines.

## Phase 7 — Marketplace, Observability, Configuration

- **Blueprints:** 21 Plugin Marketplace; 22 Observability & Diagnostics; 23 Configuration & Policy.
- **Hard prerequisites:** Phases 1–6 as identified by the dependency graph.
- **Permitted bootstrap:** Blueprint 24 Persistence stores only.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** package distribution, telemetry, configuration, and policy resolution have replaceable providers and integration tests.

## Phase 8 — Persistence, Scheduler, API

- **Blueprints:** 24 Persistence; 25 Scheduler & Background Jobs; 26 API.
- **Hard prerequisites:** Phases 1–7.
- **Permitted bootstrap:** Configuration ports already approved; no weakening of Blueprint 24 guarantees.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** persistence guarantees pass; dispatch and Runtime retry remain separate; the reference API surface is specified and verified.

## Phase 9 — SDK, CLI, Deployment

- **Blueprints:** 27 SDK; 28 CLI; 29 Deployment.
- **Hard prerequisites:** approved Blueprint 26 API specification and Phase 8.
- **Permitted bootstrap:** none.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** reference SDK and CLI match the approved API; local and containerized deployments pass health/readiness checks.

## Phase 10 — Testing, Governance, Release Hardening

- **Blueprints:** 30 Testing & Verification; 31 Platform Governance, Versioning & Evolution.
- **Hard prerequisites:** Phases 1–9.
- **Permitted bootstrap:** test tooling originally established by Blueprint 01 is replaced or adopted under Blueprint 30 ownership.
- **Expected artifacts:** canonical plan, specification, implementation/tests, report, and checklist for each listed blueprint.
- **Exit:** architectural contract suites, compatibility checks, governance validation, documentation, reports, and all checklists pass.

## Release Rule

A phase milestone does not mark a blueprint complete. Completion requires its plan, specification, implementation, tests, report, and blueprint-specific checklist.
