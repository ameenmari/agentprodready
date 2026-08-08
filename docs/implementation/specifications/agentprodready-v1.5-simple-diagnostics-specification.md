# Specification — v1.5 Simple Diagnostics & Debugging

**Implementation Mode:** Autonomous  
**Product:** [agentprodready-v1.5-simple-diagnostics.md](../../product/agentprodready-v1.5-simple-diagnostics.md)  
**Plan:** [agentprodready-v1.5-simple-diagnostics-plan.md](../plans/agentprodready-v1.5-simple-diagnostics-plan.md)

## Decisions

- **D1** Additive fields on `AgentResultMetadata`: `provider`, `modelId`, `durationMs`, `tools` (always present on successful invoke).
- **D2** `tools`: `{ configured, invoked, succeeded, failed }` — counts only; never tool arguments/results.
- **D3** `memory` remains optional and unchanged when configured.
- **D4** `durationMs` is wall-clock milliseconds for a single `invoke` (authorize + Runtime handoff + capability), floored at `0`.
- **D5** Tool summary sourced from embedded tool loop on capability output; no-tools path reports zeros for invoked/succeeded/failed.
- **D6** On successful invoke after tools, failures that abort the turn surface as `SimpleAgentError` (no partial result metadata). Successful results therefore have `failed: 0`.
- **D7** Stream API unchanged; guide documents stream events vs invoke metadata.
- **D8** Do not import or wire `@agentprodready/observability` into Simple.
- **D9** Selective bump: framework `1.5.0`; `create-agentprodready` `0.1.2` pin `^1.5.0`.

## Acceptance

| ID | Criterion |
|---|---|
| A1 | Successful reference invoke includes provider/modelId/durationMs/tools |
| A2 | Tool invoke increments `tools.invoked` / `succeeded`; `configured` matches options |
| A3 | Memory diagnostics still present alongside new fields |
| A4 | Guide + zero-key example print metadata |
| A5 | Docs clarify SimpleAgentError codes and stream vs metadata |
| A6 | `pnpm verify` + `verify-versioning` + `test:public-dx` green |
| A7 | No Observability/Simple Runtime ownership redesign |

## Ownership

- Facade mapping owns Simple metadata shape.
- Runtime remains execution owner; capability output may carry opaque tool counts for the facade.
- Security authorization ownership unchanged.
