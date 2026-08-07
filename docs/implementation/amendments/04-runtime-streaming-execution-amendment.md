# Blueprint 04 Implementation Contract Amendment — Streaming Execution Delivery

**Amendment ID:** `04-runtime-streaming-execution`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous  
**Affects:** `@agentforge/runtime` implementation contracts (not Blueprint 04 constitutional rewrite)  
**Related:** [v0.8 Streaming Responses specification](../specifications/agentforge-v0.8-streaming-responses-specification.md)

---

## 1. Problem

Runtime exposes only `execute → Promise<RuntimeResult>`. Streaming delivery requires an additive `executeStream` and optional capability `stream` without a new `ExecutionStage` or terminal state.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 04 / ADR-006 | Runtime owns operational execution, cancel, timeout |
| v0.8 specification §4.2 | Frozen executeStream + CapabilityStreamEvent |

**Blueprint amendment required?** No.  
**ADR required?** No.

---

## 3. Frozen Contracts

```ts
export type RuntimeStreamUsage = Readonly<{
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}>;

export type RuntimeFailedResult = Readonly<{
  executionId: string;
  state: 'failed';
  error: Readonly<{ code: string; message: string }>;
  attempts: number;
  history: readonly StateTransition[];
}>;

export type RuntimeCancelledResult = Readonly<{
  executionId: string;
  state: 'cancelled';
  error: Readonly<{ code: string; message: string }>;
  attempts: number;
  history: readonly StateTransition[];
}>;

export type RuntimeStreamEvent<T = unknown> =
  | Readonly<{
      type: 'delta';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      payload: Readonly<
        | { kind: 'text'; text: string }
        | { kind: 'usage'; usage: RuntimeStreamUsage }
      >;
    }>
  | Readonly<{
      type: 'completed';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeResult<T>;
      terminal: true;
    }>
  | Readonly<{
      type: 'failed';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeFailedResult;
      terminal: true;
    }>
  | Readonly<{
      type: 'cancelled';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeCancelledResult;
      terminal: true;
    }>;

export interface CapabilityStreamEvent {
  // delta | usage | final — see specification §4.2
}

export interface CapabilityInvocationPort {
  invoke(work: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>;
  stream?(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
  ): AsyncIterable<CapabilityStreamEvent>;
}

export interface RuntimeOrchestrator {
  execute(request: RuntimeRequest): Promise<RuntimeResult>;
  executeStream(request: RuntimeRequest): AsyncIterable<RuntimeStreamEvent>;
}
```

Rules: no `ExecutionStage = 'streaming'`; terminal states remain completed|failed|cancelled; exactly one terminal stream event; Runtime owns Runtime sequence; checkpoint final capability result only (not each chunk).

---

## 4. Status

**Implemented** after v0.8 verification (`pnpm verify`, `pnpm test:streaming`, streaming probe).
