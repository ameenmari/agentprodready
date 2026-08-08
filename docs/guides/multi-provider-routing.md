# Multi-Provider AI Routing (v1.0)

AgentProdReady selects AI implementations through **Capability Resolution** and records failover attempts in Runtime’s **ProviderAttemptLedger**. There is **no** `AiRouter` / `ProviderRouter` / `ModelRouter`.

## Ownership

| Concern | Owner |
|---|---|
| Ordered candidate selection | Capability Resolution |
| Adapter instantiation | Composition |
| Vendor normalize / translate | AI Provider Framework |
| Timeout, cancel, recovery, attempt ledger | Runtime |
| Routing config | Configuration / host loader |
| Authorization | Security |

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `AI_ROUTING_MODE` | `fixed` | `fixed` (v0.9 behavior) or `fallback` |
| `AI_PROVIDER` | `reference` | Primary selector (`reference` \| `openai` \| `openai-compatible`) |
| `AI_FALLBACK_PROVIDERS` | _(empty)_ | Comma-separated secondaries when mode=`fallback` |

```bash
# Opt-in failover: try OpenAI, then reference
AI_ROUTING_MODE=fallback
AI_PROVIDER=openai
AI_FALLBACK_PROVIDERS=reference
OPENAI_API_KEY=...
```

- Unknown tokens → startup fail.
- `AI_ROUTING_MODE=fallback` with empty fallbacks → startup fail.
- `openai` in the ordered list requires `OPENAI_API_KEY` at startup.
- `openai-compatible` in the ordered list requires `OPENAI_COMPATIBLE_BASE_URL` and (unless `OPENAI_COMPATIBLE_AUTH=none`) `OPENAI_COMPATIBLE_API_KEY` — never `OPENAI_API_KEY`.
- Default CI remains secret-free (`fixed` + `reference`).

Real chat providers: **reference-ai**, **openai-ai**, and **openai-compatible-ai** (distinct identity; same OpenAI adapter class). No `AiRouter`.

## Fallback-eligible errors

Normalized `AiErrorCode` + `retryable` only (never SDK types):

| Code | Fallback when `retryable` |
|---|---|
| `AI_UNAVAILABLE` | Yes |
| `AI_PROVIDER_TIMEOUT` | Yes |
| `AI_RATE_LIMITED` | Yes only if `retryable` (quota exhaustion → no) |
| `AI_AUTHENTICATION` / `AI_INVALID_REQUEST` / `AI_CONTEXT_LIMIT` / `AI_UNKNOWN` | **No** |

## Safety boundaries

| Surface | Fallback allowed? |
|---|---|
| Chat execute — before successful result to Runtime | Yes (if eligible) |
| After result delivered into tool loop | **No** |
| Tool loop — before first AI response | Yes |
| After turn envelope / any `pre-tool` / `post-tool` / continuation | **No** |
| Stream — before first client-visible content or tool-call SSE | Yes |
| Stream — after first client-visible content/tool-call | **No** (terminal stream error) |
| Embedding | **Fixed only** — no failover; profile/dimension mismatch fail closed |

Adapters must not retry (`openai` package `maxRetries: 0`). Host must not add a third retry layer. Total provider attempts ≤ length of ordered ids; per-provider Runtime retries remain bounded separately.

## Attempt model

```text
1. Resolve primary binding
2. Invoke AI (execute|stream) under Runtime
3. If failure AND fallback-eligible AND mode=fallback
     AND safety allows AND next candidate exists:
       → record failover → re-resolve next → goto 2 (same logical request)
4. Else fail closed
```

## Tests

```bash
pnpm test:routing
```

## Related

- [AI providers](./ai-providers.md)
- [Configuration](./configuration.md)
- Product: `docs/product/agentprodready-v1.0-production-release.md`
