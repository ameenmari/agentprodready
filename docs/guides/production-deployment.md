# Production Deployment

AgentProdReady is intended for **operator-deployed** production use with documented limitations — not a hosted SaaS platform.

**Embedding `createAgent` in your own Node service?** Start with the shorter recipe: [embed-agent-deployment.md](./embed-agent-deployment.md).

This page covers the composed **platform-host** / operator baseline.

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
# Do NOT set AGENTPRODREADY_ALLOW_REFERENCE_AUTH unless an explicit unsafe demo
```

Supply a real auth adapter before exposing HTTP beyond trusted networks. See [security.md](./security.md).

## Known limitations

- No distributed Runtime / multi-region / leader election
- No exactly-once external tool effects for **non-idempotent** tools (idempotent + ledger: exactly-once-**capable**)
- HTTP host SSE reconnect / resume tokens not shipped (Simple library replay available — see [stream-replay.md](./stream-replay.md))
- Provider catalog: reference + OpenAI + OpenAI-compatible + Anthropic + Gemini
- Operator-managed migrations
- No hosted management UI
- Single reference-agent HTTP product surface
- No Kubernetes / distributed Runtime requirement in the baseline

## Related

- [Embed agent deployment](./embed-agent-deployment.md) *(Simple path)*
- [Configuration](./configuration.md)
- [Operations](./operations.md)
- [Upgrading](./upgrading.md)
- [Multi-provider routing](./multi-provider-routing.md)
- [Security](./security.md)
