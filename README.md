# AgentProdReady

**TypeScript agents you can ship this week — with a clean path to production controls when you need them.**

Production-oriented architecture with a young ecosystem.

[![CI](https://github.com/ameenmari/agentprodready/workflows/CI/badge.svg)](https://github.com/ameenmari/agentprodready/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@agentprodready/agent-framework.svg)](https://www.npmjs.com/package/@agentprodready/agent-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22%20%3C25-brightgreen.svg)](package.json)

For **TypeScript / Node.js backend developers** embedding AI agents into existing applications — without giving up production controls later.

<p align="center">
  <img src="docs/community/assets/demo.svg" alt="AgentProdReady terminal demo — createAgent invoke" width="920" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agentprodready/agent-framework"><strong>npm install @agentprodready/agent-framework</strong></a>
  ·
  <a href="https://github.com/ameenmari/agentprodready/stargazers">⭐ Star</a>
  ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

```js
import { createAgent, openai, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You help with short operational questions.",
  tools: [
    tool({
      name: "lookupStatus",
      description: "Look up a ticket status",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      execute: async ({ id }) => ({ id, status: "open" }),
    }),
  ],
  memory: true,
});

const result = await agent.invoke("Check ticket T-1");
console.log(result.text);
await agent.close();
```

Also: `stream()`, `reference()` (zero API key), `openaiCompatible()` / `anthropic()`, and `result.metadata` diagnostics.

<!-- After you record: commit docs/community/assets/demo.gif and uncomment:
![Live demo](docs/community/assets/demo.gif)
-->

---

## Why AgentProdReady?

- **Simple Agent API** — `createAgent`, `invoke`, `stream`, `close`
- **Tools with guardrails** — `tool()` with conservative defaults; fail-closed approvals
- **Streaming** — embedded library streams (not HTTP SSE)
- **Memory** — ephemeral `memory: true` / `inMemory()` for the weekend path
- **OpenAI + OpenAI-compatible** — first-class helpers; credential isolation for gateways
- **Production controls when needed** — Runtime, Security, Capability Resolution, recovery — without rewriting your entrance API story

Secondary tagline: *Build an agent in minutes. Add production controls when you need them.*

---

## Getting Started

### Option A — scaffold (recommended)

```bash
npm create agentprodready@latest my-agent
cd my-agent
npm install
npm run dev
```

Choose **Reference** (no API key), **OpenAI**, or **OpenAI-compatible**.

### Option B — one package, zero secrets

```bash
npm install @agentprodready/agent-framework
```

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text); // Hello
await agent.close();
```

No API key, database, or Docker. Full walkthrough: [Getting Started](docs/guides/getting-started.md).

### OpenAI

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
export OPENAI_API_KEY="..."   # PowerShell: $env:OPENAI_API_KEY="..."
```

```js
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});
```

The library does **not** load `.env` files.

### OpenAI-compatible gateway

```js
import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openaiCompatible({
    baseUrl: "https://api.example.com/v1",
    model: "llama-3.1-70b",
  }),
  instructions: "You are a helpful assistant.",
});
```

Uses `OPENAI_COMPATIBLE_API_KEY` — **never** a silent `OPENAI_API_KEY` fallback. Guide: [openai-compatible.md](docs/guides/openai-compatible.md).

### Streaming

```js
for await (const event of agent.stream("Hello")) {
  if (event.type === "text") process.stdout.write(event.text);
}
```

### Tools

```js
import { createAgent, reference, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are helpful.",
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

// Deterministic reference demo (OpenAI selects tools from schemas instead):
const result = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
```

Defaults: `sideEffect: "mutating"`, `idempotency: "non-idempotent"`, `approvalRequirement: "none"`.  
`approvalRequirement: "required"` fails closed. External effects are **not** exactly-once.

### Memory (ephemeral)

`memory: true` ≡ `inMemory()` — process-local, instance-scoped, **not** durable Postgres.  
`reference()` does not reason over memory in natural language — use `openai()` for NL recall demos. See [Simple Memory](docs/guides/simple-memory.md).

---

## Examples

| Example | Problem it answers |
|---|---|
| [`examples/hello-agent`](examples/hello-agent) | Fastest success — `reference()` + `invoke` |
| [`examples/backend-agent`](examples/backend-agent) | **Canonical wow** — tools + memory + invoke + stream |
| [`examples/tools-agent`](examples/tools-agent) | Focused `tool()` path |
| [`examples/openai-compatible-agent`](examples/openai-compatible-agent) | Gateway / credential isolation |
| [`examples/openai-agent`](examples/openai-agent) | Live OpenAI |
| [`examples/anthropic-agent`](examples/anthropic-agent) | Live Anthropic (Messages API) |
| [`examples/diagnostics-agent`](examples/diagnostics-agent) | Zero-key `result.metadata` diagnostics |
| [`examples/memory-agent`](examples/memory-agent) | Honest memory wiring + optional NL recall |
| [`examples/streaming-agent`](examples/streaming-agent) | Library `stream()` only |

---

## Providers

| Helper | Package peer | Secrets |
|---|---|---|
| `reference()` | none | none |
| `openai()` | `@agentprodready/ai-provider-openai` | `OPENAI_API_KEY` |
| `openaiCompatible()` | `@agentprodready/ai-provider-openai` | `OPENAI_COMPATIBLE_API_KEY` (or `auth: "none"`) |
| `anthropic()` | `@agentprodready/ai-provider-anthropic` | `ANTHROPIC_API_KEY` |

Guide: [anthropic.md](docs/guides/anthropic.md).

---

## Production path

When the weekend agent becomes a real backend dependency:

1. Embed recipe — [Embed agent deployment](docs/guides/embed-agent-deployment.md) (Node service, env, Docker, health, shutdown, **your** auth)
2. Operator host — [Production deployment](docs/guides/production-deployment.md)
3. Graduation — [Adopting AgentProdReady](docs/guides/adopting-agentprodready.md)
4. Fair positioning — [Why AgentProdReady](docs/guides/why-agentprodready.md)

Simple/embedded mode is **not** production HTTP authentication. You supply real auth for internet-facing apps.

---

## Node.js

| Claim | Status |
|---|---|
| Supported engines | **`>=22 <25`** |
| CI matrix | Node **22** and **24** |
| Node 20 | Not claimed |

---

## Quality & verification

CI runs verification on every push ([workflow](.github/workflows/ci.yml)). Prefer the live workflow over fixed test-count claims.

| Gate | Command |
|---|---|
| Lint + typecheck + unit tests + build | `pnpm verify` |
| Versioning integrity | `pnpm verify-versioning` |
| Public DX (pack + external install) | `pnpm test:public-dx` |
| Scaffold clean install | `pnpm test:scaffold-dx` |
| Tools / routing / tenant / streaming | `pnpm test:tools` · `test:routing` · `test:tenant-isolation` · `test:streaming` |

---

## Limitations

- Young ecosystem — limited external adoption evidence
- `memory: true` is **ephemeral**
- Approval-required tools fail closed (no durable HITL wait/resume)
- No SSE reconnect / stream replay
- No exactly-once external tool side effects
- Provider catalog today: reference + OpenAI + OpenAI-compatible + Anthropic
- No official GHCR image yet
- Embedded Simple mode ≠ hosted multi-tenant platform

---

## Security

- `createAgent` simple/embedded mode uses application-local security defaults — **not** production HTTP auth
- **LocalReference** host auth is development/reference only
- Report vulnerabilities privately via [SECURITY.md](SECURITY.md)

---

## Community

Single maintainer today ([ameenmari](https://github.com/ameenmari)) — no foundation-scale governance claims. **Stars, issues, and small PRs are genuinely useful.**

**Good first contributions** (docs / examples / DX — not Runtime/Security redesigns):

- Improve an example README or add a focused recipe under `examples/`
- Record / polish the [demo GIF](docs/community/demo-script.md) (`docs/community/assets/demo.gif`)
- Fix package README clarity ([standard](docs/community/package-readme-standard.md))
- Add a getting-started issue reproduction or a test around Simple API DX

- [CONTRIBUTING.md](CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SUPPORT.md](SUPPORT.md)
- [ROADMAP.md](ROADMAP.md) · [CHANGELOG.md](CHANGELOG.md) · [content plan](docs/community/content-plan.md)
- Every public npm package ships install + sample code — start with [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework)

---

## Architecture (after onboarding)

Capability-driven platform with explicit ownership: Runtime owns operational execution, Security owns authorization, Composition owns instantiation, Capability Resolution selects implementations.

Deep docs: [Documentation index](docs/README.md) · [Architecture index](docs/architecture-index.md) · [Dependency graph](docs/architecture/dependency-graph.md) · [ADRs](docs/adrs/README.md) · [Blueprints](docs/blueprints/)

Beginners should start with Getting Started — not Blueprints.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 ameenmari
