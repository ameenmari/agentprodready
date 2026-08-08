# openai-agent

## What problem does this solve?

Live OpenAI chat via Simple `openai()` helper.

## How do I run it?

```bash
npm install
export OPENAI_API_KEY="..."   # PowerShell: $env:OPENAI_API_KEY="..."
npm start
```

## Env variables

| Variable | Required |
|---|---|
| `OPENAI_API_KEY` | Yes |

## Expected output

Natural-language reply from the configured OpenAI model (non-deterministic).

## Is it production-safe?

No — example CLI only. Supply your own HTTP auth for services.

## What should I read next?

- Gateway path: [`../openai-compatible-agent`](../openai-compatible-agent)
- Canonical wow: [`../backend-agent`](../backend-agent)
- [Getting Started](../../docs/guides/getting-started.md)
