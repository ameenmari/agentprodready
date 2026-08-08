# AgentProdReady v1.2 — Simple Tools, Memory & Compatibility — Specification

**Document Version:** 1.0  
**Product Version:** 1.2.0 (target)  
**Status:** Design — In Review  
**Implementation Mode:** Review-Gated  
**Authority:** Plan + product doc for v1.2; ADRs 002/004/005/006/007/008; Tool Framework + Memory contracts

---

## 1. Decisions requiring human approval

| ID | Decision | Proposed default |
|---|---|---|
| D1 | Exact `tool()` shape | See §2 |
| D2 | Default `sideEffect` / `idempotency` for simple tools | **APPROVED AMENDMENT:** `mutating` + **`non-idempotent`** + `approvalRequirement: none`; never infer idempotent for arbitrary execute |
| D3 | `memory: true` meaning | Alias of `inMemory()` — ephemeral only |
| D4 | Memory prompt integration | Prefer Context Assembly; allow minimal prompt enrichment if CA wiring blocks |
| D5 | Tool stream events on simple `stream()` | Additive safe events (`tool_call` / `tool_result` status only) |
| D6 | Tool loop location | Prefer extract shared module used by embedded + host; acceptable interim: embedded loop in `simple/` with parity tests |
| D7 | Node engines | Widen to `>=22 <25` **only after** CI Node 22 green |
| D8 | Dependency cleanup | Optional remove unused directs after proof; no package split |
| D9 | Next provider (design only) | OpenAI-compatible adapter package in a later cycle |
| D10 | No `@agentprodready/core` | Confirmed |

---

## 2. Simple Tools API (proposed)

### 2.1 Exports

From `@agentprodready/agent-framework`:

```ts
function tool(definition: SimpleToolDefinition): SimpleTool;
```

```ts
interface SimpleToolDefinition {
  readonly name: string;                 // [a-zA-Z][a-zA-Z0-9_-]{0,63}
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>; // JSON Schema object
  readonly execute: (
    args: Readonly<Record<string, unknown>>,
  ) => unknown | Promise<unknown>;
  readonly sideEffect?: 'read-only' | 'mutating' | 'external-side-effect';
  readonly idempotency?: 'idempotent' | 'non-idempotent';
  readonly approvalRequirement?: 'none' | 'required';
}

interface CreateAgentOptions {
  readonly model: AgentModel;
  readonly instructions: string;
  readonly name?: string;
  readonly description?: string;
  readonly tools?: readonly SimpleTool[];
  readonly memory?: true | SimpleMemory; // see §3
}
```

`SimpleTool` is an opaque branded object (not a raw execute function) so random objects cannot be smuggled past validation.

### 2.2 Mapping to Tool Framework

| Simple field | ToolContract / system |
|---|---|
| `name` | `id` = `simple.${name}`; capability = `tool:simple.${name}` |
| `description` | `metadata.description` + AI `AiToolDefinition.description` |
| `parameters` | `inputSchema`; `outputSchema` = `{ type: 'object' }` (permissive) |
| `sideEffect` | default **`mutating`** |
| `idempotency` | default **`idempotent`** |
| `approvalRequirement` | default **`none`** |
| `execute` | Composition-owned `ToolAdapter.invoke` calls `execute(parameters)` |
| pluginId / contributionId | synthetic `simple-agent` / `tool:${name}` |

Validation:

- Reject duplicate tool names
- Reject invalid names
- Require `parameters.type === 'object'` (or treat missing type as object with warning/error — **error**)
- `execute` must be a function

### 2.3 Execution ownership (non-negotiable)

```text
AI NormalizedToolCall
  → validate (Tool Framework)
  → Security.authorize (resource tool, toolPermissions)
  → approvalRequirement check (fail closed if required)
  → Capability Resolution
  → Composition ToolAdapterResolver
  → Runtime pre-tool checkpoint (via CapabilityExecutionControl)
  → ToolInvocationCoordinator.invoke
  → Runtime post-tool checkpoint
  → AI continuation messages
```

Embedded Security must:

- Include tool ids in `allowedTools` / `toolPermissions` when tools configured
- Authorize each tool call (application-local policies may allowlisted registered simple tools)

Idempotency key: `` `${executionId}:${toolCallId}` `` (same as host).

Limits (embedded defaults, overridable later if needed):

| Limit | Default |
|---|---|
| Max tool calls / invocation | 8 |
| Max tool loop turns | 4 |
| Max argument bytes | 16384 |
| Max result bytes | 65536 |

### 2.4 Stream events (additive)

```ts
| { readonly type: 'tool_call'; readonly toolCallId: string; readonly toolName: string; readonly status: 'executing' }
| { readonly type: 'tool_result'; readonly toolCallId: string; readonly toolName: string; readonly status: 'succeeded' | 'failed'; readonly errorCode?: string }
```

No arguments/results in stream events by default (parity with host SSE safety).

### 2.5 Explicitly not in v1.2 simple tools

- Durable HITL wait when `approvalRequirement: 'required'` (fail closed remains)
- Exactly-once external effects
- Automatic classification of user `execute` side effects
- Plugin marketplace registration

---

## 3. Simple Memory API (proposed)

### 3.1 Exports

```ts
function inMemory(options?: { readonly namespace?: string }): SimpleMemory;
```

`createAgent({ memory: true })` ≡ `createAgent({ memory: inMemory() })`.

### 3.2 Semantics

| Claim | Truth |
|---|---|
| Survives process restart | **No** |
| Shared across `createAgent` instances | **No** (unless future explicit store — out of scope) |
| Uses MemoryEngine | **Yes** |
| Uses `InMemoryMemoryProvider` | **Yes** |
| Equals Postgres / persistent host memory | **No** |

### 3.3 Behavior

Within one agent instance:

1. Before model call: `MemoryEngine.retrieve` for embedded tenant/workspace + agent identity → inject into prompt.
2. After successful turn (or after user message — implementation choice documented in report): capture concise memory records and transition to `available` using existing lifecycle APIs.
3. Authorization: Embedded Security supplies valid `MemoryAuthorization` facts (application-local).
4. `close()`: drop in-memory maps / dispose provider; subsequent invoke throws closed error (existing behavior).

### 3.4 Deferred durable helper

```ts
// NOT in v1.2 simple API
// memory: postgres({ ... })
```

Document advanced path: host `MEMORY_PROVIDER=persistent` / Persistence packages.

---

## 4. OpenAI example

Path: `examples/openai-agent/`

| Item | Spec |
|---|---|
| Dependencies | `@agentprodready/agent-framework@^1.2.0` (or `^1.1.1` until release), `@agentprodready/ai-provider-openai` |
| Entry | `index.mjs` — `createAgent` + `openai` + `invoke` + `close` |
| Env | `OPENAI_API_KEY` required; exit non-zero with instructions if missing |
| Secrets | never commit `.env` with keys |
| Docs | README with bash + PowerShell |

---

## 5. Node compatibility

### 5.1 Finding

Node **24 is the verified baseline**, not a hard language requirement from Node-24-only APIs.

### 5.2 Proposed path

1. Add CI matrix: Node 22 + Node 24 for verify (and keep specialized jobs on 24 initially if cost requires — prefer both for `verify`).
2. If Node 22 passes: set engines `>=22 <25` on root + `@agentprodready/agent-framework`.
3. Docker default image may remain `node:24-bookworm-slim` (document as “image pin”, not “only supported runtime”).
4. If Node 22 fails: keep `>=24 <25` and publish blocker list.

### 5.3 Forbidden

- Changing `engines` without CI evidence
- Claiming Node 20 without matrix

---

## 6. Package compatibility

### 6.1 Install tiers

| Tier | Packages developers install |
|---|---|
| Simple | `@agentprodready/agent-framework` (+ optional `@agentprodready/ai-provider-openai`) |
| Advanced app | + `runtime`, `ai-provider`, `tool-framework`, `memory`, `security`, `composition`, … as imported |
| Internal/transitive | pulled automatically; not typical direct installs |

### 6.2 Move-together sets

| Change | Packages that usually bump together |
|---|---|
| Simple Agent facade | `agent-framework` (+ rarely tool-framework/memory if helpers move) |
| OpenAI adapter behavior | `ai-provider-openai` (+ `ai-provider` if contracts change) |
| Tool loop contracts | `tool-framework` + host + agent-framework consumers |
| Memory engine contracts | `memory` (+ persistence if store contract changes) |

### 6.3 Version scatter

`agent-framework@1.2.x` with architecture packages at `1.0.x` is **safe and expected** under selective versioning when peers/workspace ranges resolve.

### 6.4 CI enforcement

Extend versioning verification to check peer ranges and publishable metadata consistency. Full “integration matrix of every semver combo” is **not** required in v1.2.

---

## 7. Dependency weight policy

Measured baseline (1.1.1): ~8.3 MB, 17 directs, 22 scope packages.

v1.2 will **increase** logical use of `tool-framework` and `memory` (already installed).

Allowed optimizations:

- Remove unused direct dependencies only with proof
- Keep OpenAI as optional peer + lazy import
- Document weight honestly

Forbidden:

- Splitting platform into a tiny `@agentprodready/core` solely for install optics in this cycle
- OptionalDependencies that break Composition/Runtime ownership

---

## 8. Provider expansion (design only)

**Recommended next provider:** OpenAI-compatible (`baseURL` + API key + model) as `@agentprodready/ai-provider-openai-compatible` **or** config mode on openai package — exact packaging in a later Review-Gated cycle.

Rationale and alternatives: see review §18–19.

---

## 9. Files expected in implementation

### Create

- `packages/agent-framework/src/simple/tool.ts`
- `packages/agent-framework/src/simple/memory.ts`
- `packages/agent-framework/src/simple/embedded-tool-loop.ts` (or shared extract location)
- `packages/agent-framework/src/simple/*.spec.ts` additions
- `docs/guides/simple-tools.md`
- `docs/guides/simple-memory.md`
- `docs/implementation/reports/agentprodready-v1.2-simple-tools-memory-dx-implementation-report.md`
- `docs/implementation/checklists/agentprodready-v1.2-simple-tools-memory-dx-checklist.md`

### Modify

- `packages/agent-framework/src/simple/types.ts`, `validate-options.ts`, `create-agent.ts`, `embedded-platform.ts`, `embedded-capability-execution.ts`, `embedded-security.ts`, `embedded-manifest.ts`, `embedded-prompt.ts`, `index.ts`, `package.json` (version 1.2.0)
- Possibly `apps/platform-host/.../local-reference-tool-loop.ts` if extracting shared loop
- `docs/guides/package-compatibility.md`, `getting-started.md`, `simple-agent-api.md`, `adopting-agentprodready.md`, root `README.md`, `CHANGELOG.md`, `ROADMAP.md`
- `.github/workflows/ci.yml` (Node matrix)
- `examples/openai-agent/*`, example package ranges
- `scripts/verify-versioning.mjs` or new `scripts/verify-package-compatibility.mjs`
- `scripts/test-public-dx.mjs` if exports/demos need tools/memory smoke

### Do not create

- New tool runtime package
- New memory subsystem package
- Provider package (this cycle)

---

## 10. Error model

Reuse `SimpleAgentError` with clear codes/messages for:

- invalid tool definition
- tool authorization denied
- tool approval required
- tool loop limit exceeded
- memory misconfiguration
- closed agent

Map advanced errors without leaking host-only concepts unnecessarily.

---

## 11. Testing requirements

| Suite | Coverage |
|---|---|
| Unit | `tool()` validation; options allowlist; memory alias |
| Integration | createAgent + tool execute with reference AI tool-calls (or controlled fake AI adapter in tests) |
| Security | deny tool; approval required |
| Memory | two-turn recall ephemeral; close disposes |
| Regression | existing createAgent tests; host tool tests still pass |
| Public DX | clean install still passes; optional tools demo later |
| CI | Node 22 job before engines widen |

---

## 12. Architecture / ADR impact

| ADR | Impact |
|---|---|
| Explicit ownership | Facade only; no new owner |
| Composition owns instantiation | Tool adapters + memory providers bound in embedded composition |
| Runtime owns execution | Loop/checkpoints remain Runtime-controlled |
| Security owns authorization | Per-tool authorize required |
| Capability Resolution owns selection | Tool capabilities registered for simple tools |
| Provider independence | Unchanged; provider cycle separate |

**New ADR:** not required if specification + report record facade decisions. Consider short ADR only if shared tool-loop extraction creates a new package boundary.

---

## 13. Documentation requirements

- Simple Tools guide + Simple Memory guide
- Update Simple Agent API guide with tools/memory sections
- Package compatibility expanded
- Node support section matches CI
- Limitations: ephemeral memory; approval fail-closed; no exactly-once; young ecosystem line retained
