# AgentProdReady v0.1 Local Containerization and CI Baseline — Implementation Specification

**Document Version:** 1.1  
**Product Version:** 0.1.0  
**Status:** Approved — Implemented  
**Implementation Mode:** Review-Gated  
**Date:** 2026-08-07

**Prerequisite:** v0.1 Local Reference Product Complete (including `@agentprodready/memory` host wiring).

---

# Authority

| Document | Role |
|---|---|
| [Implementation Plan](../plans/agentprodready-v0.1-container-ci-plan.md) | Scope, stages, acceptance |
| [v0.1 Local Reference Product Report](../reports/agentprodready-v0.1-local-reference-product-implementation-report.md) | Verified product surface |
| Existing env loader | `apps/platform-host/src/config/local-reference-config.ts` |
| Blueprints / ADRs | Unchanged; higher authority |

This specification defines exact infrastructure contracts. It does not authorize application behavior changes.

---

# Package / Product Boundary

```text
Product:     @agentprodready/platform-host 0.1.0
Entry (dev): pnpm start
             → node apps/platform-host/dist/bootstrap-local.js
Entry (ctr): identical Node entry after image build
Infra root:  repository root (Dockerfile, Compose, CI, ignore files)
```

Infrastructure may package and invoke the product. It may not own Runtime, Security, Planning, Workflow, Capability Resolution, AI, Audit, or Event Bus behavior.

---

# A. Environment and Configuration Strategy

## A.1 Supported variables (existing; unchanged)

| Name | Type | Default | Allowed values | Required | Secret |
|---|---|---|---|---|---|
| `HOST` | string | `127.0.0.1` | any bind address | No | No |
| `PORT` | integer | `3000` | `0`–`65535` | No | No |
| `LOG_LEVEL` | string | `info` | `debug` \| `info` \| `warn` \| `error` | No | No |
| `REFERENCE_AGENT_ENABLED` | string | `true` | any; only `"false"` disables | No | No |

## A.2 Profile matrix

| Profile | `HOST` | `PORT` | `LOG_LEVEL` | `REFERENCE_AGENT_ENABLED` |
|---|---|---|---|---|
| Local Node (`pnpm start`) | default `127.0.0.1` | `3000` | `info` | `true` |
| Docker / Compose | `0.0.0.0` | `3000` | `info` | `true` |
| CI container smoke | `0.0.0.0` | `3000` | `info` or `error` | `true` |
| In-process `pnpm smoke` | forced in script (`127.0.0.1`, ephemeral port) | `0` | `error` | `true` |

## A.3 Rules

1. Do not change `loadLocalReferenceConfig` defaults.
2. Do not add new env vars in this cycle.
3. Do not introduce Configuration Framework wiring for containerization.
4. Do not store credentials in env files. The local auth header remains documentation-only:

```text
Authorization: LocalReference principalId=local-user;tenantId=local-tenant
```

5. Readiness requires `REFERENCE_AGENT_ENABLED=true` (existing product behavior).

---

# B. `.dockerignore`

## B.1 Path

```text
.dockerignore
```

## B.2 Must exclude

```text
.git
.github
.cursor
coverage
dist
**/dist
**/*.tsbuildinfo
node_modules
**/node_modules
.env
.env.*
!.env.example
docs
*.md
!README.md
agent-transcripts
delete.md
tests
playwright-report
test-results
.idea
.vscode
**/.DS_Store
Thumbs.db
*.log
.turbo
.cache
.pnpm-store
```

## B.3 Must include in build context

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `tsconfig.json`, `tsconfig.base.json`, and any tsconfigs referenced by `tsc -b`
- `apps/**` package manifests + **all** TypeScript sources under `src/` (including `*.spec.ts` and `smoke/`, because `include: ["src/**/*.ts"]` participates in `pnpm build`)
- `packages/**` package manifests + TypeScript sources (including `@agentprodready/memory` and every host workspace dependency)
- Root tooling only if required by `pnpm build` (prefer not copying eslint/vitest into the image when unused by build)

### Clarification

Do **not** exclude `**/*.spec.ts` or `apps/platform-host/src/smoke` from the Docker **build** context — that breaks `pnpm build` under the current TypeScript project includes.

CI still runs `pnpm test` / `pnpm smoke` on the GitHub runner checkout (full tree). The product container only needs to run `bootstrap-local.js`; runtime stage may omit test artifacts after a successful multi-stage copy.

---

# C. Dockerfile

## C.1 Path

```text
Dockerfile
```

## C.2 Base images

| Stage | Image |
|---|---|
| build | `node:24-bookworm-slim` |
| runtime | `node:24-bookworm-slim` |

Pin major Node 24 to match `engines.node: ">=24 <25"`. Do not use Node 22/25.

## C.3 Build stage requirements

1. `WORKDIR /app`
2. Enable Corepack and activate `pnpm@10.15.1` (match root `packageManager`)
3. Copy workspace manifests and sources required for install/build
4. `pnpm install --frozen-lockfile`
5. `pnpm build`
6. Produce artifacts sufficient to run:

```text
node apps/platform-host/dist/bootstrap-local.js
```

### Preferred artifact strategy

```text
pnpm --filter @agentprodready/platform-host deploy --prod /out
```

Validate that `/out` can start with `node dist/bootstrap-local.js` (or the deploy-relative equivalent).  

### Fallback artifact strategy

If deploy cannot resolve workspace packages:

```text
Copy into runtime:
  package.json, pnpm-lock.yaml, pnpm-workspace.yaml
  node_modules/ (pnpm layout including .pnpm)
  apps/platform-host/package.json + dist/
  packages/*/package.json + dist/ (all workspace runtime deps)
```

Do not copy `src/` into the runtime stage when avoidable.

## C.4 Runtime stage requirements

| Item | Value |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `LOG_LEVEL` | `info` |
| `REFERENCE_AGENT_ENABLED` | `true` |
| `EXPOSE` | `3000` |
| User | non-root (`node` user or dedicated UID) |
| Working directory | deploy root or `/app` |
| `CMD` | `["node", "apps/platform-host/dist/bootstrap-local.js"]` or deploy-equivalent path |

## C.5 HEALTHCHECK

Use Node native fetch (no curl dependency):

```dockerfile
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

Probe loopback inside the container. Process must listen on `0.0.0.0` for published-port access from the host/CI.

## C.6 Labels (recommended)

```text
org.opencontainers.image.title=agentprodready-platform-host
org.opencontainers.image.version=0.1.0
org.opencontainers.image.description=AgentProdReady v0.1 Local Reference Product
```

## C.7 Prohibited in Dockerfile

- Installing PostgreSQL/Redis/Kafka clients as required runtime deps
- Baking API keys or auth secrets
- `npm` instead of pinned pnpm for install (Corepack pnpm required)
- Changing application source during build via `sed`/patches

---

# D. `compose.yaml`

## D.1 Path

```text
compose.yaml
```

## D.2 Usefulness decision

**Include.** Optional for CI; useful for local Docker runs.

## D.3 Exact service contract

Single service only:

```yaml
services:
  agentprodready:
    build:
      context: .
      dockerfile: Dockerfile
    image: agentprodready/platform-host:0.1.0
    ports:
      - "3000:3000"
    environment:
      HOST: "0.0.0.0"
      PORT: "3000"
      LOG_LEVEL: "info"
      REFERENCE_AGENT_ENABLED: "true"
    # optional:
    # env_file: .env
```

## D.4 Prohibited Compose content

- Extra services (Postgres, Redis, Kafka, OTEL collectors, etc.)
- External AI sidecars
- Secret mounts for production credentials
- Volume mounts that alter application behavior (except optional read-only docs, which are unnecessary)

---

# E. `.env.example`

## E.1 Usefulness decision

**Include.** Documents defaults-only configuration; contains no secrets.

## E.2 Exact content

```text
# AgentProdReady v0.1 Local Reference Product
# Copy to .env only if you need overrides. Defaults work for pnpm start.

HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
REFERENCE_AGENT_ENABLED=true

# Docker / Compose must use:
# HOST=0.0.0.0
```

## E.3 Notes

- `.gitignore` already ignores `.env` and allows `.env.example`
- Compose may omit `env_file` because Dockerfile already sets container defaults

---

# F. Image Tagging / Versioning Strategy

## F.1 Image name

```text
agentprodready/platform-host
```

Local/CI tags only for this baseline (no required registry).

## F.2 Tag set

| Tag | Meaning | Mutable? |
|---|---|---|
| `0.1.0` | Product version | Yes on rebuild of same version |
| `0.1.0-<shortsha>` | Version + git short SHA (7+) | No for a given commit |
| `sha-<shortsha>` | Commit-immutable | No for a given commit |
| `latest` | Convenience pointer on default branch only | Yes |

## F.3 Version source of truth

Product version `0.1.0` from `@agentprodready/platform-host` / root package version. Do not invent a separate Docker version scheme in this cycle.

## F.4 CI tagging commands

```bash
PRODUCT_VERSION=0.1.0
SHORT_SHA=$(git rev-parse --short=7 HEAD)
IMAGE=agentprodready/platform-host

docker build \
  -t "$IMAGE:$PRODUCT_VERSION" \
  -t "$IMAGE:$PRODUCT_VERSION-$SHORT_SHA" \
  -t "$IMAGE:sha-$SHORT_SHA" \
  .
```

On default branch, additionally:

```bash
docker tag "$IMAGE:$PRODUCT_VERSION-$SHORT_SHA" "$IMAGE:latest"
```

Registry push is **out of scope**; no GitHub Secrets required.

---

# G. Docker Smoke Verification

## G.1 Script path

```text
scripts/docker-smoke.mjs
```

## G.2 Behavior

CLI:

```text
node scripts/docker-smoke.mjs <baseUrl>
```

Example:

```text
node scripts/docker-smoke.mjs http://127.0.0.1:3000
```

### Assertions (all required)

| Step | Request | Pass criteria |
|---|---|---|
| 1 | Wait up to 30s polling `GET /ready` | `200` and `body.ready === true` |
| 2 | `GET /health` | `200`, `status === "ok"`, `service === "agentprodready-local-reference"`, `version === "0.1.0"` |
| 3 | `GET /ready` | `200`, `ready === true`, includes checks named `composition`, `security`, `runtime`, `agent-registry`, `event-bus`, `audit`, `reference-agent` |
| 4 | `POST /v1/agents/reference-agent/invoke` with local auth and `{"objective":"docker-smoke"}` | `200`, `result.text === "docker-smoke"`, `evidence.adapterId === "reference-ai"` |
| 5 | Exit | print `docker-smoke: ok` and exit `0`; non-zero on failure |

### Auth header (fixed)

```text
Authorization: LocalReference principalId=local-user;tenantId=local-tenant
```

### Non-goals

- Does not assert in-memory audit/event arrays (those are process-local; covered by `pnpm smoke`)
- Does not start/stop Docker itself (caller does)

## G.3 Manual / CI container lifecycle

```bash
docker build -t agentprodready/platform-host:0.1.0 .
docker run --rm -d --name agentprodready-v01 \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e REFERENCE_AGENT_ENABLED=true \
  agentprodready/platform-host:0.1.0

node scripts/docker-smoke.mjs http://127.0.0.1:3000
docker stop agentprodready-v01
```

---

# H. GitHub Actions CI Workflow

## H.1 Path

```text
.github/workflows/ci.yml
```

## H.2 Triggers

```yaml
on:
  push:
  pull_request:
```

(Optionally limit to `main`/`master` later; unrestricted push/PR is acceptable for v0.1 baseline.)

## H.3 Job: `verify`

```yaml
jobs:
  verify:
    name: Verify (Node 24)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - name: Enable pnpm
        run: |
          corepack enable
          corepack prepare pnpm@10.15.1 --activate
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Boundaries
        run: pnpm boundaries
      - name: Typecheck
        run: pnpm typecheck
      - name: Test
        run: pnpm test
      - name: Build
        run: pnpm build
      - name: Smoke
        run: pnpm smoke
```

Notes:

- `pnpm lint` already invokes boundaries today; still run `pnpm boundaries` explicitly as required by this cycle.
- No secrets.
- No Docker in this job.

## H.4 Job: `docker`

```yaml
  docker:
    name: Docker image smoke
    runs-on: ubuntu-latest
    needs: verify
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - name: Enable pnpm tooling for smoke script
        run: |
          corepack enable
          corepack prepare pnpm@10.15.1 --activate
      - name: Compute tags
        id: meta
        run: |
          echo "version=0.1.0" >> "$GITHUB_OUTPUT"
          echo "short_sha=$(git rev-parse --short=7 HEAD)" >> "$GITHUB_OUTPUT"
      - name: Build image
        run: |
          IMAGE=agentprodready/platform-host
          VERSION=${{ steps.meta.outputs.version }}
          SHA=${{ steps.meta.outputs.short_sha }}
          docker build \
            -t "$IMAGE:$VERSION" \
            -t "$IMAGE:$VERSION-$SHA" \
            -t "$IMAGE:sha-$SHA" \
            .
          if [ "${{ github.ref }}" = "refs/heads/main" ] || [ "${{ github.ref }}" = "refs/heads/master" ]; then
            docker tag "$IMAGE:$VERSION-$SHA" "$IMAGE:latest"
          fi
      - name: Run container
        run: |
          docker run --rm -d --name agentprodready-ci \
            -p 3000:3000 \
            -e HOST=0.0.0.0 \
            -e PORT=3000 \
            -e LOG_LEVEL=error \
            -e REFERENCE_AGENT_ENABLED=true \
            agentprodready/platform-host:0.1.0
      - name: Docker smoke
        run: node scripts/docker-smoke.mjs http://127.0.0.1:3000
      - name: Stop container
        if: always()
        run: docker stop agentprodready-ci || true
```

## H.5 Required CI command list (normative)

The workflow must execute, in order within the overall pipeline:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm boundaries`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`
7. `pnpm smoke`
8. Docker image build
9. Docker container health/readiness smoke (includes invoke)

## H.6 GitHub Secrets

**None required.**

Do not reference `secrets.*` in this workflow.

---

# I. Exact Docker Build / Run Commands (Normative)

### PowerShell (local)

```powershell
docker build -t agentprodready/platform-host:0.1.0 -t agentprodready/platform-host:latest .

docker run --rm -d --name agentprodready-v01 `
  -p 3000:3000 `
  -e HOST=0.0.0.0 `
  -e PORT=3000 `
  -e LOG_LEVEL=info `
  -e REFERENCE_AGENT_ENABLED=true `
  agentprodready/platform-host:0.1.0

node scripts/docker-smoke.mjs http://127.0.0.1:3000

docker stop agentprodready-v01
```

### Compose

```powershell
docker compose up --build -d
node scripts/docker-smoke.mjs http://127.0.0.1:3000
docker compose down
```

### Bash (CI-equivalent)

```bash
docker build -t agentprodready/platform-host:0.1.0 .
docker run --rm -d --name agentprodready-v01 \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e REFERENCE_AGENT_ENABLED=true \
  agentprodready/platform-host:0.1.0
node scripts/docker-smoke.mjs http://127.0.0.1:3000
docker stop agentprodready-v01
```

---

# J. Proposed Files Summary

| Path | Action | Required? |
|---|---|---|
| `Dockerfile` | Create | Yes |
| `.dockerignore` | Create | Yes |
| `compose.yaml` | Create | Optional but recommended (**include**) |
| `.env.example` | Create | Optional but recommended (**include**) |
| `.github/workflows/ci.yml` | Create | Yes |
| `scripts/docker-smoke.mjs` | Create | Yes |
| `docs/implementation/reports/agentprodready-v0.1-container-ci-implementation-report.md` | Create after impl | Yes |
| `docs/implementation/checklists/agentprodready-v0.1-container-ci-checklist.md` | Create after impl | Yes |
| `README.md` | Optional docs touch | Optional |

**Do not modify** production application/framework source in this cycle.

---

# K. Decision Answers (Required Closing)

## Proposed files

Listed in section J.

## Exact Docker build/run commands

Listed in section I.

## Exact GitHub Actions jobs

`verify` and `docker` as specified in section H.

## Is `compose.yaml` useful yet?

**Yes (optional helper).** Single-service documentation and local DX. Not required for CI correctness.

## Is `.env.example` useful yet?

**Yes.** Documents the four non-secret variables and the Docker `HOST=0.0.0.0` requirement. No secrets.

## Are any GitHub Secrets required?

**No** for this baseline.

## Stop conditions

Stop and report if:

1. Containerization requires changing application behavior or public contracts.
2. Image cannot run the same entrypoint as `pnpm start`.
3. Published-port access cannot be achieved without changing the default `HOST` in source (env override must suffice).
4. Smoke requires databases, brokers, external AI, or secrets.
5. Node 24 / pnpm 10.15.1 gates cannot run in CI.
6. Blueprints, ADRs, or ownership boundaries must change.
7. New configuration variables beyond the existing four are required for a green smoke.

## Safe for Autonomous implementation?

**Yes, after approval of this Review-Gated plan + specification**, if implementation stays within sections A–J and honors stop conditions.

---

# L. Review Gate

**Do not create infrastructure files until this specification and its plan are approved.**

Approved implementation mode after review may be:

```text
Implementation Mode: Autonomous
```

or remain Review-Gated stage-by-stage at the reviewer’s discretion.
