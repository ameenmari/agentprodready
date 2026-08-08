# AgentProdReady v1.1 Developer Experience Facade — Blueprint Implementation Specification

**Document Version:** 1.0  
**Product Version:** 1.1.0 (target)  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Plan:** `docs/implementation/plans/agentprodready-v1.1-developer-experience-facade-plan.md`  
**Product:** `docs/product/agentprodready-v1.1-developer-experience-facade.md`

This specification is normative for Autonomous implementation after Review-Gated approval.

---

## 1. Purpose

Define the smallest stable public Simple Agent API and the exact internal assembly rules so that:

1. A new Node.js developer can get a valid agent response from `@agentprodready/agent-framework` alone (reference model).
2. All real behavior remains owned by existing frameworks.
3. Advanced APIs remain available and undeprecated.

---

## 2. Architectural decisions (locked for v1.1)

| ID | Decision |
|---|---|
| D1 | Facade lives in `@agentprodready/agent-framework` (`src/simple/**`). No `@agentprodready/core`. |
| D2 | Facade is **not** a new architectural owner; assembly + defaults only. |
| D3 | Each `createAgent()` creates an **isolated** embedded composition (no global singleton). |
| D4 | `openai()` is a **descriptor factory** in agent-framework; OpenAI adapter loads via **optional peer** `@agentprodready/ai-provider-openai` (lazy). |
| D5 | Reference path uses `@agentprodready/ai-provider` `ReferenceAiProviderAdapter` (already a dependency); **no network**. |
| D6 | Text comes from Runtime execution via an embedded `AgentRuntimePort` that awaits `RuntimeOrchestrator.execute` / `executeStream` (same pattern as host port, reimplemented in-package). |
| D7 | `AgentFramework.invoke` remains the handoff owner; facade maps stored Runtime results to `AgentResult`. |
| D8 | Instructions go through **Prompt Builder** (no provider-specific message crafting in facade). |
| D9 | Simple mode = application-local / embedded defaults; **not** production multi-tenant HTTP auth. |
| D10 | Tools / Memory / Evaluation / Routing config are **out of** `createAgent` v1.1. |
| D11 | Module format remains **ESM-only**; document honestly; no dual-build in v1.1. |
| D12 | No `dotenv` auto-load; no phone-home; no process signal handlers; no HTTP listen. |

---

## 3. Public API (normative)

### 3.1 Exports added (additive)

From `@agentprodready/agent-framework`:

- `createAgent`
- `reference`
- `openai`
- Types: `CreateAgentOptions`, `Agent`, `AgentModel`, `AgentResult`, `AgentStreamEvent`, `SimpleAgentError` (approachable names; **must not** collide with existing advanced `AgentError` / `AgentErrorCode`)

Do **not** remove existing advanced exports.

### 3.2 `CreateAgentOptions`

```ts
interface CreateAgentOptions {
  readonly model: AgentModel;
  readonly instructions: string;
  readonly name?: string;
  readonly description?: string;
}
```

Validation:

- `instructions` must be a non-empty string (trim); else `AGENT_INVALID_CONFIG`
- `model` must be a valid `AgentModel` descriptor; else `AGENT_INVALID_MODEL`
- Unknown extra fields: ignore or reject consistently (prefer reject unknown for v1.1 clarity)

### 3.3 `AgentModel`

Opaque / branded structural descriptor. Conceptual shape:

```ts
type AgentModel =
  | { readonly provider: "reference"; readonly modelId: "reference" }
  | { readonly provider: "openai"; readonly modelId: string };
```

- `reference()` → `{ provider: "reference", modelId: "reference" }`
- `openai(modelId)` → `{ provider: "openai", modelId }` where `modelId` is non-empty string
- **No** OpenAI SDK types in this contract

### 3.4 `Agent`

```ts
interface Agent {
  invoke(input: string): Promise<AgentResult>;
  stream(input: string): AsyncIterable<AgentStreamEvent>;
  close(): Promise<void>;
}
```

Notes:

- Prefer `close()` as the public dispose name (alias `dispose` optional but not required).
- `invoke` / `stream` after `close` → `SimpleAgentError` with code `AGENT_CLOSED`
- Input is a string for v1.1; object overload is future work
- Do not expose `ExecutionContextFactory`, `CompositionRoot`, `CapabilityRequirement`, `AgentLifecycleState`, `AuthorizationFact` on this surface

### 3.5 `AgentResult`

```ts
interface AgentResult {
  readonly text: string;
  readonly output?: unknown;
  readonly executionId: string;
  readonly usage?: AgentUsage;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly raw?: unknown; // escape hatch: underlying Runtime/normalized result
}

interface AgentUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}
```

Rules:

- `text` is the developer-first field; derived from normalized Runtime / AI output (never raw vendor JSON fields)
- If execution fails, throw `SimpleAgentError` — do not return a soft failure object without text unless documented (prefer throw)

### 3.6 `AgentStreamEvent`

Keep v1.1 simple:

```ts
type AgentStreamEvent =
  | { readonly type: "start"; readonly executionId: string }
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "usage"; readonly usage: AgentUsage }
  | { readonly type: "complete"; readonly executionId: string };
```

- Map from existing Runtime / normalized AI stream events
- Tool lifecycle events: **out of scope** for simple stream (remain advanced)
- **No SSE** framing; no HTTP semantics

### 3.7 `SimpleAgentError`

Existing advanced export `AgentError` / `AgentErrorCode` remain unchanged for Agent Framework core. Facade uses a **distinct** developer-facing error:

```ts
class SimpleAgentError extends Error {
  readonly code: SimpleAgentErrorCode;
  readonly diagnosticId?: string;
}

type SimpleAgentErrorCode =
  | "AGENT_INVALID_CONFIG"
  | "AGENT_INVALID_MODEL"
  | "AGENT_INIT_FAILED"
  | "AGENT_MISSING_OPENAI_KEY"
  | "AGENT_PROVIDER_UNAVAILABLE"
  | "AGENT_TIMEOUT"
  | "AGENT_CLOSED"
  | "AGENT_INVOKE_FAILED"
  | "AGENT_STREAM_FAILED"
  | "AGENT_MISSING_OPENAI_PACKAGE";
```

Rules:

- Clear, actionable `message` (what to fix)
- Do not dump provider payloads / stacks by default
- Optional `diagnosticId` when available from underlying frameworks
- Map/wrap advanced `AgentError` where useful; do not broaden advanced `AgentErrorCode` solely for facade DX

---

## 4. Model helpers

### 4.1 `reference()`

- Zero config
- No secrets
- No network
- Uses deterministic reference AI adapter

### 4.2 `openai(modelId: string)`

- Returns descriptor only
- Does **not** instantiate SDK at call time
- At `createAgent` bootstrap, if model.provider === `"openai"`:
  1. Ensure `@agentprodready/ai-provider-openai` can be imported (dynamic `import()`); else `AGENT_MISSING_OPENAI_PACKAGE` with install command
  2. Read API key from `process.env.OPENAI_API_KEY` (and any existing OpenAI adapter env conventions already used by the package); if missing/empty → `AGENT_MISSING_OPENAI_KEY`
  3. Construct `OpenAiProviderAdapter` via that package’s public API
  4. Bind through Capability Resolution / AI Provider Framework as existing architecture requires

**Install commands (exact):**

```bash
# Reference hello-world
npm install @agentprodready/agent-framework

# OpenAI
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

If architecture review during implementation discovers that lazy peer import is unsafe, **fallback DX** (document as stop/deviation):

```js
import { createAgent } from "@agentprodready/agent-framework";
import { openai } from "@agentprodready/ai-provider-openai";
```

Architecture wins over single-import convenience. Preferred path remains single-import descriptor + optional peer.

---

## 5. Automatic manifest / lifecycle

### 5.1 Manifest generation

Facade generates a canonical **AgentManifest** (existing contract) from `CreateAgentOptions`.

Minimum fields (map to existing schema; do not invent a second public manifest):

- Agent id (generated stable-per-instance UUID/ULID-style id)
- Version (e.g. `1.0.0` for generated agent definition)
- Name (from `name` or default `agent`)
- Description (optional)
- Instructions reference / content binding as required by current Agent Framework + Prompt path
- Capability declarations sufficient for chosen model (AI chat capability)
- Limits (safe defaults)
- Lifecycle / governance metadata required for activation (e.g. `reviewStatus` must **not** remain `draft` if validator blocks activation — set approved values consistent with `DeterministicAgentValidator` and lifecycle transition requirements)

### 5.2 Registration + activation

On `createAgent`:

1. Validate generated definition
2. Register
3. Perform required lifecycle transitions to **active**
4. Developer does not manually transition lifecycle for hello-world

Advanced lifecycle APIs remain on `AgentFramework` / registry surfaces.

---

## 6. Invocation path (normative)

### 6.1 `invoke(input: string)`

Conceptual sequence:

1. Reject if closed
2. Build Runtime agent invocation (objective = input; identity/security references from embedded defaults)
3. Call `AgentFramework.invoke` → `AgentRuntimePort.accept`
4. Embedded port:
   - Creates execution id / context
   - Builds prompt via **Prompt Builder** using facade `instructions` + user input
   - Executes via `RuntimeOrchestrator.execute` (Capability Resolution selects AI)
   - Stores `RuntimeResult`
   - Returns `{ executionReference }`
5. Facade loads stored result, maps to `AgentResult` (`text`, `executionId`, `usage?`, `raw?`)
6. Return `AgentResult`

### 6.2 Prompt Builder ownership

- Facade accepts `instructions: string`
- Internally constructs the minimal valid Prompt Builder request / instruction entries + consumer profile + policy using existing Prompt Builder APIs
- Uses Prompt Builder output (`canonical` / sections) to feed the AI execution path already used by the platform
- **Do not** assemble OpenAI chat message arrays ad hoc in the facade
- If Context Assembly packages are required for `ExecutionContextPackage`, use existing `@agentprodready/context-assembly` APIs (already in agent-framework dependency tree) with **minimal synthetic** packages for embedded mode

If Prompt Builder cannot be satisfied without inventing a bypass → **STOP**.

### 6.3 Result normalization

- Extract text from normalized Runtime / AI result structures already produced by AI Provider Framework
- Do not parse vendor-specific response fields

---

## 7. Streaming path

### 7.1 `stream(input: string)`

1. Reject if closed
2. `AgentFramework` stream handoff → `acceptStream`
3. Embedded port starts `runtime.executeStream`
4. Facade yields simple `AgentStreamEvent`s:
   - `start` when execution begins
   - `text` for text deltas
   - `usage` if/when available
   - `complete` at end
5. Errors → throw `SimpleAgentError` (`AGENT_STREAM_FAILED` / mapped codes)

No HTTP SSE. Caller may wrap in their own transport later.

---

## 8. Disposal

`await agent.close()`:

- Transition / dispose agent resources as required by lifecycle
- Dispose Runtime / providers / timers / listeners created by this instance
- Idempotent close preferred
- Must not install global process handlers
- README must show `close()` where needed so Node can exit

---

## 9. Security model (simple mode)

### 9.1 Embedded application-local defaults

For library `createAgent` simple mode:

- Use an internal application-local principal / security context sufficient to authorize register, activate, and invoke **for this process-local agent**
- May synthesize or obtain authorization outcomes through Security platform APIs with a **local embedded policy** — prefer going through Security ownership rather than forging unchecked bypasses inside Agent Framework core paths
- Document clearly: **this is not public HTTP authentication**

### 9.2 Boundary statement (required in docs)

> `createAgent` is an embedded library API. It is not the same as public HTTP authentication. If you expose your own API, you remain responsible for authenticating users and supplying appropriate Security context when using advanced mode / production hosts.

### 9.3 Production warning

Document (README + Getting Started), without noisy per-invoke stderr spam:

- Simple defaults: in-memory Persistence, Event Bus, Audit, Observability
- Local/default security assumptions
- Not appropriate as-is for internet-facing multi-tenant servers

Optional: `agent.mode === "simple"` or result metadata `mode: "simple"` for introspection — nice-to-have, not required.

---

## 10. Configuration isolation

- Two `createAgent` instances must not mutate a shared global provider registry / config singleton in a way that crosses instances
- Prefer instance-scoped Composition / Capability bindings
- Different models/providers on concurrent agents must work independently

---

## 11. Env loading ownership

| Concern | Owner |
|---|---|
| Setting `OPENAI_API_KEY` in the environment | Application / developer |
| Reading `OPENAI_API_KEY` when OpenAI model selected | Facade bootstrap / OpenAI adapter configuration path |
| Loading `.env` files | Application (optional `dotenv`); **not** the library by default |

---

## 12. Safe development defaults (simple mode only)

Automatically use:

- In-memory Persistence
- In-memory Event Bus
- In-memory Audit
- In-memory Observability
- Application-local Security context
- Automatic manifest registration + lifecycle activation

**Do not claim** these are production multi-tenant defaults.

---

## 13. TypeScript / JavaScript experience

- Hello-world needs **no** advanced generics
- Types infer for options, result, stream events
- First demo: Node 24, `index.mjs` or `"type": "module"`, no tsconfig required
- Second demo: TypeScript
- CommonJS: **not** supported as first-class in v1.1 (package is ESM); document mismatch in troubleshooting

---

## 14. Package size / dependency graph

- Facade may add code inside agent-framework; it should **not** aggressively merge packages
- Reference install already pulls many siblings — acceptable; DX > aesthetic dep count
- Optional peer OpenAI package should **not** initialize when `reference()` is used
- Report in implementation report: installed package count, unpacked size, main contributors (from `npm pack` / install metrics)

---

## 15. Documentation requirements

### 15.1 Package README order

1. What is AgentProdReady?
2. Install
3. 60-second hello world (reference; executable)
4. OpenAI example
5. Streaming example
6. How simple mode works
7. When to use advanced API
8. Production notes
9. Links to examples/guides
10. API reference

Essential hello-world must ship **inside** the package README (no private-GitHub-only requirement).

### 15.2 Root README

Lead with product promise + hello-world. Architecture features (recovery, memory, vector, evaluation, tools, routing, audit, security) **after** quickstart.

### 15.3 Guides

- `docs/guides/getting-started.md` — requirements, install, reference agent, OpenAI agent, invoke, stream, cleanup, common errors, next steps
- `docs/guides/simple-agent-api.md` — only simple surface + copy/paste examples

### 15.4 Examples

| Example | Rules |
|---|---|
| `examples/hello-agent` | `reference()`; no API key; deterministic enough; `package.json` + source + README; `npm install` + `npm start`; depends on `@agentprodready/agent-framework` published-style name only |
| `examples/streaming-agent` | library `stream()`; not SSE; same packaging rules |
| OpenAI | Getting Started section sufficient; optional third example with `OPENAI_API_KEY` required, never in source |

---

## 16. Mandatory acceptance gates

1. **Clean external project test** — temp dir outside monorepo; install packed tarball; `node index.mjs` works without workspace resolution
2. **README-only usability** — first hello-world block is real code
3. **Time-to-first-response** — target < 5 minutes; record commands / LOC / concepts / env vars
4. **Error experience tests** — missing key, invalid model, invalid instructions, invoke after close, provider unavailable / missing openai package
5. **Resource cleanup** — create → invoke → close → process exits
6. **Multiple instance** — two agents, separate identity/lifecycle, no unintended shared mutable state
7. **Regression** — release suites listed in plan remain green

Script: `scripts/test-public-dx.mjs` (pack, temp project, install, run hello + stream, verify exit).

---

## 17. Versioning & npm

- Bump `@agentprodready/agent-framework` to **1.1.0**
- Include compiled facade, types, README, runtime dependencies in pack
- `npm pack --dry-run` + clean install verification
- No publish in Review-Gated design phase

---

## 18. Advanced escape hatch

README must distinguish:

- **Simple API:** `createAgent`, `reference`, `openai`, `invoke`, `stream`, `close`
- **Advanced API:** `AgentFramework`, Runtime, Composition, Capability Resolution, Security, etc.

No deprecations solely because facade exists.

---

## 19. Telemetry / network

- No analytics / phone-home from user applications
- Observability remains application-owned / local
- `reference()`: zero external network
- `openai()`: only configured OpenAI endpoint (adapter behavior)

---

## 20. Host coupling rules

- `createAgent` **must not** depend on `apps/platform-host`
- Reuse ideas from `LocalReferenceRuntimePort` / local composition by **reimplementing** a minimal embedded composition against public package contracts inside `packages/agent-framework/src/simple/**`
- If host-only logic is the only viable path and moving it requires ownership transfer → **STOP** and report

---

## 21. Node process ownership

Facade must not:

- Install global `SIGTERM` / `SIGINT` handlers
- Call `process.exit`
- Start an HTTP listener
- Assume port 3000

Caller owns process lifecycle.

---

## 22. Future targets (document only; do not implement in core v1.1)

```ts
// conceptual future
tools: [tool({ ... })]
memory: true | postgres(...)
```

Do not widen v1.1 for these.

---

## 23. Stop conditions

**STOP** and report if facade requires:

1. Runtime ownership duplicated in Agent Framework
2. Security bypass (unchecked invoke without an explicit embedded security design)
3. Prompt Builder bypass
4. AI Provider normalization bypass
5. Importing `apps/platform-host` into a package
6. Global mutable singleton platform
7. OpenAI SDK types in facade API
8. Breaking existing advanced API
9. Requiring DB/Docker for hello-world
10. Requiring secrets for reference quickstart
11. Production-insecure defaults without clear boundary documentation
12. Dependency cycle caused purely for convenience
13. Hidden network calls in reference mode

---

## 24. Implementation file map (expected)

### Create

- `packages/agent-framework/src/simple/create-agent.ts`
- `packages/agent-framework/src/simple/models.ts`
- `packages/agent-framework/src/simple/types.ts`
- `packages/agent-framework/src/simple/errors.ts`
- `packages/agent-framework/src/simple/result-map.ts`
- `packages/agent-framework/src/simple/stream-map.ts`
- `packages/agent-framework/src/simple/embedded-platform.ts` (name flexible)
- `packages/agent-framework/src/simple/embedded-runtime-port.ts`
- `packages/agent-framework/src/simple/index.ts`
- Specs under `packages/agent-framework/src/simple/**/*.spec.ts`
- `examples/hello-agent/**`
- `examples/streaming-agent/**`
- `docs/guides/getting-started.md`
- `docs/guides/simple-agent-api.md`
- `scripts/test-public-dx.mjs`

### Modify

- `packages/agent-framework/src/index.ts`
- `packages/agent-framework/package.json`
- `packages/agent-framework/README.md`
- Root `README.md`, `docs/README.md`, `CHANGELOG.md`

Exact filenames may vary if clearer; ownership and contracts must not.

---

## 25. Completion definition

Do not claim v1.1 complete without:

1. Required tests green (including external DX script)
2. Implementation report
3. Blueprint-specific / release checklist completed for this workstream
