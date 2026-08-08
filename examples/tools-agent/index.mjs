import { createAgent, reference, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  tools: [
    tool({
      name: "getWeather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => ({ city, forecast: "sunny" }),
    }),
  ],
});

try {
  // Deterministic reference demo path (OpenAI chooses tools from schemas instead).
  const result = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
  console.log(result.text);
} finally {
  await agent.close();
}
