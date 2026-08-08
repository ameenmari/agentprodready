# tools-agent

Zero-key Simple Tools demo with `createAgent` + `reference()` + `tool()`.

No API key. No workspace-relative imports.

## Run

```bash
npm install
npm start
```

Expected output includes a tool result for Paris (for example `Tool returned: ...`).

## Note

`reference()` uses the deterministic trigger:

```text
USE_TOOL:<toolName>:<jsonArgs>
```

OpenAI tool selection uses tool schemas instead — see [`../openai-agent`](../openai-agent) for a live-model path.
