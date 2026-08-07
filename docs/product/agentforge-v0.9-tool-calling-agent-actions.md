# AgentForge v0.9 Tool Calling & Agent Actions

**Version:** 0.9.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

## Purpose

AgentForge v0.9 productizes **safe, provider-independent Tool Calling**: the model may *propose* an action; AgentForge alone decides whether it is allowed, how it executes, whether it may be retried, how side effects are classified, and how outcomes are recorded.

```text
AI → NormalizedToolCall
  → Security authorization
  → Capability Resolution → Composition
  → Runtime-owned execution
  → Tool Framework → Tool Adapter
  → NormalizedToolResult
  → AI continuation / final response
```

v0.9 is **not** multi-provider routing, a plugin marketplace, unrestricted shell/filesystem, or unbounded autonomous loops.

---

## Critical finding: Tool Framework already exists

Blueprint 09 is implemented as `@agentforge/tool-framework@0.1.0` with:

- `ToolContract` (descriptor + sideEffect + idempotency + schemas)
- `ToolExecutionRequest` (requires `AuthorizationFact { authorized: true }`)
- `ToolInvocationCoordinator` + `ToolValidator` + `ToolRegistry`
- `AiToolCallHandoff` (NormalizedToolCall → ToolExecutionRequest)
- `PluginToolRegistrationAdapter` (`contribution.kind === 'tool'`)
- `ReferenceToolAdapter`
- Normalized error taxonomy

**What is missing is the product loop**, not a second Tool Framework:

| Gap | Today |
|---|---|
| OpenAI tools | Rejected (“not supported in v0.2”) |
| Host AI ↔ Tool loop | Absent (capability path is AI chat only) |
| Runtime multi-tool / toolCall checkpoints | Absent (single capabilityResult) |
| Streaming tool-call assembly | OpenAI fails closed on tool-calls finish |
| SSE tool lifecycle events | Absent |
| TOOLS_ENABLED / limits | Absent (`maximumToolInvocations: 0` on reference agent) |
| Durable mid-loop human approval | Human Interaction exists; **not wired** to tool loop |

---

## Contract sufficiency gate

| Layer | Sufficient for honest AI tool loop? |
|---|---|
| Tool Framework invoke/normalize | **Mostly yes** — reuse; small amendment for result statuses / approval metadata / facts |
| AI `tools` + `NormalizedToolCall` | **Partial** — shapes exist; OpenAI + stream assembly + continuation messages missing |
| Runtime single capability invoke | **Insufficient** for bounded multi-turn tool loop + per-toolCall recovery |
| Security authorization | **Yes** — must authorize each tool call |
| Capability Resolution / Composition | **Yes** |
| Human Interaction durable wait mid-loop | **Partial** — package exists; Runtime wait/resume for tool approval needs explicit design/amendment or fail-closed |
| Persistence new `tool_calls` table | **Not required** if Runtime checkpoint + Audit suffice |

**Do not invent `@agentforge/tools`.** Extend Blueprint 09 package + host/Runtime/AI wiring.

---

## Ownership (normative)

| Concern | Owner |
|---|---|
| Tool descriptors, validation, normalize, side-effect metadata | Tool Framework (BP09) |
| Authorization | Security |
| Implementation selection | Capability Resolution |
| Instantiation | Composition |
| Timeout / cancel / retry / recovery / tool loop scheduling | Runtime |
| Vendor tool schema / stream fragment assembly | AI Provider (+ openai package) |
| Agent acceptance / handoff | Agent Framework |
| SSE framing of safe tool lifecycle (optional) | platform-host |
| Approval interaction records | Human Interaction (when durable wait is in scope) |

**Hard rules:** no OpenAI SDK → arbitrary JS; no model-selected dynamic `require`/`eval`/shell; no unregistered tools.

---

## Recommended product shape

| Decision | Choice |
|---|---|
| Package | Reuse `@agentforge/tool-framework`; host seed reference tools |
| Default | `TOOLS_ENABLED=false` — non-tool behavior unchanged |
| Loop | Bounded sequential tool turns (max calls / max turns) |
| Side effects | Reuse `read-only` \| `mutating` \| `external-side-effect` + `idempotent` \| `non-idempotent` |
| Exactly-once | **Not claimed** for external effects; at-most-once Runtime terminalization + idempotent downstream where supported |
| SSE | `tool_call` `executing` only after validate + Security allow + approval + resolution + durable **pre-tool** (not mere proposal / deny / approval-required) |
| Recovery | Turn envelope (`baseMessages`+`proposedCalls`) first; per-call `pre-tool` only after authz means invoke may have occurred; `post-tool` → continuation without re-run |
| CI | Deterministic reference AI + reference tools; `pnpm test:tools`; no paid OpenAI |
| Approval | Fail-closed `TOOL_APPROVAL_REQUIRED` unless durable wait amendment approved |

---

## Recovery invariant (normative)

After durable `post-tool` + crash, restart reconstructs AI continuation from durable turn + ToolResult without re-executing the tool, re-calling the proposing AI turn, regenerating `toolCallId`, or changing `executionId:toolCallId`.

**`pre-tool` meaning:** validation + Security allow + approval permit + Cap/Composition resolution succeeded; invoke **may** have occurred (unknown external-effect window). Denied / approval-required / validation failures never create `pre-tool`.

---

## Amendments expected (design-level)

1. **C — Runtime** — tool-loop + durable normalized tool-turn checkpoint ([04-runtime-tool-loop-checkpoint-amendment.md](../implementation/amendments/04-runtime-tool-loop-checkpoint-amendment.md))  
2. **B — AI Provider / OpenAI** — tools, stream assembly, **`AiMessage.toolCalls` + `AiToolContinuationInput` / builder** ([08-ai-provider-tool-calling-amendment.md](../implementation/amendments/08-ai-provider-tool-calling-amendment.md))  
3. **A — Tool Framework** — approvalRequirement, facts, signal, size/error codes ([09-tool-calling-result-approval-amendment.md](../implementation/amendments/09-tool-calling-result-approval-amendment.md))  

Blueprint/ADR constitutional rewrite: **No** (implementation-contract amendments only).

---

## Explicit non-goals

- Multi-provider AI routing  
- Browser automation / arbitrary shell / unrestricted FS / raw model SQL  
- Plugin marketplace UI / OAuth connector catalog  
- MCP unless separately required by Blueprint  
- Distributed tool workers / Event Bus as command queue  
- Automatic Memory capture of all ToolResults  
- Exactly-once external side effects  

---

## Authority

| Document | Role |
|---|---|
| Blueprint 09 — Tool Framework | Tool semantics owner |
| Blueprint 04 / 07 / 08 / 15 / 18 / 26 | Runtime, Cap, AI, Security, Agent, API |
| ADR-002 / 004 / 005 / 006 / 007 / 008 / 010 / 011 / 013 | Ownership, providers, Composition, Runtime, Cap, Security, facts, normalize, Audit |
| [Plan](../implementation/plans/agentforge-v0.9-tool-calling-agent-actions-plan.md) | Approach |
| [Specification](../implementation/specifications/agentforge-v0.9-tool-calling-agent-actions-specification.md) | Exact decisions |

---

## Review Gate

Approve product + plan + specification (including named amendments A/B/C; D optional) before production code.

**Autonomous v0.9: complete** — see implementation report and checklist.
