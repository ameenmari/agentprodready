# Durable Simple Memory

Persist conversation memory across process restarts on the Simple Agent API.

Production-oriented architecture with a young ecosystem.

## When to use

| Option | Use when |
|---|---|
| `memory: true` / `inMemory()` | Weekend path, tests, ephemeral sessions |
| `fileMemory({ directory })` | Single-node apps, local dev, no Postgres |
| `postgresMemory({ connectionString })` | Shared durability, existing Postgres ops |

`memory: true` is **not** upgraded to durable storage — choose `fileMemory` or `postgresMemory` explicitly.

## File-backed

```js
import { createAgent, openai, fileMemory } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "Remember user facts when present.",
  memory: fileMemory({ directory: "./.agent-memory" }),
});

await agent.invoke("My favorite color is blue.");
await agent.close();

// New process — same directory + namespace → prior turns available
const agent2 = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "Remember user facts when present.",
  memory: fileMemory({ directory: "./.agent-memory" }),
});

const result = await agent2.invoke("What color did I mention?");
console.log(result.text);
await agent2.close();
```

Records are JSON files under `directory/<namespace>/`. Optional `namespace` isolates agents on the same disk.

## Postgres-backed

```js
import { createAgent, openai, postgresMemory } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "Remember user facts when present.",
  memory: postgresMemory({ connectionString: process.env.DATABASE_URL }),
});
```

Requires `@agentprodready/persistence-postgres` (peer). Run Persistence migrations before production use.

## Honesty

- Durable memory stores **execution-derived context** for prompt injection — not model intelligence by itself.
- `reference()` still does not perform natural-language recall; use a reasoning model for NL demos.
- Tenant isolation and retention policies are your responsibility in multi-tenant hosts.

## Related

- [Simple Memory](./simple-memory.md) — ephemeral path
- [Memory (advanced)](./memory.md)
- [Persistence](./persistence.md)
