# AgentForge v0.1 Local Containerization and CI Baseline — Checklist

**Product Version:** 0.1.0  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Scope

- [x] Dockerfile for `@agentforge/platform-host` product image
- [x] `.dockerignore`
- [x] `compose.yaml` with only AgentForge
- [x] `.env.example` (non-secret defaults + Docker `HOST` note)
- [x] `.github/workflows/ci.yml` (`verify` + `docker`)
- [x] `scripts/docker-smoke.mjs`
- [x] No application/behavior/blueprint/ADR/contract changes

---

## Packaging

- [x] Runtime entry equivalent to `pnpm start` (`node dist/bootstrap-local.js`)
- [x] Preferred `pnpm deploy --prod --legacy` strategy used
- [x] Node.js 24 base image
- [x] Non-root user (`node`)
- [x] `EXPOSE 3000`
- [x] HEALTHCHECK via Node `fetch` to `/health`
- [x] Container env: `HOST=0.0.0.0`, `PORT=3000`, `LOG_LEVEL=info`, `REFERENCE_AGENT_ENABLED=true`
- [x] No DB/AI sidecars, secrets, or registry publish

---

## Docker Smoke Assertions

- [x] `GET /health` → 200 / `status: ok`
- [x] `GET /ready` → 200 / `ready: true` with 7 healthy checks
- [x] `POST .../invoke` objective `docker-smoke`
- [x] `result.text === "docker-smoke"`
- [x] `evidence.adapterId === "reference-ai"`

---

## Local Verification Gates

- [x] `pnpm verify`
- [x] `pnpm smoke`
- [x] `docker build -t agentforge/platform-host:0.1.0 .`
- [x] `docker run ... agentforge/platform-host:0.1.0`
- [x] `node scripts/docker-smoke.mjs http://127.0.0.1:3000`
- [x] `docker stop agentforge-v01`
- [x] `docker compose up --build -d`
- [x] Compose docker-smoke
- [x] `docker compose down`

---

## CI Workflow

- [x] Job `verify` runs install/lint/boundaries/typecheck/test/build/smoke
- [x] Job `docker` needs `verify`
- [x] Docker job builds, runs, smokes, always stops container
- [x] No GitHub Secrets required

---

## Documentation

- [x] Implementation report created
- [x] Checklist completed

---

## Stop Conditions

- [x] No application behavior change required
- [x] Entrypoint parity with `pnpm start` preserved
- [x] No DB/external AI/secrets introduced
- [x] No ownership/contract/blueprint changes

**Status: COMPLETE**
