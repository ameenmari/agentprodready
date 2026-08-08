# AgentProdReady — Developer Adoption Sprint

**Document type:** Product design  
**Cycle name:** Developer Adoption Sprint (pre–v1.4)  
**Implementation Mode:** Review-Gated  
**Status:** Implemented (Autonomous) — publish pending human authorization  
**Baseline:** AgentProdReady **v1.3.0** (`createAgent`, tools, ephemeral memory, OpenAI, OpenAI-compatible, public npm)  
**Maturity line (unchanged):** Production-oriented architecture with a young ecosystem.

---

## 1. Why this cycle exists

AgentProdReady already supports production-oriented concepts and a usable Simple Agent API.

The bottleneck is no longer:

> Can AgentProdReady support production concepts?

It is:

> Why would a TypeScript developer discover, try, understand, and share AgentProdReady this weekend?

### Funnel to optimize

```text
DISCOVERY → FIRST INSTALL → FIRST SUCCESS → FIRST WOW → TRUST → SHARING
```

Do **not** deepen architecture merely because another subsystem can be built.

Strategic shift for this phase:

| Until now | Next phase |
|---|---|
| architecture → capabilities → DX | discovery → success → trust → adoption → **then** capabilities |

Architecture does not disappear. It becomes the reason someone who starts with a 15-line `createAgent()` example can continue when that experiment becomes a serious backend.

---

## 2. Public wedge (locked for this cycle)

### Primary persona

**TypeScript / Node.js backend developers** who want to **embed AI agents into existing Node.js applications** without giving up production controls later.

### Not the primary audience (initially)

- no-code users
- Python research workflows
- hosted-agent SaaS seekers
- developers who only want a thin LLM HTTP wrapper with no governance path

### Front-door promise

> **TypeScript agents you can ship this week — with a clean path to production controls when you need them.**

Keep the existing shorter tagline as a secondary / badge-adjacent line if useful:

> Build an agent in minutes. Add production controls when you need them.

### Claims that must NOT be made

- battle-tested / enterprise adoption / large production user base
- universal provider support
- exactly-once external tool effects
- fabricated stars, downloads, or company logos
- “memory that reasons” on `reference()` (v1.2.1 honesty stands)

---

## 3. Scope of the Adoption Sprint

### In scope (design now; implement after approval)

| ID | Work | Priority |
|---|---|---|
| A | `npm create agentprodready@latest` scaffold (`create-agentprodready`) | P0 |
| B | Node 22 official `engines` widen **if** CI proves it | P0 |
| C | One killer end-to-end example (`examples/backend-agent`) | P0 |
| D | 60–90s demo script + recording workflow | P0 |
| E | README / npm / GitHub About repositioning | P0 |
| F | Polish three copy-paste experiences (not example sprawl) | P0 |
| G | Lightweight community mechanics (templates, labels, CoC) | P1 (same sprint if capacity) |
| H | Content / community plan (four posts) | P1 planning |
| I | Fair comparison guide | P1 |
| J | Single production-shaped deployment **recipe** (not a platform) | P1 |

### Explicitly out of scope for this sprint

- Anthropic / Gemini / Bedrock implementation
- Durable Simple Memory / HITL wait-resume productization
- Runtime ownership redesign, distributed Runtime, Kubernetes
- Security ownership weakening or fake production auth
- Secret-bearing CI
- npm publish / git tags / Docker image publication during the planning pass
- Architecture-first homepage rewrite that leads with 31 Blueprints

---

## 4. Task designs (product intent)

### A — `npm create agentprodready@latest`

**Mechanism:** unscoped package `create-agentprodready` (npm `create-*` convention).  
**Availability (2026-08-08 check):** `create-agentprodready` → **404 / not taken**.  
`@agentprodready/create-agentprodready` also free, but **prefer unscoped** so:

```bash
npm create agentprodready@latest my-agent
```

works without awkward scoped create syntax.

**UX target:**

```bash
npm create agentprodready@latest my-agent
cd my-agent
npm install
npm run dev
```

**Templates (minimal):** `reference` | `openai` | `openai-compatible`  
**CLI shape:** argument-driven; optional one-question provider prompt — **not** a giant interactive wizard.

**Generated app rules:**

- public npm deps only (`@agentprodready/agent-framework`, optional `@agentprodready/ai-provider-openai`)
- no workspace protocol, no monorepo coupling
- no hidden Composition/platform-host bootstrap
- roughly: `package.json`, `src/index.ts`, `.env.example`, `.gitignore`, `README.md`, `tsconfig.json`

**TS execution:** prefer **`tsx` + `npm run dev`** for first success (compile-first is optional later). Reference template needs **zero secrets**.

### B — Node 22 support

- CI already matrices Node **22** and **24** (`.github/workflows/ci.yml`).
- Published / root `engines` today: `>=24 <25`.
- Dockerfile / GHCR path may remain Node 24 bookworm — that does **not** force public library engines to stay 24-only.
- **Widen to `>=22 <25` only after** Node 22 verify (+ `test:public-dx`) is green on the implementation branch / main. Do not fake support.
- No package is known to require Node-24-only language APIs; engines today are a verification pin.

### C — Killer example

**Canonical:** `examples/backend-agent/`

Daily path in ~50–100 meaningful lines:

`createAgent` → provider → instructions → one useful tool → memory → `invoke` → `stream` → error handling → `close`

Feel like normal application code. Link “Graduate to production controls…” afterward. Public APIs only.

### D — Demo

Script in `docs/community/demo-script.md`. Manual recording (OBS / asciinema → GIF). No video-generation subsystem.

### E — Front door

README / package README / About must sell the **developer job** above the fold: promise → 10-line example → why → getting started. Architecture / ADRs / Blueprints under Advanced.

### F — Three experiences

| Experience | Preferred vehicle |
|---|---|
| CLI / hello | `examples/hello-agent` (keep minimal) |
| Tools agent | `examples/tools-agent` (+ killer `backend-agent` as the “wow”) |
| Gateway | `examples/openai-compatible-agent` |

Improve before duplicating. `memory-agent` and `streaming-agent` remain supporting, not competing front doors.

### G — Community

Add/upgrade issue form templates, PR template polish, `CODE_OF_CONDUCT.md`, contributor labels guidance. Enable Discussions **when** question volume warrants (default: enable lightly with Getting Started / Q&A categories). Solo-maintainer scale — not foundation governance.

### H — Content

Four honest technical posts — see `docs/community/content-plan.md`.

### I — Fair comparison

`docs/guides/why-agentprodready.md` — differences, not “we’re better.” Honest where LangChain/LlamaIndex/Vercel AI SDK/etc. win (ecosystem size, providers, hosted tooling).

### J — Deployment credibility

Do **not** build Kubernetes or distributed Runtime.

Ship or navigate to **one** recipe answering “Can I ship this somewhere?”:

- Node service embedding Simple Agent **or** operator `platform-host` path
- Docker + env + `/health` `/ready` + graceful shutdown
- production auth **you supply** (no fake auth)

Existing `docs/guides/production-deployment.md` covers platform-host well but is stale in places (e.g. provider catalog) and is easy to miss from the README. Prefer: fix + link from front door + add a short **embed-in-my-app** Docker recipe if the host doc alone does not answer weekend evaluators.

---

## 5. First-wow metrics (non-vanity)

| Metric | Target |
|---|---|
| Time to first agent | < 5 minutes |
| Time to tool | < 10 minutes |
| Concepts before first response | ≤ 4 |
| Required packages for hero path | 1 (`@agentprodready/agent-framework`) |
| Required secrets for reference path | 0 |
| Blueprints required before first response | 0 |

Automated proof where practical: extend `pnpm test:public-dx` (and optionally a scaffold clean-machine script) against **packed/public** packages — not workspace imports.

Success for the sprint is **not** stars alone. Prefer: green public-DX proof, scaffold path works offline for reference, README above-the-fold job-first, demo artifact recorded, issues templates usable, first-wow targets met in a clean-machine dry run.

---

## 6. 90-day adoption roadmap (directional)

### Phase 1 — TRY IT (Adoption Sprint)

Scaffold · Node 22 engines (if proven) · killer example · README · demo · three polished experiences

### Phase 2 — TRUST IT

Simple diagnostics · production recipe navigation/polish · community mechanics · technical content posts

### Phase 3 — EXPAND IT

Anthropic · respond to real issues · durable memory / HITL **only with evidence**

No exact calendar dates promised.

---

## 7. Relationship to the previous five-job plan

Prior conceptual track:

1. Agent in My App  
2. Diagnostics & Debugging  
3. Anthropic Provider  
4. Durable Simple Memory  
5. Deploy It  

**This sprint partially satisfies** (1) and (5) at the *credibility / path* layer — not full product depth.

**Recommended order after this sprint:**

```text
Adoption Sprint
→ Anthropic
→ Diagnostics
→ Production deployment improvements (evidence-driven)
→ observe actual adoption
→ Durable Memory / HITL when justified
```

Rationale: Anthropic makes “provider independence” credible after OpenAI-compatible shipped; diagnostics keep developers after the demo works; deployment recipe is started lightly in this sprint so it need not wait for “100 users,” but deep Deploy It work follows real feedback. Durable memory/HITL remain demand-gated.

Avoid duplicate future “v1.4 Agent in My App” that redoes scaffold/README/example work already finished here. Rename/re-scope later releases around **remaining** gaps.

---

## 8. Stop conditions (planning / implementation)

Stop and report if work requires:

- architectural ownership redesign
- new Runtime architecture
- Security ownership weakening
- fake production auth
- fake adoption claims
- secret-bearing CI
- destructive migration
- unnecessary package explosion (beyond one justified `create-agentprodready`)
- Kubernetes / distributed Runtime
- Anthropic implementation during this planning pass

---

## 9. Approval ask

Approve this product design + plan + review so Autonomous implementation may proceed **within the locked scope**, still without:

- Anthropic code in this sprint unless a later explicit cycle expands scope
- npm publish until human release authorization
- inventing adoption metrics
