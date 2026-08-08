import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

try {
  const result = await agent.invoke("Hello");
  console.log(result.text);
} finally {
  await agent.close();
}
