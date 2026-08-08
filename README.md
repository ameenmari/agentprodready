# AgentProdReady

**Build an agent in minutes. Add production controls when you need them.**

Modular, provider-independent framework for production AI agents — with a simple entrance for Node.js / TypeScript developers.

| | |
|---|---|
| **Version** | `1.1.0` (simple Agent API on `@agentprodready/agent-framework`) |
| **License** | [MIT](LICENSE) |
| **Node** | `24` (see `packageManager` / `engines` in root `package.json`) |
| **npm scope** | [`@agentprodready/*`](https://www.npmjs.com/org/agentprodready) |

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

No API key required for the deterministic `reference()` model.

Guides: [Getting Started](docs/guides/getting-started.md) · [Simple Agent API](docs/guides/simple-agent-api.md)

---

## Why AgentProdReady?

Most AI projects become infrastructure projects: auth, memory, retrieval, tools, workflows, observability, and provider wiring before any business logic.

AgentProdReady is an **enterprise AI platform framework**: opinionated architecture, replaceable modules, and explicit ownership—so teams compose a platform instead of reinventing it. Start simple with `createAgent`, then adopt Runtime recovery, Memory, Tools, Evaluation, Routing, Audit, and Security when you need them.

**It is**

- A modular agent / AI application platform
- Provider-independent (swap OpenAI ↔ reference ↔ future adapters via Capability Resolution)
- Contract-first and ADR-governed

**It is not**

- A foundation-model company
- A drop-in replacement for LangChain / NestJS / Spring as a general backend
- A no-code product (code-first; Docker host is the language-agnostic path)

---

## Two ways to use it

### 1) npm libraries (primary for TypeScript apps)

**Simple path** — install one package and use `createAgent` (see Quick start above).

**Advanced path** — compose frameworks directly:

```bash
npm install @agentprodready/agent-framework
npm install @agentprodready/runtime
npm install @agentprodready/ai-provider
npm install @agentprodready/ai-provider-openai
npm install @agentprodready/memory
npm install @agentprodready/tool-framework
```

```ts
import { buildAgentDefinition, AgentFramework } from '@agentprodready/agent-framework';
// wire Runtime, AI provider, Memory, Tools via Composition in your app
```

Recommended packages and publish notes: [docs/guides/npm-distribution.md](docs/guides/npm-distribution.md).

### 2) Local reference host (HTTP / SSE)

Run the monorepo reference composition (`platform-host`) for demos, smoke tests, and ops validation:

```bash
pnpm install
pnpm verify
pnpm start
```

```bash
curl http://127.0.0.1:3000/health
curl -X POST http://127.0.0.1:3000/v1/agents/reference-agent/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: LocalReference principalId=local-user;tenantId=local-tenant" \
  -d "{\"objective\":\"hello\"}"
```

No database or API key required on the default `reference-ai` path. Opt-in OpenAI, Postgres, recovery, Memory, vector search, Evaluation, streaming, tools, and multi-provider routing—see [configuration](docs/guides/configuration.md) and [multi-provider routing](docs/guides/multi-provider-routing.md).

**Docker / GHCR** for a ready-to-run server image is a separate distribution track (see [production deployment](docs/guides/production-deployment.md)).

---

## Repository quickstart (contributors)

Requires **Node 24** and **pnpm**.

```bash
pnpm install --frozen-lockfile
pnpm verify          # lint + boundaries + typecheck + tests + build
pnpm start           # reference host
pnpm smoke           # host smoke script
```

Useful opt-in suites: `pnpm test:tools`, `pnpm test:routing`, `pnpm test:streaming`, `pnpm test:postgres` (Docker Postgres), `pnpm production-baseline`.

---

## Architecture (31 blueprints)

Capability-driven, composition-owned instantiation. Runtime owns operational execution. Security owns authorization.

```text
Foundation → Plugin Framework → Composition → Runtime → Planning → Workflow
  → Capability Resolution → AI Provider → Tools → Knowledge → Memory
  → Context Assembly → Prompt Builder → Evaluation → Security → Event Bus → Audit
  → Agent Framework → Multi-Agent → Human Interaction → Marketplace
  → Observability → Configuration → Persistence → Scheduler
  → API → SDK → CLI → Deployment → Testing → Platform Governance
```

| Concern | Owner (examples) |
|---|---|
| Execution / cancellation / checkpoints | `@agentprodready/runtime` |
| Implementation selection | `@agentprodready/capability-resolution` |
| Authorization decisions | `@agentprodready/security` |
| Instantiation / wiring | `@agentprodready/composition` |
| Agent definition / lifecycle handoff | `@agentprodready/agent-framework` |

Start here for architecture:

- [Documentation index](docs/README.md)
- [Architecture index](docs/architecture-index.md)
- [Dependency graph](docs/architecture/dependency-graph.md)
- [ADR index](docs/adrs/README.md)
- [Glossary](docs/glossary.md)
- [Cursor / Codex start guide](docs/cursor-start-here.md)

---

## Documentation map

| Audience | Start |
|---|---|
| App developers (npm) | This README + [npm distribution](docs/guides/npm-distribution.md) + [guides/](docs/guides/) |
| Operators / host | [configuration](docs/guides/configuration.md), [security](docs/guides/security.md), [production deployment](docs/guides/production-deployment.md), [operations](docs/guides/operations.md) |
| Contributors | [CONTRIBUTING.md](CONTRIBUTING.md), [implementation modes](docs/implementation/implementation-modes.md), [blueprints](docs/blueprints/) |
| Security | [SECURITY.md](SECURITY.md) |
| Releases | [CHANGELOG.md](CHANGELOG.md) |

Guides (product slices): [AI providers](docs/guides/ai-providers.md) · [streaming](docs/guides/streaming.md) · [tools](docs/guides/tools.md) · [memory](docs/guides/memory.md) · [vector search](docs/guides/vector-search.md) · [evaluation](docs/guides/evaluation.md) · [persistence](docs/guides/persistence.md) · [runtime recovery](docs/guides/runtime-recovery.md).

---

## Status (v1.0.0)

| Area | Status |
|---|---|
| Architecture (31 blueprints) | Complete |
| Local reference host | Complete |
| Public npm `@agentprodready/*` | **Published** (35 packages @ `1.0.0`) |
| Multi-provider routing / production hardening | Complete (see CHANGELOG) |
| Docker image on GHCR | Not the default track yet |
| `@agentprodready/core` facade | Planned (not required for install) |

`@agentprodready/platform-host` remains **private** (app / Docker), not an npm library.

---

## Principles (constitutional)

- Every framework owns **one** concern  
- **Runtime** owns operational execution  
- **Security** owns authorization  
- **Composition** owns instantiation  
- **Capability Resolution** selects implementations  
- Providers stay behind contracts  
- Events are facts; audit preserves accountability  
- Changes to ownership / public contracts need an **ADR**

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). One blueprint at a time; plan + specification before production code; no silent architecture redesign.

## Security

See [SECURITY.md](SECURITY.md). LocalReference HTTP auth is **not** production authentication.

## License

[MIT](LICENSE) — Copyright (c) 2026 ameenmari
