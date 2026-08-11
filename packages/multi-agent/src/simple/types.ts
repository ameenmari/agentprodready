/** Approachable Simple Team API types (v1.7). */

export type TeamStrategyName =
  | 'sequential'
  | 'parallel'
  | 'supervisor'
  | 'hierarchical'
  | 'consensus'
  | 'debate-review'
  | 'dynamic-assignment';

export type TeamFailurePolicy = 'fail-fast' | 'continue' | 'best-effort';

export type TeamRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial';

/** Duck-typed agent surface — Simple `Agent` satisfies this without a package cycle. */
export interface TeamMember {
  invoke(input: string): Promise<TeamMemberResult>;
  close?(): Promise<void>;
}

export interface TeamMemberResult {
  readonly text: string;
  readonly output?: unknown;
  readonly executionId?: string;
}

export interface AgentTask {
  readonly id: string;
  readonly title?: string;
  readonly input: string;
  readonly assignedTo?: string;
  readonly dependsOn?: readonly string[];
  readonly status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  readonly result?: TeamMemberResult;
  readonly error?: string;
}

export type SupervisorDecision =
  | { readonly action: 'delegate'; readonly agent: string; readonly task: string }
  | { readonly action: 'finish'; readonly output: string }
  | {
      readonly action: 'parallel';
      readonly tasks: readonly Readonly<{ agent: string; task: string }>[];
    };

export interface SupervisorDecideContext {
  readonly runId: string;
  readonly teamId: string;
  readonly input: string;
  readonly iteration: number;
  readonly history: readonly TeamEvent[];
  readonly agentOutputs: Readonly<Record<string, TeamMemberResult>>;
  readonly sharedContext: Record<string, unknown>;
}

export interface HandoffRequest {
  readonly to: string;
  readonly reason: string;
  readonly input?: string;
}

export type TeamEvent =
  | {
      readonly type: 'orchestration.started';
      readonly runId: string;
      readonly teamId: string;
      readonly strategy: TeamStrategyName;
      readonly at: string;
    }
  | {
      readonly type: 'orchestration.completed';
      readonly runId: string;
      readonly teamId: string;
      readonly status: TeamRunStatus;
      readonly at: string;
    }
  | {
      readonly type: 'orchestration.failed';
      readonly runId: string;
      readonly teamId: string;
      readonly error: string;
      readonly at: string;
    }
  | {
      readonly type: 'agent.started';
      readonly runId: string;
      readonly teamId: string;
      readonly agentId: string;
      readonly taskId: string;
      readonly at: string;
    }
  | {
      readonly type: 'agent.completed';
      readonly runId: string;
      readonly teamId: string;
      readonly agentId: string;
      readonly taskId: string;
      readonly at: string;
    }
  | {
      readonly type: 'agent.failed';
      readonly runId: string;
      readonly teamId: string;
      readonly agentId: string;
      readonly taskId: string;
      readonly error: string;
      readonly at: string;
    }
  | {
      readonly type: 'task.created';
      readonly runId: string;
      readonly teamId: string;
      readonly taskId: string;
      readonly agentId?: string;
      readonly at: string;
    }
  | {
      readonly type: 'task.assigned';
      readonly runId: string;
      readonly teamId: string;
      readonly taskId: string;
      readonly agentId: string;
      readonly at: string;
    }
  | {
      readonly type: 'task.completed';
      readonly runId: string;
      readonly teamId: string;
      readonly taskId: string;
      readonly agentId: string;
      readonly at: string;
    }
  | {
      readonly type: 'task.failed';
      readonly runId: string;
      readonly teamId: string;
      readonly taskId: string;
      readonly agentId: string;
      readonly error: string;
      readonly at: string;
    }
  | {
      readonly type: 'handoff.requested';
      readonly runId: string;
      readonly teamId: string;
      readonly fromAgent: string;
      readonly toAgent: string;
      readonly reason: string;
      readonly taskId: string;
      readonly at: string;
    }
  | {
      readonly type: 'handoff.completed';
      readonly runId: string;
      readonly teamId: string;
      readonly fromAgent: string;
      readonly toAgent: string;
      readonly taskId: string;
      readonly at: string;
    }
  | {
      readonly type: 'supervisor.decision';
      readonly runId: string;
      readonly teamId: string;
      readonly decision: SupervisorDecision;
      readonly iteration: number;
      readonly at: string;
    };

export interface TeamConfig {
  readonly name?: string;
  readonly agents: Readonly<Record<string, TeamMember>>;
  readonly strategy: TeamStrategyName;
  readonly supervisor?: string;
  readonly maxIterations?: number;
  readonly sharedContext?: Readonly<Record<string, unknown>>;
  readonly failurePolicy?: TeamFailurePolicy;
  /** Explicit sequential/dynamic order; defaults to Object.keys(agents). */
  readonly order?: readonly string[];
  readonly supervisorDecide?: (
    context: SupervisorDecideContext,
  ) => SupervisorDecision | Promise<SupervisorDecision>;
  readonly onEvent?: (event: TeamEvent) => void;
}

export interface TeamResult {
  readonly runId: string;
  readonly teamId: string;
  readonly status: TeamRunStatus;
  readonly text: string;
  readonly output?: unknown;
  readonly agentOutputs: Readonly<Record<string, TeamMemberResult>>;
  readonly tasks: readonly AgentTask[];
  readonly events: readonly TeamEvent[];
  readonly error?: string;
}

export interface TeamState {
  readonly runId?: string;
  readonly teamId: string;
  readonly status: TeamRunStatus;
  readonly strategy: TeamStrategyName;
  readonly agentIds: readonly string[];
}

export interface Team {
  run(input: string, options?: { readonly signal?: AbortSignal }): Promise<TeamResult>;
  getState(): TeamState;
  cancel(): void;
}

export interface OrchestrationResult {
  readonly status: TeamRunStatus;
  readonly text: string;
  readonly output?: unknown;
  readonly agentOutputs: Readonly<Record<string, TeamMemberResult>>;
  readonly tasks: readonly AgentTask[];
  readonly error?: string;
}

export interface OrchestrationContext {
  readonly runId: string;
  readonly teamId: string;
  readonly input: string;
  readonly agents: Readonly<Record<string, TeamMember>>;
  readonly order: readonly string[];
  readonly sharedContext: Record<string, unknown>;
  readonly failurePolicy: TeamFailurePolicy;
  readonly maxIterations: number;
  readonly supervisorId?: string;
  readonly supervisorDecide?: TeamConfig['supervisorDecide'];
  readonly signal?: AbortSignal;
  readonly history: TeamEvent[];
  emit(event: TeamEvent): void;
  createTaskId(prefix?: string): string;
  ensureNotCancelled(): void;
}

export interface OrchestrationStrategy {
  readonly name: TeamStrategyName;
  execute(context: OrchestrationContext): Promise<OrchestrationResult>;
}
