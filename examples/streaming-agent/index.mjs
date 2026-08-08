import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

for await (const event of agent.stream("Hello")) {
  if (event.type === "text") {
    process.stdout.write(event.text);
  }
}

process.stdout.write("\n");
await agent.close();
