# `@agentprodready/event-bus`

**Platform event bus contracts for operational events between components.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/event-bus` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You publish/subscribe normalized platform events in a host.

**Prefer not to start here** if you only need Simple `invoke` results — start with agent-framework.

---

## Install

```bash
npm install @agentprodready/event-bus
```

---

## Sample

```ts
import type { EventBus } from '@agentprodready/event-bus';

declare const bus: EventBus;
await bus.publish(/* PlatformEvent */);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Event transport contracts | Durable audit storage; telemetry backends; authorization |

---

## Documentation

- [Blueprint 16](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/16-event-bus.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
