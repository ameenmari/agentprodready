import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
if (!baseUrl) {
  throw new Error("Set OPENAI_COMPATIBLE_BASE_URL (Chat Completions–compatible /v1 endpoint).");
}

const agent = createAgent({
  model: openaiCompatible({
    baseUrl,
    model: process.env.OPENAI_COMPATIBLE_MODEL ?? "llama-3.1-70b",
    auth: process.env.OPENAI_COMPATIBLE_AUTH === "none" ? "none" : "api-key",
  }),
  instructions: "You are a helpful assistant. Keep answers short.",
});

try {
  const result = await agent.invoke("Hello");
  console.log(result.text);
} finally {
  await agent.close();
}
