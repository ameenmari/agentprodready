# AgentForge v0.8 Streaming Responses — Implementation Specification

**Document Type:** Product Implementation Specification  
**Product Version:** 0.8.0  
**Specification Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07  
**Product:** [agentforge-v0.8-streaming-responses.md](../../product/agentforge-v0.8-streaming-responses.md)  
**Plan:** [agentforge-v0.8-streaming-responses-plan.md](../plans/agentforge-v0.8-streaming-responses-plan.md)

---

# 1. Authority and Mode

```text
Implementation Mode: Review-Gated
```

This specification records exact design decisions. It does **not** authorize production code until approved.

Architectural authority order: Constitution → ADRs → Blueprints 04/08/13/15/16/17/18/22/23/26 → dependency graph → this specification → conforming code.

---

# 2. Premises

1. Blueprints 01–31 are implemented; v0.1–v0.7 productization is shipped.
2. `@agentforge/ai-provider` already exposes chat `execute` + `stream` with `NormalizedAiStreamEvent`.
3. Reference AI implements `stream`; OpenAI adapter throws “not supported in v0.2”.
4. Runtime owns timeout/cancellation/recovery via `execute → Promise<RuntimeResult>` and AbortSignal; **no** stream delivery API exists.
5. `CapabilityInvocationPort.invoke` is Promise-only.
6. `AgentFramework.invoke` always calls `AgentRuntimePort.accept`; host `LocalReferenceRuntimePort.accept` awaits `RuntimeOrchestrator.execute` (execution starts inside accept).
7. platform-host uses raw `node:http`; does not use `@agentforge/api-framework` for invoke.
8. API Framework already defines transport-independent `StreamFrame` and `TransportKind` including `'sse'`, but host does not consume it today.
9. Default CI remains secret-free and deterministic.
10. v0.8 is not tool calling, WebSockets, Runtime redesign, or stream replay.

---

# 3. Contract Inventory (Exact)

## 3.1 AI streaming

| Item | Location | Status |
|---|---|---|
| `StreamingRequirements { enabled, includeUsage }` | `packages/ai-provider/src/contracts/ai.ts` | Exists |
| `AiExecutionRequest.streaming?` | same | Exists |
| `AiProviderAdapter.stream(request): AsyncIterable<NormalizedAiStreamEvent>` | same | Exists |
| `NormalizedAiStreamEvent` = `content` \| `tool-call` \| `usage` \| `completed` | same | Exists |
| Sequence number on each event | same | Exists |
| `AiProviderFramework.stream` (contiguous sequence check, `ai.stream.completed`) | `ai-provider-framework.ts` | Exists |
| AbortSignal on `AiExecutionRequest` | — | **Absent** |
| Stream events `failed` / `cancelled` / `started` | — | **Absent** (failures throw `NormalizedAiError`) |
| Reference adapter stream | `reference-adapter.ts` | Exists (echoes full message parts as single content events) |
| OpenAI adapter stream | `openai-ai-provider-adapter.ts` | Stub throw |
| Embedding stream | — | N/A (out of scope) |

## 3.2 Runtime streaming

| Item | Status |
|---|---|
| `RuntimeOrchestrator.execute → Promise<RuntimeResult>` | Exists |
| AbortSignal on request / capability invoke | Exists |
| Timeout ownership | Exists |
| Terminal states `completed` \| `failed` \| `cancelled` | Exists |
| Checkpoints pre-invoke / post-invoke / terminal | Exists |
| `executeStream` or equivalent delivery mode | **Absent** |
| Per-chunk checkpoint | Absent (correct for v0.8) |

## 3.3 Agent streaming / Runtime handoff

| Item | Status |
|---|---|
| `AgentFramework.invoke → AgentRuntimePort.accept → acceptance` | Exists |
| `AgentInvocationAcceptance.finalExecutionOutcomeIncluded: false` | Exists (contractual; host still awaits execute inside `accept`) |
| Host `LocalReferenceRuntimePort.accept` awaits `runtime.execute` | **Exists — execution starts here today** |
| `AgentFramework.invokeStream` / `AgentRuntimePort.acceptStream` | **Absent — third amendment required** |
| Host path that calls `executeStream` after `invoke` | **Forbidden** (duplicate execution) |

## 3.4 API / HTTP streaming

| Item | Status |
|---|---|
| API Framework `StreamFrame` + `ApiStream` | Exists (unused by host) |
| TransportKind `'sse'` | Exists |
| Host SSE framing | **Absent** |
| `POST .../invoke` JSON | Exists |
| Stream endpoint | **Absent** |
| Backpressure / drain policy | **Absent** |
| Disconnect → Runtime cancel | **Absent** |

## 3.5 Adjacent

| Item | Status |
|---|---|
| Cancellation | Runtime-owned; signal to capability |
| Backpressure | Not designed |
| Partial result semantics | AI stream deltas exist; no Runtime partial |
| Stream completion | AI `completed` event + framework fact |
| Usage / final metadata | AI `usage` + `NormalizedAiResult` (execute path) |
| Event Bus token flood | Not present (good) |
| Audit per chunk | Not present (good) |

---

# 4. Contract Sufficiency Gate

## 4.1 Provider → normalized stream — mostly sufficient

`AiProviderAdapter.stream` + `NormalizedAiStreamEvent` can carry incremental content/usage/completion without inventing a parallel chat API.

**Gaps (smallest AI amendment required):**

1. **AbortSignal propagation** into the AI stream path (Runtime already has signal; AI request does not).
2. **Terminal fail/cancel as stream events** plus **single failure-termination mechanism** (§8.1.1) — emit terminal then end iterable; do not also throw the same normalized failure.
3. OpenAI implementation (adapter work, not new public chat API).

## 4.2 Normalized stream → Runtime — **insufficient (STOP)**

Runtime only returns a final `Promise<RuntimeResult>`. Composition cannot honestly claim “Runtime owns stream delivery / interruption / backpressure policy” while pulling AI streams beside Runtime.

### Smallest Runtime amendment (required)

Create before Autonomous code:

`docs/implementation/amendments/04-runtime-streaming-execution-amendment.md`

**Affects:** `@agentforge/runtime` implementation contracts (not Blueprint 04 constitutional rewrite).  
**Blueprint amendment required?** No — streaming is a delivery mode of existing execution lifecycle.  
**ADR required?** No.

Frozen intent:

```ts
// Additive — keep execute()
export type RuntimeStreamEvent =
  | Readonly<{
      type: 'delta';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      payload: Readonly<{ kind: 'text'; text: string } | { kind: 'usage'; usage: AiUsageLike }>;
    }>
  | Readonly<{
      type: 'completed';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeResult; // terminal completed
      terminal: true;
    }>
  | Readonly<{
      type: 'failed';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeResult; // terminal failed
      terminal: true;
    }>
  | Readonly<{
      type: 'cancelled';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeResult; // terminal cancelled
      terminal: true;
    }>;

interface RuntimeOrchestrator {
  execute(request: RuntimeRequest): Promise<RuntimeResult>;
  executeStream(request: RuntimeRequest): AsyncIterable<RuntimeStreamEvent>;
}
```

Rules:

- No new `ExecutionStage` named `streaming`.
- Final terminal state remains `completed` | `failed` | `cancelled`.
- Exactly one terminal `RuntimeStreamEvent` ends the iterable.
- No events after terminal.
- Final `RuntimeResult` always present on terminal event.

### Smallest Capability amendment (required with Runtime)

Extend capability invocation for streaming delivery:

```ts
export interface CapabilityInvocationPort {
  invoke(work: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>;
  /**
   * Optional streaming invoke. When absent, executeStream fails closed
   * with a normalized Runtime error (capability does not support stream).
   */
  stream?(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
  ): AsyncIterable<CapabilityStreamEvent>;
}

export type CapabilityStreamEvent =
  | Readonly<{ type: 'delta'; sequence: number; payload: Readonly<{ kind: 'text'; text: string }> }>
  | Readonly<{ type: 'usage'; sequence: number; usage: Readonly<{ inputTokens: number; outputTokens: number; totalTokens: number }> }>
  | Readonly<{ type: 'final'; sequence: number; result: unknown }>; // JSON-serializable capability result (= today's invoke result)
```

Composition’s AI capability adapter implements `stream` by calling `AiProviderFramework.stream` and aggregating text into the final capability result.

## 4.3 Agent → Runtime handoff — **insufficient without amendment (STOP corrected)**

### 4.3.1 Exact current non-stream sequence

```text
POST /v1/agents/reference-agent/invoke
  1. Host: Security authorization → AgentInvocationRequest
  2. AgentFramework.invoke(request)
       a. enforce authorization / principal / objective
       b. resolveVersion → load active definition → effective(...)
       c. runtime.accept(RuntimeAgentInvocation)   // AgentRuntimePort
            LocalReferenceRuntimePort.accept:
              - executionId = execution:<uuid>
              - await runtime.execute({ context.executionId, input: objective, ... })
              - store { runtime: RuntimeResult, invocation } in memory map
              - return { executionReference: executionId }
       d. publish AgentFact type=agent.invocation.accepted
       e. AgentAudit.record(same operation)
       f. return AgentInvocationAcceptance {
            invocationId, runtimeExecutionReference, accepted: true,
            finalExecutionOutcomeIncluded: false
          }
  3. Host: runtimePort.getResult(acceptance.runtimeExecutionReference)
  4. Host: additional platform audit / observability facts
  5. Host: JSON response from acceptance + stored RuntimeResult
```

**Does `AgentFramework.invoke` cause Runtime execution to start through `accept`?**  
**Yes.** Proven by `LocalReferenceRuntimePort.accept` awaiting `RuntimeOrchestrator.execute`.

Blueprint 18 / package tests intend acceptance to hand off to Runtime and return a reference rather than a final business outcome. The host composition currently completes execution inside `accept` before `invoke` returns — that is why `/invoke` can synchronously return JSON.

### 4.3.2 Duplicate-execution risk under previous v0.8 draft

Previous draft said Agent Framework needs no amendment and host would:

1. call Agent acceptance (`invoke` → `accept` → **`execute`**), then  
2. call **`executeStream`** for SSE  

That would produce **two Runtime executions** for one logical invocation → **FAIL**.

### 4.3.3 Options evaluated

| Option | Description | Verdict |
|---|---|---|
| **A** | Additive `AgentRuntimePort.acceptStream` + `AgentFramework.invokeStream` | **Selected** |
| B | Make `accept` prepare-only (no execute); host later calls execute/executeStream | Rejected for v0.8 — larger non-stream refactor; breaks current `getResult` after `invoke` unless redesigned |
| C | Host adapter selects execute vs executeStream *before* AgentFramework calls Runtime | Rejected — AgentFramework always calls `accept`; selecting outside requires bypassing Agent or unsafe shared mutable mode on the port |

### 4.3.4 Selected handoff (Option A) — third amendment required

Create before Autonomous code:

`docs/implementation/amendments/18-agent-streaming-runtime-handoff-amendment.md`

**Affects:** `@agentforge/agent-framework` implementation contracts (additive).  
**Blueprint 18 constitutional rewrite?** **No** — Runtime-coordinated acceptance already exists; streaming is an additive handoff mode.  
**ADR required?** **No.**

Frozen intent:

```ts
export interface AgentRuntimePort {
  accept(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>>;
  /**
   * Streaming handoff. MUST start at most one Runtime execution via executeStream.
   * MUST NOT call execute().
   * Returns executionReference; stream consumption is Composition-owned via the port.
   */
  acceptStream(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>>;
}

export class AgentFramework {
  invoke(request: AgentInvocationRequest): Promise<AgentInvocationAcceptance>;
  /**
   * Same acceptance lifecycle/facts as invoke, but hands off via acceptStream.
   * MUST NOT call accept().
   */
  invokeStream(request: AgentInvocationRequest): Promise<AgentInvocationAcceptance>;
}
```

Host `LocalReferenceRuntimePort` normative behavior:

| Method | Runtime call | When reference returns | Stream/result access |
|---|---|---|---|
| `accept` | `execute` only | After terminal `RuntimeResult` (today) | `getResult(ref)` |
| `acceptStream` | `executeStream` only | After execution id allocated and stream handle registered; **must not** await full terminal before return if that would block SSE start — register iterable, return ref, host pulls events | `getStream(ref)` + eventually `getResult(ref)` on terminal |

```text
POST /invoke/stream (normative)
  → Security authorization
  → AgentFramework.invokeStream(request)     // one acceptance fact/audit
       → AgentRuntimePort.acceptStream(...)  // executeStream only; execute count = 0
  → host: SSE start with acceptance.runtimeExecutionReference
  → host: for await (event of runtimePort.getStream(ref)) map → SSE
  → terminal RuntimeResult available via getResult(ref)
```

**HTTP must not** call `runtime.execute` / `executeStream` directly after Agent acceptance.  
**HTTP must not** fabricate `agent.invocation.accepted`.

### 4.3.5 Execution identity (normative)

For one streaming HTTP request:

| Identity | Cardinality |
|---|---|
| `invocationId` (`AgentInvocationRequest.id`) | 1 |
| `executionId` / `executionReference` | 1 (same value through acceptance, Runtime events, SSE `start`/`complete`) |
| Runtime executions started | 1 (`executeStream` only) |
| `agent.invocation.accepted` facts | 1 |
| Terminal `RuntimeResult` | 1 |

No shadow execution solely for transport.

### 4.3.6 Events / audit non-duplication

Streaming must not emit duplicates caused by running both execute paths:

- `agent.invocation.accepted` ×1  
- Runtime execution started / terminal facts ×1 set  
- Agent + platform invocation audit records consistent with one handoff  
- No second terminal fact from a ghost `execute()`

## 4.4 API Framework

`StreamFrame` is transport-independent and usable later. **v0.8 does not require** rewriting platform-host onto ApiFramework. Host maps `RuntimeStreamEvent` → SSE wire events directly. Document alignment:

| RuntimeStreamEvent | Conceptual StreamFrame.type |
|---|---|
| first delta / stream begin | `started` (host may emit SSE `start` before first delta) |
| `delta` | `incremental` |
| `completed` | `completed` |
| `failed` | `failed` |
| `cancelled` | `failed` or distinct SSE `cancelled` (host wire uses `cancelled`) |

---

# 5. Ownership (Normative)

| Concern | Owner | Forbidden |
|---|---|---|
| Provider stream translation | AI Provider Framework | Host importing OpenAI stream types |
| Normalized AI chunks | AI Provider contracts | Vendor event leakage |
| Cancellation / timeout / terminal state | Runtime | HTTP owning kill policy |
| Backpressure policy (cancel after max drain wait) | Runtime (+ host awaits drain) | Unbounded host buffers |
| Agent acceptance + invoke vs invokeStream selection | Agent Framework | HTTP fabricating acceptance facts |
| accept / acceptStream implementation | Composition (`LocalReferenceRuntimePort`) | Calling both execute and executeStream |
| SSE framing / disconnect / write-drain | platform-host | Host owning provider retry; host calling Runtime after skipping Agent |
| Authorization | Security | Stream start before authz |
| Facts | Event Bus | Token-as-event flood |
| Telemetry | Observability | Logging every chunk body |

---

# 6. Transport Decision

**Selected: A — Server-Sent Events (SSE)**

| Option | Verdict |
|---|---|
| A. SSE | **Selected** — one-way, BP26-aligned, curl/browser friendly |
| B. NDJSON | Viable but less standard for browsers |
| C. Raw chunked JSON/text | Weak framing / error encoding |
| D. WebSocket | Rejected — bidirectional surface unnecessary |

---

# 7. Endpoint Strategy

**Selected: A — new endpoint**

```http
POST /v1/agents/reference-agent/invoke/stream
```

| Option | Verdict |
|---|---|
| A. New `/invoke/stream` | **Selected** — explicit, non-breaking |
| B. `Accept: text/event-stream` | Rejected for v0.8 — ambiguous with existing JSON clients |
| C. Request flag | Rejected — mixes response modes on one route |

**Unchanged:**

```http
POST /v1/agents/reference-agent/invoke
→ application/json
```

---

# 8. Normalized Stream Event Model

## 8.1 AI layer (reuse + amend)

Keep existing names; do **not** invent `stream.started` aliases that duplicate `content`/`completed` unless needed.

**Reuse:**

- `content` (+ `sequence`, `part`)  
- `usage`  
- `completed` (+ `finishReason`, `diagnosticId`)  
- `tool-call` remains in type union but **v0.8 product path must not emit tool-call** (tool calling non-goal; adapters reject tools as today for OpenAI chat)

**Amend (smallest):**

```ts
export type NormalizedAiStreamEvent =
  | { readonly type: 'content'; readonly sequence: number; readonly part: AiContentPart }
  | { readonly type: 'tool-call'; readonly sequence: number; readonly call: NormalizedToolCall }
  | { readonly type: 'usage'; readonly sequence: number; readonly usage: AiUsage }
  | { readonly type: 'completed'; readonly sequence: number; readonly finishReason: AiFinishReason; readonly diagnosticId: string }
  | { readonly type: 'failed'; readonly sequence: number; readonly code: AiErrorCode; readonly message: string; readonly diagnosticId: string; readonly retryable: boolean }
  | { readonly type: 'cancelled'; readonly sequence: number; readonly diagnosticId: string };

// Additive on request:
export interface AiExecutionRequest {
  // ...existing fields...
  readonly signal?: AbortSignal;
}
```

`AiFact` additive (optional): `ai.stream.failed` | `ai.stream.cancelled` — high-level only.

### 8.1.1 Single failure-termination mechanism (normative freeze)

`AiProviderAdapter.stream` / `AiProviderFramework.stream` MUST use **exactly one** failure/cancel termination mechanism per stream:

| Case | Required behavior |
|---|---|
| Normalized terminal `failed` emitted | Do **not** also throw the same normalized failure; iterable ends immediately |
| Normalized terminal `cancelled` emitted | Do **not** also throw cancellation; iterable ends immediately |
| Normalized terminal `completed` emitted | Iterable ends; no throw |
| Unexpected internal exception **before** any terminal event | Catch once, normalize once (emit `failed` **or** throw once — framework chooses emit-then-end for post-start HTTP clarity; never both) |

**Forbidden:** `failed` event + thrown failure; `cancelled` event + thrown cancellation.

Runtime maps exactly one AI terminal outcome → exactly one Runtime terminal `RuntimeStreamEvent`.

Framework rules after amendment:

- Contiguous `sequence` starting at `0`  
- At most one of `completed` | `failed` | `cancelled`  
- No events after terminal  
- On AbortSignal abort: emit `cancelled`, end iterable, do not throw the same cancel  
- Provider SDK types never exported

## 8.2 Runtime layer

See §4.2 `RuntimeStreamEvent`. Host does not forward raw AI events; it maps Runtime events to SSE.

## 8.3 HTTP SSE wire names (host)

| SSE `event` | When |
|---|---|
| `start` | After headers; before first delta (includes executionReference, correlationId) |
| `delta` | Text text delta |
| `usage` | Optional usage update |
| `complete` | Terminal success (+ summary fields; not full secret metadata) |
| `error` | Terminal failure after stream started |
| `cancelled` | Terminal cancellation after stream started |

Do not finalize AI type renames to `stream.started` etc.; wire names above are host transport vocabulary.

---

# 9. Ordering

Normative properties:

1. `sequence` is monotonic and contiguous per execution at each layer (AI, Capability, Runtime, SSE `id` or payload sequence).  
2. Client-observed SSE event order is deterministic for a single connection.  
3. Duplicate provider chunks: adapter must coalesce or assign new sequences; framework rejects non-contiguous sequences.  
4. Out-of-order provider callbacks: adapter buffers/reorders internally or drops with fail-closed `failed` — must not emit decreasing sequences.  
5. Exactly one terminal event.  
6. **No event after terminal** (AI iterable ends; Runtime iterable ends; SSE connection ends after terminal event).

---

# 10. AI Provider Streaming Path

```text
Capability Resolution (binding)
  → Composition CapabilityInvocationPort.stream
  → AiProviderFramework.stream(request with streaming.enabled=true, signal)
  → AiProviderAdapter.stream
  → NormalizedAiStreamEvent*
```

Reuse existing `stream` API. Do not add a second chat stream method.

Amendment doc to create on approval:

`docs/implementation/amendments/08-ai-provider-streaming-signal-terminal-amendment.md`

---

# 11. Reference Streaming Provider

Deterministic, no network.

**Strategy (normative for CI):**

Given concatenated user text from request messages (text parts only), split into chunks:

1. Tokenize by whitespace keeping separators: `"hello agentforge"` → `["hello", " ", "agentforge"]`  
2. If empty input, emit single content part `""` then completed  
3. Emit one `content` event per chunk (`part.type === 'text'`)  
4. If `includeUsage`, emit deterministic usage `{ inputTokens: 1, outputTokens: chunkCount, totalTokens: 1 + chunkCount }`  
5. Emit `completed` with `finishReason: 'completed'`  
6. Honor `signal.aborted` between chunks → emit `cancelled` and stop  
7. For backpressure tests: optional constraint `referenceStreamDelayMs` (test-only / constraints whitelist) to delay between chunks — **not** a public product config; tests may inject a test adapter instead if constraints forbidden

Do **not** claim real tokenization.

Final aggregated text = join of chunks (reproducible).

---

# 12. OpenAI Streaming

Implement inside `@agentforge/ai-provider-openai` only.

| Concern | Design |
|---|---|
| API | Existing OpenAI SDK chat completions **stream: true** (or current SDK streaming equivalent used by package) |
| Delta translation | `delta.content` → `NormalizedAiStreamEvent` `content` text parts |
| Finish reason | Map SDK finish → `AiFinishReason` on `completed` |
| Usage | If available on final stream chunk / includeUsage path → `usage` event |
| Errors | Translate to `ProviderAdapterError` / `failed` event; no SDK types outward |
| Cancellation | Pass `request.signal` into SDK abort; stop emitting |
| Retry | **No** SDK-level retry ownership that conflicts with Runtime |
| Non-stream `execute` | Unchanged |

Tools remain unsupported (throw / failed as today).

---

# 13. Runtime Streaming Boundary

Runtime **does not** currently have a stream-capable execution contract → use amendment in §4.2.

Streaming is an **execution delivery mode**, not a new lifecycle stage.

`executeStream` runs the same planning/workflow/security/timeout envelope as `execute`, but at capability invocation uses `capabilities.stream` when present.

---

# 14. Runtime Terminal Semantics

```text
stream starts (host SSE start)
  → RuntimeStreamEvent delta*
  → provider/capability final
  → Runtime terminalizes
  → RuntimeStreamEvent completed|failed|cancelled (includes RuntimeResult)
```

Terminal Runtime **state** remains only:

- `completed`  
- `failed`  
- `cancelled`  

**No** `streamed` state.

Timeout → `failed` with existing timeout error semantics (not a new state).

---

# 15. RuntimeResult

**Required:** after stream completion, Runtime still produces a full `RuntimeResult` (on the terminal stream event and in diagnostics/checkpoint paths as applicable).

Streaming is incremental delivery; chunks are **not** the sole source of truth.

Used by: audit, persistence/checkpoint, evaluation (final), diagnostics, non-stream consumers.

---

# 16. Checkpoint / Recovery Interaction

| Question | v0.8 answer |
|---|---|
| Checkpoint every chunk? | **No** |
| Checkpoint final capabilityResult? | **Yes** at post-invoke (same as today) |
| Crash after client got 50% of SSE? | Client has partial output; process may recover execution to a terminal checkpoint later |
| Resume same HTTP stream after restart? | **Not guaranteed / not implemented** |
| Redesign Runtime Recovery? | **No** |

Honesty rule for docs/tests: recovery may safely complete execution; it must **not** claim reconnection of a dead HTTP client stream.

---

# 17. Client Disconnect

```text
HTTP client disconnect / req close
  → platform-host detects
  → signals Runtime cancellation (AbortSignal)
  → Runtime cancellation policy
  → Capability/AI AbortSignal
  → provider abort where supported
  → terminal cancelled (existing semantics)
  → SSE ends (if still writable)
```

HTTP must **not** kill provider work without Runtime involvement.

---

# 18. Cancellation Chain

```text
client disconnect | caller cancel | Runtime cancel API
  → Runtime-owned cancellation
  → AbortSignal aborted
  → AI Provider stream observes signal
  → provider SDK abort
  → terminal cancelled
```

**Proof requirement (tests):** no `delta` / `content` after cancellation terminalization at Runtime and SSE layers.

---

# 19. Timeout

Runtime continues to own timeout.

Mid-stream timeout:

1. Abort provider stream via signal  
2. Emit Runtime `failed` terminal (timeout semantics)  
3. Host encodes SSE `error` and closes  
4. No HTTP-owned timeout policy beyond reverse-proxy notes  

---

# 20. Backpressure

Node HTTP:

```text
const ok = response.write(chunk);
if (!ok) await once(response, 'drain');
```

Normative:

- Host pulls next `RuntimeStreamEvent` only after prior write drained (or write returned true).  
- Do **not** accumulate unbounded AI chunks in a host buffer.  
- Provider async iterator naturally pauses when consumer awaits drain.  
- If drain wait exceeds `STREAMING_MAX_DRAIN_WAIT_MS`, host requests Runtime cancel; terminal `cancelled` or failed-per-policy (specify: **cancelled** with reason `backpressure-timeout` in diagnostics metadata if allowed without leaking secrets).

Ownership: host transport coordinates write/drain; Runtime retains cancellation policy.

---

# 21. Slow Consumers

**Selected smallest safe design:**

- Rely on Node stream backpressure (await drain)  
- Bound wait via `STREAMING_MAX_DRAIN_WAIT_MS` (default 30000)  
- No large application-level chunk queue  
- No artificial tiny buffer of N tokens required if pull-based await is used  

Limits documented in guide + `.env.example`.

---

# 22. HTTP SSE Shape

### Request

```http
POST /v1/agents/reference-agent/invoke/stream HTTP/1.1
Content-Type: application/json
Authorization: <existing host auth scheme>
X-Correlation-Id: <optional>
Accept: text/event-stream

{ ...same body shape as /invoke... }
```

### Response headers (after authz/validation success)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Correlation-Id: <id>
```

### Frames

```text
event: start
data: {"executionReference":"...","correlationId":"...","agentId":"reference-agent"}

event: delta
data: {"sequence":0,"text":"hello"}

event: delta
data: {"sequence":1,"text":" "}

event: usage
data: {"sequence":2,"usage":{"inputTokens":1,"outputTokens":2,"totalTokens":3}}

event: complete
data: {"sequence":3,"executionReference":"...","state":"completed","finishReason":"completed"}
```

Heartbeat (transport-only):

```text
: ping
```

Rules:

- Valid SSE framing (`event`, `data`, blank line)  
- JSON `data` objects only (no raw provider events)  
- No secrets, API keys, SDK payloads, stack traces  
- After terminal event, end response  

---

# 23. Error Semantics

| Phase | Behavior |
|---|---|
| Before SSE headers committed | Normal JSON API error (`4xx`/`5xx`) as `/invoke` |
| After stream started | Terminal SSE `error` or `cancelled`; then close |

| Failure | Mapping |
|---|---|
| Auth failure | JSON 401/403 **before** stream |
| Validation failure | JSON 400 before stream |
| Provider unavailable | If before start → JSON; if after → SSE `error` |
| Rate limit | Normalized code; JSON or SSE `error` |
| Timeout | SSE `error` / Runtime failed |
| Cancellation | SSE `cancelled` |
| Malformed provider chunk | Adapter/framework fail → SSE `error` |
| Transport failure | Best-effort cancel Runtime; may not deliver terminal event |
| Internal error | Normalized safe message; no stacks |

---

# 24. Security

- Authorization **before** any SSE `start`  
- Security context remains on execution  
- No security tokens/decisions in stream payloads  
- Unauthorized → JSON error, zero stream events  

---

# 25. Audit

Audit (high-level):

- invocation started  
- streaming mode flag / path  
- terminal outcome  
- provider/capability references  
- correlation / execution refs  

Do **not** audit every token/chunk by default.  
Do not store full streamed content twice unless existing audit policy already stores final output (final RuntimeResult path may record final text once).

---

# 26. Events (Event Bus)

Prefer high-level facts only:

- stream/execution started (existing or thin additive)  
- `ai.stream.completed` (exists)  
- additive `ai.stream.failed` / `ai.stream.cancelled` if amended  
- Runtime terminal facts (existing)

**Do not** publish per-token facts.

---

# 27. Observability Metrics

| Metric | Notes |
|---|---|
| active streams | gauge |
| started / completed / failed / cancelled | counters |
| time to first chunk | histogram |
| total duration | histogram |
| chunk count | histogram/counter |
| bytes sent | counter |
| provider latency (start→first normalized event) | histogram |
| client disconnects | counter |
| backpressure waits / drain timeouts | counters |

No chunk body content in logs/metrics.

---

# 28. Evaluation

**Selected: A — final result only.**

v0.6 observational evaluation runs after complete final `RuntimeResult`, not on chunks. No streaming evaluation hot path.

---

# 29. Memory / Context

No Memory public contract changes.  
Context Assembly completes before provider stream.  
Do not stream Memory retrieval internals.

---

# 30. Persistence

**No new DB schema** for token chunks.

Existing Runtime checkpoint/result persistence sufficient.  
If implementation discovers a mandatory chunk schema → **STOP**.

---

# 31. API Endpoint (Exact)

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/v1/agents/reference-agent/invoke/stream` |
| Auth | Same as `/invoke` |
| Body | Same validation as `/invoke` |
| Success | `200` + SSE |
| Disconnect | §17 |
| Non-stream | `/invoke` unchanged |

---

# 32. CLI / SDK Impact

Current SDK/CLI are scaffold/reference level for invoke.  
**v0.8 does not require** SDK streaming surface.  
Document as future integration in `docs/guides/streaming.md`.

---

# 33. Configuration

| Variable | Default | Required? |
|---|---|---|
| `STREAMING_HEARTBEAT_INTERVAL_MS` | `15000` (`0` disables) | No |
| `STREAMING_MAX_DRAIN_WAIT_MS` | `30000` | No |

No `STREAMING_ENABLED` flag: stream route is additive; JSON `/invoke` remains default client path.

Avoid further config unless implementation proves need (then amend spec).

---

# 34. Heartbeats

SSE comment heartbeats owned by **host transport timer** only:

```text
: ping\n\n
```

Interval from `STREAMING_HEARTBEAT_INTERVAL_MS`.  
Must not affect Runtime execution semantics or sequence numbers.

---

# 35. Docker

- No Docker redesign  
- Streaming works behind current container/network  
- Default docker smoke remains **non-streaming**  
- Optional separate streaming smoke using reference AI  
- Note proxy idle timeouts if smoke runs through a proxy (usually none locally)

---

# 36. Reverse Proxy Compatibility (Docs Only)

For future Nginx/load balancers:

- disable response buffering for SSE  
- raise idle / proxy read timeouts above heartbeat interval  
- prefer HTTP/1.1 for SSE  
- do not introduce Nginx deployment in v0.8  

---

# 37. CI Strategy

| Track | Content |
|---|---|
| Default PR CI | Secret-free reference streaming tests |
| `pnpm test:streaming` | Aggregate streaming suite |
| Paid OpenAI stream | **Forbidden** in PR CI |
| Live OpenAI stream | Opt-in env / workflow only |

---

# 38. Testing — Reference Streaming

Must prove:

- ordered deltas  
- deterministic final aggregation  
- contiguous sequences  
- terminal exactly once  
- no chunks after terminal  
- cancellation  
- timeout  
- client disconnect  
- backpressure/drain  
- provider error mid-stream  
- malformed chunk → failed (single terminal; no throw-after-event)  
- final RuntimeResult consistency with joined deltas  

### 38.1 Testing — single execution / handoff identity (required)

**Streaming invocation must prove:**

| Counter | Expected |
|---|---|
| Agent Framework acceptance count (`invokeStream` completions / `agent.invocation.accepted`) | 1 |
| Runtime execution count | 1 |
| `RuntimeOrchestrator.execute` calls | **0** |
| `RuntimeOrchestrator.executeStream` calls | **1** |
| Provider / AI stream invocations | 1 |
| Terminal RuntimeResult count | 1 |

Also prove the same `invocationId` and `executionReference`/`executionId` flow through:

Agent acceptance → Runtime stream events → SSE `start` / `complete`.

Prove **no duplicate**:

- `agent.invocation.accepted`  
- runtime execution started facts  
- audit invocation records  
- terminal execution facts  

caused by running both `execute` and `executeStream`.

**Non-stream invocation must prove:**

- existing `invoke` → `accept` → `execute` behavior unchanged  
- `executeStream` count = 0 for that path  

---

# 39. Testing — OpenAI

**Mock:**

- delta translation  
- finish reason  
- usage  
- AbortSignal cancellation  
- rate-limit/error normalization  
- malformed provider event  
- final result aggregation  

**Live:** opt-in only.

---

# 40. Testing — HTTP

Prove:

- `POST .../invoke/stream` → 200 → `text/event-stream` → `start` → ordered `delta` → `complete`  
- unauthorized / validation before stream  
- provider failure before start (JSON)  
- provider failure after start (SSE `error`)  
- client disconnect → Runtime cancelled  

---

# 41. Testing — Backpressure

Deterministic slow consumer:

- throttle read or pause drain  
- assert host/provider does not unbounded-buffer (memory/chunk queue bound = 0–1 in-flight)  
- assert await-drain behavior  
- optional drain-timeout → cancel  

---

# 42. Testing — Runtime Recovery

- Existing restart/recovery suite stays green  
- Document: stream mid-flight + process death ⇒ no HTTP resume claim  
- Where practical: after final capability result checkpointed, recovery completes terminal state without recreating SSE  

---

# 43. Architecture Boundary Tests

Prove import boundaries:

| Package | Must not import |
|---|---|
| `@agentforge/runtime` | Node HTTP / SSE wire types |
| `@agentforge/ai-provider` | platform-host HTTP types |
| `@agentforge/ai-provider-openai` | export OpenAI stream types from public index |
| `@agentforge/agent-framework` | HTTP framing |
| `platform-host` | provider SDK retry/recovery ownership |

---

# 44. Manual Probe

`scripts/streaming-probe.mjs` (or host-local equivalent):

- uses reference host / reference AI  
- invokes `/invoke/stream`  
- prints safe delta text  
- asserts ordering + final complete  
- optional cancel test  
- no secrets  

---

# 45. Developer Example

Document in guide:

```bash
curl -N -X POST "$BASE/v1/agents/reference-agent/invoke/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"input":"hello agentforge"}'
```

Plus a short Node `fetch` + `ReadableStream` reader example.  
Safe SSE consumption: parse `event`/`data` lines; stop on terminal; handle disconnect.

---

# 46. Versioning

Product: **0.8.0**

Expected package bumps (only if surface changes):

| Package | Likely |
|---|---|
| `@agentforge/ai-provider` | Yes (signal + terminal events + single-terminal rule) |
| `@agentforge/ai-provider-openai` | Yes (stream impl) |
| `@agentforge/runtime` | Yes (`executeStream` + capability stream) |
| `@agentforge/agent-framework` | **Yes** (additive `invokeStream` + `acceptStream`) |
| `@agentforge/platform-host` | Yes (SSE route + `acceptStream` impl) → product 0.8.0 |
| `@agentforge/api-framework` | No (unused path) |
| Memory / Evaluation / Vector / Persistence | No |

Do not bump merely because v0.8 exists.

---

# 47. Documentation Plan

Create/update after implementation approval:

- `docs/guides/streaming.md`  
- `README.md`, `docs/README.md`, `.env.example`  
- AI Provider README, Runtime README, platform-host docs  

Cover: ownership, SSE format, cancel, timeout, backpressure, recovery limitation, final result, reference streaming, OpenAI opt-in, no tool calling.

---

# 48. Explicit Non-Goals

- Tool calling / function execution  
- WebSocket chat  
- Persistent stream replay / resume tokens  
- Multi-provider routing  
- Distributed stream brokers  
- Streaming Memory retrieval  
- Streaming Evaluation  
- UI chat app  
- Voice/audio streaming  
- Per-chunk checkpoints  
- Dual Runtime execution for one Agent acceptance  
- New Blueprint/ADR constitution changes (amendments only as named)

---

# 49. Stop Conditions

**STOP** and re-review if design/implementation requires:

1. Runtime ownership moving to HTTP/API  
2. Provider SDK stream types crossing AI boundary  
3. New persistence schema for token chunks  
4. Mandatory paid OpenAI calls in CI  
5. Context Assembly contract redesign  
6. Memory contract redesign  
7. Event Bus becoming token transport  
8. Runtime recovery redesign beyond documented stream limitations  
9. New Blueprint/ADR constitutional changes  
10. Public contract changes beyond the **three** named amendments  
11. **Any streaming path that invokes both `execute` and `executeStream` for one Agent acceptance** (new)  
12. **AI stream that both emits terminal `failed`/`cancelled` and throws the same normalized failure** (new)

---

# 50. Amendments Required Before Autonomous Code

| Amendment | Path | Status |
|---|---|---|
| AI AbortSignal + fail/cancel + single-terminal rule | `docs/implementation/amendments/08-ai-provider-streaming-signal-terminal-amendment.md` | **To create on approval** |
| Runtime `executeStream` + Capability `stream` | `docs/implementation/amendments/04-runtime-streaming-execution-amendment.md` | **To create on approval** |
| Agent `invokeStream` + `AgentRuntimePort.acceptStream` | `docs/implementation/amendments/18-agent-streaming-runtime-handoff-amendment.md` | **To create on approval** |

These are **implementation-contract amendments**, not Blueprint rewrites.  
**Blueprint/ADR constitutional amendment required:** **No.**

---

# 51. Package / File Impact (Planned)

### Create

- amendment docs (above, including Agent handoff)  
- `docs/guides/streaming.md`  
- `scripts/streaming-probe.mjs`  
- Runtime stream types + tests  
- Agent `invokeStream` / port tests (single-execution proofs)  
- OpenAI stream translation module + tests  
- host SSE handler + `acceptStream` + tests  
- streaming checklist + implementation report (at completion)

### Modify

- `packages/ai-provider` contracts + framework + reference adapter  
- `packages/ai-provider-openai` stream path + README  
- `packages/runtime` orchestrator + capability port + tests  
- `packages/agent-framework` `AgentRuntimePort` + `AgentFramework.invokeStream` + tests  
- `apps/platform-host` `LocalReferenceRuntimePort.acceptStream`, composition, HTTP server, config  
- CI workflow / package scripts  
- `.env.example`, READMEs  

### Do not modify (unless forced by stop)

- Memory / Vector / Evaluation public contracts  
- Persistence schema  
- Blueprint 18 constitutional text (implementation amendment only)  
- API Framework mandatory adoption  

---

# 52. Deliverables Summary

| Topic | Decision |
|---|---|
| Current Agent → Runtime handoff | `invoke` → `accept` → host awaits `execute` (§4.3.1) |
| Previous draft duplicate risk | **Yes** — invoke/accept/execute then host executeStream |
| Selected streaming handoff | **Option A:** `invokeStream` → `acceptStream` → `executeStream` only |
| Agent contracts must change? | **Yes** — additive implementation-contract amendment #3 |
| Execution identity | One invocationId, one executionReference, one Runtime run, one acceptance fact, one terminal result |
| Non-stream compatibility | `/invoke` keeps `invoke` → `accept` → `execute` |
| AI single-terminal rule | Emit terminal **or** throw once — never both (§8.1.1) |
| Amendments required | **Three** (AI, Runtime, Agent handoff) |
| Blueprint/ADR amendment | **No** |
| New stop conditions | **Yes** (§49 items 11–12) |
| Transport / endpoint | SSE; `POST .../invoke/stream` |
| Autonomous safe? | **FAIL** — pending Review-Gated approval of corrected design + three amendments |

---

# 53. Architectural Deviations

None intended. Streaming is delivery-mode productization over existing BP04/BP08/BP18/BP26 authorities.

Known honest limitation (not a deviation): **cross-process HTTP stream resume is out of scope**; v0.4 recovery remains execution-centric.

Correction recorded: prior claim that Agent Framework needed no public/implementation contract change was **incorrect** given host `accept`→`execute` coupling.

---

# 54. Review Checklist

- [ ] Product doc approved (including handoff correction)  
- [ ] Plan approved  
- [ ] This specification approved  
- [ ] AI streaming amendment text approved  
- [ ] Runtime streaming amendment text approved  
- [ ] **Agent streaming handoff amendment text approved**  
- [ ] Single-execution / non-duplicate fact tests acknowledged  
- [ ] Explicit non-goals acknowledged  
- [ ] Autonomous implementation authorized  

Until checked: **no production code**.  
**Autonomous v0.8 readiness: FAIL.**
