# Upgrading v0.9 → v1.0

The v0.9 → v1.0 path is **non-destructive**. Existing Persistence and vector data remain valid; no forced wipe.

## Compatibility

| Area | Behavior |
|---|---|
| Default AI routing | `AI_ROUTING_MODE=fixed` — same single-provider selection as v0.9 via `AI_PROVIDER` |
| HTTP surface | Same endpoints (`/health`, `/ready`, invoke, invoke/stream) |
| Tools / streaming / memory / eval / vector | Unchanged defaults (features remain opt-in) |
| Migrations | Operator-run; idempotent Persistence + vector migrators |

## Steps

1. Deploy v1.0 bits (host + packages) without changing env → expect v0.9-equivalent behavior.
2. Run Persistence migrations if you use Postgres: `pnpm db:migrate`.
3. If vector search is enabled, run `pnpm db:migrate:vector` only when your vector schema needs it. **Rebuilding a vector index profile remains an explicit operator action** — do not expect automatic cross-profile migration.
4. Optionally adopt v1.0 env:
   - `AI_ROUTING_MODE` / `AI_FALLBACK_PROVIDERS` for chat failover
   - `SHUTDOWN_TIMEOUT_MS`, `MAX_JSON_BODY_BYTES`
   - Production: set `NODE_ENV=production` and ensure LocalReference auth is not sole auth (`AGENTPRODREADY_ALLOW_REFERENCE_AUTH` only for explicit demos)
5. Smoke: `/ready`, non-stream invoke, stream invoke; if tools/routing enabled, run `pnpm test:tools` / `pnpm test:routing` in CI.

## What does not migrate automatically

- Embedding / `VECTOR_INDEX_PROFILE` changes (fail closed; rebuild deliberately)
- Production auth (you must supply a real adapter)
- Deferred features (durable HITL wait, SSE replay, third AI vendor SDKs)

## Rollback

Revert the deployment artifact and keep the same database. Because migrations are non-destructive additive where possible, rolling back the app without reversing migrations is the usual path; do not use destructive reset tools (`PERSISTENCE_ALLOW_RESET`, vector reset) in production.

## Related

- [Configuration](./configuration.md)
- [Multi-provider routing](./multi-provider-routing.md)
- [Production deployment](./production-deployment.md)
