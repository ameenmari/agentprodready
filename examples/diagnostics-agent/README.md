# diagnostics-agent

## What problem does this solve?

Zero-key proof of Simple invoke diagnostics (`result.metadata`: provider, model, duration, tool counts).

## How do I run it?

```bash
npm install
npm start
```

## Env variables

None.

## Expected output

Text responses plus JSON metadata including `provider`, `modelId`, `durationMs`, and `tools`.

## Is it production-safe?

No — local deterministic demo only. Diagnostics are for developer debugging, not a telemetry contract.

## What should I read next?

- Guide: [`../../docs/guides/simple-diagnostics.md`](../../docs/guides/simple-diagnostics.md)
- Tools: [`../tools-agent`](../tools-agent)
