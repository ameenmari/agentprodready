# Specification — AgentProdReady Developer Adoption Sprint

**Implementation Mode:** Review-Gated  
**Product:** [agentprodready-developer-adoption-sprint.md](../../product/agentprodready-developer-adoption-sprint.md)  
**Plan:** [agentprodready-developer-adoption-sprint-plan.md](../plans/agentprodready-developer-adoption-sprint-plan.md)  
**Status:** Implemented (Autonomous) — publish pending human authorization

## 1. Purpose

Lock implementation-level decisions for the Adoption Sprint so Autonomous execution cannot silently expand into Anthropic, durable memory, Runtime redesign, or fake adoption claims.

## 2. Decisions

### D1 — Scaffold package name

**Decision:** Publish unscoped **`create-agentprodready`**.  
**Command:** `npm create agentprodready@latest [dir]`.  
**Evidence:** npm 404 for `create-agentprodready` (2026-08-08).  
**Reject:** Requiring `@agentprodready/create-*` as the primary command (worse DX). Optional scoped mirror later — not required.

### D2 — Scaffold CLI shape

**Decision:** Minimal CLI:

```text
create-agentprodready [directory] [--template reference|openai|openai-compatible]
```

If `--template` omitted and TTY: single select prompt (three options). Non-TTY default: `reference`.

**Reject:** Multi-step wizard, plugin marketplace, monorepo generator.

### D3 — Generated stack

**Decision:**

- `"type": "module"`
- TypeScript source in `src/index.ts`
- Dev runner: **`tsx`** (`npm run dev` → `tsx src/index.ts`)
- Dependencies: `@agentprodready/agent-framework` (and `@agentprodready/ai-provider-openai` for openai / openai-compatible templates)
- Pin caret ranges to current published majors (e.g. `^1.3.0`) at generation time
- `.env.example` for secret-bearing templates; library still does not auto-load `.env` — README shows `export` / dotenv optional note honestly

### D4 — Node engines

**Decision:** Claim `engines.node: ">=22 <25"` on root + published packages that currently pin `>=24 <25` **only after** CI job `Verify (Node 22)` (full verify suite including `test:public-dx`) is green on the implementation evidence.

If any production package fails on Node 22: **do not widen**; document the blocker in the report.

Dockerfile for `platform-host` may remain `node:24-bookworm-slim` (operator image pin ≠ library engines).

### D5 — Killer example

**Decision:** Add `examples/backend-agent` as the **canonical wow** path.

Must demonstrate: provider + instructions + one tool + memory + invoke + stream + error handling + close.  
Prefer `reference()` for zero-key CI/demo determinism; document OpenAI swap in README (not a second giant file).

Target 50–100 meaningful lines in the main entry.

### D6 — Three public experiences

| Slot | Path | Role |
|---|---|---|
| Hello | `examples/hello-agent` | Fastest success |
| Tools | `examples/tools-agent` | Tool wow (link backend-agent as fuller path) |
| Gateway | `examples/openai-compatible-agent` | Provider independence |

`memory-agent` / `streaming-agent` / `openai-agent` remain secondary links — not removed unless redundant after backend-agent absorbs their job (prefer keep; demote in nav).

Each polished README must answer: problem, run steps, env vars, expected output, production-safe?, next read.

### D7 — README above-the-fold

**Decision:** Structure:

1. H1 + promise (“TypeScript agents you can ship this week…”)
2. Maturity line
3. Badges (truthful only)
4. ≤15-line `createAgent` + `openai` + `tool` example (or reference zero-key first, then OpenAI)
5. Why AgentProdReady (bullets)
6. Getting Started (incl. `npm create` when shipped)
7. Examples / Providers / Tools / Memory
8. Production path
9. Architecture / Advanced
10. Limitations / Community

**Move lower:** 31 Blueprints, package graph, ADR index, subsystem ownership.

### D8 — Promise copy

**Primary:** TypeScript agents you can ship this week — with a clean path to production controls when you need them.  
**Secondary (optional):** Build an agent in minutes. Add production controls when you need them.  
**Maturity:** Production-oriented architecture with a young ecosystem.

Update GitHub About description to the primary promise (manual-actions doc).

### D9 — Deployment recipe

**Decision:**

1. Update `docs/guides/production-deployment.md` (fix stale “OpenAI only”; link Simple graduation).
2. Add a short **embed** recipe (`docs/guides/embed-agent-deployment.md` or section) covering: Node HTTP service + env + Docker + health/readiness **pattern** + graceful shutdown + “supply your own auth.”
3. Link from README **Production path**.

**Reject:** K8s manifests as required, multi-region, performance theater, fake auth middleware claiming production Security.

### D10 — Community mechanics

**Decision:**

- Convert issue templates to GitHub forms (`.yml`) including `getting_started_problem`
- Keep/refresh `PULL_REQUEST_TEMPLATE.md`
- Add `CODE_OF_CONDUCT.md` (Contributor Covenant 2.x)
- Document labels in `docs/community/labels.md`
- Discussions: **recommend enable** with categories `Q&A`, `Ideas`, `Show and tell` — solo-maintainer moderation expectations in SUPPORT/CONTRIBUTING
- good-first-issue: docs, examples, tests, small DX only

### D11 — Content & demo artifacts

- `docs/community/content-plan.md` (planning authority for posts)
- `docs/community/demo-script.md` (recording authority)
- Demo media committed or linked after recording; no auto-generator

### D12 — Comparison guide

**Decision:** Create `docs/guides/why-agentprodready.md` — difference-focused, honest maturity/community size, no SEO attack tone.

### D13 — Public-DX proof

**Decision:** Extend clean-machine verification to cover:

1. Existing packed `@agentprodready/agent-framework` hero path (already)
2. New: run `create-agentprodready` against packed tarball / `npm pack` output into temp dir, `npm install`, `npm run dev` (reference template) expecting deterministic hello/tool output

No live OpenAI keys in CI.

### D14 — Versioning & publish

- New package `create-agentprodready@0.1.0` when ready
- Bump other packages only if production source or published metadata (`engines`) requires it
- No publish/tag in planning; Autonomous may implement but **stop before publish** unless user authorizes release

### D15 — Relationship to v1.4+

After sprint, ROADMAP order:

Adoption Sprint (done) → Anthropic → Diagnostics → Deploy improvements → observe → Durable Memory/HITL

Do not schedule a duplicate “Agent in My App” release that reimplements scaffold/README/example work.

## 3. Acceptance criteria

| # | Criterion |
|---|---|
| A1 | `npm create agentprodready@latest` documented path works with public packages for `reference` |
| A2 | Node engines claim matches CI proof (22 or still 24 with honest docs) |
| A3 | `examples/backend-agent` runs without API key on reference path |
| A4 | README above-the-fold matches D7/D8 |
| A5 | Three experiences answer the six FAQ fields |
| A6 | Community files from D10 present |
| A7 | Demo script exists; recording workflow documented (media optional until recorded) |
| A8 | Content plan + why-guide + deploy navigation complete |
| A9 | First-wow metrics assessed in report (measured dry run) |
| A10 | No stop-condition violations; no Anthropic implementation |
| A11 | Report + checklist complete before claiming done |

## 4. Test plan

- Unit/CLI tests for scaffold arg parsing + template file set
- Clean-machine script for reference template
- Existing monorepo gates: lint, typecheck, test, build, `verify-versioning`, `test:public-dx`
- Manual: OpenAI template docs dry-run without secrets

## 5. Documentation plan

- Product/plan/spec/review (this cycle)
- Community content-plan + demo-script
- README + guides listed in plan
- ROADMAP reorder
- Manual GitHub About update instructions

## 6. Explicit non-claims

Implementation and docs must not claim battle-tested status, enterprise adoption, universal providers, exactly-once tool effects, or fabricated community size.
