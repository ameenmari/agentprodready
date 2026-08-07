# AgentForge v0.9 Tool Calling & Agent Actions — Checklist

**Product Version:** 0.9.0  
**Status:** Complete  
**Date:** 2026-08-07

---

## Design

- [x] Product doc approved (Review-Gated → Autonomous)
- [x] Plan approved
- [x] Specification approved
- [x] Amendment A (Tool Framework)
- [x] Amendment B (AI Provider tool calling)
- [x] Amendment C (Runtime toolLoop)
- [x] Amendment D explicitly out of scope

## Implementation

- [x] Reuse `@agentforge/tool-framework` (no `@agentforge/tools`)
- [x] Amendment A contracts, codes, facts, signal, approvalRequirement
- [x] Reference tools `reference.echo` / `reference.counter`
- [x] Amendment B continuation builder + reference AI triggers
- [x] OpenAI tools + stream assembly + continuation translation
- [x] Amendment C durable `toolLoop` + recovery semantics
- [x] Host Composition tool loop + Security/Cap/Composition ordering
- [x] Fail closed `TOOL_APPROVAL_REQUIRED` (no fake wait)
- [x] Config: `TOOLS_ENABLED` + `TOOL_MAX_*` (defaults off / frozen limits)
- [x] SSE safe `tool_call` / `tool_result`
- [x] Probe `scripts/tool-calling-probe.mjs`
- [x] `pnpm test:tools` + CI step
- [x] Docs: `docs/guides/tools.md`, READMEs, `.env.example`, streaming cross-link
- [x] Package versions: tool-framework 0.2.0, ai-provider 0.4.0, openai 0.5.0, runtime 0.6.0, host 0.9.0

## Verification

- [x] Unit/recovery/security/approval/duplicate/boundary tests
- [x] E2E invoke + stream tool lifecycle
- [x] `pnpm verify`
- [x] `pnpm test:tools`
- [x] `pnpm test:streaming`
- [x] Tool-calling probe
- [x] Amendments A/B/C marked Implemented
- [x] Implementation report written

## Explicit non-goals confirmed

- [x] No Amendment D wait/resume
- [x] No new Persistence `tool_calls` schema
- [x] No exactly-once external effect claims
- [x] No MCP / browser / arbitrary shell-filesystem
- [x] No paid OpenAI tool CI
- [x] No Memory/Evaluation automatic tool retry or ToolResult persistence
