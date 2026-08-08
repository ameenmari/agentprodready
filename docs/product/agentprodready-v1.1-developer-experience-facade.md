# AgentProdReady v1.1 — Developer Experience Facade

**Status:** Design — In Review  
**Mode:** Review-Gated (no production code in this document)  
**Baseline:** v1.0.0 architecture + published `@agentprodready/*` packages  
**Trigger:** First external-developer feedback (“not a chat agent in 10 lines”)

---

## Verdict on the feedback

Agree. v1.0 succeeded as an **architecture / platform** milestone. It did **not** yet succeed as a **product onboarding** milestone.

Do **not** simplify the 31-blueprint architecture.  
Do **simplify the entrance** to that architecture.

Positioning target:

> **Simple to start. Production-ready when you need it.**

---

## Problem

Today a hello-world developer must manually assemble:

manifest → catalog → security authorization → lifecycle → Runtime handoff → Capability Resolution → AI provider → Composition

`@agentprodready/agent-framework` also pulls many sibling packages. That is correct for a platform, wrong as the *perceived* first step.

---

## Goal experience

```bash
npm install @agentprodready/agent-framework
```

```ts
import { createAgent } from '@agentprodready/agent-framework';

const agent = createAgent({
  name: 'assistant',
  model: 'openai:gpt-4o-mini', // or reference model for CI
  instructions: 'You are a helpful assistant.',
});

const result = await agent.invoke('Hello!');
console.log(result.output);
```

Internally `createAgent()` must still:

1. Build a valid Agent Manifest / Definition  
2. Validate against a default catalog  
3. Register + lifecycle → `active` with safe defaults  
4. Wire Composition + Runtime + Security defaults  
5. Resolve AI chat capability  
6. Return a small facade object (`invoke` / `invokeStream`)

Advanced APIs (`AgentFramework`, custom Security, Persistence, Evaluation, etc.) remain available and unchanged.

---

## Non-goals (v1.1)

- No blueprint ownership rewrite  
- No deletion of low-level contracts  
- No requirement that developers understand all 31 packages  
- No full website yet (README + examples first)  
- No replacement of `platform-host` (host remains the HTTP/SSE reference product)

---

## Design decision (recommended)

### Package surface

| Option | Recommendation |
|---|---|
| A. New `@agentprodready/core` that re-exports + `createAgent` | Good long-term brand, **extra publish** |
| B. Add `createAgent` (+ docs/examples) to `@agentprodready/agent-framework` | **Preferred for v1.1** — matches “one package quickstart” already in market |

**Decision proposal:** ship facade in `@agentprodready/agent-framework` for v1.1. Revisit `@agentprodready/core` as a thin re-export alias later if naming surveys warrant it.

### Defaults (hello-world)

| Concern | Default for `createAgent` |
|---|---|
| Tenant / principal | `local-tenant` / local principal (explicitly **dev defaults**, documented unsafe for internet) |
| AI provider | `reference` unless `model` starts with `openai:` and `OPENAI_API_KEY` is set |
| Security | Auto-issue authorized outcomes for declared operations (dev-only path; production must inject Security) |
| Lifecycle | Auto validate → register → approve → activate |
| Runtime | In-process reference Runtime port that executes chat via AI Provider Framework |
| Memory / tools / vector / eval | Off until options enable them |
| Persistence | In-memory |

Production escape hatch:

```ts
createAgent({
  ...,
  composition: existingRoot,      // bring-your-own Composition
  security: 'strict',             // no auto-auth
});
```

Exact option names are specification work; semantics above are normative for review.

### Public API sketch (not final contract)

```ts
export interface CreateAgentOptions {
  name: string;
  instructions: string;
  model?: string;                 // 'reference' | 'openai:<model>'
  tools?: CreateAgentTool[];      // v1.1.1 if needed
  memory?: false | 'session';     // phased
}

export interface AgentHandle {
  invoke(input: string): Promise<{ output: string; executionReference: string }>;
  invokeStream?(input: string): AsyncIterable<string>; // may ship in same slice
  readonly agentId: string;
  readonly version: string;
}

export function createAgent(options: CreateAgentOptions): AgentHandle;
```

Low-level exports stay: `buildAgentDefinition`, `AgentFramework`, reference stores, etc.

---

## Delivery slices (priority order)

### Slice A — `createAgent` hello path (must)

- Implementation behind facade; no ADR unless ownership moves  
- Tests: unit + one external-style example test  
- README rewrite: install → API key (optional) → first agent in &lt; 20 lines  
- Example: `examples/hello-agent`

### Slice B — Streaming

- `agent.invokeStream` / example `examples/streaming-agent`  
- Reuse Runtime stream + provider stream contracts

### Slice C — Memory + tools (thin)

- Opt-in options; examples `memory-agent`, `tool-agent`  
- Still defaults-off for hello world

### Slice D — Docs site / production example

- `examples/production-shaped` showing Security + Persistence + routing  
- Optional docs site later

---

## Documentation story

README must lead with **product**, not blueprints:

1. Install  
2. First agent  
3. Streaming  
4. Memory / tools  
5. “Need production?” → Security, recovery, evaluation, routing links  

Blueprints/ADRs remain the contributor path under `docs/`.

---

## Success criteria

An unrelated developer on a clean machine can:

1. `npm install @agentprodready/agent-framework@1.1.0` (or next semver)  
2. Copy a ≤20-line snippet from the README  
3. See a successful `invoke` response without writing manifests/catalogs/auth by hand  
4. Still import low-level contracts when they outgrow the facade  

---

## Semver note

Additive public API → prefer **`1.1.0`** (not a breaking 2.0). Publish lockstep across packages if workspace cycles still require it.

---

## Stop condition

This document is **Review-Gated**.  
**Do not implement** until approved with:

```text
Implementation Mode: Autonomous
```

(or explicit approval of Slice A plan + specification).

---

## Open questions for approval

1. Confirm facade lives in `@agentprodready/agent-framework` (not new `@agentprodready/core` yet).  
2. Confirm hello-world auto-Security / auto-lifecycle is acceptable as **explicitly unsafe-for-internet** (document + env/flag).  
3. Confirm first ship is Slice A only (hello + README + example), streaming next.  
4. Version: `1.1.0` lockstep publish of all public packages?
