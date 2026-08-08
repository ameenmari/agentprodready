# AgentProdReady v1.1 Developer Experience Facade — Implementation Plan

**Document Version:** 1.0  
**Product Version:** 1.1.0 (target)  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Baseline:** AgentProdReady v1.0.1  
**Authority:** Follows AGENTS.md, dependency graph, accepted ADRs; implements product doc `docs/product/agentprodready-v1.1-developer-experience-facade.md`

---

## 1. Scope

Implement **only** the Developer Experience facade and supporting docs/examples/tests:

1. `createAgent` / `reference` / `openai` simple API in `@agentprodready/agent-framework`
2. Embedded composition bootstrap (library-local; **not** `apps/platform-host`)
3. Simple result / stream / error / dispose surfaces
4. Package README + root README product-first rewrite
5. Guides: Getting Started + Simple Agent API
6. Examples: `examples/hello-agent`, `examples/streaming-agent`
7. External clean-install DX script + tests
8. Version bump: `@agentprodready/agent-framework@1.1.0` (other packages only if their public surface actually changes)

**Out of scope for core v1.1:** tools facade, memory facade, evaluation, routing UI, Postgres first-run, dual CJS build, `@agentprodready/core`, npm publish during design.

---

## 2. Implementation Mode

**Review-Gated** for this design phase.  
After approval: **Autonomous** implementation of this plan + specification only.

---

## 3. Current DX audit (exact journey today)

### 3.1 What `npm install @agentprodready/agent-framework` gives

- Advanced Agent Framework APIs (definition builder, registry, lifecycle, `AgentFramework.invoke` handoff)
- Transitive deps on runtime, security, composition, ai-provider, prompt-builder, etc.
- **Does not** include a runnable chat composition
- **Does not** depend on `@agentprodready/ai-provider-openai`
- ESM-only (`"type": "module"`)
- Runnable reference wiring lives in unpublished `apps/platform-host`

### 3.2 Approximate external journey to a response today

| Step | What developer must do |
|---|---|
| Install | `npm install @agentprodready/agent-framework` (+ often many siblings / copy host patterns) |
| Imports | AgentFramework, registry/lifecycle types, Runtime, AI adapters, Capability Resolution, Security outcomes, Composition, Foundation helpers |
| Manifest | Build full `AgentManifest` / definition with governance, capabilities, limits |
| Register | Registry validate + register |
| Lifecycle | Draft → review → activate with approval/evaluation/compatibility references |
| Security | Construct `AgentAuthorizationOutcome` or wire SecurityPlatform |
| Runtime | Construct `RuntimeOrchestrator` + **custom `AgentRuntimePort`** that awaits `runtime.execute` and stores results (pattern only in platform-host today) |
| Provider | Register Reference or OpenAI adapter; Capability bindings |
| Composition | Wire Persistence / Event Bus / Audit / Observability (in-memory or real) |
| Invoke | `framework.invoke` → then **separately** fetch stored Runtime result and extract text |
| Stream | `acceptStream` + host stream mapping (HTTP SSE in host — wrong layer for library) |

**Approximate counts (honest):**

| Metric | Today |
|---|---|
| LOC to first response | 80–250+ (or blocked without host) |
| Concepts | 12–20 (manifest, lifecycle, handoff, runtime port, capability binding, auth outcome, composition, …) |
| Direct packages imported | 5–10+ |
| Secrets (reference) | 0 if reference AI wired; OpenAI needs key |
| DB/Docker | Not required for in-memory, but docs/examples often imply host |

### 3.3 Top friction points

1. **No product entrance** — install succeeds; hello-world does not.
2. **Handoff ≠ answer** — `AgentFramework.invoke` returns execution reference, not `text`.
3. **Composition lives in app host** — unpublished, HTTP-centric.
4. **Manifest + lifecycle ceremony** before any model call.
5. **Security/auth outcomes** look like production API concerns in README samples.
6. **Blueprint-first docs** delay product understanding.
7. **Heavy dependency tree** (acceptable if DX works; today it amplifies “complex” perception).

---

## 4. Public API inventory (`@agentprodready/agent-framework`)

### 4.1 Classification (current)

| Class | Examples | v1.1 action |
|---|---|---|
| Advanced / stable public | `AgentFramework`, `buildAgentDefinition`, registry/lifecycle types, errors | Keep; document as Advanced |
| Reference / test helpers | Internal test utilities if exported | Do not promote in beginner docs |
| Internal-looking but public | Long architecture type names | Keep; hide from simple docs |
| Facade candidates | *(none today)* | Add `createAgent`, `reference`, `openai`, simple types |

### 4.2 Can `createAgent` live in agent-framework?

**YES** — preferred and architecturally safe **if**:

- Facade **assembles and delegates**; does not reimplement Runtime / Security / Capability Resolution / AI normalization / Prompt Builder ownership
- Facade does **not** import `apps/platform-host`
- Facade does **not** become a new blueprint owner

Do **not** create `@agentprodready/core` for v1.1.

---

## 5. Facade ownership rules

The facade **may**:

- Choose safe **simple-mode** defaults
- Assemble existing components
- Generate `AgentManifest` from developer config
- Register + activate lifecycle
- Register provider bindings
- Construct Runtime handoff (`AgentRuntimePort` that awaits execution)
- Map results to `AgentResult` / `AgentStreamEvent`
- Throw developer-facing `SimpleAgentError` (must not collide with advanced `AgentError`)
- Expose dispose

The facade **must not**:

- Own Runtime operational semantics
- Bypass Security authorization ownership (embedded mode uses an explicit **application-local** security path — see specification)
- Reimplement Capability Resolution selection logic
- Parse provider-specific OpenAI SDK types into public contracts
- Install process signal handlers / `process.exit` / HTTP listeners

---

## 6. Recommended public contracts (summary)

Exact shapes are normative in the specification. Plan-level summary:

```ts
createAgent(options: CreateAgentOptions): Agent
reference(): AgentModel
openai(modelId: string): AgentModel

interface Agent {
  invoke(input: string): Promise<AgentResult>
  stream(input: string): AsyncIterable<AgentStreamEvent>
  close(): Promise<void>
}
```

- `openai(modelId)` returns a **descriptor** only (no SDK types).
- OpenAI adapter loads **lazily** via optional peer `@agentprodready/ai-provider-openai`.
- Reference path never loads OpenAI.

---

## 7. Internal bootstrap chain

```
createAgent(config)
  → normalize CreateAgentOptions
  → build EmbeddedSimplePlatform (isolated per createAgent)
       → Foundation identifiers / clocks as needed
       → in-memory Persistence / Event Bus / Audit / Observability (simple mode)
       → AI Provider Framework + adapter (reference | openai lazy)
       → Capability Resolution bindings for chosen model
       → Prompt Builder path for instructions
       → RuntimeOrchestrator + EmbeddedRuntimePort (await execute / stream)
       → Security application-local defaults for register/lifecycle/invoke
       → AgentFramework
  → generate AgentManifest from facade config (canonical contract)
  → validate + register + activate
  → return Agent facade handle
```

**Isolation:** each `createAgent()` owns its own lightweight composition. No global mutable singleton platform.

**Host coupling:** reimplement minimal embedded path using **published package APIs**. Do not import platform-host. If a required capability exists only as host-private code and cannot be reconstructed from public contracts → **STOP** and extract into the correct package (ownership-preserving move).

---

## 8. Package / dependency plan

### Reference path

```bash
npm install @agentprodready/agent-framework
```

### OpenAI path

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

Declare `@agentprodready/ai-provider-openai` as **optional peerDependency** (+ `peerDependenciesMeta.optional: true`).  
If `openai()` model is used and peer is missing → developer-friendly error with exact install command.

**Why not hard-depend openai package?** Avoid Blueprint 18 permanently owning a paid-provider adapter and avoid forcing OpenAI SDK into every reference install. Descriptor + lazy peer preserves DX import style:

```js
import { createAgent, openai } from "@agentprodready/agent-framework";
```

without a dependency cycle (openai package is not required to import agent-framework for the descriptor).

### Env

- Read `process.env.OPENAI_API_KEY` only when OpenAI model is selected (document ownership: facade bootstrap / openai adapter config).
- Do **not** auto-load `dotenv`. Document `export OPENAI_API_KEY=...` / OS env / `.env` loaded by the **application**.

---

## 9. Documentation plan

| Deliverable | Action |
|---|---|
| `packages/agent-framework/README.md` | Full rewrite (product order in §30 of brief) |
| Root `README.md` | Product-first; hello-world immediately |
| `docs/README.md` | Point beginners to Getting Started before Blueprints |
| `docs/guides/getting-started.md` | Canonical beginner guide |
| `docs/guides/simple-agent-api.md` | Short API reference |
| `examples/hello-agent/**` | Reference provider; `npm start` |
| `examples/streaming-agent/**` | Library `stream()`; not SSE |
| Optional OpenAI | Getting Started section; optional `examples/openai-agent` if size allows |

---

## 10. Testing plan

| Test | Purpose |
|---|---|
| Unit: facade config validation | Bad model / missing instructions |
| Unit: reference invoke → `result.text` | Deterministic |
| Unit: missing OPENAI_API_KEY | Clear error |
| Unit: invoke after close | Clear error |
| Unit: two agents isolation | Separate identity / state |
| Unit: close → process can exit | No leaked handles (best-effort + documented) |
| Integration: Prompt Builder ownership | Instructions via approved path |
| `scripts/test-public-dx.mjs` | Pack → temp dir → install tarball → `node index.mjs` → stream → exit |
| Regression | `pnpm verify`, `pnpm test:routing`, `pnpm test:tenant-isolation`, `pnpm test:tools`, `pnpm test:streaming`, plus suites touched |

README quickstart blocks must be executable (no pseudo-code in first hello-world).

---

## 11. File plan (post-approval)

### Likely create

- `packages/agent-framework/src/simple/**` (createAgent, models, errors, result mapping, embedded bootstrap, EmbeddedRuntimePort)
- `examples/hello-agent/**`
- `examples/streaming-agent/**`
- `docs/guides/getting-started.md`
- `docs/guides/simple-agent-api.md`
- `scripts/test-public-dx.mjs`
- `tests/public-dx/**` (or package-local specs under `packages/agent-framework/src/simple/**/*.spec.ts`)

### Likely modify

- `packages/agent-framework/src/index.ts` (additive exports)
- `packages/agent-framework/package.json` (version 1.1.0, optional peer, files)
- `packages/agent-framework/README.md`
- Root `README.md`, `docs/README.md`, `CHANGELOG.md`

### Must not modify (for facade alone)

- Blueprint ownership contracts unless a documented stop forces a package extraction PR first
- Advanced public APIs (no removals / deprecations for facade)

---

## 12. Versioning & distribution

- `@agentprodready/agent-framework` → **1.1.0**
- Bump other packages **only** if production source/public surface changes
- Verify: `npm pack --dry-run`, clean external install
- **Do not publish** during Review-Gated design

---

## 13. Phased delivery (Autonomous after approval)

1. Embedded bootstrap + reference `createAgent` + `invoke` + `close`
2. Result / error types + tests
3. `stream()` simple events
4. `openai()` descriptor + lazy peer + env error
5. Examples + DX script
6. README / guides rewrite
7. Pack verification + regression suites
8. Implementation report + checklist (completion gate)

---

## 14. Stop conditions (plan)

Stop and report if implementation would require any item listed in the specification § Stop Conditions (Runtime duplication, Security bypass, Prompt Builder bypass, host import, global singleton, OpenAI SDK in facade API, cycles for prettier syntax, secrets for reference path, etc.).

---

## 15. Exit criteria

- External temp project: install packed agent-framework → `node index.mjs` prints reference text
- OpenAI path documented + error experience tested without requiring live key in CI (key-missing test); live key optional local
- Streaming example works without SSE knowledge
- Advanced exports unchanged
- Required regression suites green
- Report + checklist completed before claiming done
