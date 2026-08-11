import { createTeam } from './create-team.js';
import { createWorkflow, type Workflow, type WorkflowResult } from './create-workflow.js';
import { TeamError } from './errors.js';
import type { Team, TeamMember, TeamResult } from './types.js';

export type OrchestratorTarget = TeamMember | Team | Workflow;

export type OrchestratorRunType = 'agent' | 'team' | 'workflow';

export type OrchestratorRunStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OrchestratorRun {
  readonly id: string;
  readonly type: OrchestratorRunType;
  readonly status: OrchestratorRunStatus;
  readonly input: unknown;
  readonly output?: unknown;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly error?: unknown;
  readonly approvalId?: string;
}

export interface CreateOrchestratorOptions {
  readonly onEvent?: (event: { readonly type: string; readonly runId: string; readonly at: string }) => void;
}

export interface Orchestrator {
  run(
    target: OrchestratorTarget,
    input: string,
    options?: { readonly signal?: AbortSignal },
  ): Promise<OrchestratorRun>;
  approve(
    runId: string,
    decision: { readonly approvalId: string; readonly approved: boolean; readonly approvedBy?: string },
  ): Promise<OrchestratorRun>;
  resume(runId: string, options?: { readonly signal?: AbortSignal }): Promise<OrchestratorRun>;
  getRun(runId: string): OrchestratorRun | undefined;
  cancel(runId: string): void;
}

interface TrackedRun {
  record: OrchestratorRun;
  target: OrchestratorTarget;
  kind: OrchestratorRunType;
}

class SimpleOrchestrator implements Orchestrator {
  readonly #runs = new Map<string, TrackedRun>();
  readonly #onEvent?: CreateOrchestratorOptions['onEvent'];

  public constructor(options: CreateOrchestratorOptions = {}) {
    this.#onEvent = options.onEvent;
  }

  public getRun(runId: string): OrchestratorRun | undefined {
    return this.#runs.get(runId)?.record;
  }

  public cancel(runId: string): void {
    const tracked = this.#runs.get(runId);
    if (tracked === undefined) return;
    if (isWorkflow(tracked.target)) tracked.target.cancel();
    else if (isTeam(tracked.target)) tracked.target.cancel();
    tracked.record = {
      ...tracked.record,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    };
  }

  public async run(
    target: OrchestratorTarget,
    input: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<OrchestratorRun> {
    if (typeof input !== 'string' || input.trim() === '') {
      throw new TeamError('TEAM_INVALID_CONFIG', 'orchestrator.run requires non-empty input');
    }
    const kind = detectKind(target);
    const id =
      kind === 'workflow'
        ? // workflow assigns its own run id; we sync after
          `orch:${crypto.randomUUID()}`
        : `orch:${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();
    let record: OrchestratorRun = {
      id,
      type: kind,
      status: 'running',
      input: input.trim(),
      startedAt,
    };
    this.#runs.set(id, { record, target, kind });
    this.#onEvent?.({ type: 'orchestration.started', runId: id, at: startedAt });

    try {
      if (kind === 'agent') {
        const result = await (target as TeamMember).invoke(input.trim());
        record = {
          ...record,
          status: 'completed',
          output: result.text,
          completedAt: new Date().toISOString(),
        };
      } else if (kind === 'team') {
        const result = await (target as Team).run(input.trim(), options);
        record = mapTeamResult(id, input.trim(), startedAt, result);
      } else {
        const result = await (target as Workflow).run(input.trim(), options);
        record = mapWorkflowResult(result, startedAt);
        // re-key under workflow run id for approve/resume
        this.#runs.delete(id);
        this.#runs.set(result.runId, { record, target, kind });
        this.#onEvent?.({
          type: result.status === 'waiting' ? 'human.approval.requested' : 'orchestration.completed',
          runId: result.runId,
          at: new Date().toISOString(),
        });
        return record;
      }
      this.#runs.set(id, { record, target, kind });
      this.#onEvent?.({
        type: 'orchestration.completed',
        runId: id,
        at: new Date().toISOString(),
      });
      return record;
    } catch (error) {
      record = {
        ...record,
        status: 'failed',
        error,
        completedAt: new Date().toISOString(),
      };
      this.#runs.set(id, { record, target, kind });
      this.#onEvent?.({
        type: 'orchestration.failed',
        runId: id,
        at: new Date().toISOString(),
      });
      throw error;
    }
  }

  public async approve(
    runId: string,
    decision: { readonly approvalId: string; readonly approved: boolean; readonly approvedBy?: string },
  ): Promise<OrchestratorRun> {
    const tracked = this.#runs.get(runId);
    if (tracked === undefined || !isWorkflow(tracked.target)) {
      throw new TeamError('TEAM_INVALID_CONFIG', `No workflow run pending approval: ${runId}`);
    }
    const result = await tracked.target.approve(runId, decision);
    const record = mapWorkflowResult(result, tracked.record.startedAt);
    this.#runs.set(runId, { ...tracked, record });
    return record;
  }

  public async resume(
    runId: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<OrchestratorRun> {
    const tracked = this.#runs.get(runId);
    if (tracked === undefined || !isWorkflow(tracked.target)) {
      throw new TeamError('TEAM_INVALID_CONFIG', `No resumable workflow run: ${runId}`);
    }
    const result = await tracked.target.resume(runId, options);
    const record = mapWorkflowResult(result, tracked.record.startedAt);
    this.#runs.set(runId, { ...tracked, record });
    return record;
  }
}

export function createOrchestrator(options: CreateOrchestratorOptions = {}): Orchestrator {
  return new SimpleOrchestrator(options);
}

function detectKind(target: OrchestratorTarget): OrchestratorRunType {
  if (isWorkflow(target)) return 'workflow';
  if (isTeam(target)) return 'team';
  if (typeof (target as TeamMember).invoke === 'function') return 'agent';
  throw new TeamError('TEAM_INVALID_CONFIG', 'orchestrator.run target must be agent, team, or workflow');
}

function isTeam(value: OrchestratorTarget): value is Team {
  return (
    typeof value === 'object' &&
    value !== null &&
    'run' in value &&
    typeof (value as Team).run === 'function' &&
    'getState' in value &&
    !('approve' in value && 'resume' in value && typeof (value as Workflow).approve === 'function')
  );
}

function isWorkflow(value: OrchestratorTarget): value is Workflow {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Workflow).run === 'function' &&
    typeof (value as Workflow).approve === 'function' &&
    typeof (value as Workflow).resume === 'function'
  );
}

function mapTeamResult(
  id: string,
  input: string,
  startedAt: string,
  result: TeamResult,
): OrchestratorRun {
  const status: OrchestratorRunStatus =
    result.status === 'partial' || result.status === 'idle'
      ? result.status === 'idle'
        ? 'pending'
        : 'completed'
      : result.status;
  return {
    id,
    type: 'team',
    status,
    input,
    output: result.text,
    startedAt,
    completedAt: new Date().toISOString(),
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

function mapWorkflowResult(result: WorkflowResult, startedAt?: string): OrchestratorRun {
  const status: OrchestratorRunStatus =
    result.status === 'idle' ? 'pending' : result.status;
  return {
    id: result.runId,
    type: 'workflow',
    status,
    input: '',
    output: result.text,
    ...(startedAt === undefined ? {} : { startedAt }),
    completedAt: new Date().toISOString(),
    ...(result.error === undefined ? {} : { error: result.error }),
    ...(result.approvalId === undefined ? {} : { approvalId: result.approvalId }),
  };
}

// re-export helpers used by hosts that build teams/workflows inline
export { createTeam, createWorkflow };
