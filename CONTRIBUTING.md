# Contributing to AgentForge

## Prerequisites

- Node.js LTS
- pnpm
- Git
- familiarity with TypeScript, NestJS, Vitest, and the blueprint being implemented

## Required Reading

Read [docs/cursor-start-here.md](docs/cursor-start-here.md), [Blueprint 01](docs/blueprints/01-foundation.md), [Blueprint 31](docs/blueprints/31-platform-governance-and-evolution.md), the active blueprint, its dependencies from the [dependency graph](docs/architecture/dependency-graph.md), and related accepted [ADRs](docs/adrs/README.md).

Architectural authority is: Blueprint 01, accepted ADRs, the active blueprint, its dependency blueprints, Blueprint 31, implementation guidance and the approved specification, the approved implementation plan, then conforming code.

## Implementation Workflow

1. Work on one blueprint at a time.
2. Declare a mode from [implementation-modes.md](docs/implementation/implementation-modes.md).
3. Create the plan under [docs/implementation/plans/](docs/implementation/plans/) using the [plan template](docs/implementation-plan-template.md).
4. Create the specification under [docs/implementation/specifications/](docs/implementation/specifications/) using the [specification template](docs/templates/implementation-specification-template.md).
5. Map every acceptance criterion to implementation and verification.
6. Implement only the active blueprint's responsibilities.
7. Run lint, tests, and build.
8. Create the report under [docs/implementation/reports/](docs/implementation/reports/) using the [report template](docs/implementation-report-template.md).
9. Complete the blueprint checklist under [docs/implementation/checklists/](docs/implementation/checklists/); record cross-blueprint findings under [docs/implementation/reviews/](docs/implementation/reviews/).

Never silently redesign architecture. Create or update an ADR when ownership, dependency direction, public architecture, security semantics, execution semantics, consistency guarantees, or compatibility must change.

## Branches and Commits

- Use branches such as blueprint/01-foundation, fix/docs-dependency-graph, or adr/016-short-title.
- Keep commits focused and describe the architectural or implementation outcome.
- Do not combine unrelated blueprint implementations.

## Pull Requests

Every pull request must include:

- active blueprint and implementation mode;
- plan and specification links;
- files and contracts changed;
- test commands and results;
- acceptance-criteria mapping;
- architecture, security, and dependency review;
- implementation report and completed checklist;
- ADRs, assumptions, limitations, and deferred work.

Architecture-affecting changes require architecture review before merge. A blueprint is not complete until its tests, report, and checklist are complete.
