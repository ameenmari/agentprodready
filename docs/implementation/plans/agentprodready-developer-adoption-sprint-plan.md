# Plan — AgentProdReady Developer Adoption Sprint

**Implementation Mode:** Review-Gated  
**Product:** [agentprodready-developer-adoption-sprint.md](../../product/agentprodready-developer-adoption-sprint.md)  
**Specification:** [agentprodready-developer-adoption-sprint-specification.md](../specifications/agentprodready-developer-adoption-sprint-specification.md)  
**Review:** [agentprodready-developer-adoption-sprint-review.md](../reviews/agentprodready-developer-adoption-sprint-review.md)  
**Status:** Implemented (Autonomous) — publish pending human authorization

## Problem

Architecture and Simple Agent capabilities exist. Developers still lack a frictionless weekend path: create → install → success → shareable demo → trust.

## Goal

Complete a **Developer Adoption Sprint before v1.4+**, optimizing discovery → first success → wow → trust → sharing, without deepening Runtime/Security architecture.

## Non-goals

- Anthropic (or other new vendor protocols)
- Durable memory / HITL productization
- Distributed Runtime / Kubernetes
- Fake adoption claims or secret-bearing CI
- Blueprint-count marketing above the fold
- Mechanical bumps of unrelated packages

## Recommended approach

Docs/DX-first with **one** new publishable package (`create-agentprodready`) and **selective** engines/metadata edits. Prefer improving existing examples over proliferation. Deployment = recipe + navigation, not a new platform.

## Workstreams

| ID | Work | Depends | Verification |
|---|---|---|---|
| W0 | Human approval of product + plan + spec + review | — | Written approval |
| W1 | README / package README / Getting Started / About copy (job-first) | W0 | Manual above-the-fold audit |
| W2 | Node 22 engines widen **iff** Node 22 CI green | W0 | Matrix job + local `engines` check |
| W3 | `examples/backend-agent` killer example | W0 | `npm start` zero-key + optional OpenAI path docs |
| W4 | Polish hello / tools / openai-compatible READMEs | W3 | Checklist answers per example |
| W5 | `packages/create-agentprodready` scaffold CLI | W0–W1 | Clean-machine scaffold + `npm run dev` |
| W6 | Public-DX / clean-machine proof for scaffold + hero path | W5 | Script in CI or `test:public-dx` extension |
| W7 | Community templates, CoC, labels doc; Discussions note | W0 | Files present; no foundation theater |
| W8 | `why-agentprodready.md` + deploy recipe navigation/update | W0 | Link from README Production path |
| W9 | Record demo per `docs/community/demo-script.md` | W1–W4 | GIF/video committed or linked (manual) |
| W10 | ROADMAP reorder; CHANGELOG notes; report + checklist | W1–W9 | `pnpm verify` / versioning when packages change |

## Implementation order (after approval)

1. Front-door copy (W1) — unblocks everything else  
2. Killer example + three experiences (W3–W4)  
3. Node 22 proof → engines (W2)  
4. Scaffold package (W5–W6)  
5. Community + comparison + deploy nav (W7–W8)  
6. Demo recording (W9)  
7. ROADMAP / report / checklist (W10)  
8. **Publish** only with explicit human release auth (`create-agentprodready` + any engines-touched packages)

## Exact files to create / modify (implementation)

### Create

| Path | Purpose |
|---|---|
| `packages/create-agentprodready/**` | Scaffold package (`bin`, templates) |
| `examples/backend-agent/**` | Killer example |
| `docs/guides/why-agentprodready.md` | Fair comparison |
| `docs/guides/embed-agent-deployment.md` *(or equivalent)* | Simple embed Docker/health recipe if needed |
| `docs/community/labels.md` | Label guidance |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Form template |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | Form template |
| `.github/ISSUE_TEMPLATE/getting_started_problem.yml` | Form template |
| `CODE_OF_CONDUCT.md` | Contributor Covenant (or short equivalent) |
| `docs/implementation/reports/agentprodready-developer-adoption-sprint-implementation-report.md` | After code |
| `docs/implementation/checklists/agentprodready-developer-adoption-sprint-checklist.md` | After code |
| `docs/media/demo.gif` *(or `docs/community/assets/`)* | Recorded demo (manual) |

### Modify

| Path | Purpose |
|---|---|
| `README.md` | Job-first structure + promise |
| `packages/agent-framework/README.md` | Align promise; Node engines text |
| `docs/guides/getting-started.md` | Scaffold + Node 22 when claimed |
| `docs/guides/production-deployment.md` | Fix stale provider lines; link Simple path |
| `docs/guides/adopting-agentprodready.md` | Point to sprint outcomes |
| `examples/hello-agent/README.md` | Experience checklist |
| `examples/tools-agent/README.md` | Experience checklist |
| `examples/openai-compatible-agent/README.md` | Experience checklist |
| `ROADMAP.md` | Adoption Sprint → Anthropic → Diagnostics → Deploy → Memory/HITL |
| `CHANGELOG.md` | Sprint notes when versions bump |
| `package.json` / public package `engines` | `>=22 <25` **only if proven** |
| `pnpm-workspace.yaml` | Include create package |
| `scripts/*public-dx*` / `package.json` scripts | Scaffold clean-machine proof |
| `.github/PULL_REQUEST_TEMPLATE.md` | App-dev vs platform contributor paths |
| `.github/ISSUE_TEMPLATE/config.yml` | Point to Discussions if enabled |
| `docs/implementation/manual-actions/github-repository-metadata.md` | Updated About description |
| `docs/README.md` | Index community + why guide |
| `CONTRIBUTING.md` | Node engines + good-first-issue guidance |

### Do not modify (this sprint)

- Runtime / Security / Capability Resolution ownership or behavior (unless a bug blocks DX)
- Anthropic adapter packages
- Durable memory semantics
- Blueprint source docs for “marketing”

## Package versions (expected)

| Package | Version action | Why |
|---|---|---|
| `create-agentprodready` | **0.1.0** (new) | Scaffold |
| `@agentprodready/agent-framework` | bump **only** if engines or README-in-package requires publish | Selective |
| Other `@agentprodready/*` | bump **only** if `engines` fields change and are published | Selective |
| `@agentprodready/platform-host` | private; Dockerfile may stay Node 24 | No npm |

Root private monorepo version independent.

## Dependencies / ownership

- Scaffold generates **consumer** apps; does not become Composition owner
- Examples use public APIs only
- Deployment recipe documents operator auth responsibility — Security remains authority
- No Runtime redesign

## Risks

| Risk | Mitigation |
|---|---|
| `create-agentprodready` name taken later | Claim/publish promptly after implementation; verified free 2026-08-08 |
| Engines widen while Node 22 red | Gate on green matrix; keep `>=24 <25` if blocked |
| Example sprawl | One killer + three polished; demote duplicates in README |
| Over-claiming deployment | Recipe only; link limitations |
| Solo-maintainer overload | Cap community to templates + labels; defer heavy Discussions moderation |

## Completion definition

- Required tests/gates green (including public-DX / scaffold proof where added)
- Implementation report + checklist complete
- No stop-condition violations
- Human authorize any npm publish / tag separately
