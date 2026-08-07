# Tool Calling & Agent Actions (v0.9)

The model may **propose** a tool action. AgentForge alone decides whether it is allowed, how it executes, whether it may be retried, how side effects are classified, and how outcomes are recorded.

```text
AI → NormalizedToolCall
  → validate → Security authorize → approval check
  → Capability Resolution → Composition ToolAdapter
  → Runtime pre-tool checkpoint
  → ToolInvocationCoordinator.invoke
  → post-tool checkpoint
  → AI continuation (buildToolContinuationMessages)
```

## Enablement

Default: tools disabled (`TOOLS_ENABLED=false`). Existing chat/streaming behavior unchanged.

```bash
TOOLS_ENABLED=true
TOOL_MAX_CALLS_PER_INVOCATION=8
TOOL_MAX_TURNS=4
TOOL_MAX_ARGUMENT_BYTES=16384
TOOL_MAX_RESULT_BYTES=65536
```

## Ownership

| Concern | Owner |
|---|---|
| Descriptors, validation, normalize | `@agentforge/tool-framework` (Blueprint 09) |
| Authorization | Security |
| Selection / instantiation | Capability Resolution / Composition |
| Loop, timeout, cancel, retry, recovery, checkpoints | Runtime |
| Vendor tool schema / stream assembly / continuation messages | AI Provider (+ OpenAI package) |
| Safe SSE framing | platform-host |

## Side effects & retry

Reuse Tool Framework taxonomy:

- `read-only` | `mutating` | `external-side-effect`
- `idempotent` | `non-idempotent`

Idempotency key: `executionId:toolCall.id` (stable across retry/restart).

| Class | After durable `pre-tool` crash |
|---|---|
| read-only / idempotent | May retry with same identity |
| mutating/external + idempotent | Retry only with same key |
| non-idempotent | `TOOL_UNSAFE_RECOVERY` — no silent re-exec |

**Exactly-once external effects are not claimed.**

## Checkpoints

1. **Turn envelope** (`baseMessages`, `proposedCalls`) — AI proposed; not authorized/started  
2. **`pre-tool`** — after validate + Security allow + approval permit + Cap/Composition resolve; invoke **may** have occurred  
3. **`post-tool`** — durable `NormalizedToolResult`; never re-execute; rebuild AI continuation

Denied / approval-required / validation failures: **no** `pre-tool`, adapter count = 0.

## Approval

`approvalRequirement: 'required'` → fail closed `TOOL_APPROVAL_REQUIRED` (no durable wait in v0.9 core).

## SSE (when streaming)

Safe events only (no arguments/results by default):

- `tool_call` `{ sequence, toolCallId, toolId, status: "executing" }` — only after durable pre-tool  
- `tool_result` `{ sequence, toolCallId, toolId, status, errorCode? }`

## Reference tools (CI)

| Tool | Behavior |
|---|---|
| `reference.echo` | read-only; `{ message }` → echo |
| `reference.counter` | mutating idempotent; stable key → same value |

Trigger with reference AI:

- `USE_TOOL_ECHO: hello`
- `USE_TOOL_COUNTER`

## Probe

```bash
pnpm build
node scripts/tool-calling-probe.mjs
pnpm test:tools
```

## OpenAI

Native tool definitions and streamed tool-call assembly live in `@agentforge/ai-provider-openai`. Host never builds OpenAI `role=tool` messages — use `buildToolContinuationMessages`.
