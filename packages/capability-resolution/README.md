# `@agentprodready/capability-resolution`

**Select which implementation fulfills a capability binding — provider-neutral resolution.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/capability-resolution` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

Your host routes work to AI / tool / other capability implementations by policy.

**Prefer not to start here** if Simple `createAgent` already resolves embedded bindings for you.

---

## Install

```bash
npm install @agentprodready/capability-resolution
```

---

## Sample

```ts
import type { CapabilityResolver } from '@agentprodready/capability-resolution';

declare const resolver: CapabilityResolver;
// Runtime asks for a binding; this package selects the implementation id.
const binding = await resolver.resolve(/* CapabilityResolutionRequest */);
console.log(binding.implementationId);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Capability → implementation selection | Executing the capability; authorizing the caller; constructing adapters |

---

## Documentation

- [Blueprint 07](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/07-capability-resolution.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
