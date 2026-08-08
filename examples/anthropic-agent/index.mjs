import { createAgent, anthropic } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514"),
  instructions: "You are a helpful assistant. Keep answers short.",
});

try {
  const result = await agent.invoke("Hello");
  console.log(result.text);
} finally {
  await agent.close();
}
