# AgentProdReady v1.1 Developer Experience Facade — Review

**Document Version:** 1.0  
**Product Version:** 1.1.0 (target)  
**Status:** Approved → Implemented (Autonomous)  
**Implementation Mode:** Review-Gated  
**Artifacts reviewed:**

- `docs/product/agentprodready-v1.1-developer-experience-facade.md`
- `docs/implementation/plans/agentprodready-v1.1-developer-experience-facade-plan.md`
- `docs/implementation/specifications/agentprodready-v1.1-developer-experience-facade-specification.md`

**Baseline inspected:** `@agentprodready/agent-framework@1.0.1` (published), platform-host local composition, AI Provider / OpenAI packages, Runtime handoff contracts.

---

## Required review output

### 1. Current hello-world developer journey

Today:

1. `npm install @agentprodready/agent-framework`
2. Discover advanced exports (`buildAgentDefinition`, `AgentFramework`, …) — **no chat answer**
3. Either abandon, or reverse-engineer unpublished `apps/platform-host` composition:
   - Build full agent manifest / definition
   - Validation catalog + register
   - Lifecycle transitions to `active` (approval / evaluation / compatibility refs)
   - Wire Runtime + custom `AgentRuntimePort` that **awaits** `runtime.execute` and stores results (host pattern)
   - Wire Capability Resolution + AI adapters
   - Construct Security authorization outcomes or Security platform
   - Wire Composition / Persistence / Event Bus / Audit / Observability
   - Invoke via `AgentFramework.invoke`, then **separately** read stored Runtime result and extract text
4. Streaming today is understood mainly via host HTTP SSE — wrong layer for an embedded library demo

**Approximate today:** 80–250+ LOC (or blocked), 12–20 concepts, 5–10+ direct package imports.

### 2. Current friction points

1. Installable package ≠ runnable product entrance  
2. `AgentFramework.invoke` returns handoff acceptance (`finalExecutionOutcomeIncluded: false`), not `text`  
3. Runnable wiring lives in unpublished `apps/platform-host`  
4. Manifest + lifecycle ceremony before any model call  
5. Security/auth outcomes dominate samples  
6. Blueprint-first documentation  
7. Heavy transitive graph amplifies “complex” perception (acceptable if DX works)

### 3. Recommended final `createAgent` API

```ts
createAgent(options: CreateAgentOptions): Agent

interface CreateAgentOptions {
  model: AgentModel;
  instructions: string;
  name?: string;
  description?: string;
}
```

Lives in `@agentprodready/agent-framework`. Returns facade `Agent` handle.

### 4. Recommended `reference()` API

```ts
reference(): AgentModel
// → { provider: "reference", modelId: "reference" }
```

Zero secrets, zero network, uses existing `ReferenceAiProviderAdapter`.

### 5. Recommended `openai()` API

```ts
openai(modelId: string): AgentModel
// → { provider: "openai", modelId }
```

Descriptor only; no OpenAI SDK types. Adapter loaded lazily via optional peer `@agentprodready/ai-provider-openai`. Missing key → `SimpleAgentError` `AGENT_MISSING_OPENAI_KEY`. Missing peer package → `AGENT_MISSING_OPENAI_PACKAGE` with install command.

### 6. `Agent.invoke` API

```ts
invoke(input: string): Promise<AgentResult>
```

Facade builds internal invocation; developer passes a string only.

### 7. `Agent.stream` API

```ts
stream(input: string): AsyncIterable<AgentStreamEvent>
```

Embedded library stream — **not** HTTP SSE.

### 8. Result type

```ts
interface AgentResult {
  text: string;
  output?: unknown;
  executionId: string;
  usage?: AgentUsage;
  metadata?: Readonly<Record<string, unknown>>;
  raw?: unknown;
}
```

Primary field: `result.text`.

### 9. Stream event type

```ts
type AgentStreamEvent =
  | { type: "start"; executionId: string }
  | { type: "text"; text: string }
  | { type: "usage"; usage: AgentUsage }
  | { type: "complete"; executionId: string };
```

Tool events deferred.

### 10. Error type

`SimpleAgentError` + `SimpleAgentErrorCode` (distinct from existing advanced `AgentError` / `AgentErrorCode` to avoid export collision). Codes include missing OpenAI key/package, invalid config/model, closed, timeout, provider unavailable, init/invoke/stream failures.

### 11. Disposal API

```ts
await agent.close(): Promise<void>
```

Idempotent preferred. Required in README when handles would otherwise keep Node alive. No global signal handlers / `process.exit`.

### 12. Internal bootstrap flow

```
createAgent(config)
→ normalize facade config
→ construct isolated EmbeddedSimplePlatform
→ Foundation + in-memory Persistence / Event Bus / Audit / Observability
→ AI Provider Framework + adapter (reference | openai lazy)
→ Capability Resolution bindings
→ Prompt Builder path for instructions
→ RuntimeOrchestrator + EmbeddedRuntimePort (await execute / stream; store results)
→ application-local Security defaults for register / lifecycle / invoke
→ AgentFramework
→ generate AgentManifest → validate → register → activate
→ return Agent facade
```

### 13. Security / default model

Simple mode uses **application-local** embedded security sufficient for process-local register/activate/invoke. Explicitly **not** public HTTP auth. Production / multi-tenant hosts remain advanced + real Security integration. Prefer Security-owned paths with local policy over unchecked bypasses.

### 14. Prompt Builder integration

`instructions: string` → Prompt Builder instruction entries + minimal consumer profile/policy + required context package via existing Context Assembly APIs → normalized prompt feeds AI path. **No** provider-specific message crafting in facade. Stop if bypass would be required.

### 15. Can agent-framework cleanly export `openai()`?

**Yes, as a descriptor factory + optional peer lazy load** — preferred.

- Avoids hard dependency on `@agentprodready/ai-provider-openai` for reference installs  
- Avoids dependency cycles  
- Preserves `import { createAgent, openai } from "@agentprodready/agent-framework"`  
- Fallback if blocked: import `openai` from `@agentprodready/ai-provider-openai` (architecture wins)

### 16. Package dependency impact

**Current `@agentprodready/agent-framework@1.0.1`:**

- Direct deps: **17** `@agentprodready/*` packages (no `ai-provider-openai`)
- Published unpacked size (package alone): **~62 KB** (`dist.unpackedSize: 61660`)
- Main size contributors: transitive sibling graph (runtime, security, composition, memory, tools, evaluation, …), not the facade source itself

**v1.1 impact:** facade code adds little to package tarball; optional peer OpenAI for OpenAI path only; reference path should not initialize OpenAI SDK. Do not merge packages solely to reduce dep count.

### 17. Public export additions

Additive only:

- `createAgent`, `reference`, `openai`
- `CreateAgentOptions`, `Agent`, `AgentModel`, `AgentResult`, `AgentStreamEvent`, `SimpleAgentError`, `SimpleAgentErrorCode`, `AgentUsage` (as needed)

Advanced exports retained.

### 18. Files to create

- `packages/agent-framework/src/simple/**` (createAgent, models, types, errors, mapping, embedded platform, embedded runtime port, tests)
- `examples/hello-agent/**`, `examples/streaming-agent/**`
- `docs/guides/getting-started.md`, `docs/guides/simple-agent-api.md`
- `scripts/test-public-dx.mjs`

### 19. Files to modify

- `packages/agent-framework/src/index.ts`
- `packages/agent-framework/package.json` → **1.1.0** + optional peer
- `packages/agent-framework/README.md`
- Root `README.md`, `docs/README.md`, `CHANGELOG.md`

### 20. README rewrite plan

Package README product order: What → Install → 60s hello world → OpenAI → Streaming → Simple mode → Advanced → Production notes → Links → API reference. Root README: product promise + hello-world first; architecture features after. Essential docs ship in package README (private GitHub must not be sole source).

### 21. Getting Started outline

Requirements → install → first reference agent → first OpenAI agent → invoke → stream → cleanup → common errors (missing key, Node version, ESM/CJS, close, provider unavailable, quota) → next steps (advanced / production).

### 22. Simple Agent API outline

Only: `createAgent`, `reference`, `openai`, `invoke`, `stream`, `close`, result type, `SimpleAgentError` — each with one copy/paste example.

### 23. Example projects

- `examples/hello-agent` — `reference()`, no key, deterministic, published-style dependency, `npm start`
- `examples/streaming-agent` — library `stream()`, not SSE
- OpenAI: Getting Started (optional third example)

### 24. External clean-install test strategy

`scripts/test-public-dx.mjs`: `npm pack` → temp dir outside repo → `npm install <tarball>` → write README hello `index.mjs` → run → streaming check → verify clean exit. No workspace imports.

### 25. Before / after DX metrics

| Metric | Before (v1.0.1) | After (v1.1 target) |
|---|---|---|
| Packages imported (reference) | many / unclear | 1 (`agent-framework`) |
| Concepts | 12–20 | ≤ 4 |
| LOC | 80–250+ or blocked | ~10–20 |
| Commands | many | `npm init -y`, `npm install`, `node index.mjs` |
| Secrets (reference) | N/A | 0 |
| Time to first response | hours / blocked | < 5 minutes |

### 26. npm pack impact

Pack must include compiled `simple/**`, types, README, runtime deps. OpenAI remains optional peer (not forced into every install). Verify with `npm pack --dry-run` + external install. **No publish in this Review-Gated phase.**

### 27. Versioning recommendation

- `@agentprodready/agent-framework` → **1.1.0**
- Bump other packages only if their production/public surface changes
- Do **not** mechanically bump the monorepo

### 28. Production warnings

Document clearly (README + Getting Started): simple mode is in-memory / embedded / application-local security; not for internet-facing multi-tenant services without advanced configuration. Prefer docs + optional mode metadata over noisy per-invoke warnings.

### 29. Stop conditions

As specified: Runtime duplication, Security bypass, Prompt Builder bypass, AI normalization bypass, host import into package, global singleton platform, OpenAI SDK in facade API, breaking advanced API, DB/Docker for hello-world, secrets for reference path, insecure defaults without boundary, convenience dependency cycles, hidden network in reference mode.

### 30. Architectural deviations

**None required** if implementation follows:

- Facade assembly-only ownership  
- Embedded Runtime port reimplementation from public contracts (inspired by host, not importing host)  
- `SimpleAgentError` naming to avoid colliding with advanced `AgentError`  
- Optional peer for OpenAI instead of hard Blueprint-18 → OpenAI coupling  

**Accepted product deviation from “architecture-first README”:** beginner docs become product-first; Blueprints move under Advanced (docs positioning only — ADRs/Blueprints retained).

### 31. Whether safe for Autonomous implementation

**Yes**, under Review-Gated approval of this design set, with mandatory stop reporting if §29 triggers during implementation. Highest implementation risk (not a design FAIL): assembling Prompt Builder + Runtime + Capability Resolution embedded path without host-private helpers — mitigated by stop condition + package extraction if needed.

---

## Additional audit notes

### Public export inventory (current)

| Class | Notes |
|---|---|
| Advanced/stable | `AgentFramework`, `buildAgentDefinition`, registry/lifecycle/invocation types |
| Facade candidates | None today — add `createAgent` / `reference` / `openai` |
| Collision watch | Existing `AgentError` → facade must use `SimpleAgentError` |

### Host coupling

`LocalReferenceRuntimePort` proves the required handoff→execute→store pattern. v1.1 must reimplement a minimal equivalent inside the package. **Must not** import `apps/platform-host`.

### Module format

ESM-only (`"type": "module"`). No dual CJS build in v1.1. Document CommonJS mismatch in troubleshooting.

### Out of scope confirmed

Tools, Memory, Evaluation, Routing on `createAgent`; Postgres first-run; phone-home; dotenv auto-load.

### Trust / positioning

> Build an agent in minutes. Add production controls when you need them.

Do not oversell SaaS, magic autonomy, exactly-once tools, or production auth defaults.

### Documentation path

```
README → Getting Started → Simple Agent API → Streaming → Advanced Architecture → Production Deployment
```

---

## Verdict

PASS — safe to approve Autonomous v1.1 Developer Experience implementation
