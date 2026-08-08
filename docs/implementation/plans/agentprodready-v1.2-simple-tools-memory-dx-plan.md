# AgentProdReady v1.2 — Simple Tools, Memory & Compatibility — Implementation Plan

**Document Version:** 1.0  
**Product Version:** 1.2.0 (target)  
**Status:** Approved — Autonomous implementation (D2: non-idempotent defaults)  
**Implementation Mode:** Review-Gated (design) → Autonomous (approved)  
**Baseline:** `@agentprodready/agent-framework@1.1.1` + credibility docs  
**Authority:** Product doc `docs/product/agentprodready-v1.2-simple-tools-memory-dx.md`; ADRs 002/004/005/006/007/008; dependency graph; tools/memory guides

---

## 1. Scope

Implement **only** after approval:

| Track | Deliverable |
|---|---|
| A | Simple Tools facade (`tool()`, `createAgent({ tools })`) over existing Tool Framework |
| B | Simple Memory facade (`inMemory()`, `memory: true`) over existing MemoryEngine |
| C | Verify/polish `examples/openai-agent` |
| D | Node compatibility: CI evidence + engines/docs aligned to evidence |
| E | Expand `docs/guides/package-compatibility.md` + optional CI compatibility checks |
| F | Docs: Simple Tools, Simple Memory, Node, simple vs advanced, limitations |
| G | GitHub About metadata (manual/gh) |
| H | Dependency-weight notes + non-breaking cleanup recommendations |
| I | Provider expansion **recommendation only** (no new adapter package) |

**Out of scope:** new AI provider implementation; `@agentprodready/core`; durable HITL; GHCR; lockstep version bumps; production TypeScript during this Review-Gated design pass.

---

## 2. Implementation Mode

**Review-Gated** now.  
After approval of plan + specification: **Autonomous** for the approved slice only, with stop conditions in the review.

---

## 3. Current-state audit (summary)

### 3.1 Simple Agent today

- Options: `model`, `instructions`, `name?`, `description?`
- `tools` / `memory` rejected by allowlist
- Embedded platform: AI + Security + Runtime + Planning + Prompt; **no** ToolRegistry / MemoryEngine
- Stream events: text-only
- Tool loop reference implementation: unpublished `apps/platform-host`

### 3.2 Tool Framework reuse surface

- `ToolContract`, `ToolAdapter`, `ToolAdapterResolver`, `ToolInvocationCoordinator`, `AiToolCallHandoff`
- Host loop: validate → Security → approval → Cap Resolution → Composition → Runtime checkpoints → coordinator → AI continuation

### 3.3 Memory reuse surface

- `MemoryEngine` + `InMemoryMemoryProvider` (+ host persistent path)
- Lifecycle required before retrieval (`available` state)
- Authorization facts required per operation

### 3.4 Install weight (measured 2026-08-08)

Clean external: `npm install @agentprodready/agent-framework@1.1.1 --omit=dev`

| Metric | Value |
|---|---|
| Packages added (npm report) | 68 |
| Direct dependencies of agent-framework | 17 |
| `@agentprodready/*` installed | 22 |
| Top-level packages (approx) | 43 |
| `node_modules` size | ~8.34 MB |

Direct deps unused by `packages/agent-framework/src` today (candidates for careful review, not forced deletion): `audit`, `evaluation`, `event-bus`, `knowledge` (and historically `memory` / `tool-framework` unused by simple — but **required for v1.2 facades**).

### 3.5 Node

- No Node-24-only production APIs found
- Pins: root + agent-framework `engines`, CI, Docker `node:24-bookworm-slim`, docs
- Local environment has Node 24 only — Node 22 must be proven in CI before claiming support

---

## 4. Workstreams

### A — Simple Tools

1. Add `tool()` helper in `packages/agent-framework/src/simple/` mapping developer shape → `ToolContract` + Composition-bound `ToolAdapter`.
2. Extend `CreateAgentOptions` with optional `tools?: readonly SimpleTool[]`.
3. Wire embedded platform: ToolRegistry, FactoryToolAdapterResolver, ToolInvocationCoordinator, Cap Resolution tool capabilities, Security `allowedTools` / per-call authorize.
4. Implement embedded tool loop that **mirrors** host ownership (prefer extract shared module under an owned package if low-risk; otherwise duplicate carefully inside `simple/` then extract later).
5. Raise `maximumToolInvocations` when tools present; offer `AiToolDefinition[]` on AI requests.
6. Extend stream events with safe tool lifecycle events (no raw args/results by default) — align with host SSE safety rules for library stream.
7. Defaults for sideEffect/idempotency per specification (explicit product decision).
8. Tests: unit + createAgent tool invoke with `reference()` or mock; Security deny path; approval fail-closed; public-dx update if exported surface grows.

### B — Simple Memory

1. Add `inMemory()` helper; `memory: true` as alias for `inMemory()`.
2. Construct `MemoryEngine` + `InMemoryMemoryProvider` (+ ranking/noop AI port as host does).
3. Define embedded session identity (agent instance scope).
4. On invoke: retrieve available memories → inject into prompt path (Prompt Builder / Context Assembly — prefer approved Context Assembly path when feasible; smallest honest injection if CA wiring is disproportionate — document decision).
5. Capture conversation facts with lifecycle to `available` for subsequent turns **within the same agent instance**.
6. `close()` disposes/clears memory provider maps.
7. Docs: ephemeral ≠ Postgres.
8. Explicitly **defer** `postgres()` simple helper to later cycle (advanced path remains).

### C — OpenAI example

1. Keep `examples/openai-agent` public-package style.
2. Ensure README/start scripts match product target.
3. Link from root README / docs index (partially done).
4. Do not commit secrets; fail clearly without `OPENAI_API_KEY`.

### D — Node compatibility

1. Add CI job(s) for Node **22** (and keep 24) running `pnpm verify` (or a documented subset if full matrix too expensive — prefer full verify).
2. Only after green: widen `engines` to `>=22 <25` on root + agent-framework.
3. Docker: keep 24 by default **or** document 22; do not silently change production image without note.
4. Update Getting Started / package-compatibility / adopting guide.
5. If CI fails on 22: document exact blocker; keep engines 24.

### E — Package compatibility

1. Expand `docs/guides/package-compatibility.md` with: install tiers, peers, move-together sets, full public version table.
2. Extend `scripts/verify-versioning.mjs` (or sibling) to validate:
   - every public package has repository/homepage/bugs/license
   - peerDependency ranges for openai peer remain satisfiable by published versions
   - workspace dependency graph does not declare impossible peer ranges
3. Do **not** force versions to look identical.

### F — Documentation

New/updated guides:

- Simple Tools
- Simple Memory
- Updates to Simple Agent API, Getting Started, adopting, README limitations
- Keep maturity line

### G — GitHub metadata

Manual / `gh repo edit` (see review). Not claimed complete without execution.

### H — Dependency weight

1. Document measured numbers.
2. Optional non-breaking cleanup: remove direct deps that neither `src/` nor published types require **and** that are not needed for v1.2 tools/memory — only with typecheck/boundary proof.
3. Reject package-split redesign in v1.2.

### I — Provider recommendation

Document only: next provider = **OpenAI-compatible** (see review). Separate Review-Gated cycle for implementation.

---

## 5. Package version bumps (expected)

| Package | Likely bump | Why |
|---|---|---|
| `@agentprodready/agent-framework` | **1.2.0** | New public simple surface (`tool`, `inMemory`, options, stream events) |
| `@agentprodready/tool-framework` | only if public helper/export moved here | Prefer keep facade in agent-framework; bump only if shared loop extracted into this package |
| `@agentprodready/memory` | only if new public helper exported from memory package | Prefer facade in agent-framework |
| `@agentprodready/ai-provider` / openai | no | unless stream/tool typing needs shared export |
| Root private monorepo | independent | engines may change |

Selective bumps only.

---

## 6. Acceptance criteria → verification map

| # | Criterion | Verification |
|---|---|---|
| A1 | `tool()` + `createAgent({ tools })` works with reference or OpenAI | Automated Test |
| A2 | Tool path uses ToolInvocationCoordinator | Automated / Architecture Review |
| A3 | Security authorize per tool; deny fails closed | Automated Test |
| A4 | approvalRequirement required → fail closed | Automated Test |
| A5 | No second tool runtime | Manual Architecture Review |
| A6 | Advanced tool APIs unchanged | Contract / existing tests |
| B1 | `inMemory()` / `memory: true` recalls within instance | Automated Test |
| B2 | No DB required | Automated Test |
| B3 | Docs distinguish ephemeral vs durable | Documentation Verification |
| B4 | `close()` safe with memory | Automated Test |
| C1 | openai-agent example runs with key | Manual / script |
| D1 | Node claim matches CI | CI + Documentation |
| E1 | Compatibility guide answers scatter | Documentation Verification |
| E2 | Versioning/compat script green | Automated Test |
| F1 | Guides for tools/memory/compatibility | Documentation Verification |

---

## 7. Sequencing

1. Lock API decisions in specification (review).
2. Tools wiring + tests (harder; unblocks realistic demos).
3. Memory wiring + tests.
4. Docs + examples + compatibility.
5. Node 22 CI experiment → engines decision.
6. Report + checklist + selective publish of `agent-framework@1.2.0`.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Tool loop duplication vs host drift | Shared module or parity tests against host behaviors |
| Over-promising memory durability | Product copy + `inMemory` naming |
| Stream event expansion breaks consumers | Additive union members only |
| Node 22 fails late | CI before engines change |
| Dependency cleanup breaks advanced imports | Typecheck + boundaries + public-dx |

---

## 9. Stop conditions (plan-level)

Stop and re-review if:

- Tool execution would bypass Security or ToolInvocationCoordinator
- Memory would invent a parallel store
- Durable Postgres must be in simple path for acceptance
- Node 22 requires substantial polyfills / API rewrites
- New `@agentprodready/core` becomes “required” without evidence
- Provider implementation sneaks into scope
