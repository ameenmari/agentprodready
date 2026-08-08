# Changelog

All notable AgentProdReady product releases are summarized here. Architecture blueprints (01–31) underpin these slices.

## [1.3.1] — Developer Adoption Sprint (DX)

Adoption / discoverability cycle (architecture ownership unchanged):

- Job-first README + package README promise: *TypeScript agents you can ship this week…*
- Node engines widened to **`>=22 <25`** (CI matrix 22 + 24)
- Canonical example: `examples/backend-agent`
- Scaffold package: **`create-agentprodready@0.1.0`** (`npm create agentprodready@latest`) — publish pending authorization
- Guides: `why-agentprodready.md`, `embed-agent-deployment.md`; production-deployment navigation fix
- Community: issue forms, CODE_OF_CONDUCT, labels doc; Discussions remain a manual GitHub setting
- DX gates: `pnpm test:public-dx`, `pnpm test:scaffold-dx`
- `@agentprodready/agent-framework@1.3.1` — engines + public metadata/docs only (no Simple API behavior change)

## [1.3.0] — Provider Ecosystem (OpenAI-compatible)

Facade-first OpenAI-compatible Simple path (architecture ownership unchanged):

- `openaiCompatible({ baseUrl, model, apiKey?, auth?, … })` on `@agentprodready/agent-framework@1.3.0`
- Distinct capability id `openai-compatible-ai` (reuses `OpenAiProviderAdapter`; not `openai-ai`)
- Credential security: compatible path uses `OPENAI_COMPATIBLE_API_KEY` only — never silent `OPENAI_API_KEY` fallback
- Explicit `auth: "none"` for local/no-auth compatible endpoints
- Host parity: `AI_PROVIDER=openai-compatible` + compatible env vars
- Guide: `docs/guides/openai-compatible.md`; example: `examples/openai-compatible-agent`
- `@agentprodready/ai-provider-openai@1.0.2` — configurable implementation id, compatible config loader, no-auth placeholder
- Anthropic remains next named provider track (not implemented)

## [1.2.1] — DX honesty for Simple Memory + examples

Documentation/product-story patch (Memory ownership unchanged):

- Honest `reference()` + memory examples: wiring diagnostics, not natural-language recall claims
- Additive diagnostic `result.metadata.memory` (`enabled`, `retrievedItemCount`, `injected`, `injectedPreview`) for zero-key proof
- Guides: Simple Memory clarifies retrieval ≠ model intelligence
- Examples: `examples/tools-agent`, `examples/memory-agent` (reference wiring + OpenAI-gated NL recall)
- Public DX asserts memory inject path without false NL assertions
- `@agentprodready/agent-framework@1.2.1` only

## [1.2.0] — Simple Tools, Simple Memory & developer compatibility

Documentation + Simple Agent facade (architecture ownership unchanged):

- `tool()` + `createAgent({ tools })` over Tool Framework / Security / Runtime checkpoints
- Conservative tool defaults: `sideEffect: "mutating"`, `idempotency: "non-idempotent"`, `approvalRequirement: "none"`
- `memory: true` / `inMemory()` ephemeral MemoryEngine session (not durable Postgres)
- Additive `tool_call` / `tool_result` stream lifecycle events
- Guides: Simple Tools, Simple Memory; README paths A/B/C
- CI verify matrix: Node 22 + Node 24 (engines remain `>=24 <25` until Node 22 is green on main)
- Package compatibility guide expanded; public DX packs `ai-provider` + `agent-framework`
- `@agentprodready/ai-provider@1.0.2` — reference `USE_TOOL:<name>:<json>` for deterministic tool demos

## [1.1.1] — Public credibility & trust (docs/metadata)

Documentation and discoverability only (no Simple Agent behavior change):

- Root README: badges, v1.1 Simple Agent API highlight, quality gates, support/limitations matrix, security prominence, maintainer honesty
- `ROADMAP.md`, `SUPPORT.md`, `docs/guides/adopting-agentprodready.md`, `docs/benchmarks/README.md`
- Lightweight GitHub issue/PR templates + `CODEOWNERS`
- `@agentprodready/agent-framework` package metadata: `keywords`, `engines.node` (`>=24 <25`), description polish

## [1.1.0] — Developer Experience facade

- Simple Agent API on `@agentprodready/agent-framework`: `createAgent`, `reference`, `openai`, `invoke`, `stream`, `close`
- Developer-facing `SimpleAgentError` (advanced `AgentError` unchanged)
- Embedded isolated composition with in-memory defaults and application-local Security
- Optional peer `@agentprodready/ai-provider-openai` for OpenAI (lazy; reference path needs no peer)
- Developer-first package README, Getting Started, Simple Agent API guide
- Examples: `examples/hello-agent`, `examples/streaming-agent`
- Public DX clean-install script: `pnpm test:public-dx`
- **Advanced APIs remain unchanged** — no deprecations

## [1.0.0] — Production release

- Multi-provider chat routing via Capability Resolution ordered fallback + Runtime `ProviderAttemptLedger` (no `AiRouter`)
- Opt-in `AI_ROUTING_MODE=fallback` with `AI_FALLBACK_PROVIDERS`; default `fixed` preserves v0.9
- Fallback only on retryable `AI_UNAVAILABLE` / `AI_PROVIDER_TIMEOUT` / `AI_RATE_LIMITED`, with stream/tool/embedding safety boundaries
- Production hardening: graceful shutdown (`SHUTDOWN_TIMEOUT_MS`), JSON body limits (`MAX_JSON_BODY_BYTES`), production LocalReference auth policy (`AGENTPRODREADY_ALLOW_REFERENCE_AUTH`)
- Ops/security docs: configuration, deployment, security, operations, upgrading, routing guide

## [0.9.0] — Tool calling & agent actions

- Safe provider-independent tool loop (validate → Security → Cap/Composition → Runtime checkpoints)
- Opt-in `TOOLS_ENABLED` with call/turn/byte bounds
- SSE safe `tool_call` / `tool_result` lifecycle events
- Fail-closed approval (`TOOL_APPROVAL_REQUIRED`) and unsafe recovery (`TOOL_UNSAFE_RECOVERY`)

## [0.8.0] — Streaming responses

- Provider-independent streaming via Runtime `executeStream` and host SSE (`/invoke/stream`)
- Heartbeat / drain configuration; one execution identity per stream
- No SSE reconnect/replay (retained limitation)

## [0.7.0] — Vector search & semantic memory

- Opt-in vector / hybrid Memory retrieval behind `MemorySearchProvider`
- pgvector adapter + embedding profiles (`reference-32`, `openai-1536-small`)
- Separate vector migrations from Persistence

## [0.6.0] — Evaluation Framework

- Host wiring for Evaluation Framework with local reference evaluators
- Opt-in result store (in-memory or persistent)

## [0.5.0] — Persistent memory

- Durable Memory records via Persistence-backed provider
- `MEMORY_PROVIDER=persistent` + Postgres for cross-process durability

## [0.4.0] — Runtime restart & recovery

- Durable Runtime checkpoints and boot-time `recoverIncomplete`
- At-most-once terminalization; resume-if-safe defaults

## [0.3.0] — PostgreSQL persistence

- First durable Persistence provider (`@agentprodready/persistence-postgres`)
- In-memory remains default for local/CI

## [0.2.0] — Real AI provider

- OpenAI chat adapter behind AI Provider Framework (`maxRetries: 0`)
- Config selection `AI_PROVIDER=reference|openai`; reference remains CI default

## [0.1.0] — Local reference product

- First locally runnable composition of Blueprints 01–31
- Deterministic in-memory reference host and HTTP smoke surface
