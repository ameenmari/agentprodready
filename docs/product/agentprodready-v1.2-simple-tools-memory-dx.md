# AgentProdReady v1.2 — Simple Tools, Simple Memory & Developer Compatibility

**Document type:** Product design  
**Product version:** 1.2.0 (target)  
**Implementation Mode:** Review-Gated  
**Status:** Implemented (Autonomous) — publish pending human authorization  
**Baseline:** AgentProdReady v1.1.1 (`@agentprodready/agent-framework` published; P0 credibility pass complete)  
**Scope:** Additive Simple Agent DX + honesty about Node/package compatibility — **no architectural ownership redesign**

---

## 1. Product principle

Build an agent in minutes. Add production controls when you need them.

v1.1 made **chat + stream** reachable. External feedback now says the next gap for small/medium pilots is:

1. Simple **tools**
2. Simple **memory**
3. Clearer **Node / package compatibility**
4. Discoverability and example polish

Maturity wording remains:

> Production-oriented architecture with a young ecosystem.

Do **not** claim battle-tested adoption.

---

## 2. Target experiences

### 2.1 Simple Tools (proposed — exact names subject to review)

```js
import { createAgent, openai, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
  tools: [
    tool({
      name: "getWeather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => ({ city, forecast: "sunny" }),
    }),
  ],
});

const result = await agent.invoke("What is the weather in Paris?");
console.log(result.text);
await agent.close();
```

### 2.2 Simple Memory (proposed)

```js
import { createAgent, reference, inMemory } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "Remember user preferences when they appear.",
  memory: inMemory(), // or memory: true (alias)
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What is my favorite color?");
console.log(result.text);
await agent.close();
```

**Product meaning of `memory: true` / `inMemory()`:** process-local ephemeral memory for this agent instance.  
**Not** durable Postgres memory. **Not** multi-tenant production persistence.

### 2.3 OpenAI example

```bash
cd examples/openai-agent
npm install
# bash: export OPENAI_API_KEY=...
# PowerShell: $env:OPENAI_API_KEY="..."
npm start
```

Uses only published npm APIs. Never commits a key.  
*(Scaffold already exists in-tree from the credibility follow-up; v1.2 implementation verifies and documents it as a first-class example.)*

---

## 3. What v1.2 is / is not

| Is | Is not |
|---|---|
| Facade helpers over Tool Framework + Memory | A second tool runtime or memory subsystem |
| Embedded Simple Agent progressive disclosure | Hosted SaaS / durable HITL |
| Ephemeral in-memory memory for pilots | Claim that embedded memory ≡ Postgres durability |
| Compatibility docs + optional Node 22 CI path | Silent “works on any Node” claim without matrix |
| One recommended next **provider design** | Implementing Anthropic/Azure/OpenAI-compatible in this cycle |

---

## 4. Current friction (evidence)

| Gap | Evidence |
|---|---|
| No `tools` option | `CreateAgentOptions` allowlists only `model/instructions/name/description`; unknown keys throw |
| Tools rejected in execution | Embedded capability execution: “Tool calling is not supported in the simple Agent API” |
| Manifest limits | `tools: []`, `maximumToolInvocations: 0` |
| Tool loop lives in unpublished host | `apps/platform-host/.../local-reference-tool-loop.ts` |
| No `tool()` helper | `ToolContract` requires capability/plugin/sideEffect/idempotency fields |
| No memory option | MemoryEngine exists; simple path never wires it; prompt memory versions empty |
| Node 24 pin | Policy/CI/Docker/engines — not a Node-24-only API dependency found |
| Version scatter | Selective bumps — confusing but intentional; matrix exists and needs expansion |
| Install weight | Clean install of `agent-framework@1.1.1`: **17** direct deps, **22** `@agentprodready/*`, ~**43** top-level packages, ~**8.3 MB** `node_modules`, **68** packages added |

---

## 5. Product requirements (must)

1. Simple Tools reuse Tool Framework contracts + coordinator; Security authorizes; Runtime owns loop/checkpoints; Composition owns adapter binding.
2. No Security bypass; no second tool runtime.
3. Advanced Tool Framework APIs remain available and unchanged in meaning.
4. Simple Memory reuses MemoryEngine + `InMemoryMemoryProvider`; no second memory system.
5. Docs clearly state ephemeral vs durable memory.
6. `close()` remains correct with tools/memory resources.
7. Hello-world reference path still needs **no** DB / Docker / API key.
8. OpenAI example works from public packages with env key only.
9. Package compatibility guide answers install/version questions honestly.
10. Node support claims match CI evidence.
11. Provider expansion is **design-only** in this cycle.

---

## 6. Non-requirements (v1.2)

- Durable HITL wait/resume
- Exactly-once external tool side effects
- SSE reconnect/replay
- Simple-path Postgres memory helper (`postgres(...)`) — design hook only / later
- New `@agentprodready/core` package
- Implementing a second vendor provider package
- Mechanical lockstep version bumps across all packages
- Aggressive package graph split solely to reduce install count

---

## 7. Progressive disclosure

```text
createAgent (v1.1 chat)
  → + tool() / tools[] (v1.2)
  → + inMemory() / memory: true (v1.2)
  → advanced Tool Framework / MemoryEngine / Security / Runtime / Composition
  → platform-host production patterns
```

---

## 8. Success metrics (qualitative)

- A developer can add a local tool in ~15–30 lines without reading Blueprint 09.
- A developer can enable ephemeral memory without Postgres.
- README / adopting guide answer Node and version-scatter questions without apology theater.
- External reviewer’s “fix first” list for tools/memory/examples/compatibility is addressed or explicitly deferred with reasons.

---

## 9. Related artifacts

- Plan: `docs/implementation/plans/agentprodready-v1.2-simple-tools-memory-dx-plan.md`
- Specification: `docs/implementation/specifications/agentprodready-v1.2-simple-tools-memory-dx-specification.md`
- Review: `docs/implementation/reviews/agentprodready-v1.2-simple-tools-memory-dx-review.md`
- Prior product: `docs/product/agentprodready-v1.1-developer-experience-facade.md`
- Compatibility draft: `docs/guides/package-compatibility.md`
