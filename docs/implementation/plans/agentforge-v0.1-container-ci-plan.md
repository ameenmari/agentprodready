# AgentProdReady v0.1 Local Containerization and CI Baseline — Implementation Plan

**Document Type:** Product Infrastructure Plan  
**Product Version:** 0.1.0  
**Plan Version:** 1.1  
**Status:** Approved — Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# Objective

Add the smallest Docker packaging and GitHub Actions CI baseline for the already verified AgentProdReady v0.1 Local Reference Product (`@agentprodready/platform-host`), without changing blueprints, ADRs, public contracts, or application behavior.

**Prerequisite (met):** Local product report/checklist are Complete; invoke response with `adapterId: reference-ai` verified; host deps include `@agentprodready/memory`.

The container must run the same product that currently passes `pnpm start` and `pnpm smoke`. CI must verify Node.js 24 LTS quality gates and a Docker health/readiness/invoke smoke against a running container.

This is an **infrastructure packaging** task, not a framework or product-feature redesign.

---

# Documents Reviewed

| Document | Reviewed |
|---|---|
| README.md | Yes |
| docs/README.md | Yes |
| docs/cursor-start-here.md | Yes |
| docs/implementation-guidelines.md | Yes |
| docs/implementation/implementation-modes.md | Yes |
| docs/architecture/dependency-graph.md | Yes |
| docs/blueprints/01-foundation.md | Yes |
| docs/blueprints/29-deployment-framework.md | Yes |
| ADR-001 through ADR-015 | Yes |
| docs/implementation/reviews/local-runnability-assessment.md | Yes |
| docs/implementation/reports/agentprodready-v0.1-local-reference-product-implementation-report.md | Yes |
| docs/implementation/checklists/agentprodready-v0.1-local-reference-product-checklist.md | Yes |
| docs/implementation/specifications/agentprodready-v0.1-local-reference-product-specification.md | Yes |
| apps/platform-host/src/config/local-reference-config.ts | Yes |
| apps/platform-host/src/smoke/smoke.ts | Yes |
| apps/platform-host/src/bootstrap-local.ts | Yes |
| package.json / pnpm-workspace.yaml / .gitignore | Yes |

---

# Scope

## In Scope

1. Root `Dockerfile` that builds and runs `@agentprodready/platform-host`
2. Root `.dockerignore`
3. Optional root `compose.yaml` containing only AgentProdReady itself
4. GitHub Actions workflow under `.github/workflows/`
5. Environment/configuration strategy for the current defaults-only product
6. Docker container smoke verification (health, readiness, invoke)
7. Image tagging/versioning strategy
8. Optional `.env.example` documenting non-secret local/container env vars
9. Optional `scripts/docker-smoke.mjs` for deterministic Docker smoke (Node, cross-platform)
10. Implementation report and checklist after approved implementation

## Out of Scope

- PostgreSQL, Redis, Kafka, or any database
- External AI providers
- Production secrets, TLS termination, ingress, Kubernetes
- Pushing images to a registry as a required gate (optional later)
- Changes to blueprints, ADRs, public framework contracts
- Changes to application behavior, HTTP routes, auth semantics, or execution chain
- Changing the default `HOST=127.0.0.1` in application source
- Wiring Blueprint 29 `DeploymentManager` into the host (framework remains contract-only)
- Multi-service compose topologies

---

# Constraints (Hard)

| Constraint | Implication |
|---|---|
| Same product as `pnpm start` / `pnpm smoke` | Container entry must execute `apps/platform-host/dist/bootstrap-local.js` after a successful workspace build |
| No app behavior change | Docker/CI must use existing env vars only (`HOST`, `PORT`, `LOG_LEVEL`, `REFERENCE_AGENT_ENABLED`) |
| Default bind is `127.0.0.1` | Container/Compose/CI **must** set `HOST=0.0.0.0` so published ports are reachable; localhost `pnpm start` remains unchanged |
| No external infra | Image contains only Node runtime + built monorepo product artifacts |
| Node.js 24 LTS | Base image and CI use Node 24; align with `engines.node` and `packageManager` pnpm 10.15.1 |
| No production secrets | No GitHub Secrets required for the baseline CI path |
| Deployment Framework ownership | Dockerfiles are product packaging artifacts; they do not transfer Deployment Framework ownership into the host |

---

# Design Decisions

## D1 — Dockerfile location

Place a single root `Dockerfile` at the repository root so the monorepo build context includes `apps/`, `packages/`, lockfile, and TypeScript project references.

## D2 — Multi-stage build

| Stage | Purpose |
|---|---|
| `build` | Enable Corepack pnpm 10.15.1, `pnpm install --frozen-lockfile`, `pnpm build` |
| `runtime` | Minimal Node 24 image, copy built workspace artifacts needed to start the host, run as non-root |

Exact copy strategy is specified in the companion specification. Preferred order:

1. Attempt portable `pnpm deploy --filter=@agentprodready/platform-host --prod` into a deploy directory after build.
2. If deploy cannot preserve workspace package resolution for `node apps/platform-host/dist/bootstrap-local.js`, fall back to copying the built monorepo runtime subset (`package.json` files, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `node_modules`, `apps/*/dist`, `packages/*/dist`, and required package metadata) without shipping TypeScript sources or tests.

Both paths must run the same entrypoint as `pnpm start`.

## D3 — Container listen address

Do **not** change `loadLocalReferenceConfig` defaults.

| Environment | `HOST` | Why |
|---|---|---|
| Local `pnpm start` | default `127.0.0.1` | Existing verified local behavior |
| Docker / Compose / CI container | `0.0.0.0` via env | Published ports must accept external connections |
| In-container HEALTHCHECK | probes `127.0.0.1:$PORT` | Loopback works when the process listens on `0.0.0.0` |

## D4 — compose.yaml

Include a thin optional `compose.yaml` with a single `agentprodready` service. Useful for local Docker UX and documenting ports/env. Not required for correctness; CI may `docker build` / `docker run` directly.

## D5 — `.env.example`

Include a non-secret `.env.example` documenting the four supported variables. Useful for onboarding. Not required at runtime because defaults exist; Compose may reference it optionally without requiring secrets.

## D6 — CI workflow

One workflow file, two jobs:

1. **`verify`** — Node quality gates including `pnpm smoke`
2. **`docker`** — depends on `verify`; build image; run container; health/ready/invoke smoke; stop

## D7 — Image tagging

| Tag | When |
|---|---|
| `agentprodready/platform-host:0.1.0` | Product version from root/`platform-host` `0.1.0` |
| `agentprodready/platform-host:0.1.0-<shortsha>` | Every CI build |
| `agentprodready/platform-host:sha-<shortsha>` | Immutable commit tag |
| `agentprodready/platform-host:latest` | Optional; only on default branch after successful `docker` job |

No registry push is required for v0.1 baseline approval.

## D8 — Docker smoke vs `pnpm smoke`

| Gate | What it proves |
|---|---|
| `pnpm smoke` | In-process host on ephemeral port; facts/audit/logs assertions |
| Docker smoke | Built image starts, listens, `/health` + `/ready` + invoke echo succeed from outside the container |

Both are required. Docker smoke does not replace `pnpm smoke`.

---

# Proposed Files

## Create (after approval only)

```text
Dockerfile
.dockerignore
compose.yaml
.env.example
.github/workflows/ci.yml
scripts/docker-smoke.mjs
docs/implementation/reports/agentprodready-v0.1-container-ci-implementation-report.md
docs/implementation/checklists/agentprodready-v0.1-container-ci-checklist.md
```

## Modify (after approval only, documentation-safe)

```text
README.md                          ← optional: document Docker/CI commands (status tables may also be corrected)
docs/product/agentprodready-v0.1-local-reference-product.md  ← optional: link container/CI docs
```

## Do Not Modify

```text
docs/blueprints/**
docs/adrs/**
packages/**/src/contracts/**
apps/platform-host/src/**          ← no application behavior changes
package.json scripts that change product semantics
```

No production TypeScript behavior changes are authorized. If Docker packaging discovers that a code change is required beyond env configuration, **stop**.

---

# Implementation Stages (Post-Approval)

## Stage 1 — Ignore rules and env example

Create `.dockerignore` and `.env.example`.

## Stage 2 — Dockerfile

Implement multi-stage Dockerfile with `HOST=0.0.0.0`, `PORT=3000`, healthcheck, non-root user, and start command equivalent to `pnpm start`.

## Stage 3 — Compose

Add single-service `compose.yaml`.

## Stage 4 — Docker smoke script

Add `scripts/docker-smoke.mjs` that assumes a running reachable base URL and asserts health, ready, and invoke echo `docker-smoke`.

## Stage 5 — GitHub Actions

Add `.github/workflows/ci.yml` with `verify` and `docker` jobs under Node 24.

## Stage 6 — Local verification

Run exact Docker build/run/smoke commands and CI-equivalent local gates; produce report + checklist.

---

# Exact Docker Build / Run Commands (Proposed)

```powershell
# Build
docker build -t agentprodready/platform-host:0.1.0 -t agentprodready/platform-host:latest .

# Run (HOST must be 0.0.0.0 for published-port access)
docker run --rm -d --name agentprodready-v01 `
  -p 3000:3000 `
  -e HOST=0.0.0.0 `
  -e PORT=3000 `
  -e LOG_LEVEL=info `
  -e REFERENCE_AGENT_ENABLED=true `
  agentprodready/platform-host:0.1.0

# Smoke against container (or: node scripts/docker-smoke.mjs http://127.0.0.1:3000)
curl.exe -s http://127.0.0.1:3000/health
curl.exe -s http://127.0.0.1:3000/ready
curl.exe -s -X POST http://127.0.0.1:3000/v1/agents/reference-agent/invoke `
  -H "Authorization: LocalReference principalId=local-user;tenantId=local-tenant" `
  -H "Content-Type: application/json; charset=utf-8" `
  -d "{\"objective\":\"docker-smoke\"}"

# Stop
docker stop agentprodready-v01
```

Compose equivalent:

```powershell
docker compose up --build -d
node scripts/docker-smoke.mjs http://127.0.0.1:3000
docker compose down
```

---

# Exact GitHub Actions Jobs (Proposed)

## Job `verify`

- Runner: `ubuntu-latest`
- Setup Node.js `24` with Corepack / pnpm `10.15.1`
- Steps:
  1. `pnpm install --frozen-lockfile`
  2. `pnpm lint`
  3. `pnpm boundaries`
  4. `pnpm typecheck`
  5. `pnpm test`
  6. `pnpm build`
  7. `pnpm smoke`

## Job `docker`

- Needs: `verify`
- Runner: `ubuntu-latest`
- Steps:
  1. Checkout
  2. Set `SHORT_SHA` and image tags (`0.1.0`, `0.1.0-$SHORT_SHA`, `sha-$SHORT_SHA`)
  3. `docker build` with those tags
  4. `docker run -d` with `HOST=0.0.0.0`, publish `3000:3000`
  5. Wait for `/ready`
  6. Run Docker smoke (script or inline curl/node fetch) including invoke echo
  7. `docker stop` / remove container
  8. Fail job if any smoke assertion fails

Triggers: `push` and `pull_request` to the default branch (and optionally all branches).

---

# Environment / Configuration Strategy

Existing supported variables (already implemented; unchanged):

| Variable | Default | Container value | Secret? |
|---|---|---|---|
| `HOST` | `127.0.0.1` | `0.0.0.0` | No |
| `PORT` | `3000` | `3000` | No |
| `LOG_LEVEL` | `info` | `info` (or `error` in CI smoke) | No |
| `REFERENCE_AGENT_ENABLED` | `true` | `true` | No |

No additional configuration framework wiring. No `.env` required for defaults-only operation. Local auth header remains the non-secret reference credential documented in the product report.

---

# Risks

| Risk | Mitigation |
|---|---|
| Binding on `127.0.0.1` inside container blocks published ports | Require `HOST=0.0.0.0` in Dockerfile `ENV`, Compose, and CI `docker run` |
| pnpm workspace deploy complexity | Spec defines deploy-first with monorepo-copy fallback; stop if neither preserves start parity |
| Slim image lacks curl for HEALTHCHECK | Use Node 24 native `fetch` in `HEALTHCHECK` / smoke script |
| Windows local Docker vs Linux CI differences | Smoke script in Node; document PowerShell and bash equivalents |
| Accidental inclusion of secrets or `.env` | `.dockerignore` excludes `.env*` except allowing build context without secrets; never COPY credentials |
| Scope creep into DB/AI providers | Explicit out-of-scope + stop conditions |

---

# Testing Strategy

| Layer | Verification |
|---|---|
| Existing product | `pnpm smoke` unchanged and passing |
| Image build | `docker build` succeeds |
| Container liveness | `GET /health` → 200 |
| Container readiness | `GET /ready` → 200, `ready: true` |
| Container invoke | POST invoke → echo objective, `adapterId: reference-ai` evidence when asserted |
| Regression | Full `verify` job gates remain green |
| Boundaries | No new cross-package source imports; Docker files are root infra |

---

# Acceptance Mapping

| Criterion | Verification |
|---|---|
| Dockerfile for platform-host product | Image builds and starts bootstrap-local |
| `.dockerignore` present | Build context excludes junk/secrets/`node_modules`/`dist`; keeps all TypeScript sources needed for `pnpm build` (including `*.spec.ts` and smoke sources) |
| Optional compose only AgentProdReady | Single service; no DB/AI sidecars |
| GitHub Actions CI | Workflow runs listed gates |
| Env strategy documented | Spec + `.env.example` |
| Docker smoke | Health/ready/invoke against container |
| Tagging strategy | Tags applied in CI/local commands |
| No blueprint/ADR/contract/behavior change | Diff review |
| No DB/external AI/secrets | Diff review + Compose contents |

---

# Completion Artifacts (Post-Implementation)

- `docs/implementation/reports/agentprodready-v0.1-container-ci-implementation-report.md`
- `docs/implementation/checklists/agentprodready-v0.1-container-ci-checklist.md`

---

# Decision Summary (Design-Time Answers)

## Is `compose.yaml` useful yet?

**Yes, optionally.** For a single in-memory service it is not required for correctness, but it is useful as the documented local Docker entrypoint (ports, `HOST=0.0.0.0`, rebuild). CI may still use raw `docker` commands. Include it.

## Is `.env.example` useful yet?

**Yes.** It documents the four non-secret variables and the Docker requirement to set `HOST=0.0.0.0`. It does not introduce secrets. Include it.

## Are any GitHub Secrets required?

**No** for the v0.1 baseline (install, verify, build image, run smoke).  
Registry publish (GHCR/Docker Hub) is out of scope; if added later, that would need credentials and a separate gated change.

## Stop conditions

Stop implementation and report if:

1. Running the product in Docker requires changing application behavior or public contracts (beyond setting existing env vars).
2. The image cannot execute the same entrypoint semantics as `pnpm start`.
3. Health/readiness/invoke smoke cannot pass without adding databases, brokers, external AI, or secrets.
4. CI cannot run on Node.js 24 LTS with the required pnpm gates.
5. Packaging requires modifying blueprints, ADRs, or framework ownership boundaries.
6. A new cross-cutting configuration/secret system is required beyond the existing four env vars.

## Safe for Autonomous implementation?

**Yes — after this Review-Gated plan and specification are approved**, provided implementation:

- creates only the proposed infrastructure/docs files;
- sets `HOST=0.0.0.0` via container environment only;
- does not modify `apps/platform-host` or package contracts;
- does not add sidecars or secrets;
- stops on any stop condition above.

---

# Review Decision

**Status:** In Review — do not create infrastructure files until approved.

**Companion specification:** [agentprodready-v0.1-container-ci-specification.md](../specifications/agentprodready-v0.1-container-ci-specification.md)
