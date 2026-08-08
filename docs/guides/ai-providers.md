# AgentProdReady AI Providers

**Version:** 1.0.0

## Overview

AgentProdReady isolates AI vendors behind Blueprint 08. Higher layers consume only `NormalizedAiResult` / `NormalizedAiError`.

| Implementation id | Package / Simple helper | Default | Requires secrets |
|---|---|---|---|
| `reference-ai` | `reference()` | Yes | No |
| `openai-ai` | `openai(...)` + `@agentprodready/ai-provider-openai` | No | `OPENAI_API_KEY` |
| `openai-compatible-ai` | `openaiCompatible({ baseUrl, model })` + same package | No | `OPENAI_COMPATIBLE_API_KEY` (unless `auth: "none"`) |
| Anthropic | **Not implemented** — next named provider track | — | — |

## Selection

```bash
# Deterministic local / CI (default)
AI_PROVIDER=reference

# Official OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
# optional
OPENAI_MODEL=gpt-5
OPENAI_BASE_URL=https://api.openai.com/v1

# OpenAI Chat Completions–compatible endpoint (distinct identity)
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_MODEL=llama-3.1-70b
OPENAI_COMPATIBLE_API_KEY=...
# OPENAI_COMPATIBLE_AUTH=none   # explicit local/no-auth only
```

**Security:** `OPENAI_API_KEY` is never automatically forwarded to compatible `baseUrl`s. See [openai-compatible.md](./openai-compatible.md).

Copy `.env.example` to `.env` for local overrides. Never commit real keys.

## Multi-provider routing (v1.0)

Ordered fallback across registered implementations is owned by **Capability Resolution** plus a Runtime attempt ledger. There is no `AiRouter`. See [multi-provider-routing.md](./multi-provider-routing.md).

```bash
AI_ROUTING_MODE=fallback
AI_PROVIDER=reference
AI_FALLBACK_PROVIDERS=openai
OPENAI_API_KEY=sk-...
```

## SDK pin

`@agentprodready/ai-provider-openai` depends on exact `openai@7.4.0` with `maxRetries: 0`. Runtime owns retry/timeout/cancellation.

## Models within one provider

Selecting different models within one provider (for example `gpt-5` vs a smaller OpenAI model) remains an adapter / Composition / Capability Resolution configuration concern and must not require Runtime, Planning, or Workflow changes. Default `OPENAI_MODEL` is `gpt-5`.

## Live tests

```bash
AI_LIVE_TESTS=1 AI_PROVIDER=openai OPENAI_API_KEY=... pnpm test
```

Default CI never sets `AI_LIVE_TESTS` and never requires OpenAI secrets.

## Deferred / next

- Anthropic Messages API adapter (next named provider track)
- Gemini / Bedrock / other non–Chat-Completions vendors
- Claiming universal “OpenAI-compatible” gateway support
