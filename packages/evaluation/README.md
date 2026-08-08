# `@agentprodready/evaluation`

**Evaluation framework — score and compare agent runs with replaceable evaluators.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/evaluation` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You add offline/online evaluation to a host or CI quality gate.

**Prefer not to start here** if manual `invoke` checks are enough for your prototype.

---

## Install

```bash
npm install @agentprodready/evaluation
```

---

## Sample

```ts
import type { EvaluationRunner } from '@agentprodready/evaluation';

declare const evaluation: EvaluationRunner;
const report = await evaluation.run(/* EvaluationRunRequest */);
console.log(report);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Evaluation run / scoring contracts | Model training; Observability backends; Simple facade |

---

## Documentation

- [Evaluation guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/evaluation.md)
- [Blueprint 14](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/14-evaluation-framework.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
