# `@agentprodready/testing-verification`

**Testing & verification helpers for AgentProdReady platform packages and hosts.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/testing-verification` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You write architecture/integration tests against platform contracts.

**Prefer not to start here** if Vitest unit tests against your own `createAgent` app are enough.

---

## Install

```bash
npm install @agentprodready/testing-verification
```

---

## Sample

```ts
// Pair with Vitest in the monorepo or a composed host test suite.
import '@agentprodready/testing-verification';

console.log('testing-verification contracts available');
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Verification helpers / contract test utilities | Your application test framework choice; CI vendor |

---

## Documentation

- [Blueprint 30](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/30-testing-and-verification.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
