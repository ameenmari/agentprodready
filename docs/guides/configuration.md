# Configuration

Local Reference host config is loaded from the process environment (see `.env.example`). Copy to `.env` only for overrides. Defaults work for `pnpm start` (reference AI, in-memory persistence, tools/evaluation/vector off).

## Parsing rules (v1.0)

- Booleans: strict `true` / `false` only
- Integers: full-string digits only (`8abc` rejected)
- Unknown enum tokens → startup fail
- Secrets must never appear in logs, metrics, audit payloads, `/health`, `/ready`, or client errors

## Production mode

`NODE_ENV=production` is the primary production signal:

- LocalReference auth fails startup unless `AGENTFORGE_ALLOW_REFERENCE_AUTH=true` (unsafe demo escape hatch)
- Prefer TLS for non-local Postgres (`POSTGRES_SSL=false` may warn)
- Prefer `LOG_LEVEL` ≥ `info`

## Environment variables

| name | type | default | allowed | secret | required when | production note |
|---|---|---|---|---|---|---|
| `HOST` | string | `127.0.0.1` | any bind address | no | — | Use `0.0.0.0` in containers |
| `PORT` | int | `3000` | `0`–`65535` | no | — | Expose only as needed |
| `LOG_LEVEL` | enum | `info` | `debug`, `info`, `warn`, `error` | no | — | Prefer ≥ `info` |
| `NODE_ENV` | string | _(unset)_ | any; `production` enables prod policy | no | — | Set for production policy |
| `REFERENCE_AGENT_ENABLED` | bool | `true` | `true`, `false` | no | — | Keep enabled for reference product |
| `AI_PROVIDER` | enum | `reference` | `reference`, `openai` | no | — | Primary chat selector |
| `AI_ROUTING_MODE` | enum | `fixed` | `fixed`, `fallback` | no | — | Default `fixed` preserves v0.9 |
| `AI_FALLBACK_PROVIDERS` | csv | _(empty)_ | `reference`, `openai` (ordered, no dupes/primary) | no | `AI_ROUTING_MODE=fallback` | Do not list providers without keys |
| `OPENAI_API_KEY` | string | _(empty)_ | opaque | **yes** | `AI_PROVIDER=openai`, openai in fallbacks, or OpenAI embeddings | Never commit; never log |
| `OPENAI_MODEL` | string | provider default | model id | no | optional with OpenAI chat | Pin deliberately |
| `OPENAI_BASE_URL` | url | OpenAI default | https URL | no | optional | SSRF risk; avoid metadata/link-local in prod |
| `OPENAI_ORGANIZATION` | string | _(empty)_ | org id | no | optional | — |
| `OPENAI_PROJECT` | string | _(empty)_ | project id | no | optional | — |
| `AI_LIVE_TESTS` | flag | unset | `1` enables | no | opt-in live package tests | Never in default CI |
| `PERSISTENCE_PROVIDER` | enum | `in-memory` | `in-memory`, `postgres` | no | — | Use `postgres` for durability |
| `DATABASE_URL` | url | _(empty)_ | `postgres:` / `postgresql:` | **yes** | `PERSISTENCE_PROVIDER=postgres` (or discrete parts) | Prefer SSL remotely |
| `POSTGRES_SSL` | bool | `false` | `true`, `false` | no | optional with postgres | Prefer `true` non-local |
| `POSTGRES_POOL_MIN` | int | `0` | ≥0 | no | optional | Size for load |
| `POSTGRES_POOL_MAX` | int | `10` | ≥ `POSTGRES_POOL_MIN` | no | optional | Size for load |
| `POSTGRES_HOST` | string | _(empty)_ | hostname | no | when no `DATABASE_URL` | Alternate URL parts |
| `POSTGRES_PORT` | int | `5432` | port | no | when no `DATABASE_URL` | — |
| `POSTGRES_DATABASE` | string | _(empty)_ | name | no | when no `DATABASE_URL` | — |
| `POSTGRES_USER` | string | _(empty)_ | user | no | when no `DATABASE_URL` | — |
| `POSTGRES_PASSWORD` | string | _(empty)_ | password | **yes** | when no `DATABASE_URL` | Never commit |
| `PERSISTENCE_ALLOW_RESET` | flag | unset | `1` enables | no | `pnpm db:reset:test` only | Dev/test only |
| `RUNTIME_RECOVERY_ENABLED` | bool | `false` | `true`, `false` | no | optional | Needs postgres for cross-process |
| `MEMORY_PROVIDER` | enum | `in-memory` | `in-memory`, `persistent` | no | — | Durable: `persistent` + postgres |
| `EVALUATION_ENABLED` | bool | `false` | `true`, `false` | no | optional | Off by default |
| `EVALUATION_RESULT_STORE` | enum | `in-memory` | `in-memory`, `persistent` | no | optional | Durable: `persistent` + postgres |
| `VECTOR_SEARCH_ENABLED` | bool | `false` | `true`, `false` | no | optional | Off by default |
| `VECTOR_STORE_PROVIDER` | enum | `none` | `none`, `memory`, `pgvector` | no | `VECTOR_SEARCH_ENABLED=true` → not `none` | `pgvector` needs DB |
| `EMBEDDING_PROVIDER` | enum | `none` | `none`, `reference`, `openai` | no | when vector enabled | **Fixed routing only** |
| `EMBEDDING_MODEL` | string | profile default | profile model | no | when vector enabled | Must match profile |
| `EMBEDDING_DIMENSIONS` | int | profile default | profile dims | no | when vector enabled | Must match profile |
| `VECTOR_INDEX_PROFILE` | enum | profile default | `reference-32`, `openai-1536-small` | no | when vector enabled | No cross-profile fallback |
| `STREAMING_HEARTBEAT_INTERVAL_MS` | int | `15000` | ≥0 (`0` disables) | no | optional | Tune for proxies |
| `STREAMING_MAX_DRAIN_WAIT_MS` | int | `30000` | ≥1 | no | optional | Bound drain before cancel |
| `TOOLS_ENABLED` | bool | `false` | `true`, `false` | no | optional | Off by default |
| `TOOL_MAX_CALLS_PER_INVOCATION` | int | `8` | `1`–`64` | no | optional | Bound tool loops |
| `TOOL_MAX_TURNS` | int | `4` | `1`–`32` | no | optional | Bound tool loops |
| `TOOL_MAX_ARGUMENT_BYTES` | int | `16384` | `1`–`1048576` | no | optional | Payload bound |
| `TOOL_MAX_RESULT_BYTES` | int | `65536` | `1`–`4194304` | no | optional | Payload bound |
| `SHUTDOWN_TIMEOUT_MS` | int | `30000` | `1`–`300000` | no | optional | Graceful drain window |
| `MAX_JSON_BODY_BYTES` | int | `1048576` | `1`–`16777216` | no | optional | HTTP body limit |
| `AGENTFORGE_ALLOW_REFERENCE_AUTH` | bool | `false` | `true`, `false` | no | `NODE_ENV=production` demo only | **Not** production auth |

## Related guides

- [Multi-provider routing](./multi-provider-routing.md)
- [Production deployment](./production-deployment.md)
- [Security](./security.md)
- [AI providers](./ai-providers.md)
- [Persistence](./persistence.md)
- [Tools](./tools.md)
