# Plan — AgentProdReady v1.2.1 DX Honesty & Examples

**Implementation Mode:** Autonomous  
**Scope:** Documentation/product-story honesty + examples. Not a Memory redesign.

## Problem

`memory: true` is wired (capture → retrieve → inject into prompt), but public examples using `reference()` implied natural-language recall (`"blue"` answers). `reference()` echoes the last user message and cannot reason over injected memory.

## Goals

1. Honest README/guide examples for memory + `reference()`.
2. Zero-key deterministic memory wiring proof via small additive `result.metadata.memory` diagnostics (not a new architectural subsystem).
3. OpenAI-gated natural-language recall example.
4. `examples/tools-agent` and `examples/memory-agent`.
5. Public DX coverage without mandatory paid API calls.
6. Attempt GitHub About metadata; else document manual steps.

## Non-goals

- Durable memory / Context Assembly productization
- Ownership changes (Runtime / Security / Tool / Memory)
- Node engines widen
- New AI providers
- npm publish / git tag / GitHub Release

## Workstreams

| ID | Work | Verification |
|---|---|---|
| W1 | Plan + specification | Artifacts present |
| W2 | Additive `metadata.memory` diagnostics on Simple results | Unit + public-dx |
| W3 | Rewrite root/package README + guides | Doc audit |
| W4 | `examples/tools-agent`, `examples/memory-agent` | Manual run paths |
| W5 | Extend `test-public-dx.mjs` | `pnpm test:public-dx` |
| W6 | GitHub topics/description | gh or manual report |
| W7 | Version decision + report/checklist | Gates green |

## Package version

Bump `@agentprodready/agent-framework` → **1.2.1** because packaged README + additive result metadata change the published artifact. No other package bumps.

## Stop conditions

Stop for review only if Memory ownership or public architectural contracts must expand beyond diagnostic metadata.
