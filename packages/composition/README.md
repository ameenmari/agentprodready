# `@agentprodready/composition`

**Composition root ownership — instantiate and wire platform dependencies without scattering `new` across the app.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/composition` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You are assembling a production host (or studying how the reference host is wired).

**Prefer not to start here** if you are embedding a weekend agent — `createAgent` owns embedded composition for you.

---

## Install

```bash
npm install @agentprodready/composition
```

---

## Sample

```ts
import { CompositionRoot } from '@agentprodready/composition';

const root = new CompositionRoot();
root.build();
// Host registers providers/adapters on the root — Composition owns instantiation lifetime.
await root.dispose();
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Instantiation ownership; composition graph lifetime | Authorization; Runtime orchestration; capability selection policy |

---

## Documentation

- [Blueprint 02 — Composition](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/02-composition.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
