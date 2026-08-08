# AgentProdReady

**Build an agent in minutes. Add production controls when you need them.**

Production-oriented architecture with a young ecosystem.

[![CI](https://github.com/ameenmari/agentprodready/workflows/CI/badge.svg)](https://github.com/ameenmari/agentprodready/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@agentprodready/agent-framework.svg)](https://www.npmjs.com/package/@agentprodready/agent-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-24-brightgreen.svg)](package.json)

| | |
|---|---|
| **Entry package** | [`@agentprodready/agent-framework@1.1.1`](https://www.npmjs.com/package/@agentprodready/agent-framework) |
| **License** | [MIT](LICENSE) |
| **Node** | `24` |
| **npm scope** | [`@agentprodready/*`](https://www.npmjs.com/org/agentprodready) |

---

## New in v1.1 — Simple Agent API

The public entrance is no longer Blueprint-first. Install one package and use:

| API | Role |
|---|---|
| `createAgent(options)` | Create an embedded agent |
| `reference()` | Deterministic local model (no API key) |
| `openai(modelId)` | OpenAI model descriptor (optional peer) |
| `agent.invoke(text)` | One-shot response → `result.text` |
| `agent.stream(text)` | Embedded async stream (not HTTP SSE) |
| `agent.close()` | Dispose this agent instance |

Guide: [Simple Agent API](docs/guides/simple-agent-api.md) · [Getting Started](docs/guides/getting-started.md)

---

## Quick start

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
console.log(result.text);

await agent.close();
```

No API key, database, or Docker required for `reference()`.

### OpenAI

```bash
npm install @agentprodready/agent-framework @agentprodready/ai-provider-openai
```

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

The library does **not** load `.env` files. Set the key in the environment.

### Streaming

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

for await (const event of agent.stream("Hello")) {
  if (event.type === "text") process.stdout.write(event.text);
}

await agent.close();
```

This is an embedded library stream — not HTTP SSE.

---

## Quality & verification

CI runs the verification suites on every push ([workflow: CI](.github/workflows/ci.yml)). Prefer the live workflow over any fixed test-count claim.

| Gate | Command |
|---|---|
| Lint + typecheck + unit tests + build | `pnpm verify` |
| Versioning integrity | `pnpm verify-versioning` |
| Public DX (pack + external install) | `pnpm test:public-dx` |
| Tools | `pnpm test:tools` |
| Routing | `pnpm test:routing` |
| Tenant isolation | `pnpm test:tenant-isolation` |
| Streaming | `pnpm test:streaming` |
| PostgreSQL persistence | `pnpm test:postgres` |
| Runtime recovery | `pnpm test:runtime-recovery` |
| Memory persistence | `pnpm test:memory-persistence` |
| Evaluation persistence | `pnpm test:evaluation-persistence` |
| Vector search | `pnpm test:vector-search` |

Docker image smoke and Postgres service jobs also run in CI. Local performance baseline: `pnpm production-baseline` (see [benchmarks](docs/benchmarks/README.md)) — **local baseline, not an SLA**.

---

## Supported / limitations

**Available today**

- Simple Agent API (`createAgent`, `reference`, `openai`, `invoke`, `stream`, `close`)
- Streaming (library + host SSE)
- Tool calling (advanced / host path)
- Memory, evaluation, runtime recovery, multi-provider routing
- OpenAI + deterministic reference providers
- PostgreSQL persistence and pgvector paths
- Deterministic CI / reference verification paths

**Honest limitations**

- Young ecosystem — limited external adoption evidence
- No SSE reconnect / stream replay
- No durable HITL approval wait / resume
- No exactly-once guarantee for external tool side effects
- Limited vendor provider catalog (reference + OpenAI today)
- No official GHCR image yet (build locally from `Dockerfile` / `compose.yaml`)
- Embedded Simple Agent mode is **not** a hosted multi-tenant production platform

---

## Security

- `createAgent` **simple/embedded mode** uses application-local security defaults. It is **not** production HTTP authentication.
- **LocalReference** HTTP auth on the reference host is **development/reference only**.
- Internet-facing multi-tenant applications must authenticate users themselves and use advanced Security integration.
- Report vulnerabilities privately via [SECURITY.md](SECURITY.md) — do not open public issues for exploitable bugs.
- More detail: [docs/guides/security.md](docs/guides/security.md)

---

## Examples

| Example | What it shows |
|---|---|
| [`examples/hello-agent`](examples/hello-agent) | `reference()` + `invoke` (no API key) |
| [`examples/streaming-agent`](examples/streaming-agent) | library `stream()` (not HTTP SSE) |

Each example uses published-style `@agentprodready/agent-framework` package names.

---

## Roadmap & maintainer

- Public roadmap: [ROADMAP.md](ROADMAP.md)
- Evaluating for a larger project: [Adopting AgentProdReady](docs/guides/adopting-agentprodready.md)
- Support expectations: [SUPPORT.md](SUPPORT.md)

**Maintainer:** [ameenmari](https://github.com/ameenmari) (single maintainer today).  
Contributions: [CONTRIBUTING.md](CONTRIBUTING.md). Security: [SECURITY.md](SECURITY.md).

This project does not claim a foundation, company backing, or multi-maintainer team.

---

## Architecture (after onboarding)

Capability-driven platform with explicit ownership: Runtime owns operational execution, Security owns authorization, Composition owns instantiation, Capability Resolution selects implementations.

```text
Foundation → Plugin Framework → Composition → Runtime → Planning → Workflow
  → Capability Resolution → AI Provider → Tools → Knowledge → Memory
  → Context Assembly → Prompt Builder → Evaluation → Security → …
  → Agent Framework (includes Simple Agent API facade)
```

| Concern | Package (examples) |
|---|---|
| Simple + advanced agent APIs | `@agentprodready/agent-framework` |
| Execution / cancellation / checkpoints | `@agentprodready/runtime` |
| Implementation selection | `@agentprodready/capability-resolution` |
| Authorization decisions | `@agentprodready/security` |
| Instantiation / wiring | `@agentprodready/composition` |

Deep docs: [Documentation index](docs/README.md) · [Architecture index](docs/architecture-index.md) · [Dependency graph](docs/architecture/dependency-graph.md) · [ADRs](docs/adrs/README.md) · [Blueprints](docs/blueprints/)

Beginners should start with Getting Started / Simple Agent API — not Blueprints.

---

## Advanced / contributor paths

**Advanced npm composition** (when you outgrow `createAgent`):

```bash
npm install @agentprodready/agent-framework
npm install @agentprodready/runtime
npm install @agentprodready/ai-provider
npm install @agentprodready/ai-provider-openai
```

**Local reference host** (HTTP / SSE demos in the monorepo):

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm start
```

Docker / Compose is a **local/dev convenience** today — not a published GHCR production image. See [production deployment](docs/guides/production-deployment.md).

---

## Documentation map

| Audience | Start |
|---|---|
| App developers | [Getting Started](docs/guides/getting-started.md) · [Simple Agent API](docs/guides/simple-agent-api.md) |
| Evaluators / leads | [Adopting AgentProdReady](docs/guides/adopting-agentprodready.md) |
| Operators | [configuration](docs/guides/configuration.md) · [security](docs/guides/security.md) · [production deployment](docs/guides/production-deployment.md) |
| Contributors | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | [SECURITY.md](SECURITY.md) |
| Releases | [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md) |

---

## License

[MIT](LICENSE) — Copyright (c) 2026 ameenmari
