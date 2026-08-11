# AgentProdReady v1.6 — Production Durability

**Implementation Mode:** Autonomous  
**Baseline:** v1.5.2 published  
**Promise unchanged:** TypeScript agents you can ship this week — with a clean path to production controls when you need them.  
**Maturity:** Production-oriented architecture with a young ecosystem.

## Goal

Close the four production gaps that block complex, restart-safe agent systems on the Simple / public path — without silently redefining `memory: true`, inventing a parallel Runtime, or claiming impossible exactly-once external side effects.

## Gaps addressed

| # | Gap | Product fix |
|---|---|---|
| 1 | Ephemeral-only Simple Memory | Additive `fileMemory()` / `postgresMemory()` — `memory: true` stays ephemeral |
| 2 | No durable HITL wait/resume | Amendment D + Simple `approve` / `reject` / `resume` |
| 3 | No stream replay; weak tool retry story | Durable stream event log + reconnect; durable idempotency ledger for **idempotent** tools |
| 4 | Narrow provider catalog | Named **Gemini** provider + Simple `gemini(modelId)` |

## Target shape

```ts
import {
  createAgent,
  tool,
  fileMemory,
  postgresMemory,
  gemini,
  openai,
} from "@agentprodready/agent-framework";

const agent = createAgent({
  model: gemini("gemini-2.0-flash"),
  instructions: "You are a careful assistant.",
  memory: fileMemory({ directory: "./.agent-memory" }),
  // or: memory: postgresMemory({ connectionString: process.env.DATABASE_URL! }),
  tools: [
    tool({
      name: "send_email",
      description: "Send an email",
      parameters: { type: "object", properties: { to: { type: "string" }, body: { type: "string" } }, required: ["to", "body"] },
      execute: async ({ to, body }) => ({ sent: true, to, body }),
      sideEffect: "external-side-effect",
      idempotency: "non-idempotent",
      approvalRequirement: "required",
    }),
  ],
});

try {
  console.log(await agent.invoke("Email alice@example.com that the report is ready."));
} catch (error) {
  if (error.code === "AGENT_TOOL_APPROVAL_REQUIRED") {
    await agent.approve(error.approvalId);
    console.log(await agent.resume(error.executionId));
  } else {
    throw error;
  }
}

// Stream reconnect
for await (const event of agent.stream("Hello", { resumeFrom: lastSequence })) {
  // …
}
```

## Scope

1. **Durable Simple Memory** — `fileMemory` / `postgresMemory`; never upgrade `memory: true`
2. **Amendment D** — Runtime `waiting` on approval + resume via Human Interaction completion
3. **Simple HITL surface** — `approve` / `reject` / `resume`; durable wait across process restart when durable store configured
4. **Stream replay** — persist stream events; `stream(input, { resumeFrom })` / `replayStream(executionId, afterSequence)`
5. **Tool idempotency ledger** — durable cache for `idempotent` tools (exactly-once **capable**); non-idempotent remain at-most-once / fail-closed on unsafe recovery
6. **Gemini** — `@agentprodready/ai-provider-gemini` + Simple helper + host parity
7. **Docs** — README, ROADMAP, CHANGELOG, guides, package READMEs; remove stale “not implemented” claims for these capabilities

## Non-goals / honesty bounds

- **Exactly-once external side effects for non-idempotent tools** remain a non-claim (ROADMAP out-of-scope)
- Silent upgrade of `memory: true` to durable
- Hosted SaaS / custom approval UI framework
- Bedrock / Azure OpenAI native SDKs (still Later)
- Distributed multi-region Runtime leader election

## Ownership

| Concern | Owner |
|---|---|
| Wait / resume / stream sequence persistence | Runtime |
| Approval interaction records | Human Interaction |
| Memory durability providers | Memory (+ Persistence for Postgres path) |
| Tool invoke + ledger lookup | Tool Framework |
| Provider adapters | AI Provider packages |
| Simple facade | Agent Framework |

## Package bumps (selective)

| Package | Version |
|---|---|
| `@agentprodready/agent-framework` | **1.6.0** |
| `@agentprodready/runtime` | **1.1.0** |
| `@agentprodready/memory` | **1.1.0** |
| `@agentprodready/tool-framework` | **1.1.0** |
| `@agentprodready/human-interaction` | **1.1.0** |
| `@agentprodready/ai-provider-gemini` | **1.0.0** (new) |
| `@agentprodready/persistence` / `persistence-postgres` | patch only if required for wiring |

## Success criteria

1. Durable file / Postgres Simple Memory survives process restart with the same namespace.
2. Approval-required tools pause durably; `approve` + `resume` continues without re-proposing the tool call.
3. Clients can reconnect to a stream and receive events after a given sequence.
4. Idempotent tools with the same idempotency key return the ledgered result without a second side effect.
5. `gemini(modelId)` works with `GEMINI_API_KEY`.
6. Public docs no longer list these four items as hard blockers for the 1.6 line.
