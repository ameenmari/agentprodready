# anthropic-agent

## What problem does this solve?

Live Anthropic Claude chat via Simple `anthropic()` (Messages API — not OpenAI-compatible).

## How do I run it?

```bash
npm install
export ANTHROPIC_API_KEY="..."   # PowerShell: $env:ANTHROPIC_API_KEY="..."
npm start
```

## Env variables

| Variable | Required |
|---|---|
| `ANTHROPIC_API_KEY` | Yes |
| `ANTHROPIC_MODEL` | No (default `claude-sonnet-4-20250514`) |

`OPENAI_API_KEY` is never used.

## Expected output

Natural-language reply from Claude (non-deterministic).

## Is it production-safe?

No — example CLI only. Supply your own HTTP auth for services.

## What should I read next?

- [ai-providers.md](../../docs/guides/ai-providers.md)
- Canonical wow: [`../backend-agent`](../backend-agent)
