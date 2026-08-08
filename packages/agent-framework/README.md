# @agentprodready/agent-framework

Build an AI agent in minutes. Add production controls when you need them.

Production-oriented architecture with a young ecosystem.

**v1.1 Simple Agent API:** `createAgent` · `reference()` · `openai()` · `invoke()` · `stream()` · `close()`

`@agentprodready/agent-framework` is the package most developers should install first. It includes a simple embedded API plus the full advanced Agent Framework for production platforms.

Guides: [Getting Started](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/getting-started.md) · [Simple Agent API](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-agent-api.md) · [Adopting AgentProdReady](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/adopting-agentprodready.md)

---

## Install

```bash
npm install @agentprodready/agent-framework
```

Requires **Node.js 24** and an **ESM** project (`"type": "module"` or an `.mjs` file).

---

## 60-second hello world

No API key. No database. No Docker.

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

With the deterministic reference model, `result.text` echoes the user input (`Hello`).

---

## OpenAI example

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

Set your key in the environment (the library does **not** load `.env` files):

```bash
# bash
export OPENAI_API_KEY="..."

# PowerShell
$env:OPENAI_API_KEY="..."
```

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

---

## Streaming example

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

for await (const event of agent.stream("Hello")) {
  if (event.type === "text") {
    process.stdout.write(event.text);
  }
}

await agent.close();
```

This is an embedded library stream API — not HTTP SSE.

---

## How simple mode works

`createAgent` assembles an isolated embedded platform for you:

- in-memory Persistence / Event Bus / Audit / Observability defaults
- automatic Agent manifest, registration, and lifecycle activation
- application-local Security for register / activate / invoke
- Runtime execution through existing AgentProdReady frameworks
- Prompt Builder ownership for `instructions`

Each `createAgent()` call owns its own composition. There is no global shared platform singleton.

**Security:** simple/embedded mode is **not** production HTTP authentication. LocalReference host auth is development-only. Internet-facing multi-tenant apps must authenticate users and use advanced Security integration. See [SECURITY.md](https://github.com/ameenmari/agentprodready/blob/main/SECURITY.md).

---

## Advanced API

When you outgrow hello-world, the same package still exports the advanced surface:

- `AgentFramework`, `buildAgentDefinition`
- registry / lifecycle / discovery
- Runtime handoff contracts

Use advanced APIs with Composition, Capability Resolution, Security, Memory, Tools, Evaluation, and your own host.

Nothing in the advanced API is deprecated by `createAgent`.

---

## Production notes

Simple mode is appropriate for:

- local apps and CLIs
- prototypes
- embedded agent features
- learning / demos

For **internet-facing multi-tenant services**, use advanced platform configuration and production Security integration. `createAgent()` is an embedded library API — it is **not** public HTTP authentication. If you expose your own API, you authenticate users and supply appropriate Security context.

---

## Guides / examples

- Getting Started: see repository `docs/guides/getting-started.md`
- Simple Agent API: `docs/guides/simple-agent-api.md`
- Examples: `examples/hello-agent`, `examples/streaming-agent`

---

## Simple API reference

| Export | Purpose |
|---|---|
| `createAgent(options)` | Create an embedded agent |
| `reference()` | Deterministic local model descriptor |
| `openai(modelId)` | OpenAI model descriptor (optional peer package) |
| `agent.invoke(text)` | Run once → `AgentResult` (`result.text`) |
| `agent.stream(text)` | AsyncIterable simple events |
| `agent.close()` | Dispose this agent instance |
| `SimpleAgentError` | Developer-facing facade errors |

### `CreateAgentOptions`

```ts
{
  model: AgentModel;
  instructions: string;
  name?: string;
  description?: string;
}
```

### `AgentResult`

```ts
{
  text: string;
  output?: unknown;
  executionId: string;
  usage?: AgentUsage;
  metadata?: Record<string, unknown>;
  raw?: unknown;
}
```

---

## License

MIT
