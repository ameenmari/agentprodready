# Blueprint 08 Implementation Contract Amendment — Streaming Signal & Terminal Events

**Amendment ID:** `08-ai-provider-streaming-signal-terminal`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous  
**Affects:** `@agentforge/ai-provider` implementation contracts (not Blueprint 08 constitutional rewrite)  
**Related:** [v0.8 Streaming Responses specification](../specifications/agentforge-v0.8-streaming-responses-specification.md)

---

## 1. Problem

v0.8 requires AbortSignal propagation into AI streams and explicit normalized terminal `failed` / `cancelled` events with a single termination mechanism per stream.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 08 | Stream normalization already owned by AI Provider |
| ADR-004 / 011 | Provider independence; normalize at boundary |
| v0.8 specification §8.1 / §8.1.1 | Frozen shapes and single-terminal rule |

**Blueprint amendment required?** No.  
**ADR required?** No.

---

## 3. Frozen Contracts

```ts
export interface AiExecutionRequest {
  // ...existing fields...
  readonly signal?: AbortSignal;
}

export type NormalizedAiStreamEvent =
  | { readonly type: 'content'; readonly sequence: number; readonly part: AiContentPart }
  | { readonly type: 'tool-call'; readonly sequence: number; readonly call: NormalizedToolCall }
  | { readonly type: 'usage'; readonly sequence: number; readonly usage: AiUsage }
  | { readonly type: 'completed'; readonly sequence: number; readonly finishReason: AiFinishReason; readonly diagnosticId: string }
  | { readonly type: 'failed'; readonly sequence: number; readonly code: AiErrorCode; readonly message: string; readonly diagnosticId: string; readonly retryable: boolean }
  | { readonly type: 'cancelled'; readonly sequence: number; readonly diagnosticId: string };

export type AiFact = {
  readonly type:
    | 'ai.completed'
    | 'ai.failed'
    | 'ai.stream.completed'
    | 'ai.stream.failed'
    | 'ai.stream.cancelled';
  readonly requestId: string;
  readonly executionId: string;
  readonly diagnosticId: string;
};
```

### Single-terminal rule

Exactly one of: emit `completed` | `failed` | `cancelled` then end iterable; **or** throw once before any terminal. Never both emit and throw the same failure/cancel. No events after terminal. Contiguous sequences from 0.

---

## 4. Status

**Implemented** after v0.8 verification (`pnpm verify`, `pnpm test:streaming`, streaming probe).
