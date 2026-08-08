import { createAgent, openai } from "@agentprodready/agent-framework";

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is not set.\n" +
      "bash: export OPENAI_API_KEY=\"...\"\n" +
      "PowerShell: $env:OPENAI_API_KEY=\"...\"\n" +
      "The library does not load .env files.",
  );
  process.exit(1);
}

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant. Keep answers short.",
});

try {
  const result = await agent.invoke("Say hello in one short sentence.");
  console.log(result.text);
} finally {
  await agent.close();
}
