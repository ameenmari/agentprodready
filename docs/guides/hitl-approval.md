# HITL Approval (Simple)

Wait for human approval on sensitive tools, then resume execution — including across process restart when a durable store is configured.

Production-oriented architecture with a young ecosystem.

## Flow

```text
invoke / stream
  → tool requires approval
  → execution parks (awaiting-approval checkpoint)
  → AGENT_TOOL_APPROVAL_REQUIRED (approvalId + executionId)
  → operator approves or rejects
  → agent.resume(executionId) continues or fails
```

## Example

```js
import { createAgent, reference, tool, fileMemory } from "@agentprodready/agent-framework";
import { SimpleAgentError } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are helpful.",
  memory: fileMemory({ directory: "./.agent-data" }), // optional: durable HITL + checkpoints
  tools: [
    tool({
      name: "sendEmail",
      description: "Send an email",
      parameters: {
        type: "object",
        properties: { to: { type: "string" }, body: { type: "string" } },
        required: ["to", "body"],
      },
      execute: async ({ to, body }) => ({ sent: true, to }),
      approvalRequirement: "required",
    }),
  ],
});

try {
  await agent.invoke('USE_TOOL:sendEmail:{"to":"a@example.com","body":"hi"}');
} catch (error) {
  if (error instanceof SimpleAgentError && error.code === "AGENT_TOOL_APPROVAL_REQUIRED") {
    await agent.approve(error.approvalId);
    const result = await agent.resume(error.executionId);
    console.log(result.text);
  } else {
    throw error;
  }
}

await agent.close();
```

## API

| Method | Purpose |
|---|---|
| `approve(approvalId)` | Grant pending approval |
| `reject(approvalId, reason?)` | Deny — resume fails with rejection |
| `resume(executionId)` | Continue parked execution after approve |

Error `AGENT_TOOL_APPROVAL_REQUIRED` includes `approvalId` and `executionId`.

## Durability

- Default embedded store is in-memory (lost on exit).
- With `fileMemory({ directory })`, HITL interactions and checkpoints can persist under the same directory for restart-safe waits.
- This is **not** a hosted approval UI — wire your own operator channel in production.

## Related

- [Simple Tools](./simple-tools.md)
- [Security](./security.md)
- [Blueprint 20 Human Interaction](../blueprints/20-human-interaction-and-approval.md)
