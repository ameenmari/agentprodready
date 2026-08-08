# {{PACKAGE_NAME}}

AgentProdReady **OpenAI-compatible** scaffold (Chat Completions–shaped gateways).

## Run

```bash
npm install

# bash
export OPENAI_COMPATIBLE_BASE_URL="https://api.example.com/v1"
export OPENAI_COMPATIBLE_MODEL="llama-3.1-70b"
export OPENAI_COMPATIBLE_API_KEY="..."

# PowerShell
# $env:OPENAI_COMPATIBLE_BASE_URL="..."
# $env:OPENAI_COMPATIBLE_MODEL="..."
# $env:OPENAI_COMPATIBLE_API_KEY="..."

npm run dev
```

## Env

| Variable | Required |
|---|---|
| `OPENAI_COMPATIBLE_BASE_URL` | Yes |
| `OPENAI_COMPATIBLE_MODEL` | No (default `llama-3.1-70b`) |
| `OPENAI_COMPATIBLE_API_KEY` | Yes unless `OPENAI_COMPATIBLE_AUTH=none` |
| `OPENAI_COMPATIBLE_AUTH` | No (`api-key` default, or `none`) |

`OPENAI_API_KEY` is **never** used on this path.

## Production-safe?

No — add your own auth before exposing HTTP. See [openai-compatible guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/openai-compatible.md).

## Next

- [examples/openai-compatible-agent](https://github.com/ameenmari/agentprodready/tree/main/examples/openai-compatible-agent)
