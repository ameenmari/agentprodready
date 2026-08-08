# {{PACKAGE_NAME}}

AgentProdReady **OpenAI** scaffold.

## Run

```bash
npm install

# bash
export OPENAI_API_KEY="..."

# PowerShell
# $env:OPENAI_API_KEY="..."

npm run dev
```

## Env

| Variable | Required |
|---|---|
| `OPENAI_API_KEY` | Yes |

The library does **not** load `.env` files for you.

## Production-safe?

No — you must add your own HTTP auth before exposing an API. See [embed deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/embed-agent-deployment.md).

## Next

- [Getting Started](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/getting-started.md)
- [openai-compatible template](https://github.com/ameenmari/agentprodready/tree/main/packages/create-agentprodready/templates/openai-compatible) via `--template openai-compatible`
