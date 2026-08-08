# tools-agent

## What problem does this solve?

Focused Simple Tools demo — `tool()` + deterministic `reference()` trigger without an API key.

## How do I run it?

```bash
npm install
npm start
```

## Env variables

None.

## Expected output

Text that includes a tool result for Paris (for example `Tool returned: ...` with sunny/Paris).

## Is it production-safe?

No. Tool defaults are conservative but this example is not an HTTP service. Approvals fail closed; external effects are not exactly-once.

## What should I read next?

- Fuller path: [`../backend-agent`](../backend-agent)
- [Simple Tools](../../docs/guides/simple-tools.md)
- Live model tools: [`../openai-agent`](../openai-agent)

### Note

`reference()` uses `USE_TOOL:<toolName>:<jsonArgs>`. OpenAI selects tools from schemas instead.
