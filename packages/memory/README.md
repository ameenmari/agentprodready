# @agentforge/memory

Blueprint 11 execution-derived memory capture, lifecycle, storage, retrieval, recall, and security boundary.

## Providers

| Provider | Role |
|---|---|
| `InMemoryMemoryProvider` | Process-local storage + search (default host) |
| `PersistenceBackedMemoryProvider` | Storage + search over `@agentforge/persistence` repository `memory-records` |

`PersistenceBackedMemoryProvider` does **not** import `pg` or SQL. Host selects Persistence separately (`PERSISTENCE_PROVIDER`).

## Host configuration

- `MEMORY_PROVIDER=in-memory` (default)
- `MEMORY_PROVIDER=persistent` → Persistence-backed Memory

Durable Memory requires `MEMORY_PROVIDER=persistent` and `PERSISTENCE_PROVIDER=postgres`.

Semantic/hybrid retrieval (v0.7) is additive behind `MemorySearchProvider` when `VECTOR_SEARCH_ENABLED=true`. See [docs/guides/vector-search.md](../../docs/guides/vector-search.md). Memory does not import OpenAI or pgvector packages.

See [docs/guides/memory.md](../../docs/guides/memory.md).
