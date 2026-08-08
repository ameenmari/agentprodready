# openai-agent

Minimal AgentProdReady OpenAI agent using the Simple Agent API.

## Requirements

- Node.js **24**
- `OPENAI_API_KEY` in the environment (the library does **not** load `.env` files)

## Run

```bash
npm install
```

```bash
# bash
export OPENAI_API_KEY="..."

# PowerShell
$env:OPENAI_API_KEY="..."
```

```bash
npm start
```

Uses `@agentprodready/agent-framework` + `@agentprodready/ai-provider-openai` with `openai()` and `createAgent`.

For a zero-secret path, use [`../hello-agent`](../hello-agent) with `reference()`.
