# Streaming Responses (v0.8)

AgentProdReady streams incremental AI output over **SSE** while Runtime remains the owner of cancellation, timeout, and terminal execution state.

## Endpoint

```http
POST /v1/agents/reference-agent/invoke/stream
Content-Type: application/json
Accept: text/event-stream
Authorization: LocalReference principalId=local-user;tenantId=local-tenant
```

Non-stream JSON invoke remains:

```http
POST /v1/agents/reference-agent/invoke
```

## Handoff (one execution)

```text
Security
  → AgentFramework.invokeStream
  → AgentRuntimePort.acceptStream
  → RuntimeOrchestrator.executeStream
  → Capability.stream → AiProviderFramework.stream
  → SSE
```

Guarantees for one streaming request:

- one `invocationId`
- one `executionReference` / `executionId`
- one Runtime execution (`execute` count = 0, `executeStream` count = 1)
- one `agent.invocation.accepted` fact
- one terminal `RuntimeResult` / SSE terminal event

When `TOOLS_ENABLED=true`, the stream may also emit safe `tool_call` / `tool_result` lifecycle events (ids + status only). See [tools.md](./tools.md).

## SSE events

| Event | Meaning |
|---|---|
| `start` | Stream began (execution + correlation refs) |
| `delta` | Text chunk `{ sequence, text }` |
| `usage` | Optional usage update |
| `complete` | Success terminal |
| `error` | Failure terminal (after headers committed) |
| `cancelled` | Cancellation terminal |

Errors known before SSE headers commit use normal JSON API errors.

## curl example

```bash
curl -N -X POST "http://127.0.0.1:3000/v1/agents/reference-agent/invoke/stream" \
  -H "Authorization: LocalReference principalId=local-user;tenantId=local-tenant" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{\"objective\":\"hello agentprodready\"}"
```

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `STREAMING_HEARTBEAT_INTERVAL_MS` | `15000` | SSE `: ping` interval; `0` disables |
| `STREAMING_MAX_DRAIN_WAIT_MS` | `30000` | Max wait on `response.write` backpressure before Runtime cancel |

No `STREAMING_ENABLED` flag — the stream route is the opt-in surface.

## Ownership

| Concern | Owner |
|---|---|
| Vendor → normalized stream | AI Provider |
| Cancel / timeout / terminal result | Runtime |
| Acceptance / handoff selection | Agent Framework |
| SSE framing / drain / disconnect | platform-host |

## Backpressure

Host awaits Node `drain` when `write()` returns `false`. Provider/Runtime iterators pause naturally via pull. Drain timeout requests Runtime cancellation once (`backpressure-timeout` path).

## Recovery limitation (host SSE)

Chunks are **not** checkpointed for HTTP reconnect. Final capability result may be checkpointed at post-invoke. Crash mid-stream does **not** resume the same HTTP/SSE connection.

## Simple library replay (v1.6)

Embedded `createAgent` supports durable stream event logging and client replay:

- `agent.stream(input, { resumeFrom })` — replay then live-tail
- `agent.replayStream(executionId, afterSequence?)` — log-only replay

Guide: [stream-replay.md](./stream-replay.md). Requires durable stream log (e.g. with `fileMemory({ directory })`).

## Reference vs OpenAI

- Reference AI: deterministic whitespace-preserving chunks; secret-free CI
- OpenAI: opt-in streaming in `@agentprodready/ai-provider-openai`; live calls not required in PR CI

## Non-goals (host v0.8 baseline)

Tool calling, WebSockets, HTTP SSE reconnect/resume tokens, streaming Evaluation/Memory on the operator host.

## Probe

```bash
pnpm build
node scripts/streaming-probe.mjs
pnpm test:streaming
```

## Reverse proxies (future)

Disable response buffering for SSE; set idle/read timeouts above the heartbeat interval; prefer HTTP/1.1. Nginx is not deployed by v0.8.
