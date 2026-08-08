# openai-compatible-agent

Point Simple Agent at an **OpenAI Chat Completions–compatible** HTTP endpoint.

This is **not** Anthropic Messages API support. Compatibility depends on the endpoint implementing the request/response shapes used by AgentProdReady’s OpenAI adapter (chat completions; tools/streaming only if the gateway matches those shapes).

## Install

```bash
npm install
```

## Configure

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

Local / no-auth OpenAI-compatible servers (conceptual):

```bash
export OPENAI_COMPATIBLE_BASE_URL="http://127.0.0.1:11434/v1"
export OPENAI_COMPATIBLE_MODEL="llama3.1"
export OPENAI_COMPATIBLE_AUTH=none
```

`OPENAI_API_KEY` is **never** used for this example.

## Run

```bash
npm start
```

No secrets are committed in this example.
