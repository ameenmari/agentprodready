# Operations (v1.0)

## Day-2 checklist

1. Probe `/ready` (not only `/health`) before sending traffic
2. Confirm migrations applied (`pnpm db:migrate`; vector: `pnpm db:migrate:vector` when enabled)
3. Confirm secrets present for selected providers (never in images or logs)
4. Confirm `NODE_ENV=production` policy and that LocalReference auth is not relied on
5. Size Postgres pool (`POSTGRES_POOL_MIN` / `POSTGRES_POOL_MAX`) and `MAX_JSON_BODY_BYTES`
6. Set `SHUTDOWN_TIMEOUT_MS` to cover in-flight invoke + SSE drain under your orchestrator kill grace

## Graceful shutdown

On SIGTERM/SIGINT the host:

1. Stops accepting new requests
2. Drains in-flight invoke + SSE up to `SHUTDOWN_TIMEOUT_MS` (default 30000)
3. Cancels remainder via `AbortSignal`
4. Disposes composition / pools
5. Exits

Checkpoint durability follows existing Runtime semantics — aborted executions are possible; zero-abort is not claimed.

## Runtime recovery

Opt in with `RUNTIME_RECOVERY_ENABLED=true`. Cross-process recovery requires `PERSISTENCE_PROVIDER=postgres`. See [runtime-recovery.md](./runtime-recovery.md).

## Observability (minimum signals)

HTTP rate/errors/latency; active executions; Runtime terminal outcomes; recovery outcomes; AI latency/errors by `AiErrorCode`; routing (`ai.routing.*` selected / fallback_* / stream|tool_fallback_prevented); active streams/TTFB; tool outcomes; Memory/vector; Postgres pool; Evaluation; readiness.

Preserve `correlationId` / `executionId` across Agent → Runtime → AI → Tool. Never emit prompts, keys, or raw content in metrics/audit.

## Routing ops

- Default `AI_ROUTING_MODE=fixed`
- Failover is opt-in; exhausted fallbacks fail closed
- Stream/tool safety boundaries prevent mid-response provider splicing — expect terminal errors rather than silent switches

See [multi-provider-routing.md](./multi-provider-routing.md).

## Common failures

| Symptom | Likely cause |
|---|---|
| Startup fail on auth in production | Missing real auth; or need explicit unsafe `AGENTPRODREADY_ALLOW_REFERENCE_AUTH` for demos only |
| `/ready` false | Postgres / OpenAI key / vector prerequisites |
| Routing startup fail | Bad `AI_ROUTING_MODE` / empty or duplicate `AI_FALLBACK_PROVIDERS` |
| Stream ends with error after partial text | Fallback blocked after first client-visible content (by design) |
| `TOOL_APPROVAL_REQUIRED` | Approval-required tool; durable HITL deferred |

## Related

- [Production deployment](./production-deployment.md)
- [Configuration](./configuration.md)
- [Security](./security.md)
