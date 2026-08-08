# AgentProdReady v1.5 — Simple Diagnostics & Debugging

**Implementation Mode:** Autonomous  
**Baseline:** v1.4.0 Anthropic published  
**Promise unchanged:** TypeScript agents you can ship this week — with a clean path to production controls when you need them.  
**Maturity:** Production-oriented architecture with a young ecosystem.

## Goal

Make Simple Agent invoke results **debuggable without Runtime spelunking**: richer `result.metadata`, a short guide, and a zero-key example — without wiring `@agentprodready/observability` into the Simple path or redesigning Runtime.

## Target shape

```js
const result = await agent.invoke("Hello");
console.log(result.metadata);
// {
//   mode: "simple",
//   provider: "reference",
//   modelId: "reference",
//   durationMs: 12,
//   tools: { configured: 0, invoked: 0, succeeded: 0, failed: 0 },
//   // memory?: { enabled, retrievedItemCount, injected, injectedPreview }
// }
```

Stream remains event-oriented (`tool_call` / `tool_result` / `usage`); structured diagnostics live on **invoke** results.

## Scope

- Extend `AgentResultMetadata` on `@agentprodready/agent-framework@1.5.0`
- Tool summary from the embedded tool loop (counts only; no payload dumps)
- Guide `docs/guides/simple-diagnostics.md` + `examples/diagnostics-agent`
- Clearer SimpleAgentError / stream notes in Simple docs
- Scaffold pin `create-agentprodready@0.1.2` → `^1.5.0`

## Non-goals

- Wiring Observability package into Simple
- Runtime / Security ownership changes
- Secret-bearing CI or live provider keys
- Durable memory / HITL
- K8s / production deploy overhaul (next roadmap item)
