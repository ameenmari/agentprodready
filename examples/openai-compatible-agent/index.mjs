import { createAgent, openaiCompatible } from "@agentprodready/agent-framework";

/**
 * OpenAI Chat Completions–compatible endpoint demo.
 *
 * Required:
 *   OPENAI_COMPATIBLE_BASE_URL
 *   OPENAI_COMPATIBLE_MODEL
 *
 * Auth (default api-key):
 *   OPENAI_COMPATIBLE_API_KEY
 *   — or set OPENAI_COMPATIBLE_AUTH=none for local no-auth endpoints
 *
 * OPENAI_API_KEY is never used for this path.
 */

const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();
const model = process.env.OPENAI_COMPATIBLE_MODEL?.trim();
const authRaw = (process.env.OPENAI_COMPATIBLE_AUTH ?? "api-key").trim().toLowerCase();
const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim();

if (!baseUrl || !model) {
  console.error(
    "Set OPENAI_COMPATIBLE_BASE_URL and OPENAI_COMPATIBLE_MODEL.\n" +
      "For api-key auth also set OPENAI_COMPATIBLE_API_KEY.\n" +
      "For local no-auth endpoints: OPENAI_COMPATIBLE_AUTH=none\n" +
      "OPENAI_API_KEY is never forwarded to compatible baseUrls.",
  );
  process.exit(1);
}

if (authRaw !== "api-key" && authRaw !== "none") {
  console.error('OPENAI_COMPATIBLE_AUTH must be "api-key" or "none".');
  process.exit(1);
}

if (authRaw === "api-key" && !apiKey) {
  console.error("OPENAI_COMPATIBLE_API_KEY is required when auth is api-key.");
  process.exit(1);
}

const agent = createAgent({
  model: openaiCompatible({
    baseUrl,
    model,
    auth: authRaw,
    ...(authRaw === "api-key" ? { apiKey } : {}),
  }),
  instructions: "You are a helpful assistant. Keep answers short.",
});

try {
  const result = await agent.invoke("Say hello in one short sentence.");
  console.log(result.text);
} finally {
  await agent.close();
}
