# `@agentprodready/security`

**Centralized authorization** for AgentProdReady — identity normalization, allow/deny decisions, delegation, revocation, and Security Context production.

| | |
|---|---|
| **Status** | Production contracts published (`1.0.x`) |
| **Install** | `npm install @agentprodready/security` |
| **Module** | ESM |
| **License** | MIT |

---

## Installation

```bash
npm install @agentprodready/security
```

Pulled automatically by Agent Framework and many platform packages.

---

## Features

| Feature | Description |
|---|---|
| Authorization outcomes | Structured allow/deny with scope & obligations |
| Authority state | Active / inactive semantics for consumers |
| Delegation & revocation | First-class security operations |
| Security Context | Produced for Runtime / Agent / Tool paths |
| Reference adapters | Deterministic helpers for tests |

---

## Ownership rule

```text
Security decides.
Everyone else consumes the decision.
```

Agent Framework, Tools, Memory, and Persistence **must not** invent their own authorization.

---

## Usage (conceptual)

```ts
import type { AuthorityState } from '@agentprodready/security';

// Agent Framework expects AgentAuthorizationOutcome-shaped decisions.
// Produce them from Security in Composition — do not hardcode in production.
```

Reference host uses LocalReference HTTP auth for demos only.  
**Not production authentication.** See [SECURITY.md](https://github.com/ameenmari/agentprodready/blob/main/SECURITY.md).

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) | Requires auth on register/lifecycle/invoke |
| [`@agentprodready/tool-framework`](https://www.npmjs.com/package/@agentprodready/tool-framework) | Tool authorization |
| [`@agentprodready/audit`](https://www.npmjs.com/package/@agentprodready/audit) | Accountability records |

---

## Documentation

- [Security guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/security.md)
- [Blueprint 15](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/15-security-and-authorization.md)

---

## License

MIT © 2026 ameenmari
