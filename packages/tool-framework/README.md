# `@agentprodready/tool-framework`

**Provider-independent tool contracts** for AgentProdReady — define tools, authorize them, execute them, and emit lifecycle facts without embedding vendor SDKs.

| | |
|---|---|
| **Status** | Production contracts published (`1.1.x`) |
| **Install** | `npm install @agentprodready/tool-framework` |
| **Module** | ESM |
| **License** | MIT |

---

## Installation

```bash
npm install @agentprodready/tool-framework

# Typical agent stack
npm install @agentprodready/agent-framework @agentprodready/runtime @agentprodready/ai-provider
```

---

## Features

| Feature | Description |
|---|---|
| Tool contracts | Stable describe / execute shapes |
| Approval requirement | `none` \| `required` per tool |
| AbortSignal | Cooperative cancellation |
| Idempotency ledger | Durable cache for `idempotent` tools — exactly-once-**capable** when ledger hits |
| Lifecycle facts | requested → authorized/denied → started → completed/failed/cancelled |
| Reference tools | `reference.echo`, `reference.counter` |
| Typed errors | e.g. `TOOL_APPROVAL_REQUIRED`, `TOOL_CANCELLED` |
| Vendor isolation | No OpenAI imports |

---

## Ownership

| Concern | Owner |
|---|---|
| Tool definition & result shape | Tool Framework |
| Whether a tool may run | **Security** |
| When / retry / checkpoint | **Runtime** |
| Model tool_calls parsing | **AI Provider** |

---

## Usage (conceptual)

```ts
import type { ToolContract } from '@agentprodready/tool-framework';

// Register tools via Composition / Capability Resolution in your host.
// Reference tools (echo, counter) ship for CI and demos.

declare const echoTool: ToolContract;
```

Full host loop (Security → Cap Resolution → Runtime checkpoints):  
[Tools guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/tools.md)

Idempotent tools consult `ToolIdempotencyLedger` before adapter invoke. Non-idempotent external effects are **not** exactly-once.

Enable tools on the reference host with `TOOLS_ENABLED=true`.

---

## Error codes (selected)

| Code | Meaning |
|---|---|
| `TOOL_APPROVAL_REQUIRED` | Policy requires human/system approval |
| `TOOL_RESULT_TOO_LARGE` | Result exceeded byte bounds |
| `TOOL_UNSAFE_RECOVERY` | Unsafe to resume tool loop from checkpoint |
| `TOOL_CANCELLED` | Cancelled via signal / policy |

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/runtime`](https://www.npmjs.com/package/@agentprodready/runtime) | Tool-loop checkpoints |
| [`@agentprodready/ai-provider`](https://www.npmjs.com/package/@agentprodready/ai-provider) | Normalized tool calls from models |
| [`@agentprodready/security`](https://www.npmjs.com/package/@agentprodready/security) | Authorization |
| [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) | Agent tool declarations |

---

## Documentation

- [Tools guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/tools.md)
- [Blueprint 09](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/09-tool-framework.md)

---

## License

MIT © 2026 ameenmari
