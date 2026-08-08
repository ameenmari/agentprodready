# Report — AgentProdReady v1.2.1 DX Honesty & Examples

**Implementation Mode:** Autonomous  
**Status:** V1.2.1 PATCH READY  
**Date:** 2026-08-08

## Memory documentation issue found

Public examples (root README, package README, Simple Memory / Simple Agent API guides) showed:

1. `createAgent({ model: reference(), memory: true })`
2. Turn 1: “My favorite color is blue.”
3. Turn 2: “What color did I mention?”
4. Implied `result.text` would answer with the color

External verification of `@agentprodready/agent-framework@1.2.0` showed turn 2 text was only the echoed question. Memory was wired; the story overpromised.

## Why `reference()` cannot demonstrate natural-language recall

`reference()` is a deterministic wiring/test provider. It effectively echoes the last user message. Simple Memory retrieves prior turns and injects them into the system prompt, but `reference()` does not reason over that context. Retrieval ≠ model intelligence.

## Documentation corrections

| Surface | Change |
|---|---|
| Root `README.md` | Separated wiring vs NL recall; reference honesty note |
| `packages/agent-framework/README.md` | Same; OpenAI NL example |
| `docs/guides/simple-memory.md` | Full rewrite: semantics, retrieval ≠ intelligence, two paths |
| `docs/guides/simple-agent-api.md` | Honest memory section |
| `docs/guides/getting-started.md` | Reference limitations + example links |
| `docs/product/agentprodready-v1.2-…` | Removed overpromising snippet; points to v1.2.1 / examples |

Explicit note added everywhere relevant:

> The reference provider is deterministic and intended for wiring/tests. It does not perform natural-language reasoning over recalled memory.

## Zero-key deterministic memory proof

Additive diagnostic (not a new architectural subsystem):

`result.metadata.memory` when Simple Memory is enabled:

- `enabled: true`
- `retrievedItemCount`
- `injected`
- `injectedPreview` (truncated; diagnostic only)

`examples/memory-agent/index-reference.mjs` and public DX assert capture → retrieve → inject (including `blue` in preview) **without** asserting NL answer text.

## OpenAI memory example

`examples/memory-agent/index-openai.mjs` — requires `OPENAI_API_KEY`; exits 1 with clear instructions if missing.  
Public DX: runs NL smoke only when `OPENAI_API_KEY` is set; otherwise logs `SKIP`.

## Tools example

`examples/tools-agent` — zero-key `createAgent` + `reference` + `tool` + `USE_TOOL:…`; `npm install` / `npm start`.

## GitHub metadata

`gh` is not available in this environment. Metadata was **not** changed. Manual steps/commands remain in:

`docs/implementation/manual-actions/github-repository-metadata.md`

Desired: description, homepage README, topics including `ai`, `developer-tools`.

## Tests

| Gate | Result |
|---|---|
| `pnpm verify` | PASS |
| `pnpm test:public-dx` | PASS (OpenAI NL SKIP — no key) |
| `pnpm test:tools` | PASS |
| `pnpm test:streaming` | PASS |
| `pnpm verify-versioning` | PASS (`agent-framework@1.2.1`) |
| Unit: memory wiring diagnostics | PASS |
| `npm pack --dry-run` (agent-framework) | PASS — README + dist only; no secrets |

## Package version recommendation

Bump **`@agentprodready/agent-framework` → `1.2.1`** is required:

- Packaged README changed
- Additive `metadata.memory` diagnostics ship in the published artifact

No other `@agentprodready/*` package bumps.

## Whether npm publish is required

**Yes, after approval** — to ship the honest package README and diagnostic metadata to registry consumers.  
This report does **not** publish, tag, or create a GitHub Release (per authorization).

## Non-goals confirmed

- No Memory redesign / durable memory / Context Assembly productization
- No Runtime / Security / Tool / Memory ownership changes
- No Node engines widen
- No new AI provider
