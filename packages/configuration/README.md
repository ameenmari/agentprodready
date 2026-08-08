# `@agentprodready/configuration`

**Configuration contracts — typed config loading for replaceable host settings.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/configuration` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your host needs versioned configuration providers.

**Prefer not to start here** if env vars + `createAgent` options are enough.

---

## Install

```bash
npm install @agentprodready/configuration
```

---

## Sample

```ts
import type { ConfigurationProvider } from '@agentprodready/configuration';

declare const config: ConfigurationProvider;
const value = await config.get('runtime.timeoutMs');
console.log(value);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Configuration provider contracts | Secret storage; Runtime policy evaluation; npm config |

---

## Documentation

- [Blueprint 23](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/23-configuration.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
