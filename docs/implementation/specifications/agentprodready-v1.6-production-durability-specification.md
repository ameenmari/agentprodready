# AgentProdReady v1.6 — Production Durability Implementation Specification

**Document Type:** Product Implementation Specification  
**Product:** AgentProdReady v1.6 Production Durability  
**Specification Version:** 1.0  
**Status:** Approved (Autonomous)  
**Implementation Mode:** Autonomous  
**Related plan:** [plan](../plans/agentprodready-v1.6-production-durability-plan.md)  
**Amendment D:** [04-runtime-tool-approval-wait-amendment.md](../amendments/04-runtime-tool-approval-wait-amendment.md)

---

## 1. Simple Memory

```ts
export type SimpleMemory =
  | { readonly __simpleMemory: true; readonly kind: 'in-memory'; readonly namespace: string }
  | {
      readonly __simpleMemory: true;
      readonly kind: 'file';
      readonly namespace: string;
      readonly directory: string;
    }
  | {
      readonly __simpleMemory: true;
      readonly kind: 'postgres';
      readonly namespace: string;
      readonly connectionString: string;
    };

export function inMemory(options?: { namespace?: string }): SimpleMemory;
export function fileMemory(options: { directory: string; namespace?: string }): SimpleMemory;
export function postgresMemory(options: {
  connectionString: string;
  namespace?: string;
}): SimpleMemory;
```

- `memory: true` → `inMemory()` only.
- File provider: `@agentprodready/memory` `FileBackedMemoryProvider` — JSON files under `directory/namespace/`.
- Postgres: dynamic import `@agentprodready/persistence-postgres` + `PersistenceBackedMemoryProvider`.
- Durable kinds use retention `category: 'operational'` (not `session-only`) and prompt label “Durable agent memory”.

---

## 2. Simple HITL

```ts
export interface Agent {
  invoke(input: string): Promise<AgentResult>;
  stream(input: string, options?: StreamOptions): AsyncIterable<AgentStreamEvent>;
  replayStream(executionId: string, afterSequence?: number): AsyncIterable<AgentStreamEvent>;
  approve(approvalId: string): Promise<void>;
  reject(approvalId: string, reason?: string): Promise<void>;
  resume(executionId: string): Promise<AgentResult>;
  close(): Promise<void>;
}

export interface StreamOptions {
  readonly resumeFrom?: number; // exclusive lower bound; replay then live-tail if still open
}

// SimpleAgentError extras when code === AGENT_TOOL_APPROVAL_REQUIRED
readonly approvalId?: string;
readonly executionId?: string;
```

Embedded HITL uses HumanInteractionFramework + InMemoryInteractionStore by default. File durable run-store (same directory as `fileMemory` when kind=file, else optional `hitlDirectory`) persists interactions for restart.

Approval participant = embedded operator principal (same as Simple security principal for local DX).

---

## 3. Runtime tool-loop stage

`ToolLoopCallStage` adds `'awaiting-approval'`. Optional `approvalId` on call checkpoint.

Coordinator / embedded loop:

1. Authorize → if required approval → persist awaiting-approval → issue interaction → throw `TOOL_APPROVAL_REQUIRED` with ids.
2. On resume after approve → stage becomes `pre-tool` then invoke → `post-tool`.

---

## 4. Stream event log

```ts
export interface StreamEventRecord {
  readonly executionId: string;
  readonly sequence: number;
  readonly event: RuntimeStreamEvent; // JSON-serializable
  readonly occurredAt: string;
}

export interface StreamEventLog {
  append(record: StreamEventRecord): Promise<void>;
  list(executionId: string, afterSequence?: number): Promise<readonly StreamEventRecord[]>;
}
```

Runtime `stream()` appends each yielded event. Simple `stream(input, { resumeFrom })` yields log events with `sequence > resumeFrom` then continues live if not terminal. `replayStream` is log-only.

---

## 5. Tool idempotency ledger

```ts
export interface ToolIdempotencyLedger {
  get(key: string): Promise<NormalizedToolResult | undefined>;
  put(key: string, result: NormalizedToolResult): Promise<void>;
}

export class InMemoryToolIdempotencyLedger implements ToolIdempotencyLedger;
export class FileToolIdempotencyLedger implements ToolIdempotencyLedger; // optional file path
```

`ToolInvocationCoordinator.invoke`: if contract.idempotency === 'idempotent' and key present and ledger hit → return cached result without adapter call. On success put. Non-idempotent never ledger-write as success cache for “EO claim”; only idempotent.

Public docs: **exactly-once-capable for idempotent tools with a durable ledger**; external non-idempotent effects remain not exactly-once.

---

## 6. Gemini

Package `@agentprodready/ai-provider-gemini`:

- Capability id: `gemini-ai`
- Env: `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `GEMINI_BASE_URL`
- Adapter uses `@google/generative-ai` or fetch to Generative Language API
- Chat + tools + streaming; embeddings deferred

Simple: `gemini(modelId)` → provider `'gemini'`.

---

## 7. Error codes

| Code | When |
|---|---|
| `AGENT_TOOL_APPROVAL_REQUIRED` | Wait (now includes approvalId/executionId) |
| `AGENT_APPROVAL_NOT_FOUND` | approve/reject unknown id |
| `AGENT_RESUME_FAILED` | resume unsafe / missing checkpoint |
| `TOOL_REJECTED` | Human rejected |

---

## 8. Implementation decisions (Autonomous)

| Decision | Choice |
|---|---|
| File memory format | One JSON object per memory id under `directory/namespace/` |
| Default HITL store | In-memory; file-backed when `fileMemory` used or `createAgent` future option |
| Stream log default | In-memory per embedded platform; file when fileMemory directory present (`directory/.streams`) |
| Ledger default | In-memory; file under `directory/.tool-ledger` when fileMemory |
| Gemini SDK | `@google/generative-ai` with thin translate layer |
| Version | agent-framework 1.6.0; selective minors listed in product doc |

---

## 9. Deferred

- Bedrock / Azure native
- Multi-tenant hosted approval channels
- Claiming EO for non-idempotent external tools
- Distributed Runtime
