# Package compatibility matrix

AgentProdReady uses **selective versioning**: packages bump only when their public surface changes. `@agentprodready/*` versions are intentionally **not** all identical.

Production-oriented architecture with a young ecosystem.

## Current published/repo line (v1.3)

| Package | Version | Notes |
|---|---|---|
| `@agentprodready/agent-framework` | **1.3.0** | Simple Agent API: chat + tools + memory + `openaiCompatible()` |
| `@agentprodready/ai-provider` | **1.0.2** | Reference adapter supports deterministic `USE_TOOL:<name>:<json>` |
| `@agentprodready/ai-provider-openai` | **1.0.2** | Optional peer for `openai()` / `openaiCompatible()` |
| `@agentprodready/runtime` | 1.0.1 | Selective bump |
| `@agentprodready/memory` | 1.0.1 | Selective bump |
| `@agentprodready/tool-framework` | 1.0.1 | Selective bump |
| `@agentprodready/security` | 1.0.1 | Selective bump |
| Most other `@agentprodready/*` | **1.0.0** | Baseline synchronized public release |

`@agentprodready/platform-host` is **private** (not an npm library).

---

## Install tiers

### Simple (recommended entrance)

```bash
npm install @agentprodready/agent-framework
# optional OpenAI:
npm install @agentprodready/ai-provider-openai
```

You do **not** need to pin every transitive package. npm resolves versions declared by `agent-framework`.

### Advanced (import these when you call them)

Examples: `@agentprodready/runtime`, `@agentprodready/tool-framework`, `@agentprodready/memory`, `@agentprodready/security`, `@agentprodready/composition`, `@agentprodready/ai-provider`.

### Internal / transitive

Pulled automatically. Not typical direct installs for app developers.

---

## Peer dependencies

| Package | Peer | Required? |
|---|---|---|
| `@agentprodready/agent-framework` | `@agentprodready/ai-provider-openai@^1.0.2` | **Optional** — for `openai()` / `openaiCompatible()` |

---

## Move-together sets

| When you change… | Usually bump… |
|---|---|
| Simple Agent facade | `agent-framework` (+ rarely `ai-provider` if reference/test hooks change) |
| OpenAI adapter behavior | `ai-provider-openai` (+ `ai-provider` if contracts change) |
| Tool Framework contracts | `tool-framework` + consumers |
| Memory Engine contracts | `memory` (+ persistence if store contracts change) |

Seeing `agent-framework@1.3.x` next to architecture packages at `1.0.x` is **expected**, not broken.

---

## Node.js

| Claim | Status |
|---|---|
| Verified baseline | **Node 24** (`engines`: `>=24 <25` until Node 22 CI is proven green) |
| CI matrix | Node **22** and **24** (see `.github/workflows/ci.yml`) |
| Engines widen to `>=22 <25` | **Only after** Node 22 verify job is green |
| Node 20 | Not claimed |

Why 24 today? Matching the verified runtime/CI image pin — not because production code requires Node-24-only APIs.

---

## CI checks

- `pnpm verify-versioning` — semver, publishConfig, CHANGELOG highest version
- Workspace `pnpm verify` — lint/typecheck/tests/build on the CI Node matrix
- `pnpm test:public-dx` — packed external install of Simple Agent paths

Full combinatorial semver matrices across every package are **not** run.

---

## Related

- [npm distribution](./npm-distribution.md)
- [Adopting AgentProdReady](./adopting-agentprodready.md)
- [ROADMAP.md](../../ROADMAP.md)
