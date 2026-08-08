# AgentProdReady v1.2 — Simple Tools, Memory & Compatibility — Checklist

**Version:** 1.0  
**Authority:** Approved v1.2 review (D2 amended)  
**Report:** [agentprodready-v1.2-simple-tools-memory-dx-implementation-report.md](../reports/agentprodready-v1.2-simple-tools-memory-dx-implementation-report.md)  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-08

---

## Scope gates

- [x] D1–D10 approved (D2 conservative non-idempotent defaults)
- [x] No Security / ToolInvocationCoordinator bypass
- [x] Runtime checkpoint ownership preserved
- [x] Memory uses MemoryEngine (no parallel store)
- [x] No new AI provider implementation
- [x] No `@agentprodready/core`
- [x] No npm publish / git tag in this pass

---

## Simple Tools

- [x] `tool()` facade
- [x] `createAgent({ tools })`
- [x] Defaults: mutating / non-idempotent / approval none
- [x] Security authorize per call
- [x] Approval-required fail closed
- [x] Stream `tool_call` / `tool_result` (no raw args/results)
- [x] Host tool regression green

## Simple Memory

- [x] `inMemory()` + `memory: true` alias
- [x] Ephemeral / instance-scoped
- [x] Two-turn / isolation / dispose tests
- [x] Docs state not durable

## Compatibility / DX

- [x] OpenAI example polished
- [x] Package compatibility guide
- [x] Node 22+24 CI matrix
- [x] Engines not widened without Node 22 green
- [x] Public DX hello/stream/tools
- [x] README paths A/B/C
- [x] Guides: Simple Tools, Simple Memory, Simple Agent API, Getting Started

## Verification

- [x] `pnpm verify`
- [x] `pnpm verify-versioning`
- [x] `pnpm test:public-dx`
- [x] `pnpm test:tools` / streaming / routing / tenant-isolation

## Release (human)

- [ ] Push / confirm Node 22 CI green
- [ ] Optionally widen engines to `>=22 <25`
- [ ] `pnpm npm:publish` for `agent-framework@1.2.0` + `ai-provider@1.0.2`
- [ ] Annotated tag `v1.2.0` (if cutting product release)
- [ ] GitHub About metadata (manual if still unset)

---

## Decision

| Field | Value |
|---|---|
| Implementation version | 1.2.0 (agent-framework) + ai-provider 1.0.2 |
| Reviewer | Approved for Autonomous; publish pending human |
| Decision | **V1.2 PUBLISH READY** — stop before publish/tag |
| Notes | CA not fully wired for memory (prompt enrichment); embedded tool loop (host parity) |
