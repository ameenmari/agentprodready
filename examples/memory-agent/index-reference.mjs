import { createAgent, reference } from "@agentprodready/agent-framework";

/**
 * Path A — zero-key memory wiring demo.
 *
 * reference() is deterministic and intended for wiring/tests.
 * It does not perform natural-language reasoning over recalled memory.
 * Expect result.text on turn 2 to echo the user question — that is correct.
 * Proof of memory is in result.metadata.memory (capture → retrieve → inject).
 */

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  memory: true,
});

try {
  await agent.invoke("My favorite color is blue.");
  const result = await agent.invoke("What color did I mention?");

  console.log("turn2 text (reference echoes user; not NL recall):");
  console.log(result.text);

  const memory = result.metadata?.memory;
  console.log("memory diagnostics:");
  console.log(JSON.stringify(memory, null, 2));

  if (memory?.enabled !== true) {
    throw new Error("Expected metadata.memory.enabled === true");
  }
  if (!(memory.retrievedItemCount >= 1)) {
    throw new Error("Expected retrievedItemCount >= 1 after turn 1 capture");
  }
  if (memory.injected !== true) {
    throw new Error("Expected injected === true when memory block is present");
  }
  if (!/blue/i.test(memory.injectedPreview)) {
    throw new Error("Expected injectedPreview to include the captured fact (blue)");
  }

  console.log("PASS — memory capture/retrieve/inject verified without claiming NL recall");
} finally {
  await agent.close();
}
