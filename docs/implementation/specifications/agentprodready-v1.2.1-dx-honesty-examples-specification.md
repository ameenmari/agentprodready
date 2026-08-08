# Specification — AgentProdReady v1.2.1 DX Honesty & Examples

**Implementation Mode:** Autonomous  
**Package:** `@agentprodready/agent-framework@1.2.1` (only)

## 1. Documentation honesty

Any example pairing `reference()` with `memory: true` / `inMemory()` MUST NOT imply natural-language recall.

Required note (or equivalent):

> The reference provider is deterministic and intended for wiring/tests. It does not perform natural-language reasoning over recalled memory.

Natural-language recall demos MUST use `openai(...)` and require `OPENAI_API_KEY`.

## 2. Zero-key memory diagnostics (minimal)

When Simple Memory is enabled, `AgentResult.metadata.memory` MAY include:

| Field | Meaning |
|---|---|
| `enabled` | `true` when memory session is active for the agent |
| `retrievedItemCount` | Count of memories returned by retrieve-for-prompt |
| `injected` | `true` when a non-empty memory block was added to the prompt |
| `injectedPreview` | Truncated preview of the injected block (diagnostic only; not a durable API contract) |

Absent when memory is not configured.

This is diagnostic evidence for wiring demos/tests — not a new Memory Engine product surface and not a host ownership change.

## 3. Examples

### `examples/tools-agent`

- Zero-key: `createAgent` + `reference` + `tool`
- Deterministic `USE_TOOL:<name>:<json>` invoke
- `npm install` / `npm start` (registry dependency, no workspace imports)

### `examples/memory-agent`

- `index-reference.mjs` — wiring path; assert diagnostics; explicitly state reference does not NL-recall
- `index-openai.mjs` — fact + question; requires `OPENAI_API_KEY`
- README separates paths A/B

## 4. Public DX

Extend `scripts/test-public-dx.mjs`:

- hello + tools still pass
- memory wiring: two turns; assert `metadata.memory.injected` / counts; do **not** assert NL answer `"blue"`
- if `OPENAI_API_KEY` set, optionally run NL recall smoke; otherwise skip with log

## 5. Acceptance

| ID | Criterion |
|---|---|
| A1 | No public doc implies reference NL memory recall |
| A2 | Zero-key path proves capture/retrieve/inject via diagnostics |
| A3 | OpenAI memory example exists and skips without key |
| A4 | tools-agent example works zero-key |
| A5 | `pnpm verify`, `test:public-dx`, `test:tools`, `test:streaming` pass |
| A6 | Report + checklist complete; no publish/tag/release |
