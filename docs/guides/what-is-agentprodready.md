# What is AgentProdReady?

Short answers to the questions evaluators usually cannot find.

**Maturity line (canonical):** *Production-oriented architecture with a young ecosystem.*

The name means **architecture and APIs shaped for production controls** (Runtime, Security, recovery, ownership). It does **not** mean “widely adopted in production at scale” or “hosted SaaS.” Adoption evidence is still limited.

---

## 1. What is the core abstraction?

**Not a graph DSL.** AgentProdReady is **not** LangGraph-style “nodes and edges as the primary programming model.”

**Not role-play multi-agent as the entrance.** Multi-agent collaboration exists as an advanced package, but the public entrance is not “assign roles and debate.”

| Layer | Abstraction |
|---|---|
| **Simple entrance** | An **agent** — `createAgent` → `invoke` / `stream` / `close`, optional tools + memory |
| **Execution core** | **Runtime-owned work** — timeout, cancel, checkpoint, recover, stream; Security authorizes; Composition wires; Capability Resolution selects implementations |
| **Optional advanced** | Workflow progression, planning, multi-agent, evaluation — behind the same ownership model |

Mental model:

```text
createAgent / AgentFramework
        ↓ handoff
   Runtime (when / retry / checkpoint / stream)
        ↓ authorize
   Security
        ↓ select
   Capability Resolution → AI Provider | Tool | …
```

You write an **imperative agent loop** (chat + tools), not a graph. Graphs/workflows are available deeper in the platform when you need them — they are not the hello-world contract.

Full ownership map: [Adopting AgentProdReady](./adopting-agentprodready.md) · [Architecture index](../architecture-index.md).

---

## 2. Durable state / checkpointing?

**Yes — first-class, but opt-in on the Simple path.**

| Concern | What you get | Default Simple |
|---|---|---|
| **Execution checkpoints** | Runtime stores barriers (`pre-invoke` / `post-invoke`, tool-loop stages including `awaiting-approval`) | In-process; host/Postgres for cross-restart |
| **Memory** | `fileMemory` / `postgresMemory` survive restart | `memory: true` / `inMemory()` = **ephemeral** |
| **Stream replay** | `stream({ resumeFrom })` / `replayStream` | Process-local unless file-backed via durable memory directory |
| **HITL pause state** | Parked approval + tool-loop checkpoint | Process-local; file-backed when using `fileMemory` |

You do **not** have to invent checkpointing from scratch for Runtime recovery — see [runtime-recovery.md](./runtime-recovery.md). You **do** choose durability (`fileMemory` / Postgres / host Persistence) instead of assuming `memory: true` is durable.

Guides: [durable-memory](./durable-memory.md) · [stream-replay](./stream-replay.md) · [hitl-approval](./hitl-approval.md).

---

## 3. Retries, idempotency, human-in-the-loop?

| Topic | Behavior |
|---|---|
| **Retries** | **Runtime owns** operational retry / timeout / cancel. AI vendor SDKs run with provider `maxRetries: 0` so there is no competing retry layer. |
| **Provider failover** | Host **Capability Resolution** ordered fallback (`AI_ROUTING_MODE=fallback`) + Runtime attempt ledger — not a separate `AiRouter`. See [multi-provider-routing](./multi-provider-routing.md). |
| **Tool idempotency** | Tools declare `idempotent` \| `non-idempotent`. Idempotent tools can use a **durable ledger** (exactly-once-**capable**). Non-idempotent external effects are **not** exactly-once. |
| **HITL** | `approvalRequirement: "required"` → pause with `AGENT_TOOL_APPROVAL_REQUIRED` → `approve` / `reject` → `resume`. Amendment D on the embedded Simple path (v1.6). |

Unsafe recovery after a non-idempotent tool may have started fails closed (`TOOL_UNSAFE_RECOVERY`), not with a silent re-fire.

Guides: [simple-tools](./simple-tools.md) · [hitl-approval](./hitl-approval.md) · [runtime-recovery](./runtime-recovery.md).

---

## 4. Provider routing story?

| Mode | Meaning |
|---|---|
| **Simple API** | You pick a helper: `reference()` / `openai()` / `openaiCompatible()` / `anthropic()` / `gemini()` — one binding per agent |
| **Host / advanced** | Capability Resolution selects among registered implementations; optional **ordered failover** via config (`AI_ROUTING_MODE`, `AI_PROVIDER`, `AI_FALLBACK_PROVIDERS`) |

There is **no** `ModelRouter` package. Routing is ownership-split: Capability Resolution selects, Composition instantiates, AI Provider normalizes, Runtime records attempts / timeouts.

Catalog today: reference, OpenAI, OpenAI-compatible, Anthropic, Gemini. Broader catalogs (Bedrock / Azure native, etc.) remain Later.

Guides: [ai-providers](./ai-providers.md) · [multi-provider-routing](./multi-provider-routing.md).

---

## 5. Is “production ready” real usage or aspirational?

**Honest split:**

| Claim | Status |
|---|---|
| Architecture + APIs designed for production controls (authz ownership, checkpoints, recovery, fail-closed security) | **Real** — implemented blueprints 01–31 and the Simple graduation path |
| CI / verify / selective npm publish / documented guarantees and non-claims | **Real** |
| Large external production fleet / multi-tenant SaaS / third-party audit / foundation governance | **Not claimed** — young ecosystem, single maintainer, limited public adoption evidence |

Read “production-oriented” as: *you can grow into production controls without rewriting the entrance story* — not *already battle-tested at global scale*.

If you need maximum community proof or hosted agents today, prefer a mature alternative; see [why-agentprodready.md](./why-agentprodready.md).

---

## One-page cheat sheet

```text
Abstraction:  Agent + Runtime execution (not graph-first)
State:        Checkpoints + optional durable memory / HITL / stream log
Retries:      Runtime-owned; vendor SDK retries disabled
Idempotency:  Declared on tools; ledger for idempotent only
HITL:         approve / reject / resume (v1.6 Simple)
Routing:      Capability Resolution (+ optional host failover)
Maturity:     Production-oriented architecture, young ecosystem
```

Package: [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework).
