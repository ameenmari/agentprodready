# `@agentprodready/cli-framework`

**CLI framework contracts for operator and developer command-line surfaces.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/cli-framework` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You build a CLI that talks to your AgentProdReady host/API.

**Prefer not to start here** if you only need `npm create agentprodready` / library embed.

---

## Install

```bash
npm install @agentprodready/cli-framework
```

---

## Sample

```ts
import type { CliApp } from '@agentprodready/cli-framework';

declare const cli: CliApp;
await cli.run(process.argv.slice(2));
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| CLI parsing/output/diagnostics contracts | Business agent logic; Runtime orchestration |

---

## Documentation

- [Blueprint 28](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/28-cli-framework.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
