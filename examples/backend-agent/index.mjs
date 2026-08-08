import { createAgent, reference, tool } from "@agentprodready/agent-framework";

/**
 * Canonical weekend path: createAgent → tool → memory → invoke → stream → close.
 * Zero API key (reference). Swap model: openai("gpt-4o-mini") when you have OPENAI_API_KEY.
 */
const agent = createAgent({
  model: reference(),
  instructions: "You help with short operational lookups. Keep answers brief.",
  memory: true,
  tools: [
    tool({
      name: "lookupTicket",
      description: "Look up a support ticket by id",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      execute: async ({ id }) => ({
        id,
        status: "open",
        assignee: "platform-oncall",
      }),
    }),
  ],
});

try {
  await agent.invoke("Remember that the default queue is platform-oncall.");

  const invoked = await agent.invoke('USE_TOOL:lookupTicket:{"id":"T-42"}');
  console.log("invoke:", invoked.text);
  console.log("memory:", invoked.metadata?.memory);

  process.stdout.write("stream: ");
  for await (const event of agent.stream("USE_TOOL:lookupTicket:{\"id\":\"T-99\"}")) {
    if (event.type === "text") process.stdout.write(event.text);
  }
  process.stdout.write("\n");
} catch (error) {
  console.error("agent error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await agent.close();
}
