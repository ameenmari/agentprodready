# Specification — AgentProdReady v1.7 Team Orchestration

Implementation Mode: Autonomous

## Public contracts

```ts
createTeam(config: TeamConfig): Team

interface TeamConfig {
  name?: string;
  agents: Record<string, TeamMember>;
  strategy: 'sequential' | 'parallel' | 'supervisor' | ...;
  supervisor?: string;
  maxIterations?: number;
  sharedContext?: Record<string, unknown>;
  failurePolicy?: 'fail-fast' | 'continue' | 'best-effort';
  order?: string[]; // sequential order; default Object.keys insertion order
  supervisorDecide?: (ctx: SupervisorDecideContext) => Promise<SupervisorDecision> | SupervisorDecision;
  onEvent?: (event: TeamEvent) => void;
}

interface TeamMember {
  invoke(input: string): Promise<{ text: string; output?: unknown; executionId?: string }>;
  close?(): Promise<void>;
}

interface Team {
  run(input: string, options?: { signal?: AbortSignal }): Promise<TeamResult>;
  getState(): TeamState;
  cancel(): void;
}
```

## Strategy interface

```ts
interface OrchestrationStrategy {
  execute(context: OrchestrationContext): Promise<OrchestrationResult>;
}
```

## Supervisor decisions (structured)

`delegate` | `finish` | `parallel` — validated before execution. Prefer `supervisorDecide` when provided; otherwise parse JSON from supervisor agent text.

## Handoff

`handoff({ to, reason, input? })` returns a marker string. Strategies detect it in agent text/output and route through orchestration (no direct agent-to-agent calls).

## Errors

`TeamError` with codes: `TEAM_INVALID_CONFIG`, `TEAM_STRATEGY_FAILED`, `TEAM_AGENT_FAILED`, `TEAM_HANDOFF_FAILED`, `TEAM_CANCELLED`, `TEAM_SUPERVISOR_INVALID`.
