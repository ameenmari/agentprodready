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
  const plain = await agent.invoke("Hello");
  console.log("--- plain invoke ---");
  console.log(plain.text);
  console.log(JSON.stringify(plain.metadata, null, 2));

  const withTool = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
  console.log("--- tool invoke ---");
  console.log(withTool.text);
  console.log(JSON.stringify(withTool.metadata, null, 2));
} finally {
  await agent.close();
}
