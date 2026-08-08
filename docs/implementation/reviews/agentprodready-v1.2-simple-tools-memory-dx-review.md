# AgentProdReady v1.2 — Simple Tools, Memory & Compatibility — Review

**Document Version:** 1.0  
**Status:** Approved — Autonomous implementation (D2 amended)  
**Implementation Mode:** Review-Gated (design) → Autonomous (approved)  
**Date:** 2026-08-08  
**Baseline:** `@agentprodready/agent-framework@1.1.1` published; credibility P0 complete; external scorecard feedback absorbed  
**Constraint:** No production TypeScript changes in this design pass. No provider implementation. No npm publish. No git tags.

**Related:**

- Product: [`docs/product/agentprodready-v1.2-simple-tools-memory-dx.md`](../../product/agentprodready-v1.2-simple-tools-memory-dx.md)
- Plan: [`../plans/agentprodready-v1.2-simple-tools-memory-dx-plan.md`](../plans/agentprodready-v1.2-simple-tools-memory-dx-plan.md)
- Spec: [`../specifications/agentprodready-v1.2-simple-tools-memory-dx-specification.md`](../specifications/agentprodready-v1.2-simple-tools-memory-dx-specification.md)

**Exploration support:** [tools/memory audit](fe8ada35-9e14-45fc-9956-bd31fdbf3f63) · [Node/deps audit](73c77f51-cd76-434e-9193-3feee4337513)

---

## Executive summary

v1.1 fixed the chat entrance. The next high-leverage product gap is **simple tools + ephemeral memory** on the same facade, plus honesty about **Node pins**, **selective versions**, and **install weight**.

Technically, a smallest-safe facade is feasible by assembling existing Tool Framework + Memory + Security + Runtime + Composition — the same pattern `createAgent` already uses for AI. The hard parts are **tool-loop placement** (today in unpublished `platform-host`), **safe defaults for side effects**, and **not lying about memory durability**.

**Recommendation for Autonomous implementation after approval:** **CONDITIONAL PASS**

---

## Required answers (1–25)

### 1. What makes simple tools difficult today?

1. `createAgent` options allowlist rejects `tools`.
2. Embedded capability execution explicitly refuses tool-calls.
3. Manifest sets `maximumToolInvocations: 0` and empty tools.
4. Canonical tool loop lives in **`apps/platform-host`** (not published).
5. `ToolContract` is production-shaped (capability, pluginId, sideEffect, idempotency) — no `tool()` helper.
6. Security/auth outcomes hardcode empty `allowedTools`.
7. Simple stream API has no tool lifecycle events.
8. Approval is fail-closed without durable HITL — must remain honest in DX.

### 2. Smallest safe Simple Tools facade?

Add in `@agentprodready/agent-framework` / `src/simple/`:

- `tool({ name, description, parameters, execute, sideEffect?, idempotency?, approvalRequirement? })`
- `createAgent({ tools: [...] })`
- Map to `ToolContract` + Composition `ToolAdapter`
- Run a host-parity tool loop through `ToolInvocationCoordinator` + Security + Cap Resolution + Runtime checkpoints

**Do not** invent a parallel executor that calls `execute` from the AI adapter.

### 3. What guarantees can/cannot be preserved automatically?

| Guarantee | Simple tools |
|---|---|
| Security authorization per call | **Can** (must) |
| Tool Framework validation + normalize | **Can** |
| Runtime pre/post tool checkpoints | **Can** (via control ports) |
| Idempotency key discipline | **Can** (auto key) |
| Approval fail-closed when required | **Can** |
| Exactly-once external side effects | **Cannot** |
| Durable HITL wait/resume | **Cannot** |
| Correct sideEffect taxonomy without developer honesty | **Cannot** (defaults + docs only) |

### 4. Smallest safe Simple Memory facade?

- `inMemory()` helper + `memory: true` alias
- Wire `MemoryEngine` + `InMemoryMemoryProvider` into embedded platform
- Retrieve → inject into prompt; capture → lifecycle to `available` within agent instance
- Dispose on `close()`

No new memory subsystem. No Postgres in hello-world.

### 5. Should `memory: true` mean ephemeral memory?

**Yes.** Product meaning: `memory: true` ≡ `inMemory()` — process-local, instance-scoped, non-durable.

Any other meaning would over-promise.

### 6. How should durable memory be exposed later?

- Advanced / host: existing `MEMORY_PROVIDER=persistent` + Persistence packages
- Future simple helper (not v1.2): e.g. `memory: postgres({...})` only when Composition Persistence is explicitly configured and documented
- Never silently upgrade `memory: true` to durable

### 7. Exact OpenAI example design?

Already scaffolded at `examples/openai-agent/`:

```bash
npm install
# set OPENAI_API_KEY
npm start
```

`createAgent` + `openai("gpt-4o-mini")` + `invoke` + `close`; public packages only; clear error if key missing; no committed secrets.  
v1.2 implementation: verify against published line, bump dependency range to `^1.2.0` when releasing, keep linked from README/docs.

### 8. Is Node 22 support technically possible?

**Likely yes.** Audit found no Node-24-only production APIs; TypeScript target is ES2022; `@types/node` is already `^22`.  
**Not proven in this environment** (only Node 24 installed locally). Must be proven by CI before engines change.

### 9. What currently forces Node 24?

Policy / verification pins — not API hard requirements:

- root + `agent-framework` `engines.node: ">=24 <25"`
- CI `node-version: "24"`
- Docker `FROM node:24-bookworm-slim`
- Docs stating older majors unverified
- Historical container/CI specification preferring 24

### 10. Proposed engines / CI matrix?

| Phase | Action |
|---|---|
| 1 | Add CI Node **22** + **24** verify jobs |
| 2a | If 22 green → `engines`: `>=22 <25` (root + agent-framework) |
| 2b | If 22 red → keep `>=24 <25`; document blockers |
| Docker | Default image may remain 24; document as image pin |

Do **not** claim Node 20 in v1.2.

### 11. Current public package / version matrix?

| Version | Packages (public) |
|---|---|
| **1.1.1** | `agent-framework` |
| **1.0.1** | `ai-provider`, `ai-provider-openai`, `runtime`, `memory`, `tool-framework`, `security` |
| **1.0.0** | Remaining public `@agentprodready/*` (majority) |
| private | `platform-host` |

Full table should live in `docs/guides/package-compatibility.md` (exists; expand in implementation).

### 12. Are version differences unsafe or merely confusing?

**Merely confusing** under the selective versioning policy, provided peer/workspace ranges resolve (they do for the published line).  
Not a broken release. Documentation + optional CI checks fix the confusion; lockstep bumps would be harmful churn.

### 13. Proposed compatibility documentation?

Expand `docs/guides/package-compatibility.md`:

- install tiers (simple vs advanced vs transitive)
- peer: optional `@agentprodready/ai-provider-openai`
- move-together sets
- full version table
- Node engines linked to CI
- “why 1.2.x beside 1.0.x”

### 14. Can compatibility be CI-enforced?

**Partially yes:**

- Extend `verify-versioning` / add `verify-package-compatibility` for peers, engines consistency, metadata
- Existing `pnpm verify` already exercises workspace graph
- Full combinatorial semver matrix: **no** (too expensive; not proposed)

### 15. Current install dependency / size measurements?

Clean install `@agentprodready/agent-framework@1.1.1` (`--omit=dev`, 2026-08-08):

| Metric | Measured |
|---|---|
| npm “added” packages | **68** |
| Direct deps | **17** |
| `@agentprodready/*` installed | **22** |
| Top-level packages (approx) | **43** |
| `node_modules` size | **~8.34 MB** |

### 16. Can simple-path dependency weight safely decrease?

**Marginally, not dramatically**, without architecture redesign.

- OpenAI already optional/lazy
- Some directs appear unused by `agent-framework/src` today (`audit`, `evaluation`, `event-bus`, `knowledge`) — candidates for careful removal **after** proof
- `memory` / `tool-framework` become **used** by v1.2 facades
- Many packages arrive transitively via Composition/Security/Runtime anyway
- Package split / `@agentprodready/core`: **not recommended** in this cycle

### 17. GitHub metadata changes required?

Yes — still the highest-leverage free discoverability win. Environment lacked `gh` / token.

**Desired:**

| Field | Value |
|---|---|
| Description | `Build an agent in minutes. Add production controls when you need them.` |
| Homepage | `https://github.com/ameenmari/agentprodready#readme` |
| Topics | `ai-agents`, `agent-framework`, `typescript`, `nodejs`, `llm`, `openai`, `ai`, `developer-tools` |

```bash
gh repo edit ameenmari/agentprodready \
  --description "Build an agent in minutes. Add production controls when you need them." \
  --homepage "https://github.com/ameenmari/agentprodready#readme" \
  --add-topic ai-agents \
  --add-topic agent-framework \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic llm \
  --add-topic openai \
  --add-topic ai \
  --add-topic developer-tools
```

Also: GitHub UI → About pencil. See `docs/implementation/manual-actions/github-repository-metadata.md`.

### 18. Which next provider gives the highest value?

**OpenAI-compatible** (base URL + API key + model id) — design-only for this cycle.

Covers many backends (proxies, Azure-ish gateways, Groq/Together-style OpenAI APIs, local OpenAI-compatible servers) with maximal reuse of existing request/response/stream/tool translation patterns and mockable CI without Anthropic-specific protocol work.

### 19. Why not the other provider options first?

| Option | Why not first |
|---|---|
| **Anthropic** | Different messages/tools streaming shapes; higher maintenance; still one vendor; needs separate error/tool normalization work |
| **Azure OpenAI** | Mostly credential/endpoint variant of OpenAI; better as a config profile of OpenAI or OpenAI-compatible than a wholly separate architecture |
| **OpenAI-compatible** | Highest leverage per engineering hour; CI-friendly with mocks/local servers |

Provider **implementation** remains a separate Review-Gated cycle.

### 20. Exact files to create/modify?

See specification §9. Primary: `packages/agent-framework/src/simple/**`, docs/guides, CI workflow, examples/openai-agent, versioning script, CHANGELOG/README.

### 21. Package versions that would need bumps?

| Package | Expected |
|---|---|
| `@agentprodready/agent-framework` | **1.2.0** (public simple surface) |
| Others | Only if shared loop/helpers are extracted into their public surface |

No mechanical lockstep bump.

### 22. Tests required?

- `tool()` validation + duplicate names
- createAgent tools happy path + Security deny + approval required
- loop limits / unsafe recovery classification preserved
- memory two-turn ephemeral recall + close
- existing createAgent + host tool suites remain green
- `pnpm test:public-dx`
- Node 22 CI before engines widen

### 23. Architecture / ADR amendments required?

**No new ownership ADR required** if the facade strictly delegates.  
Optional future ADR only if a new shared tool-loop package boundary is introduced.

Must **not** amend ADRs to move tool auth into AI Provider or agent-framework-as-Security.

### 24. Stop conditions?

Stop implementation and re-review if:

1. Tool `execute` would run without Security + ToolInvocationCoordinator
2. Memory invents a parallel store bypassing MemoryEngine
3. Durable memory is demanded inside `memory: true`
4. Node 22 needs substantial runtime polyfills/rewrites
5. `@agentprodready/core` is proposed as mandatory
6. A new provider package is pulled into the same cycle
7. Stream/tool event design would require breaking v1.1 consumers beyond additive unions
8. Host tool-loop extraction would force unsafe ownership changes

### 25. Is Autonomous implementation safe?

**Conditionally yes** — after human approval of D1–D10 in the specification (especially tool defaults, memory alias semantics, tool-loop placement, and Node engines process).

Autonomous is **not** safe if API shape is still bike-shedded mid-implementation or if Node engines are widened without CI.

---

## External feedback mapping

| Feedback item | v1.2 design response |
|---|---|
| Repo discoverability | Manual `gh`/UI steps (§17) |
| Simple tools + memory + openai example | Tracks A/B/C |
| Soften/explain Node 24 | Track D + docs |
| More providers | Design-only: OpenAI-compatible next (§18) |
| Compatibility matrix | Track E (file already started) |
| Heavy deps | Measured (§15–16); limited safe cleanup only |
| Don’t claim battle-tested | Retained maturity line |

---

## Recommendation

### **CONDITIONAL PASS** for Autonomous implementation

**Approve when:**

1. Spec decisions D1–D10 accepted (or explicitly amended in writing)
2. Scope remains facade + docs + CI/compat — no provider implementation
3. Implementers agree tool loop will preserve ownership (shared extract **or** embedded parity with tests)

**Then Autonomous may:**

- Implement tools/memory facades + tests + docs + example polish
- Run Node 22 CI experiment and widen engines only if green
- Bump/publish `agent-framework@1.2.0` only when user authorizes publish

**Do not Autonomous-expand into:** Anthropic/Azure packages, `@agentprodready/core`, durable simple Postgres memory, or lockstep monorepo versioning.

---

## Checklist for approver

- [ ] Product target experiences accepted
- [ ] `tool()` defaults for sideEffect/idempotency accepted
- [ ] `memory: true` = ephemeral accepted
- [ ] Tool loop placement approach accepted
- [ ] Node 22 = CI-gated accepted
- [ ] Provider recommendation accepted as **later cycle**
- [ ] Autonomous CONDITIONAL PASS acknowledged
