# AgentForge AI Providers

**Version:** 0.2.0

## Overview

AgentForge isolates AI vendors behind Blueprint 08. Higher layers consume only `NormalizedAiResult` / `NormalizedAiError`.

| Implementation id | Package | Default | Requires secrets |
|---|---|---|---|
| `reference-ai` | `@agentforge/ai-provider` | Yes | No |
| `openai-ai` | `@agentforge/ai-provider-openai` | No | `OPENAI_API_KEY` |

## Selection

```bash
# Deterministic local / CI (default)
AI_PROVIDER=reference

# Production-capable OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
# optional
OPENAI_MODEL=gpt-5
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_ORGANIZATION=
OPENAI_PROJECT=
```

Copy `.env.example` to `.env` for local overrides. Never commit real keys.

## SDK pin

`@agentforge/ai-provider-openai` depends on exact `openai@7.4.0` with `maxRetries: 0`. Runtime owns retry/timeout/cancellation.

## Multi-model (future)

Selecting different models within one provider (for example `gpt-5` vs a smaller OpenAI model) is an adapter / Composition / Capability Resolution configuration concern and must not require Runtime, Planning, or Workflow changes. v0.2 uses a single `OPENAI_MODEL` defaulting to `gpt-5`.

## Live tests

```bash
AI_LIVE_TESTS=1 AI_PROVIDER=openai OPENAI_API_KEY=... pnpm test
```

Default CI never sets `AI_LIVE_TESTS` and never requires OpenAI secrets.

## Deferred in v0.2

- Streaming product responses
- Tool-calling loops
- Embeddings / image / audio product APIs
- Anthropic / Gemini / Azure OpenAI adapters
