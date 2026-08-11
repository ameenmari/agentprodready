# AgentProdReady v1.6 — Production Durability Implementation Plan

**Document Type:** Product Implementation Plan  
**Product:** AgentProdReady v1.6 Production Durability  
**Plan Version:** 1.0  
**Status:** Approved (Autonomous)  
**Implementation Mode:** Autonomous  
**Related:** [product doc](../../product/agentprodready-v1.6-production-durability.md), [Amendment D](../amendments/04-runtime-tool-approval-wait-amendment.md)

---

## Objective

Ship durable Simple Memory, durable HITL wait/resume, stream replay/reconnect, idempotent-tool ledger, and Gemini provider on the public package line — updating GitHub docs and npm package surfaces.

---

## Documents Reviewed

| Document | Reviewed |
| --- | --- |
| README.md / ROADMAP.md / CHANGELOG.md | ☐ → [x] |
| docs/cursor-start-here.md | [x] |
| implementation-modes.md | [x] |
| dependency-graph.md | [x] |
| Blueprints 04, 08, 09, 11, 18, 20, 24 | [x] |
| v1.2 Simple Memory review (never redefine memory:true) | [x] |
| v0.9 Amendment D deferral | [x] |
| Existing checkpoint / persistence / HITL packages | [x] |

---

## Work packages

### WP1 — Durable Simple Memory

- Extend `SimpleMemory` discriminant: `in-memory` | `file` | `postgres`
- `fileMemory({ directory, namespace? })` → file-backed MemoryStorage/Search in `@agentprodready/memory`
- `postgresMemory({ connectionString, namespace? })` → PersistenceBackedMemoryProvider + postgres peer
- Keep `memory: true` ≡ `inMemory()`
- Retention category durable (not session-only) for file/postgres
- Tests: restart simulation for file path

### WP2 — Amendment D + Simple HITL

- Add `awaiting-approval` tool-loop stage
- Wire HumanInteractionFramework into embedded platform
- RuntimeInteractionPort that parks/resumes executions
- Simple: `approve` / `reject` / `resume`; enrich `AGENT_TOOL_APPROVAL_REQUIRED`
- Persist wait checkpoints via existing Runtime checkpoint store (embedded in-memory + optional durable)

### WP3 — Stream replay + tool ledger

- `StreamEventLog` port + in-memory/file implementations on Runtime
- Persist deltas during `stream`; `resumeFrom` / `replayStream`
- `ToolIdempotencyLedger` in Tool Framework; coordinator consults before invoke for `idempotent`
- Docs: exactly-once-**capable** for ledgered idempotent tools; non-claim for non-idempotent external effects

### WP4 — Gemini provider

- New `@agentprodready/ai-provider-gemini@1.0.0` (Google Generative Language API)
- Simple `gemini(modelId)`; peer optional; `GEMINI_API_KEY`
- Host `AI_PROVIDER=gemini`
- Example + guide

### WP5 — Docs & versioning

- README limitations → updated capability table
- ROADMAP: move these from Later/Next into Shipped
- Guides: durable-memory, hitl-approval, stream-replay, gemini
- Package READMEs; CHANGELOG 1.6.0
- Selective version bumps + verify-versioning

---

## Acceptance criteria → verification

| Criterion | Verification |
|---|---|
| File memory survives restart | Vitest write → new session → retrieve |
| Postgres memory path | Unit with PersistenceBacked + mock/in-memory persistence when no DB; optional postgres job |
| HITL approve/resume | Spec: approval pause then resume executes tool once |
| HITL reject | Spec: no tool invoke |
| Stream resumeFrom | Spec: skip already-seen sequences |
| Idempotent ledger | Spec: second invoke same key returns cached result |
| Gemini helper | Config + adapter unit tests (no live key required) |
| Docs honesty | README no longer lists these as hard blockers |

---

## Risks

| Risk | Mitigation |
|---|---|
| Breaking Agent interface | Additive methods; invoke still throws on approval wait |
| Postgres peer weight | Optional peer; fileMemory needs no postgres |
| Over-claiming EO | Explicit language in README/CHANGELOG |
| Gemini API churn | Thin adapter + translate layer like Anthropic |

---

## Stop conditions

Stop only if ownership conflict appears (e.g. Simple inventing a second Runtime). Record field-level choices in the specification.
