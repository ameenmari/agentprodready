# Simple Diagnostics & Debugging

How to inspect a Simple Agent turn without opening Runtime internals.

Requires `@agentprodready/agent-framework@^1.5.0`.

## Invoke metadata

Every successful `agent.invoke(...)` includes `result.metadata`:

| Field | Meaning |
|---|---|
| `mode` | Always `"simple"` |
| `provider` | Configured model provider (`reference`, `openai`, `anthropic`, `openai-compatible`) |
| `modelId` | Configured model id |
| `durationMs` | Wall-clock time for that invoke |
| `tools.configured` | Tools registered on `createAgent` |
| `tools.invoked` / `succeeded` / `failed` | Tool-loop counts for the turn |
| `memory?` | Present when `memory` is configured — wiring proof only |

Tool failures abort the turn as `SimpleAgentError` (no partial result). Successful results therefore have `tools.failed === 0`.

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are helpful.",
});

const result = await agent.invoke("Hello");
console.log(result.metadata);
await agent.close();
```

Zero-key demo: [`examples/diagnostics-agent`](../../examples/diagnostics-agent).

## Stream events (not the same shape)

`agent.stream(...)` emits lifecycle events: `start` | `text` | `tool_call` | `tool_result` | `usage` | `complete`.

Use stream events for live progress; use **invoke metadata** for a structured post-turn summary. Stream events do not dump tool arguments or results by default.

## SimpleAgentError

Catch `SimpleAgentError` and branch on `error.code` (and optional `error.diagnosticId`):

| Code | Typical cause |
|---|---|
| `AGENT_INVALID_CONFIG` / `AGENT_INVALID_MODEL` | Bad `createAgent` options |
| `AGENT_MISSING_OPENAI_KEY` / `AGENT_MISSING_OPENAI_PACKAGE` | OpenAI path incomplete |
| `AGENT_MISSING_ANTHROPIC_KEY` / `AGENT_MISSING_ANTHROPIC_PACKAGE` | Anthropic path incomplete |
| `AGENT_TOOL_AUTHORIZATION` / `AGENT_TOOL_APPROVAL_REQUIRED` / `AGENT_TOOL_REJECTED` | Tool loop denied / blocked / limited |
| `AGENT_PROVIDER_UNAVAILABLE` / `AGENT_TIMEOUT` | Provider / timing |
| `AGENT_CLOSED` / `AGENT_INVOKE_FAILED` / `AGENT_STREAM_FAILED` | Lifecycle / generic failure |

```js
import { SimpleAgentError } from "@agentprodready/agent-framework";

try {
  await agent.invoke(input);
} catch (error) {
  if (error instanceof SimpleAgentError) {
    console.error(error.code, error.message, error.diagnosticId);
  }
  throw error;
}
```

## What this is not

- Not `@agentprodready/observability` / production telemetry
- Not a durable audit trail
- Not a guarantee of stable internal Runtime field shapes beyond documented `metadata`

For production controls, see [Embed agent deployment](./embed-agent-deployment.md) and [Production Deployment](./production-deployment.md).
