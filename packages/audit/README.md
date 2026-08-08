# `@agentprodready/audit`

**Audit & compliance fact ingestion contracts — immutable audit records for hosts.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/audit` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your host records governed audit facts from Security / Runtime / tools.

**Prefer not to start here** if you are prototyping with Simple Agent API only.

---

## Install

```bash
npm install @agentprodready/audit
```

---

## Sample

```ts
import type { AuditIngestor } from '@agentprodready/audit';

declare const audit: AuditIngestor;
await audit.ingest(/* AuditIngestRequest */);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Audit ingestion / record contracts | Authorization decisions; event bus transport; Persistence drivers |

---

## Documentation

- [Blueprint 17](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/17-audit-and-compliance.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
