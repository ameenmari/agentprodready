# `@agentprodready/memory`

**Execution-derived memory** for AgentProdReady — capture, store, search, and recall context from agent runs (distinct from Knowledge / RAG).

| | |
|---|---|
| **Status** | Production contracts published (`1.0.x`) |
| **Install** | `npm install @agentprodready/memory` |
| **Module** | ESM |
| **License** | MIT |

---

## Installation

```bash
npm install @agentprodready/memory

# Durable memory (host also needs Persistence)
npm install @agentprodready/persistence @agentprodready/persistence-postgres

# Semantic / hybrid search (optional)
npm install @agentprodready/vector-store @agentprodready/vector-store-pgvector
```

---

## Features

| Feature | Description |
|---|---|
| Memory lifecycle | Capture → store → retrieve → recall |
| In-memory provider | Process-local default for demos/tests |
| Persistence-backed provider | Durable records via Persistence repository `memory-records` |
| Search provider surface | Pluggable `MemorySearchProvider` |
| Vector / hybrid search | Additive when host enables vector stack |
| Security boundary | Scoped by tenant / authorization outcomes |
| No vendor lock-in | Does not import `pg` or OpenAI |

---

## Providers

| Provider | Use when |
|---|---|
| `InMemoryMemoryProvider` | Local development, unit tests |
| `PersistenceBackedMemoryProvider` | Cross-process durability |

---

## Host configuration (reference product)

| Environment variable | Meaning |
|---|---|
| `MEMORY_PROVIDER=in-memory` | Default |
| `MEMORY_PROVIDER=persistent` | Persistence-backed Memory |
| `PERSISTENCE_PROVIDER=postgres` | Required for durable Memory |
| `VECTOR_SEARCH_ENABLED=true` | Enable semantic / hybrid retrieval |

---

## Usage (conceptual)

```ts
import type { MemoryProvider } from '@agentprodready/memory';

declare const memory: MemoryProvider; // from Composition

// Capture / store / search APIs are on the Memory contracts —
// wire through your host composition (see monorepo platform-host).
```

Runnable wiring: clone the monorepo and follow the [Memory guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/memory.md).

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/persistence`](https://www.npmjs.com/package/@agentprodready/persistence) | Durability contracts |
| [`@agentprodready/persistence-postgres`](https://www.npmjs.com/package/@agentprodready/persistence-postgres) | Postgres provider |
| [`@agentprodready/vector-store`](https://www.npmjs.com/package/@agentprodready/vector-store) | Vector NN contracts |
| [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) | Agent declarations for memory resources |

---

## Documentation

- [Memory guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/memory.md)
- [Vector search](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/vector-search.md)
- [Blueprint 11](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/11-memory-engine.md)

---

## License

MIT © 2026 ameenmari
