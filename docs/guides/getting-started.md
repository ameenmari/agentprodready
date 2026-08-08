# Getting Started

Build an agent in minutes with `@agentprodready/agent-framework`.

Production-oriented architecture with a young ecosystem.

**v1.2 Simple Agent API:** `createAgent` · `reference()` · `openai()` · `tool()` · `inMemory()` · `invoke()` · `stream()` · `close()`

## Requirements

- Node.js **24** for the claimed engines line (`>=24 <25`); CI also runs Node **22** (engines widen only after that job is green on main)
- npm, pnpm, or yarn
- ESM (`"type": "module"` in `package.json`, or use `.mjs` files)

CommonJS `require(...)` is **not** a first-class supported path.

**Why Node 24 in engines today?** It is the last fully claimed verified baseline. Node 22 is under CI proof — not silently supported via engines until green.

## Install (reference / zero-secret)

```bash
mkdir demo
cd demo
npm init -y
npm pkg set type=module
npm install @agentprodready/agent-framework
```

## First reference agent

Create `index.mjs`:

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

Run:

```bash
node index.mjs
```

Expected deterministic output:

```text
Hello
```

No API key, database, or Docker is required.

`reference()` is deterministic and intended for wiring/tests. It does **not** perform natural-language reasoning over recalled memory. For tools/memory demos see [`examples/tools-agent`](../../examples/tools-agent) and [`examples/memory-agent`](../../examples/memory-agent).

## First OpenAI agent

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

Set the key in your environment (the library does not load `.env` automatically):

```bash
# bash
export OPENAI_API_KEY="your-key"

# PowerShell
$env:OPENAI_API_KEY="your-key"
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

Never put API keys in source files.

## invoke()

```js
const result = await agent.invoke("Hello");
console.log(result.text);
console.log(result.executionId);
```

## stream()

```js
for await (const event of agent.stream("Hello")) {
  if (event.type === "text") process.stdout.write(event.text);
}
```

Library streaming only — not HTTP SSE.

## close()

Always close agents you create when finished:

```js
await agent.close();
```

`close()` is idempotent. Calling `invoke` / `stream` after close throws `AGENT_CLOSED`.

## Simple mode & security

Simple mode uses embedded in-memory defaults and **application-local** Security assumptions.

Appropriate for:

- local apps
- CLI tools
- prototypes
- embedded features
- learning

**Not** production HTTP authentication. **LocalReference** host auth is development/reference only.

For internet-facing multi-tenant services, use advanced AgentProdReady platform configuration and production Security integration. If you expose `createAgent` through your own public HTTP API, you remain responsible for authenticating users.

Vulnerability reporting: [SECURITY.md](../../SECURITY.md). Evaluator guide: [Adopting AgentProdReady](./adopting-agentprodready.md).

## Common errors

| Symptom | Fix |
|---|---|
| `AGENT_MISSING_OPENAI_PACKAGE` | `npm install @agentprodready/ai-provider-openai` |
| `AGENT_MISSING_OPENAI_KEY` | Set `OPENAI_API_KEY` in the environment |
| Provider / quota errors | Check OpenAI account quota and model access |
| Unsupported Node version | Use Node 24 |
| `ERR_REQUIRE_ESM` / `require is not defined` | Use ESM (`"type": "module"` or `.mjs`) |
| `AGENT_PROVIDER_UNAVAILABLE` | Check network / provider configuration |
| `AGENT_CLOSED` | Create a new agent; do not reuse after `close()` |

## Next steps

- [Simple Agent API](./simple-agent-api.md) · [Simple Tools](./simple-tools.md) · [Simple Memory](./simple-memory.md)
- Examples: `examples/hello-agent`, `examples/streaming-agent`, `examples/openai-agent`
- Advanced architecture / production deployment docs under `docs/`
