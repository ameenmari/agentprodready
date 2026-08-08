# Simple Agent API

Short reference for the v1.1 embedded facade.

Import from `@agentprodready/agent-framework`.

## createAgent

```js
import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  name: "demo", // optional
  description: "Demo agent", // optional
});
```

## reference

```js
import { reference } from "@agentprodready/agent-framework";

const model = reference();
// { provider: "reference", modelId: "reference" }
```

No API key. No network.

## openai

```js
import { openai } from "@agentprodready/agent-framework";

const model = openai("gpt-4o-mini");
// { provider: "openai", modelId: "gpt-4o-mini" }
```

Requires optional peer `@agentprodready/ai-provider-openai` and `OPENAI_API_KEY`.

## Agent.invoke

```js
const result = await agent.invoke("Hello");
console.log(result.text);
```

## Agent.stream

```js
for await (const event of agent.stream("Hello")) {
  if (event.type === "text") process.stdout.write(event.text);
}
```

Events: `start` | `text` | `usage` | `complete`.

## Agent.close

```js
await agent.close();
```

## AgentResult

```ts
{
  text: string;
  output?: unknown;
  executionId: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  metadata?: Record<string, unknown>;
  raw?: unknown;
}
```

## AgentStreamEvent

```ts
| { type: "start"; executionId: string }
| { type: "text"; text: string }
| { type: "usage"; usage: AgentUsage }
| { type: "complete"; executionId: string }
```

## SimpleAgentError

```js
import { SimpleAgentError } from "@agentprodready/agent-framework";

try {
  await agent.invoke("Hello");
} catch (error) {
  if (error instanceof SimpleAgentError) {
    console.error(error.code, error.message);
  }
}
```

Common codes: `AGENT_INVALID_CONFIG`, `AGENT_INVALID_MODEL`, `AGENT_MISSING_OPENAI_KEY`, `AGENT_MISSING_OPENAI_PACKAGE`, `AGENT_CLOSED`, `AGENT_INVOKE_FAILED`, `AGENT_STREAM_FAILED`.
