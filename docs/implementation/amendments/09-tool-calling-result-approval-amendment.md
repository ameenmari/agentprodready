# Blueprint 09 Implementation Contract Amendment — Tool Approval, Facts, Signal & Size

**Amendment ID:** `09-tool-calling-result-approval`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Review-Gated  
**Affects:** `@agentprodready/tool-framework` implementation contracts (not Blueprint 09 constitutional rewrite)  
**Related:** [v0.9 Tool Calling specification](../specifications/agentprodready-v0.9-tool-calling-agent-actions-specification.md)

---

## 1. Problem

v0.9 productizes the AI → Security → Runtime → Tool loop. Existing Tool Framework contracts are mostly sufficient but need smallest additive fields for approval requirement, cancel signal, size limits, lifecycle facts, and recovery/denial error codes.

---

## 2. Authority

| Source | Finding |
|---|---|
| Blueprint 09 | Tool semantics, validation, normalize |
| ADR-008 | Security owns authorization (unchanged) |
| ADR-006 | Runtime owns timeout/cancel (signal into tools) |

**Blueprint amendment required?** No.  
**ADR required?** No.

---

## 3. Frozen additive intents

1. `ToolContract.approvalRequirement?: 'none' | 'required'` (default `'none'`).  
2. Keep coordinator throw for adapter failures; additive `ToolErrorCode` values:  
   `TOOL_APPROVAL_REQUIRED` | `TOOL_RESULT_TOO_LARGE` | `TOOL_UNSAFE_RECOVERY` | `TOOL_CANCELLED`  
3. Additive facts: `tool.requested` | `tool.authorized` | `tool.denied` | `tool.started` | `tool.approval-required` | existing completed/failed (+ cancelled).  
   - `tool.started` **only after** validation + Security allow + approval policy permit + Cap/Composition resolution + durable Runtime `pre-tool` checkpoint (immediately before/when invoke begins).  
   - `tool.denied` / `tool.approval-required`: **no** `tool.started`; adapter invoke count remains 0; no per-call `pre-tool`.  
4. `ToolExecutionRequest.signal?: AbortSignal`.  
5. Result/argument size enforcement at framework/Composition-supplied bounds.

---

## 4. Status

**Implemented** after v0.9 verification (`pnpm verify`, `pnpm test:tools`, tool-calling probe).
