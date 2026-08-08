# `@agentprodready/deployment-framework`

**Deployment descriptors and contracts for packaging AgentProdReady hosts.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/deployment-framework` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You describe container/process deployment profiles for a host.

**Prefer not to start here** if you are still validating `createAgent` locally.

---

## Install

```bash
npm install @agentprodready/deployment-framework
```

---

## Sample

```ts
import type { DeploymentDescriptor } from '@agentprodready/deployment-framework';

declare const deployment: DeploymentDescriptor;
console.log(deployment.profile);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Deployment description contracts | Kubernetes controllers; cloud IAM; Runtime |

---

## Documentation

- [Blueprint 29](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/29-deployment-framework.md)
- [Production deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/production-deployment.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
