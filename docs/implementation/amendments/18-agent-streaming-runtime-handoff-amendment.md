# Blueprint 18 Implementation Contract Amendment — Streaming Runtime Handoff

**Amendment ID:** `18-agent-streaming-runtime-handoff`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous  
**Affects:** `@agentforge/agent-framework` implementation contracts (not Blueprint 18 constitutional rewrite)  
**Related:** [v0.8 Streaming Responses specification](../specifications/agentforge-v0.8-streaming-responses-specification.md)

---

## 1. Problem

`AgentFramework.invoke` always calls `AgentRuntimePort.accept`. Host `accept` awaits `RuntimeOrchestrator.execute`. A streaming route that also called `executeStream` would create a second Runtime execution.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 18 | Agent owns acceptance; hands off to Runtime; does not own final outcome |
| ADR-002 / 006 | Explicit ownership; Runtime owns execution |
| v0.8 specification §4.3 | Option A — additive acceptStream / invokeStream |

**Blueprint amendment required?** No.  
**ADR required?** No.

---

## 3. Frozen Contracts

```ts
export interface AgentRuntimePort {
  accept(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>>;
  acceptStream(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>>;
}

export class AgentFramework {
  invoke(request: AgentInvocationRequest): Promise<AgentInvocationAcceptance>;
  invokeStream(request: AgentInvocationRequest): Promise<AgentInvocationAcceptance>;
}
```

Normative:

- `invoke` → `accept` only (never `acceptStream`)
- `invokeStream` → `acceptStream` only (never `accept`)
- Same acceptance fact/audit shape; `finalExecutionOutcomeIncluded: false`
- No HTTP/SSE types in `@agentforge/agent-framework`
- Composition implements `acceptStream` with `executeStream` only (`execute` count = 0)

---

## 4. Status

**Implemented** after v0.8 verification (`pnpm verify`, `pnpm test:streaming`, streaming probe).
