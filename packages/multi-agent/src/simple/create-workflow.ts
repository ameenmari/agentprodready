import { TeamError } from './errors.js';
import {
  InMemoryCheckpointStore,
  type CheckpointStore,
  type OrchestrationCheckpoint,
} from './checkpoint.js';
import type { Team, TeamMember, TeamMemberResult } from './types.js';

export type WorkflowRunnable =
  | TeamMember
  | Team
  | ((input: string) => Promise<string | TeamMemberResult>);

export interface WorkflowStepApproval {
  readonly requiredWhen?: (context: {
    readonly input: string;
    readonly stepOutputs: Readonly<Record<string, string>>;
  }) => boolean;
}

export interface WorkflowStep {
  readonly id: string;
  readonly run: WorkflowRunnable;
  readonly dependsOn?: readonly string[];
  readonly approval?: WorkflowStepApproval;
}

export interface CreateWorkflowOptions {
  readonly name?: string;
  readonly steps: readonly WorkflowStep[];
  readonly checkpointStore?: CheckpointStore;
  readonly onEvent?: (event: WorkflowSimpleEvent) => void;
}

export type WorkflowSimpleEvent =
  | { readonly type: 'workflow.started'; readonly runId: string; readonly workflowId: string }
  | { readonly type: 'workflow.completed'; readonly runId: string; readonly workflowId: string }
  | { readonly type: 'workflow.failed'; readonly runId: string; readonly error: string }
  | {
      readonly type: 'human.approval.requested';
      readonly runId: string;
      readonly workflowId: string;
      readonly stepId: string;
      readonly approvalId: string;
    }
  | {
      readonly type: 'step.completed';
      readonly runId: string;
      readonly stepId: string;
      readonly text: string;
    };

export type WorkflowRunStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowResult {
  readonly runId: string;
  readonly workflowId: string;
  readonly status: WorkflowRunStatus;
  readonly text: string;
  readonly stepOutputs: Readonly<Record<string, string>>;
  readonly approvalId?: string;
  readonly error?: string;
}

export interface Workflow {
  run(input: string, options?: { readonly signal?: AbortSignal }): Promise<WorkflowResult>;
  resume(runId: string, options?: { readonly signal?: AbortSignal }): Promise<WorkflowResult>;
  approve(
    runId: string,
    decision: { readonly approvalId: string; readonly approved: boolean; readonly approvedBy?: string },
  ): Promise<WorkflowResult>;
  getState(): { readonly workflowId: string; readonly status: WorkflowRunStatus; readonly runId?: string };
  cancel(): void;
}

class SimpleWorkflow implements Workflow {
  readonly #workflowId: string;
  readonly #steps: readonly WorkflowStep[];
  readonly #store: CheckpointStore;
  readonly #onEvent?: CreateWorkflowOptions['onEvent'];
  readonly #controller = new AbortController();
  #status: WorkflowRunStatus = 'idle';
  #runId: string | undefined;

  public constructor(
    workflowId: string,
    steps: readonly WorkflowStep[],
    store: CheckpointStore,
    onEvent?: CreateWorkflowOptions['onEvent'],
  ) {
    this.#workflowId = workflowId;
    this.#steps = steps;
    this.#store = store;
    this.#onEvent = onEvent;
  }

  public getState(): {
    readonly workflowId: string;
    readonly status: WorkflowRunStatus;
    readonly runId?: string;
  } {
    return {
      workflowId: this.#workflowId,
      status: this.#status,
      ...(this.#runId === undefined ? {} : { runId: this.#runId }),
    };
  }

  public cancel(): void {
    this.#controller.abort();
    if (this.#status === 'running' || this.#status === 'waiting') {
      this.#status = 'cancelled';
    }
  }

  public async run(
    input: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<WorkflowResult> {
    if (typeof input !== 'string' || input.trim() === '') {
      throw new TeamError('TEAM_INVALID_CONFIG', 'workflow.run requires non-empty input');
    }
    const runId = `workflow-run:${crypto.randomUUID()}`;
    this.#runId = runId;
    const checkpoint: OrchestrationCheckpoint = {
      runId,
      kind: 'workflow',
      workflowId: this.#workflowId,
      input: input.trim(),
      completedSteps: [],
      stepOutputs: {},
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.#store.save(checkpoint);
    this.#onEvent?.({ type: 'workflow.started', runId, workflowId: this.#workflowId });
    return this.#drive(checkpoint, options.signal);
  }

  public async resume(
    runId: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<WorkflowResult> {
    const checkpoint = await this.#store.load(runId);
    if (checkpoint === undefined) {
      throw new TeamError('TEAM_INVALID_CONFIG', `Unknown workflow run: ${runId}`);
    }
    if (checkpoint.status === 'completed') {
      return {
        runId,
        workflowId: this.#workflowId,
        status: 'completed',
        text: checkpoint.output ?? '',
        stepOutputs: checkpoint.stepOutputs,
      };
    }
    this.#runId = runId;
    return this.#drive(
      {
        ...checkpoint,
        status: 'running',
        updatedAt: new Date().toISOString(),
      },
      options.signal,
    );
  }

  public async approve(
    runId: string,
    decision: { readonly approvalId: string; readonly approved: boolean; readonly approvedBy?: string },
  ): Promise<WorkflowResult> {
    const checkpoint = await this.#store.load(runId);
    if (checkpoint === undefined) {
      throw new TeamError('TEAM_INVALID_CONFIG', `Unknown workflow run: ${runId}`);
    }
    if (
      checkpoint.status !== 'waiting' ||
      checkpoint.pendingApproval?.approvalId !== decision.approvalId
    ) {
      throw new TeamError('TEAM_INVALID_CONFIG', 'No matching pending approval for this run');
    }
    if (!decision.approved) {
      const error = `Approval rejected${decision.approvedBy === undefined ? '' : ` by ${decision.approvedBy}`}`;
      const { pendingApproval: _ignored, ...base } = checkpoint;
      const failed: OrchestrationCheckpoint = {
        ...base,
        status: 'failed',
        error,
        updatedAt: new Date().toISOString(),
      };
      await this.#store.save(failed);
      this.#status = 'failed';
      return {
        runId,
        workflowId: this.#workflowId,
        status: 'failed',
        text: '',
        stepOutputs: checkpoint.stepOutputs,
        error,
      };
    }
    const stepId = checkpoint.pendingApproval.stepId;
    const { pendingApproval: _ignoredApproval, ...baseResume } = checkpoint;
    const resumed: OrchestrationCheckpoint = {
      ...baseResume,
      status: 'running',
      completedSteps: [...checkpoint.completedSteps, `approval:${stepId}`],
      updatedAt: new Date().toISOString(),
    };
    await this.#store.save(resumed);
    this.#runId = runId;
    return this.#drive(resumed);
  }

  async #drive(
    initial: OrchestrationCheckpoint,
    signal?: AbortSignal,
  ): Promise<WorkflowResult> {
    this.#status = 'running';
    let checkpoint = initial;
    const completed = new Set(checkpoint.completedSteps);
    const outputs: Record<string, string> = { ...checkpoint.stepOutputs };

    try {
      while (true) {
        this.#ensureActive(signal);
        const ready = this.#steps.filter(
          (step) =>
            !completed.has(step.id) &&
            (step.dependsOn ?? []).every((dep) => completed.has(dep)),
        );

        // pending approval gate for a ready step
        for (const step of ready) {
          const needsApproval = Boolean(
            step.approval?.requiredWhen?.({
              input: checkpoint.input,
              stepOutputs: outputs,
            }),
          );
          if (needsApproval && !completed.has(`approval:${step.id}`)) {
            const approvalId = `approval:${crypto.randomUUID()}`;
            checkpoint = {
              ...checkpoint,
              status: 'waiting',
              currentStep: step.id,
              stepOutputs: outputs,
              pendingApproval: { approvalId, stepId: step.id },
              updatedAt: new Date().toISOString(),
            };
            await this.#store.save(checkpoint);
            this.#status = 'waiting';
            this.#onEvent?.({
              type: 'human.approval.requested',
              runId: checkpoint.runId,
              workflowId: this.#workflowId,
              stepId: step.id,
              approvalId,
            });
            return {
              runId: checkpoint.runId,
              workflowId: this.#workflowId,
              status: 'waiting',
              text: '',
              stepOutputs: outputs,
              approvalId,
            };
          }
        }

        const executable = ready.filter((step) => {
          const needsApproval = Boolean(
            step.approval?.requiredWhen?.({
              input: checkpoint.input,
              stepOutputs: outputs,
            }),
          );
          return !needsApproval || completed.has(`approval:${step.id}`);
        });

        if (executable.length === 0) {
          if (completed.size >= this.#steps.length) {
            break;
          }
          // waiting on approval already handled; otherwise blocked
          if (checkpoint.status === 'waiting') {
            return {
              runId: checkpoint.runId,
              workflowId: this.#workflowId,
              status: 'waiting',
              text: '',
              stepOutputs: outputs,
              ...(checkpoint.pendingApproval === undefined
                ? {}
                : { approvalId: checkpoint.pendingApproval.approvalId }),
            };
          }
          break;
        }

        // Fan-out: execute independent ready steps in parallel
        const settlements = await Promise.all(
          executable.map(async (step) => {
            this.#ensureActive(signal);
            const input = resolveStepInput(checkpoint.input, outputs, step.dependsOn);
            const text = await executeRunnable(step.run, input);
            return { stepId: step.id, text };
          }),
        );

        for (const { stepId, text } of settlements) {
          completed.add(stepId);
          outputs[stepId] = text;
          this.#onEvent?.({
            type: 'step.completed',
            runId: checkpoint.runId,
            stepId,
            text,
          });
        }

        const lastStepId = settlements.at(-1)?.stepId;
        checkpoint = {
          ...checkpoint,
          status: 'running',
          completedSteps: [...completed],
          stepOutputs: outputs,
          ...(lastStepId === undefined ? {} : { currentStep: lastStepId }),
          updatedAt: new Date().toISOString(),
        };
        await this.#store.save(checkpoint);
      }

      const exitSteps = this.#steps.filter(
        (step) => !this.#steps.some((other) => (other.dependsOn ?? []).includes(step.id)),
      );
      const text =
        exitSteps.map((step) => outputs[step.id]).filter(Boolean).join('\n') ||
        Object.values(outputs).at(-1) ||
        '';

      checkpoint = {
        ...checkpoint,
        status: 'completed',
        output: text,
        stepOutputs: outputs,
        completedSteps: [...completed],
        updatedAt: new Date().toISOString(),
      };
      await this.#store.save(checkpoint);
      this.#status = 'completed';
      this.#onEvent?.({
        type: 'workflow.completed',
        runId: checkpoint.runId,
        workflowId: this.#workflowId,
      });
      return {
        runId: checkpoint.runId,
        workflowId: this.#workflowId,
        status: 'completed',
        text,
        stepOutputs: outputs,
      };
    } catch (error) {
      const cancelled =
        this.#controller.signal.aborted ||
        Boolean(signal?.aborted) ||
        (error instanceof TeamError && error.code === 'TEAM_CANCELLED');
      const message = error instanceof Error ? error.message : String(error);
      checkpoint = {
        ...checkpoint,
        status: cancelled ? 'cancelled' : 'failed',
        error: message,
        stepOutputs: outputs,
        completedSteps: [...completed],
        updatedAt: new Date().toISOString(),
      };
      await this.#store.save(checkpoint);
      this.#status = cancelled ? 'cancelled' : 'failed';
      if (!cancelled) {
        this.#onEvent?.({
          type: 'workflow.failed',
          runId: checkpoint.runId,
          error: message,
        });
      }
      return {
        runId: checkpoint.runId,
        workflowId: this.#workflowId,
        status: this.#status,
        text: Object.values(outputs).at(-1) ?? '',
        stepOutputs: outputs,
        error: message,
      };
    }
  }

  #ensureActive(signal?: AbortSignal): void {
    if (this.#controller.signal.aborted || signal?.aborted) {
      throw new TeamError('TEAM_CANCELLED', 'Workflow run cancelled');
    }
  }
}

export function createWorkflow(options: CreateWorkflowOptions): Workflow {
  if (!Array.isArray(options.steps) || options.steps.length === 0) {
    throw new TeamError('TEAM_INVALID_CONFIG', 'createWorkflow requires at least one step');
  }
  const ids = new Set<string>();
  for (const step of options.steps) {
    if (typeof step.id !== 'string' || step.id.trim() === '') {
      throw new TeamError('TEAM_INVALID_CONFIG', 'Each workflow step requires an id');
    }
    if (ids.has(step.id)) {
      throw new TeamError('TEAM_INVALID_CONFIG', `Duplicate workflow step id: ${step.id}`);
    }
    ids.add(step.id);
    if (step.run === undefined) {
      throw new TeamError('TEAM_INVALID_CONFIG', `Step ${step.id} requires run`);
    }
    for (const dep of step.dependsOn ?? []) {
      if (!options.steps.some((candidate) => candidate.id === dep)) {
        throw new TeamError('TEAM_INVALID_CONFIG', `Unknown dependsOn "${dep}" on step ${step.id}`);
      }
    }
  }
  const roots = options.steps.filter((step) => (step.dependsOn ?? []).length === 0);
  if (roots.length === 0) {
    throw new TeamError('TEAM_INVALID_CONFIG', 'Workflow must have at least one root step');
  }
  const workflowId =
    typeof options.name === 'string' && options.name.trim() !== ''
      ? options.name.trim()
      : `workflow:${crypto.randomUUID()}`;
  return new SimpleWorkflow(
    workflowId,
    options.steps,
    options.checkpointStore ?? new InMemoryCheckpointStore(),
    options.onEvent,
  );
}

function resolveStepInput(
  rootInput: string,
  outputs: Readonly<Record<string, string>>,
  dependsOn: readonly string[] | undefined,
): string {
  if (dependsOn === undefined || dependsOn.length === 0) return rootInput;
  if (dependsOn.length === 1) return outputs[dependsOn[0]!] ?? rootInput;
  return dependsOn.map((id) => `[${id}] ${outputs[id] ?? ''}`).join('\n');
}

async function executeRunnable(runnable: WorkflowRunnable, input: string): Promise<string> {
  if (typeof runnable === 'function') {
    const result = await runnable(input);
    return typeof result === 'string' ? result : result.text;
  }
  if (isTeam(runnable)) {
    const result = await runnable.run(input);
    return result.text;
  }
  const result = await runnable.invoke(input);
  return result.text;
}

function isTeam(value: WorkflowRunnable): value is Team {
  return (
    typeof value === 'object' &&
    value !== null &&
    'run' in value &&
    typeof (value as Team).run === 'function' &&
    'getState' in value
  );
}
