# openai-compatible-agent

## What problem does this solve?

Point Simple Agent at a **Chat Completions–compatible** gateway without leaking `OPENAI_API_KEY`.

This is **not** Anthropic Messages API support.

## How do I run it?

```bash
npm install
```

```bash
# bash
export OPENAI_COMPATIBLE_BASE_URL="https://api.example.com/v1"
export OPENAI_COMPATIBLE_MODEL="llama-3.1-70b"
export OPENAI_COMPATIBLE_API_KEY="..."

# PowerShell
$env:OPENAI_COMPATIBLE_BASE_URL="https://api.example.com/v1"
$env:OPENAI_COMPATIBLE_MODEL="llama-3.1-70b"
$env:OPENAI_COMPATIBLE_API_KEY="..."
```

Local / no-auth (conceptual):

```bash
export OPENAI_COMPATIBLE_BASE_URL="http://127.0.0.1:11434/v1"
export OPENAI_COMPATIBLE_MODEL="llama3.1"
export OPENAI_COMPATIBLE_AUTH=none
```

```bash
npm start
```

## Env variables

| Variable | Required |
|---|---|
| `OPENAI_COMPATIBLE_BASE_URL` | Yes |
| `OPENAI_COMPATIBLE_MODEL` | Recommended |
| `OPENAI_COMPATIBLE_API_KEY` | Yes unless `AUTH=none` |
| `OPENAI_COMPATIBLE_AUTH` | Optional (`none` for local) |

`OPENAI_API_KEY` is **never** used here.

## Expected output

Model text from your gateway (varies). Construct/config errors if baseUrl/key missing.

## Is it production-safe?

Gateway auth ≠ your app auth. Add production HTTP authentication before exposing an API. See [embed-agent-deployment.md](../../docs/guides/embed-agent-deployment.md).

## What should I read next?

- [openai-compatible.md](../../docs/guides/openai-compatible.md)
- [Why AgentProdReady](../../docs/guides/why-agentprodready.md)
- Canonical wow: [`../backend-agent`](../backend-agent)
