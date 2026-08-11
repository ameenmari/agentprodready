# AgentProdReady v1.7 — Team Orchestration (Simple API)

Implementation Mode: Autonomous

## Goal

Ship a working Simple Team API (`createTeam`) on `@agentprodready/multi-agent`, re-exported from `@agentprodready/agent-framework`, without breaking `createAgent`.

## Ownership

- Multi-agent decides **what** executes (strategy / handoff / supervisor decisions).
- Each member agent’s `invoke()` already delegates **how/when** to Runtime.
- Do not add private retry/timeout/persistence loops inside Team.

## Scope (milestone 1)

- `createTeam` + `Team.run` / `Team.cancel` / `Team.getState`
- Strategies: `sequential`, `parallel`, `supervisor`
- Handoff helper + recording
- Failure policies for parallel: `fail-fast` | `continue` | `best-effort`
- Events (in-memory listener on Team)
- Tests + 3 small examples
- Re-export from agent-framework

## Out of scope (later)

- hierarchical / consensus / debate-review / dynamic-assignment runners
- createWorkflow / createOrchestrator
- durable checkpoint resume for teams
- HITL approval gates on team steps
- effect ledger

## Cycle break

Remove `@agentprodready/agent-framework` from multi-agent deps (only used for `AgentLifecycleState` type). Inline that union. Add multi-agent as agent-framework dependency for re-exports.

## Verification

- Unit/integration tests for sequential, parallel, supervisor, handoff, failure, cancel
- Examples run with `reference()` model
