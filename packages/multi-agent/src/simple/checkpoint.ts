/** Checkpoint store for durable Simple Workflow / Orchestrator runs. */

export type CheckpointStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OrchestrationCheckpoint {
  readonly runId: string;
  readonly kind: 'workflow' | 'team' | 'agent';
  readonly workflowId?: string;
  readonly teamId?: string;
  readonly input: string;
  readonly completedSteps: readonly string[];
  readonly currentStep?: string;
  readonly stepOutputs: Readonly<Record<string, string>>;
  readonly status: CheckpointStatus;
  readonly pendingApproval?: Readonly<{
    readonly approvalId: string;
    readonly stepId: string;
  }>;
  readonly output?: string;
  readonly error?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CheckpointStore {
  save(checkpoint: OrchestrationCheckpoint): Promise<void>;
  load(runId: string): Promise<OrchestrationCheckpoint | undefined>;
}

export class InMemoryCheckpointStore implements CheckpointStore {
  readonly #items = new Map<string, OrchestrationCheckpoint>();

  public async save(checkpoint: OrchestrationCheckpoint): Promise<void> {
    this.#items.set(checkpoint.runId, Object.freeze({ ...checkpoint }));
  }

  public async load(runId: string): Promise<OrchestrationCheckpoint | undefined> {
    return this.#items.get(runId);
  }
}
