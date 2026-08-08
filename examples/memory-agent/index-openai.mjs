import { createAgent, openai } from "@agentprodready/agent-framework";

/**
 * Path B — natural-language recall with a reasoning-capable model.
 *
 * Requires OPENAI_API_KEY.
 * reference() verifies wiring but is not intended to demonstrate semantic conversation recall.
 */

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is not set.\n" +
      "bash: export OPENAI_API_KEY=\"...\"\n" +
      "PowerShell: $env:OPENAI_API_KEY=\"...\"\n" +
      "The library does not load .env files.\n" +
      "For a zero-key wiring demo, run: npm run start:reference",
  );
  process.exit(1);
}

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions:
    "Answer using remembered user facts when present. Keep answers to one short sentence.",
  memory: true,
});

try {
  await agent.invoke("My favorite color is blue.");
  const result = await agent.invoke("What color did I mention?");
  console.log(result.text);
  if (!/blue/i.test(result.text)) {
    console.warn(
      "WARN — model response did not clearly mention blue; check memory wiring and model output.",
    );
    process.exitCode = 2;
  }
} finally {
  await agent.close();
}
