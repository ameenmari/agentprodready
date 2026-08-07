# Production Deployment (v1.0)

AgentForge v1.0 is intended for **operator-deployed** production use with documented limitations — not a hosted SaaS platform.

## Suitable baseline

- Compose packages via `platform-host` (or your own Composition root)
- Real OpenAI chat when needed (`AI_PROVIDER=openai`)
- PostgreSQL for durable Persistence / Memory / Evaluation / Runtime recovery / pgvector
- Operator-run migrations (`pnpm db:migrate`, `pnpm db:migrate:vector`)
- Production auth **you supply** (LocalReference is not production auth)

## Startup order

```text
config → secret presence checks → persistence assertReady →
composition → seed → optional recoverIncomplete →
readiness true → listen
```

Startup does **not** auto-migrate.

## Health probes

| Endpoint | Use |
|---|---|
| `GET /health` | Liveness |
| `GET /ready` | Readiness (orchestration should wait on this) |

Mandatory readiness contributors depend on config (Postgres when selected, OpenAI key when openai is required, vector store when enabled). Optional degraded providers must not flip ready unless mandatory.

## Container notes

- Bind `HOST=0.0.0.0` in containers
- Run non-root; no secrets in the image
- Prefer orchestration readiness on `/ready`; image HEALTHCHECK may remain liveness `/health`
- Compose is for **local** stacks, not a production orchestrator
- Graceful shutdown: SIGTERM/SIGINT → stop accept → drain up to `SHUTDOWN_TIMEOUT_MS` → cancel remainder → dispose → exit

## Recommended production settings

```bash
NODE_ENV=production
HOST=0.0.0.0
LOG_LEVEL=info
AI_PROVIDER=openai
AI_ROUTING_MODE=fixed   # or fallback with explicit AI_FALLBACK_PROVIDERS
OPENAI_API_KEY=...
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgres://...
POSTGRES_SSL=true
MEMORY_PROVIDER=persistent
RUNTIME_RECOVERY_ENABLED=true
MAX_JSON_BODY_BYTES=1048576
SHUTDOWN_TIMEOUT_MS=30000
# Do NOT set AGENTFORGE_ALLOW_REFERENCE_AUTH unless an explicit unsafe demo
```

Supply a real auth adapter before exposing HTTP beyond trusted networks. See [security.md](./security.md).

## Known limitations

- No distributed Runtime / multi-region / leader election
- No exactly-once external tool effects
- No durable HITL approval wait (fail-closed `TOOL_APPROVAL_REQUIRED`)
- No SSE reconnect / stream replay
- Provider catalog: reference + OpenAI only
- Operator-managed migrations
- No hosted management UI
- Single reference-agent HTTP product surface

## Related

- [Configuration](./configuration.md)
- [Operations](./operations.md)
- [Upgrading](./upgrading.md)
- [Multi-provider routing](./multi-provider-routing.md)
