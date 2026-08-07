# AgentProdReady v0.9 Tool Calling & Agent Actions — Implementation Report

**Product Version:** 0.9.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Package versions

| Package | Version |
|---|---|
| `@agentprodready/platform-host` | 0.9.0 |
| `@agentprodready/tool-framework` | 0.2.0 |
| `@agentprodready/ai-provider` | 0.4.0 |
| `@agentprodready/ai-provider-openai` | 0.5.0 |
| `@agentprodready/runtime` | 0.6.0 |

Agent Framework / Memory / Vector / Evaluation / Persistence: unchanged (no bump).

---

## Amendments

| Amendment | Status |
|---|---|
| A — `09-tool-calling-result-approval-amendment.md` | Implemented |
| B — `08-ai-provider-tool-calling-amendment.md` | Implemented |
| C — `04-runtime-tool-loop-checkpoint-amendment.md` | Implemented |
| D — `04-runtime-tool-approval-wait-amendment.md` | **Out of scope** (fail closed `TOOL_APPROVAL_REQUIRED`) |

---

## Tool Framework reuse proof

- Reused `@agentprodready/tool-framework` (Blueprint 09). **No** `@agentprodready/tools` package.
- Extended only via Amendment A: `approvalRequirement`, `signal`, error codes, facts, reference tools.
- Adapters remain behind Tool Framework; Runtime owns the bounded loop.

---

## AI / OpenAI tool support

- `AiMessage.toolCalls`, `AiToolContinuationInput` / `Result`, `buildToolContinuationMessages`
- Reference AI: `USE_TOOL_ECHO:` / `USE_TOOL_COUNTER`
- OpenAI: tools request translation, non-stream tool_calls, continuation message mapping, streamed fragment assembly → complete `NormalizedToolCall` only
- Host never constructs OpenAI `role=tool` messages

---

## Continuation contract

Logical order: `baseMessages` → one assistant message with `toolCalls` → one tool-role message per `ToolResult` (ids must match). Conflicts → `AI_INVALID_REQUEST`.

---

## Durable `toolLoop` shape

Normalized only (no SDK types): `turn`, `maxTurns`, `baseMessages`, `proposedCalls`, `calls[]` with full `NormalizedToolCall`, side-effect/idempotency metadata, `stage` (`pre-tool` | `post-tool`), durable result after post-tool.

`baseMessages` retained as the **pre-proposal turn base** so post-tool recovery rebuilds continuation without re-running tools or the proposing AI turn.

---

## Exact `pre-tool` meaning

Persisted only after: registry lookup → validate args/size → Security allow → approval permit → Capability Resolution → Composition adapter resolve → stable `idempotencyKey = executionId:toolCall.id`. Invocation may occur after this checkpoint (unknown-side-effect boundary).

---

## Per-call ordering

Enforced in `local-reference-tool-loop.ts` exactly as specified (validate → authorize → approval → Cap → Composition → pre-tool → invoke → result size → post-tool → evidence → continue).

---

## Security denial proof

Unit test: deny tool → `TOOL_AUTHORIZATION`, `tool.denied = 1`, `tool.started = 0`, adapter invokes = 0, no `pre-tool`.

---

## Approval-required proof

Unit test: `approvalRequirement='required'` → `TOOL_APPROVAL_REQUIRED`, `tool.approval-required = 1`, adapter = 0, no `pre-tool`. No durable wait/resume (Amendment D out of scope).

---

## Side-effect / retry matrix

Reuse Tool Framework taxonomy. Stable key `executionId:toolCall.id`. Non-idempotent after `pre-tool` → `TOOL_UNSAFE_RECOVERY`. No exactly-once external-effect claim.

---

## Stable idempotency / counter proof

`reference.counter` + pre-tool restart: second invoke returns same logical value (`deduped`), same idempotency key.

---

## Duplicate `toolCallId`

Fail closed (`TOOL_VALIDATION`) before any adapter invoke when the same id appears twice in one turn (or conflicts with prior seen ids).

---

## Post-tool / continuation recovery

- Post-tool restart: adapter count unchanged; AI continuation rebuilt from durable calls/results.
- Proposal-only restart: revalidate/re-authorize then execute once.
- Pre-tool non-idempotent: `TOOL_UNSAFE_RECOVERY`, zero silent re-exec.

---

## Reference.echo end-to-end

E2E + unit: one proposal, one authorize, one pre-tool, one adapter invoke, one post-tool, one AI continuation, final `Tool returned: hello`. Streaming emits safe `tool_call` / `tool_result` without argument leakage.

---

## SSE payload safety

`tool_call` / `tool_result` carry sequence, toolCallId, toolId, status, optional errorCode — not arguments/results/credentials.

---

## Architecture boundaries

- `tool-framework` does not import `openai` / `@agentprodready/ai-provider-openai`
- Runtime checkpoint contracts contain no OpenAI types
- Security authorizes; does not execute adapters
- Host does not call OpenAI SDK tool APIs directly

---

## Verification

| Command | Result |
|---|---|
| `pnpm verify` | PASS (535 tests + 1 skipped live OpenAI) |
| `pnpm test:tools` | PASS (65 tests) |
| `pnpm test:streaming` | PASS (93 tests) |
| `node scripts/tool-calling-probe.mjs` | PASS |
| `node scripts/streaming-probe.mjs` | PASS |
| Docker smoke (`0.9.0`) | PASS (`docker build` + `scripts/docker-smoke.mjs`) |

---

## Known limitations

- Amendment D (durable human approval wait/resume) not implemented — fail closed
- No exactly-once guarantees for external side effects
- No MCP / browser / arbitrary shell-filesystem / multi-provider tool routing
- No dedicated Tool REST API; tools run via agent invoke/stream
- No `tool_calls` SQL table — Runtime checkpoint + Audit only
- Tool-enabled streaming uses tool-loop AI rounds then streams final text (v0.8 SSE framing preserved)

---

## Architectural deviations

None relative to approved Amendments A/B/C and the v0.9 specification. Amendment D explicitly out of scope.

---

## v1.0 design readiness

**Yes** — v0.9 tool calling productization is complete; v1.0 design may begin after normal review/merge of this slice.
