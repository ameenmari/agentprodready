# Contributing to AgentProdReady

## Two audiences

| Audience | Start here |
|---|---|
| **App developers** (npm consumers) | [README](README.md) · [Getting Started](docs/guides/getting-started.md) · [Simple Agent API](docs/guides/simple-agent-api.md) |
| **Platform contributors** (this monorepo) | This document + [cursor-start-here](docs/cursor-start-here.md) |

You do **not** need Blueprints to use `createAgent` from `@agentprodready/agent-framework`.

This is a **solo-maintainer** project today. Responses are best-effort — see [SUPPORT.md](SUPPORT.md). Be kind; follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites (contributors)

- Node.js **`>=22 <25`** (CI runs 22 and 24)
- pnpm (`packageManager` in root `package.json`)
- Git
- familiarity with TypeScript, Vitest, and the blueprint being implemented (for architecture work)

## Good first issues

Prefer docs, examples, tests, and small DX improvements.

Avoid first contributions that redesign Runtime, Security authorization, or Persistence migrations.

Label guidance: [docs/community/labels.md](docs/community/labels.md).

## Required reading (platform work)

Read [docs/cursor-start-here.md](docs/cursor-start-here.md), [Blueprint 01](docs/blueprints/01-foundation.md), [Blueprint 31](docs/blueprints/31-platform-governance-and-evolution.md), the active blueprint, its dependencies from the [dependency graph](docs/architecture/dependency-graph.md), and related accepted [ADRs](docs/adrs/README.md).

## Implementation workflow

1. Work on one blueprint (or one approved DX cycle) at a time.
2. Declare a mode from [implementation-modes.md](docs/implementation/implementation-modes.md).
3. Create plan + specification under `docs/implementation/` when changing architecture/public contracts.
4. Map acceptance criteria to implementation and verification.
5. Run lint, tests, and build (`pnpm verify`). For DX: `pnpm test:public-dx` / `pnpm test:scaffold-dx` when relevant.
6. Create report + checklist before claiming completion.

Never silently redesign architecture.

## Branches and commits

- Use focused branches (`fix/docs-…`, `feat/scaffold-…`, `blueprint/…`)
- Do not combine unrelated blueprint implementations

## Pull requests

Use the PR template. App-developer DX PRs should emphasize commands run and docs/examples touched. Architecture PRs must include plan/spec/report links.

## Discussions

GitHub Discussions may be enabled manually (Settings → Features). Until then, use issue forms (bug / feature / getting-started).
