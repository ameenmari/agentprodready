# AgentProdReady v1.1 — Developer Experience & Simple Agent API

**Document type:** Product design  
**Product version:** 1.1.0 (target)  
**Implementation Mode:** Review-Gated  
**Status:** Implemented (Autonomous)  
**Baseline:** AgentProdReady v1.0.1 (published npm packages)  
**Scope:** Entrance simplification only — no architectural ownership redesign

---

## 1. Product principle

Build an agent in minutes. Add production controls when you need them.

AgentProdReady v1.0 delivered a production-shaped architecture. External developer feedback confirms the main weakness is **onboarding / DX**, not architecture. Developers need too much knowledge of manifests, lifecycle, catalogs, auth outcomes, and runtime wiring before they can get a simple response.

v1.1 adds a **developer facade** on top of the existing platform. The architecture remains intact underneath.

---

## 2. Target experience

### Reference (zero-secret) path

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);

await agent.close();
```

### OpenAI path

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);

await agent.close();
```

### Streaming

```js
for await (const event of agent.stream("Hello")) {
  if (event.type === "text") process.stdout.write(event.text);
}
```

No Blueprints, no manifest authoring, no lifecycle transitions, no CompositionRoot construction in the happy path.

---

## 3. What v1.1 is / is not

| Is | Is not |
|---|---|
| Additive simple API on `@agentprodready/agent-framework` | A new architectural owner |
| Embedded library DX for local / app-local use | Hosted SaaS |
| Safe defaults for hello-world | Production multi-tenant auth |
| Progressive disclosure to advanced APIs | Deprecation of advanced APIs |
| Reference path with no secrets / DB / Docker | Exactly-once tools or magic autonomy |

---

## 4. Current-state product problem (summary)

Today a new developer who installs `@agentprodready/agent-framework` can import advanced types (`buildAgentDefinition`, `AgentFramework`, …) but **cannot** get a chat response without assembling:

- Agent manifest + registry + lifecycle
- Runtime + `AgentRuntimePort` handoff that actually executes
- Capability Resolution bindings
- AI Provider adapters (reference or OpenAI)
- Security authorization outcomes or Security platform wiring
- Composition / Persistence / Event Bus / Audit / Observability stubs

Most of that runnable wiring currently lives in **`apps/platform-host`**, which is **not** published to npm. The published package surface is architecturally correct and incomplete as a product entrance.

---

## 5. Product requirements (must)

1. `npm install @agentprodready/agent-framework` then a ~10–20 line file yields a valid agent response (reference model).
2. OpenAI path uses `OPENAI_API_KEY` from the environment and `openai(modelId)` — no manual adapter / resolver / composition construction.
3. `result.text` is the primary field developers read.
4. `stream()` is an embedded AsyncIterable API (not HTTP SSE).
5. `close()` / disposal ends resources so Node can exit.
6. Advanced APIs remain fully available and undeprecated.
7. No phone-home telemetry. Reference mode makes no network calls.
8. Docs lead with product quickstart, not Blueprints.

---

## 6. Explicit non-goals (v1.1 core)

- Simplified Tool Calling API (`tools: [tool(...)]`) — defer to v1.1.x / v1.2
- Simplified Memory (`memory: true` / `postgres(...)`) — defer
- Evaluation / routing configuration on `createAgent`
- Postgres / Docker / `DATABASE_URL` in first-agent docs
- Dual CJS build (document ESM honestly)
- New `@agentprodready/core` package (unless a stop condition forces it — preferred: **no**)
- Analytics / phone-home
- Softening Security ownership or Runtime ownership

---

## 7. Positioning & trust

**Recommended messaging:**

> Build an agent in minutes. Add production controls when you need them.

**Do not oversell:** hosted SaaS, magic autonomy, exactly-once tools, production auth defaults in simple mode.

**Honest limitation:** Simple mode uses in-memory / embedded / application-local security defaults. Internet-facing multi-tenant services must use advanced platform configuration and production Security integration.

---

## 8. Success metrics (product)

| Metric | Before (v1.0.1) | After (v1.1 target) |
|---|---|---|
| Packages to install (reference) | 1 (but incomplete path) | 1 working |
| Secrets for first response | N/A / often assumed | 0 |
| Concepts before first response | 10+ | ≤ 4 (`createAgent`, `reference`/`openai`, `invoke`, `close`) |
| LOC | dozens–hundreds | ~10–20 |
| Time to first response | hours / blocked | < 5 minutes |
| Architecture regression | — | None (`pnpm verify` + release suites green) |

---

## 9. Documentation product path

```
README (root + package)
  → Getting Started
  → Simple Agent API
  → Streaming
  → Advanced Architecture
  → Production Deployment
```

Blueprints / ADRs remain under Architecture / Advanced. Beginners must not need them.

---

## 10. Related implementation artifacts

| Artifact | Path |
|---|---|
| Plan | `docs/implementation/plans/agentprodready-v1.1-developer-experience-facade-plan.md` |
| Specification | `docs/implementation/specifications/agentprodready-v1.1-developer-experience-facade-specification.md` |
| Review | `docs/implementation/reviews/agentprodready-v1.1-developer-experience-review.md` |

---

## 11. Gate

This product design is **Review-Gated**. No production TypeScript, no npm publish, and no tags until the review document receives approval for Autonomous implementation.
