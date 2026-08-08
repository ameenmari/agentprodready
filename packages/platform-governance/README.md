# `@agentprodready/platform-governance`

**Platform governance & evolution contracts — versioning, compatibility, governance facts.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/platform-governance` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You operate multi-version platform evolution policies.

**Prefer not to start here** if you are shipping a single-app embedded agent.

---

## Install

```bash
npm install @agentprodready/platform-governance
```

---

## Sample

```ts
import type { CompatibilityPolicy } from '@agentprodready/platform-governance';

declare const policy: CompatibilityPolicy;
console.log(policy);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Governance / compatibility contracts | npm publishing scripts; Runtime execution |

---

## Documentation

- [Blueprint 31](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/31-platform-governance-and-evolution.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
