# Changelog

All notable AgentProdReady product releases are summarized here. Architecture blueprints (01–31) underpin these slices.

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
