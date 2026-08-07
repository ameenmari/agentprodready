# Blueprint 08 Implementation Contract Amendment — Tool Calling, Stream Assembly & Continuation

**Amendment ID:** `08-ai-provider-tool-calling`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Review-Gated  
**Affects:** `@agentprodready/ai-provider`, `@agentprodready/ai-provider-openai` implementation contracts (not Blueprint 08 constitutional rewrite)  
**Related:** [v0.9 Tool Calling specification](../specifications/agentprodready-v0.9-tool-calling-agent-actions-specification.md)  
**Companion:** [04-runtime-tool-loop-checkpoint-amendment.md](./04-runtime-tool-loop-checkpoint-amendment.md)

---

## 1. Problem

v0.9 requires OpenAI (and reference) tool definitions, complete streamed `NormalizedToolCall` assembly, and **provider-neutral AI continuation** after Runtime-executed tools — including after restart from durable Runtime `toolLoop` state — without host constructing vendor SDK messages.

Existing contracts already include `AiToolDefinition`, `NormalizedToolCall`, `AiExecutionRequest.tools`, stream `tool-call`, and `AiMessage.role: 'tool'` + `toolCallId`. They are **insufficient** for reconstructing an assistant tool-proposing turn: `AiMessage` has no `toolCalls` field, and no frozen continuation builder exists.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 08 / ADR-004 / ADR-011 | Provider independence; normalize at AI boundary |
| v0.9 specification (corrected) | Continuation from durable NormalizedToolCall + ToolResult |

**Blueprint amendment required?** No.  
**ADR required?** No.

---

## 3. Frozen additive contracts

### 3.1 `AiMessage.toolCalls` (public contract addition)

```ts
export interface AiMessage {
  readonly role: AiRole;
  readonly content: readonly AiContentPart[];
  readonly name?: string;
  readonly toolCallId?: string;
  /**
   * When role === 'assistant' and the turn proposed tools:
   * complete ordered NormalizedToolCall[] (ids/names/arguments).
   * Forbidden on role === 'tool'.
   */
  readonly toolCalls?: readonly NormalizedToolCall[];
}
```

Existing `tools` on `AiExecutionRequest` and `NormalizedToolCall` remain.

### 3.2 Normalized continuation result item

```ts
/**
 * Provider-neutral tool outcome for model continuation.
 * Built from durable NormalizedToolResult (or mapped non-executing terminal).
 */
export interface AiToolContinuationResult {
  readonly toolCallId: string;
  readonly content: readonly AiContentPart[];
  readonly metadata?: Readonly<Record<string, string>>;
}
```

### 3.3 Continuation input + builder (public / framework surface)

```ts
export interface AiToolContinuationInput {
  /** Messages preceding the assistant tool-proposing turn (from Runtime toolLoop.baseMessages). */
  readonly baseMessages: readonly AiMessage[];
  /** Exact ordered NormalizedToolCall[] from the proposing turn (Runtime proposedCalls). */
  readonly toolCalls: readonly NormalizedToolCall[];
  /** Optional assistant text parts from that turn; default empty. */
  readonly assistantContent?: readonly AiContentPart[];
  /** One result per toolCall id; same order as toolCalls preferred. */
  readonly results: readonly AiToolContinuationResult[];
}

/**
 * AI Provider Framework owns translation to AiMessage[].
 * Adapters map AiMessage[] → vendor wire format (OpenAI assistant tool_calls + tool messages).
 * platform-host MUST NOT build OpenAI role=tool messages.
 */
export function buildToolContinuationMessages(
  input: AiToolContinuationInput,
): readonly AiMessage[];
```

**Normative builder output order:**

1. `...baseMessages`  
2. one `assistant` message with `toolCalls` (+ optional content)  
3. one `tool` message per result: `{ role: 'tool', toolCallId, content }`  

Ids in `results` **MUST** match `toolCalls[].id`. Missing/conflicting ids → fail closed (`AI_INVALID_REQUEST`).

### 3.4 Continuation execute path

```text
Runtime durable toolLoop
  → AiToolContinuationInput
  → buildToolContinuationMessages(...)
  → AiExecutionRequest.messages = that array (+ tools if still enabled)
  → AiProviderAdapter.execute | stream
  → vendor messages inside openai package only
```

---

## 4. OpenAI adapter responsibilities

- Map `AiToolDefinition[]` → OpenAI `tools`  
- Map OpenAI tool_calls → `NormalizedToolCall[]`  
- Stream: assemble fragments by provider tool_call id → emit complete `NormalizedToolCall` only  
- Map `AiMessage` with `toolCalls` / `role: 'tool'` → OpenAI assistant/tool messages  
- Incomplete JSON arguments never cross the execution boundary  
- SDK types remain private to `@agentprodready/ai-provider-openai`  

---

## 5. Interaction with Runtime recovery

After `post-tool` restart, Runtime **MUST NOT** re-invoke the proposing AI turn. It rebuilds `AiToolContinuationInput` from durable `baseMessages`, `proposedCalls` / `toolCall`, and `result` → Amendment B builder → next AI call.

---

## 6. Non-goals

- Tool execution inside AI Provider  
- Host OpenAI message construction  
- Storing OpenAI SDK types in Runtime  

---

## 7. Status

**Implemented** after v0.9 verification (`pnpm verify`, `pnpm test:tools`, tool-calling probe).
