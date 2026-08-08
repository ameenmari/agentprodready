# memory-agent

## What problem does this solve?

Honest Simple Memory story: wiring/diagnostics with `reference()`, optional NL recall with `openai()`.

## How do I run it?

```bash
npm install
npm run start:reference
# optional NL recall:
# export OPENAI_API_KEY="..."
# npm run start:openai
```

See `package.json` scripts if named differently in-tree.

## Env variables

| Path | Vars |
|---|---|
| Reference wiring | none |
| OpenAI NL recall | `OPENAI_API_KEY` + `@agentprodready/ai-provider-openai` |

## Expected output

- Reference: echoed user text + `metadata.memory` proof (not NL “intelligence”)
- OpenAI: short answer that can mention recalled facts

## Is it production-safe?

No. `memory: true` is **ephemeral**, not durable Postgres.

## What should I read next?

- [simple-memory.md](../../docs/guides/simple-memory.md)
- Canonical weekend path: [`../backend-agent`](../backend-agent)
