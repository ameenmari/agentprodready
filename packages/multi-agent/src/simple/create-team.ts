import { TeamError } from './errors.js';
import { resolveStrategy } from './strategies/index.js';
import type {
  OrchestrationContext,
  Team,
  TeamConfig,
  TeamEvent,
  TeamResult,
  TeamState,
  TeamStrategyName,
} from './types.js';

class SimpleTeam implements Team {
  readonly #config: NormalizedTeamConfig;
  readonly #controller = new AbortController();
  #status: TeamState['status'] = 'idle';
  #runId: string | undefined;

  public constructor(config: NormalizedTeamConfig) {
    this.#config = config;
  }

  public getState(): TeamState {
    return {
      ...(this.#runId === undefined ? {} : { runId: this.#runId }),
      teamId: this.#config.teamId,
      status: this.#status,
      strategy: this.#config.strategy,
      agentIds: this.#config.order,
    };
  }

  public cancel(): void {
    this.#controller.abort();
    if (this.#status === 'running') {
      this.#status = 'cancelled';
    }
  }

  public async run(
    input: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<TeamResult> {
    if (typeof input !== 'string' || input.trim() === '') {
      throw new TeamError('TEAM_INVALID_CONFIG', 'team.run requires a non-empty input string');
    }
    if (this.#status === 'running') {
      throw new TeamError('TEAM_INVALID_CONFIG', 'Team already has a running orchestration');
    }

    const runId = `team-run:${crypto.randomUUID()}`;
    this.#runId = runId;
    this.#status = 'running';

    const history: TeamEvent[] = [];
    const sharedContext: Record<string, unknown> = { ...this.#config.sharedContext };
    let taskCounter = 0;

    const emit = (event: TeamEvent): void => {
      history.push(event);
      this.#config.onEvent?.(event);
    };

    const linked = linkSignals(this.#controller.signal, options.signal);

    const context: OrchestrationContext = {
      runId,
      teamId: this.#config.teamId,
      input: input.trim(),
      agents: this.#config.agents,
      order: this.#config.order,
      sharedContext,
      failurePolicy: this.#config.failurePolicy,
      maxIterations: this.#config.maxIterations,
      ...(this.#config.supervisorId === undefined
        ? {}
        : { supervisorId: this.#config.supervisorId }),
      ...(this.#config.supervisorDecide === undefined
        ? {}
        : { supervisorDecide: this.#config.supervisorDecide }),
      signal: linked.signal,
      history,
      emit,
      createTaskId: (prefix = 'task') => {
        taskCounter += 1;
        return `${prefix}:${String(taskCounter)}`;
      },
      ensureNotCancelled: () => {
        if (linked.signal.aborted || this.#controller.signal.aborted) {
          throw new TeamError('TEAM_CANCELLED', 'Team run cancelled');
        }
      },
    };

    emit({
      type: 'orchestration.started',
      runId,
      teamId: this.#config.teamId,
      strategy: this.#config.strategy,
      at: new Date().toISOString(),
    });

    try {
      const strategy = resolveStrategy(this.#config.strategy);
      const outcome = await strategy.execute(context);
      this.#status = outcome.status === 'partial' ? 'partial' : outcome.status;
      if (this.#status === 'failed') {
        emit({
          type: 'orchestration.failed',
          runId,
          teamId: this.#config.teamId,
          error: outcome.error ?? 'Team orchestration failed',
          at: new Date().toISOString(),
        });
      } else {
        emit({
          type: 'orchestration.completed',
          runId,
          teamId: this.#config.teamId,
          status: this.#status,
          at: new Date().toISOString(),
        });
      }
      return {
        runId,
        teamId: this.#config.teamId,
        status: this.#status,
        text: outcome.text,
        ...(outcome.output === undefined ? {} : { output: outcome.output }),
        agentOutputs: outcome.agentOutputs,
        tasks: outcome.tasks,
        events: [...history],
        ...(outcome.error === undefined ? {} : { error: outcome.error }),
      };
    } catch (error) {
      const aborted =
        this.#controller.signal.aborted || Boolean(options.signal?.aborted);
      const cancelled =
        aborted || (error instanceof TeamError && error.code === 'TEAM_CANCELLED');
      this.#status = cancelled ? 'cancelled' : 'failed';
      const message = error instanceof Error ? error.message : String(error);
      const at = new Date().toISOString();
      if (cancelled) {
        emit({
          type: 'orchestration.completed',
          runId,
          teamId: this.#config.teamId,
          status: 'cancelled',
          at,
        });
        return {
          runId,
          teamId: this.#config.teamId,
          status: 'cancelled',
          text: '',
          agentOutputs: {},
          tasks: [],
          events: [...history],
          error: message,
        };
      }
      emit({
        type: 'orchestration.failed',
        runId,
        teamId: this.#config.teamId,
        error: message,
        at,
      });
      throw error instanceof TeamError
        ? error
        : new TeamError('TEAM_STRATEGY_FAILED', message, error);
    } finally {
      linked.dispose();
    }
  }
}

interface NormalizedTeamConfig {
  readonly teamId: string;
  readonly strategy: TeamStrategyName;
  readonly agents: TeamConfig['agents'];
  readonly order: readonly string[];
  readonly failurePolicy: NonNullable<TeamConfig['failurePolicy']>;
  readonly maxIterations: number;
  readonly sharedContext: Readonly<Record<string, unknown>>;
  readonly supervisorId?: string;
  readonly supervisorDecide?: TeamConfig['supervisorDecide'];
  readonly onEvent?: TeamConfig['onEvent'];
}

export function createTeam(config: TeamConfig): Team {
  return new SimpleTeam(normalizeConfig(config));
}

function normalizeConfig(config: TeamConfig): NormalizedTeamConfig {
  if (config === null || typeof config !== 'object') {
    throw new TeamError('TEAM_INVALID_CONFIG', 'createTeam requires a config object');
  }
  if (config.agents === null || typeof config.agents !== 'object') {
    throw new TeamError('TEAM_INVALID_CONFIG', 'createTeam requires agents');
  }
  const order =
    config.order !== undefined
      ? [...config.order]
      : Object.keys(config.agents);
  if (order.length < 2) {
    throw new TeamError('TEAM_INVALID_CONFIG', 'createTeam requires at least two agents');
  }
  for (const id of order) {
    if (config.agents[id] === undefined) {
      throw new TeamError('TEAM_INVALID_CONFIG', `Agent missing for id: ${id}`);
    }
    if (typeof config.agents[id]?.invoke !== 'function') {
      throw new TeamError('TEAM_INVALID_CONFIG', `Agent "${id}" must implement invoke()`);
    }
  }
  for (const id of Object.keys(config.agents)) {
    if (!order.includes(id) && config.strategy !== 'supervisor') {
      // allow extra agents only for supervisor-controlled routing
    }
  }

  const strategy = config.strategy;
  if (typeof strategy !== 'string' || strategy.trim() === '') {
    throw new TeamError('TEAM_INVALID_CONFIG', 'createTeam requires strategy');
  }

  let supervisorId = config.supervisor;
  const needsSupervisor =
    strategy === 'supervisor' ||
    strategy === 'hierarchical' ||
    strategy === 'dynamic-assignment';
  if (needsSupervisor || strategy === 'debate-review') {
    if (needsSupervisor) {
      supervisorId = supervisorId ?? order[0];
      if (supervisorId === undefined || config.agents[supervisorId] === undefined) {
        throw new TeamError(
          'TEAM_INVALID_CONFIG',
          `${strategy} strategy requires supervisor agent id present in agents`,
        );
      }
    } else {
      supervisorId = supervisorId ?? order.at(-1);
    }
  } else if (supervisorId !== undefined) {
    throw new TeamError(
      'TEAM_INVALID_CONFIG',
      'supervisor is only valid for supervisor/hierarchical/dynamic-assignment/debate-review',
    );
  }

  const maxIterations = config.maxIterations ?? 8;
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 100) {
    throw new TeamError('TEAM_INVALID_CONFIG', 'maxIterations must be an integer 1..100');
  }

  const failurePolicy = config.failurePolicy ?? 'fail-fast';
  if (
    failurePolicy !== 'fail-fast' &&
    failurePolicy !== 'continue' &&
    failurePolicy !== 'best-effort'
  ) {
    throw new TeamError('TEAM_INVALID_CONFIG', 'Invalid failurePolicy');
  }

  const teamId =
    typeof config.name === 'string' && config.name.trim() !== ''
      ? config.name.trim()
      : `team:${crypto.randomUUID()}`;

  return {
    teamId,
    strategy,
    agents: config.agents,
    order,
    failurePolicy,
    maxIterations,
    sharedContext: { ...(config.sharedContext ?? {}) },
    ...(supervisorId === undefined ? {} : { supervisorId }),
    ...(config.supervisorDecide === undefined
      ? {}
      : { supervisorDecide: config.supervisorDecide }),
    ...(config.onEvent === undefined ? {} : { onEvent: config.onEvent }),
  };
}

function linkSignals(
  internal: AbortSignal,
  external?: AbortSignal,
): { readonly signal: AbortSignal; dispose(): void } {
  if (external === undefined) {
    return { signal: internal, dispose: () => undefined };
  }
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  if (internal.aborted || external.aborted) {
    controller.abort();
    return { signal: controller.signal, dispose: () => undefined };
  }
  internal.addEventListener('abort', abort);
  external.addEventListener('abort', abort);
  return {
    signal: controller.signal,
    dispose: () => {
      internal.removeEventListener('abort', abort);
      external.removeEventListener('abort', abort);
    },
  };
}
