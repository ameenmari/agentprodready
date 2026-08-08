import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant. Keep answers short.",
});

try {
  const result = await agent.invoke("Hello");
  console.log(result.text);
} finally {
  await agent.close();
}
