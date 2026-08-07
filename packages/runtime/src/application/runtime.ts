/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { CreateExecutionContextRequest, ExecutionContext } from '@agentforge/foundation';
import type {
  ExecutionCheckpoint,
  ExecutionStage,
  ExecutionState,
  RecoverIncompleteRequest,
  RecoverIncompleteResult,
  RecoverOutcome,
  RecoveryPolicyBundle,
  RuntimeDependencies,
  RuntimeDiagnostics,
  RuntimeFact,
  RuntimePolicy,
  RuntimeRequest,
  RuntimeResult,
  StateTransition,
} from '../contracts/runtime.js';
import { DEFAULT_RECOVERY_POLICY } from '../contracts/runtime.js';
import { RuntimeError } from '../errors/runtime-error.js';
import {
  assertCheckpointableValue,
  CheckpointConflictError,
  hasValidCapabilityResult,
  isResumeSafeStage,
  requirePostInvokeResult,
} from './checkpoint.js';

const transitions: Readonly<Record<ExecutionState, readonly ExecutionState[]>> = {
  created: ['initializing'],
  initializing: ['planning', 'failed', 'cancelling'],
  planning: ['executing', 'recovering', 'failed', 'cancelling'],
  executing: ['completing', 'recovering', 'failed', 'cancelling'],
  waiting: ['executing', 'cancelling', 'failed'],
  recovering: ['planning', 'executing', 'failed', 'cancelling'],
  cancelling: ['cancelled'],
  completing: ['completed', 'failed', 'cancelling'],
  completed: [],
  failed: [],
  cancelled: [],
};

export class ExecutionStateManager {
  readonly #history: StateTransition[] = [];
  #state: ExecutionState = 'created';
  public constructor(private readonly now: () => Date = () => new Date()) {
    this.#history.push(Object.freeze({ state: 'created', occurredAt: this.now().toISOString() }));
  }
  public static fromHistory(history: readonly StateTransition[], now: () => Date): ExecutionStateManager {
    if (history.length === 0) {
      throw new RuntimeError('RUNTIME_EXECUTION_FAILED', 'Checkpoint history is empty');
    }
    const manager = new ExecutionStateManager(now);
    manager.#history.length = 0;
    for (const item of history) manager.#history.push(Object.freeze({ ...item }));
    const last = history[history.length - 1];
    if (last === undefined) {
      throw new RuntimeError('RUNTIME_EXECUTION_FAILED', 'Checkpoint history is empty');
    }
    manager.#state = last.state;
    return manager;
  }
  public get state(): ExecutionState {
    return this.#state;
  }
  public get history(): readonly StateTransition[] {
    return Object.freeze([...this.#history]);
  }
  public transition(next: ExecutionState): StateTransition {
    if (!transitions[this.#state].includes(next)) {
      throw new RuntimeError('RUNTIME_INVALID_TRANSITION', `${this.#state} -> ${next}`);
    }
    this.#state = next;
    const item = Object.freeze({ state: next, occurredAt: this.now().toISOString() });
    this.#history.push(item);
    return item;
  }
}

export class ConcurrencyManager {
  #active = 0;
  public get active(): number {
    return this.#active;
  }
  public async run<T>(limit: number, work: () => Promise<T>): Promise<T> {
    if (this.#active >= limit) {
      throw new RuntimeError('RUNTIME_CONCURRENCY_LIMIT', 'Runtime concurrency limit reached');
    }
    this.#active++;
    try {
      return await work();
    } finally {
      this.#active--;
    }
  }
}

export class ExecutionScheduler {
  public constructor(private readonly concurrency = new ConcurrencyManager()) {}
  public schedule<T>(policy: RuntimePolicy, work: () => Promise<T>): Promise<T> {
    return this.concurrency.run(policy.maxConcurrency, work);
  }
  public get active(): number {
    return this.concurrency.active;
  }
}

export class TimeoutManager {
  public async run<T>(
    milliseconds: number,
    signal: AbortSignal,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
    };
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => {
      controller.abort();
    }, milliseconds);
    try {
      return await Promise.race([
        work(controller.signal),
        new Promise<T>((_, reject) => {
          controller.signal.addEventListener(
            'abort',
            () => {
              reject(
                new RuntimeError(
                  signal.aborted ? 'RUNTIME_CANCELLED' : 'RUNTIME_TIMEOUT',
                  signal.aborted ? 'Execution cancelled' : 'Execution timed out',
                ),
              );
            },
            { once: true },
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
}

export class RetryManager {
  public async run<T>(
    policy: RuntimePolicy,
    work: (attempt: number) => Promise<T>,
    recover: (error: unknown, attempt: number) => Promise<void>,
  ): Promise<{ value: T; attempts: number }> {
    let last: unknown;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        return { value: await work(attempt), attempts: attempt };
      } catch (error) {
        last = error;
        if (attempt >= policy.maxAttempts || !policy.isRetryable(error)) throw error;
        await recover(error, attempt);
      }
    }
    throw last;
  }
}

function recoveryPolicyOf(policy: RuntimePolicy): RecoveryPolicyBundle {
  return policy.recovery ?? DEFAULT_RECOVERY_POLICY;
}

function isTerminalState(state: ExecutionState): boolean {
  return state === 'completed' || state === 'failed' || state === 'cancelled';
}

export class RuntimeOrchestrator {
  readonly #scheduler = new ExecutionScheduler();
  readonly #timeout = new TimeoutManager();
  readonly #retry = new RetryManager();
  #completed = 0;
  #failed = 0;
  #cancelled = 0;
  #recoveryStarted = 0;
  #recoveryResumed = 0;
  #recoveryCompleted = 0;
  #recoveryFailed = 0;
  #recoveryDeferred = 0;
  #recoveryUnsafeFail = 0;
  #recovering = false;

  public constructor(private readonly dependencies: RuntimeDependencies) {}

  public async execute<T = unknown>(request: RuntimeRequest): Promise<RuntimeResult<T>> {
    const startedMs = Date.now();
    const now = this.dependencies.now ?? (() => new Date());
    assertCheckpointableValue(request.input, 'RuntimeRequest.input');
    const scope = this.dependencies.scopes.createExecutionScope(request.context);
    const state = new ExecutionStateManager(now);
    const controller = new AbortController();
    const forward = (): void => {
      controller.abort();
    };
    request.signal?.addEventListener('abort', forward, { once: true });
    const context = scope.context;
    let checkpoint = this.#seedCheckpoint(request.context, request.input, context, state, now());

    try {
      checkpoint = await this.#transitionAndCheckpoint(state, checkpoint, 'initializing', 'accepted', {});

      const decision = await this.dependencies.security.authorize(context);
      if (!decision.authorized) {
        throw new RuntimeError('RUNTIME_UNAUTHORIZED', `Authorization denied: ${decision.decisionId}`);
      }

      const policy = await this.dependencies.policies.get(context);
      const recovery = recoveryPolicyOf(policy);
      const startedAt = now();
      const deadlineAt = new Date(startedAt.getTime() + policy.timeoutMs);
      checkpoint = await this.#upsert({
        ...checkpoint,
        maxAttempts: policy.maxAttempts,
        timeoutMs: policy.timeoutMs,
        startedAt: startedAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
        recoveryPolicy: recovery,
        state: state.state,
        history: state.history,
        updatedAt: now().toISOString(),
      });

      const remainingMs = (): number => Math.max(1, deadlineAt.getTime() - now().getTime());
      const result = await this.#scheduler.schedule(policy, () =>
        this.#retry.run(
          policy,
          async (attempt) => {
            checkpoint =
              (await this.dependencies.checkpoints.load(context.executionId)) ?? checkpoint;
            checkpoint = await this.#upsert({ ...checkpoint, attempts: attempt });
            return this.#timeout.run(remainingMs(), controller.signal, async (signal) =>
              this.#runDelegatedStages<T>(
                state,
                checkpoint,
                request.input,
                context,
                signal,
                'accepted',
                true,
              ),
            );
          },
          async () => {
            checkpoint =
              (await this.dependencies.checkpoints.load(context.executionId)) ?? checkpoint;
            checkpoint = await this.#transitionAndCheckpoint(
              state,
              checkpoint,
              'recovering',
              checkpoint.stage,
              {},
            );
          },
        ),
      );

      checkpoint = (await this.dependencies.checkpoints.load(context.executionId)) ?? checkpoint;
      checkpoint = await this.#transitionAndCheckpoint(state, checkpoint, 'completing', 'post-invoke', {
        capabilityResult: result.value,
      });
      checkpoint = await this.#terminalize(state, checkpoint, 'completed', {
        capabilityResult: result.value,
      });
      this.#completed++;
      this.dependencies.telemetry.completed(context.executionId, Date.now() - startedMs, result.attempts);
      return Object.freeze({
        executionId: context.executionId,
        state: 'completed',
        output: result.value,
        attempts: result.attempts,
        history: state.history,
      });
    } catch (error) {
      const cancelled = error instanceof RuntimeError && error.code === 'RUNTIME_CANCELLED';
      try {
        checkpoint = (await this.dependencies.checkpoints.load(context.executionId)) ?? checkpoint;
        if (cancelled) {
          checkpoint = await this.#upsert({
            ...checkpoint,
            cancelled: true,
            cancellationReason: error instanceof Error ? error.message : 'cancelled',
          });
          if (!isTerminalState(state.state)) {
            checkpoint = await this.#reachState(state, checkpoint, 'cancelling');
            checkpoint = await this.#terminalize(state, checkpoint, 'cancelled', { cancelled: true });
          }
        } else if (!isTerminalState(state.state)) {
          checkpoint = await this.#reachState(state, checkpoint, 'failed');
          checkpoint = await this.#terminalize(state, checkpoint, 'failed', {});
        }
      } catch {
        /* preserve original failure */
      }
      if (cancelled) this.#cancelled++;
      else this.#failed++;
      const normalized =
        error instanceof RuntimeError
          ? error
          : new RuntimeError('RUNTIME_EXECUTION_FAILED', 'Runtime execution failed', { cause: error });
      this.dependencies.telemetry.failed(context.executionId, normalized.code, Date.now() - startedMs);
      throw normalized;
    } finally {
      request.signal?.removeEventListener('abort', forward);
      await scope.dispose();
    }
  }

  public async recoverIncomplete(
    request: RecoverIncompleteRequest = {},
  ): Promise<RecoverIncompleteResult> {
    if (this.#recovering) {
      throw new RuntimeError('RUNTIME_EXECUTION_FAILED', 'recoverIncomplete is already in progress');
    }
    this.#recovering = true;
    const now = request.now ?? (this.dependencies.now?.() ?? new Date());
    const outcomes: RecoverOutcome[] = [];
    let resumed = 0;
    let failed = 0;
    let deferred = 0;
    try {
      const incomplete = await this.dependencies.checkpoints.listIncomplete({
        ...(request.limit === undefined ? {} : { limit: request.limit }),
      });
      for (const item of incomplete) {
        const outcome = await this.#recoverOne(item, now);
        outcomes.push(outcome);
        if (outcome.kind === 'resumed-completed') resumed++;
        else if (outcome.kind === 'deferred') deferred++;
        else if (outcome.kind === 'failed' || outcome.kind === 'cancelled') failed++;
      }
      return Object.freeze({
        examined: incomplete.length,
        resumed,
        failed,
        deferred,
        outcomes: Object.freeze([...outcomes]),
      });
    } finally {
      this.#recovering = false;
    }
  }

  public diagnostics(): RuntimeDiagnostics {
    return Object.freeze({
      active: this.#scheduler.active,
      completed: this.#completed,
      failed: this.#failed,
      cancelled: this.#cancelled,
      recoveryStarted: this.#recoveryStarted,
      recoveryResumed: this.#recoveryResumed,
      recoveryCompleted: this.#recoveryCompleted,
      recoveryFailed: this.#recoveryFailed,
      recoveryDeferred: this.#recoveryDeferred,
      recoveryUnsafeFail: this.#recoveryUnsafeFail,
    });
  }

  public async health() {
    const d = this.diagnostics();
    return Object.freeze({
      name: 'runtime',
      status: d.active >= 0 ? 'healthy' : 'unhealthy',
      details: Object.freeze({
        active: String(d.active),
        completed: String(d.completed),
        failed: String(d.failed),
        cancelled: String(d.cancelled),
        recoveryStarted: String(d.recoveryStarted),
        recoveryResumed: String(d.recoveryResumed),
        recoveryCompleted: String(d.recoveryCompleted),
        recoveryFailed: String(d.recoveryFailed),
        recoveryDeferred: String(d.recoveryDeferred),
        recoveryUnsafeFail: String(d.recoveryUnsafeFail),
      }),
    } as const);
  }

  async #recoverOne(initial: ExecutionCheckpoint, now: Date): Promise<RecoverOutcome> {
    const checkpoint = (await this.dependencies.checkpoints.load(initial.executionId)) ?? initial;
    if (checkpoint.terminal || isTerminalState(checkpoint.state)) {
      return Object.freeze({ executionId: checkpoint.executionId, kind: 'ignored-terminal' });
    }

    this.#recoveryStarted++;
    this.dependencies.telemetry.recovery?.('started', checkpoint.executionId);
    await this.#publishRecoveryFact(checkpoint, 'runtime.recovery.started', checkpoint.state);

    const policy = checkpoint.recoveryPolicy;

    if (policy.failIfCancelled && checkpoint.cancelled) {
      return this.#recoveryTerminalize(checkpoint, 'cancelled', 'RUNTIME_CANCELLED');
    }

    if (policy.failIfExpired && now.getTime() >= Date.parse(checkpoint.deadlineAt)) {
      return this.#recoveryTerminalize(checkpoint, 'failed', 'RUNTIME_TIMEOUT');
    }

    if (policy.onRestart === 'manual-recovery') {
      this.#recoveryDeferred++;
      this.dependencies.telemetry.recovery?.('deferred', checkpoint.executionId);
      await this.#publishRecoveryFact(checkpoint, 'runtime.recovery.deferred', checkpoint.state);
      return Object.freeze({
        executionId: checkpoint.executionId,
        kind: 'deferred',
        detail: 'manual-recovery',
      });
    }

    if (checkpoint.stage === 'post-invoke' && !hasValidCapabilityResult(checkpoint)) {
      this.#recoveryUnsafeFail++;
      this.dependencies.telemetry.recovery?.('unsafe_fail', checkpoint.executionId);
      return this.#recoveryTerminalize(
        checkpoint,
        'failed',
        'RUNTIME_EXECUTION_FAILED',
        'Malformed post-invoke checkpoint',
      );
    }

    if (policy.onRestart === 'resume-immediately') {
      return this.#resumeCheckpoint(checkpoint, now, true);
    }

    // ResumeIfSafe
    if (checkpoint.stage === 'pre-invoke') {
      this.#recoveryUnsafeFail++;
      this.dependencies.telemetry.recovery?.('unsafe_fail', checkpoint.executionId);
      return this.#recoveryTerminalize(
        checkpoint,
        'failed',
        'RUNTIME_EXECUTION_FAILED',
        'ResumeIfSafe refuses pre-invoke re-invocation',
      );
    }

    if (!isResumeSafeStage(checkpoint.stage)) {
      return this.#recoveryTerminalize(
        checkpoint,
        'failed',
        'RUNTIME_EXECUTION_FAILED',
        `Unsafe or unknown stage: ${checkpoint.stage}`,
      );
    }

    return this.#resumeCheckpoint(checkpoint, now, false);
  }

  async #resumeCheckpoint(
    checkpoint: ExecutionCheckpoint,
    now: Date,
    allowPreInvokeReinvoke: boolean,
  ): Promise<RecoverOutcome> {
    this.#recoveryResumed++;
    this.dependencies.telemetry.recovery?.('resumed', checkpoint.executionId);
    await this.#publishRecoveryFact(checkpoint, 'runtime.recovery.resumed', checkpoint.state);

    const scope = this.dependencies.scopes.createExecutionScope(checkpoint.contextRequest);
    const clock = this.dependencies.now ?? (() => new Date());
    const state = ExecutionStateManager.fromHistory(checkpoint.history, clock);
    const controller = new AbortController();
    try {
      if (!isTerminalState(state.state) && state.state !== 'recovering') {
        if (transitions[state.state].includes('recovering')) {
          checkpoint = await this.#transitionAndCheckpoint(
            state,
            checkpoint,
            'recovering',
            checkpoint.stage,
            {},
          );
        }
      }

      const remainingMs = Math.max(1, Date.parse(checkpoint.deadlineAt) - now.getTime());
      const output = await this.#timeout.run(remainingMs, controller.signal, async (signal) =>
        this.#runDelegatedStages(
          state,
          checkpoint,
          checkpoint.input,
          scope.context,
          signal,
          checkpoint.stage,
          allowPreInvokeReinvoke,
        ),
      );

      checkpoint = (await this.dependencies.checkpoints.load(checkpoint.executionId)) ?? checkpoint;
      if (!isTerminalState(state.state)) {
        if (state.state !== 'completing') {
          checkpoint = await this.#reachState(state, checkpoint, 'completing');
        }
        checkpoint = await this.#terminalize(state, checkpoint, 'completed', {
          capabilityResult: output,
        });
      }

      this.#completed++;
      this.#recoveryCompleted++;
      this.dependencies.telemetry.recovery?.('completed', checkpoint.executionId);
      await this.#publishRecoveryFact(checkpoint, 'runtime.recovery.completed', 'completed');
      this.dependencies.telemetry.completed(checkpoint.executionId, 0, checkpoint.attempts);
      return Object.freeze({ executionId: checkpoint.executionId, kind: 'resumed-completed' });
    } catch (error) {
      if (error instanceof CheckpointConflictError) {
        return Object.freeze({
          executionId: checkpoint.executionId,
          kind: 'occ-lost',
          detail: error.message,
        });
      }
      const cancelled = error instanceof RuntimeError && error.code === 'RUNTIME_CANCELLED';
      try {
        checkpoint = (await this.dependencies.checkpoints.load(checkpoint.executionId)) ?? checkpoint;
        if (checkpoint.terminal) {
          return Object.freeze({ executionId: checkpoint.executionId, kind: 'occ-lost' });
        }
        if (cancelled) {
          return await this.#recoveryTerminalize(checkpoint, 'cancelled', 'RUNTIME_CANCELLED');
        }
        const code = error instanceof RuntimeError ? error.code : 'RUNTIME_EXECUTION_FAILED';
        return await this.#recoveryTerminalize(
          checkpoint,
          'failed',
          code,
          error instanceof Error ? error.message : 'recovery failed',
        );
      } catch (inner) {
        if (inner instanceof CheckpointConflictError) {
          return Object.freeze({
            executionId: checkpoint.executionId,
            kind: 'occ-lost',
            detail: inner.message,
          });
        }
        throw inner;
      }
    } finally {
      await scope.dispose();
    }
  }

  async #recoveryTerminalize(
    checkpoint: ExecutionCheckpoint,
    terminal: 'failed' | 'cancelled',
    code: RuntimeError['code'],
    detail?: string,
  ): Promise<RecoverOutcome> {
    const clock = this.dependencies.now ?? (() => new Date());
    const state = ExecutionStateManager.fromHistory(checkpoint.history, clock);
    try {
      if (terminal === 'cancelled') {
        if (!isTerminalState(state.state)) {
          checkpoint = await this.#reachState(state, checkpoint, 'cancelling');
          checkpoint = await this.#terminalize(state, checkpoint, 'cancelled', { cancelled: true });
        }
        this.#cancelled++;
        this.#recoveryFailed++;
        this.dependencies.telemetry.recovery?.('failed', checkpoint.executionId);
        await this.#publishRecoveryFact(checkpoint, 'runtime.recovery.failed', 'cancelled');
        this.dependencies.telemetry.failed(checkpoint.executionId, code, 0);
        return Object.freeze({
          executionId: checkpoint.executionId,
          kind: 'cancelled',
          detail: detail ?? code,
        });
      }

      if (!isTerminalState(state.state)) {
        checkpoint = await this.#reachState(state, checkpoint, 'failed');
        checkpoint = await this.#terminalize(state, checkpoint, 'failed', {});
      }
      this.#failed++;
      this.#recoveryFailed++;
      this.dependencies.telemetry.recovery?.('failed', checkpoint.executionId);
      await this.#publishRecoveryFact(checkpoint, 'runtime.recovery.failed', 'failed');
      this.dependencies.telemetry.failed(checkpoint.executionId, code, 0);
      return Object.freeze({
        executionId: checkpoint.executionId,
        kind: 'failed',
        detail: detail ?? code,
      });
    } catch (error) {
      if (error instanceof CheckpointConflictError) {
        return Object.freeze({
          executionId: checkpoint.executionId,
          kind: 'occ-lost',
          detail: error.message,
        });
      }
      throw error;
    }
  }

  async #reachState(
    state: ExecutionStateManager,
    checkpoint: ExecutionCheckpoint,
    target: ExecutionState,
  ): Promise<ExecutionCheckpoint> {
    let current = checkpoint;
    for (let guard = 0; guard < 8 && state.state !== target && !isTerminalState(state.state); guard++) {
      const options = transitions[state.state];
      if (options.includes(target)) {
        return this.#transitionAndCheckpoint(state, current, target, current.stage, {
          ...(target === 'cancelling' || current.cancelled ? { cancelled: true } : {}),
        });
      }
      if (target === 'failed' || target === 'cancelling' || target === 'completing') {
        if (options.includes('recovering')) {
          current = await this.#transitionAndCheckpoint(state, current, 'recovering', current.stage, {});
          continue;
        }
        if (target === 'completing' && options.includes('executing')) {
          current = await this.#transitionAndCheckpoint(state, current, 'executing', current.stage, {});
          continue;
        }
        if (target === 'failed' && options.includes('failed')) {
          return this.#transitionAndCheckpoint(state, current, 'failed', current.stage, {});
        }
      }
      if (target === 'cancelling' && options.includes('cancelling')) {
        return this.#transitionAndCheckpoint(state, current, 'cancelling', current.stage, {
          cancelled: true,
        });
      }
      break;
    }
    if (state.state !== target) {
      throw new RuntimeError(
        'RUNTIME_INVALID_TRANSITION',
        `Unable to reach ${target} from ${state.state}`,
      );
    }
    return current;
  }

  async #runDelegatedStages<T>(
    state: ExecutionStateManager,
    checkpoint: ExecutionCheckpoint,
    input: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    fromStage: ExecutionStage,
    allowPreInvokeReinvoke: boolean,
  ): Promise<T> {
    let current =
      (await this.dependencies.checkpoints.load(checkpoint.executionId)) ?? checkpoint;
    let plan = current.plan;
    let work = current.workflowWork;

    const skipPlanning =
      fromStage === 'post-planning' ||
      fromStage === 'post-workflow' ||
      fromStage === 'pre-invoke' ||
      fromStage === 'post-invoke';
    const skipWorkflow =
      fromStage === 'post-workflow' || fromStage === 'pre-invoke' || fromStage === 'post-invoke';
    const skipInvoke = fromStage === 'post-invoke';

    if (skipInvoke) {
      return requirePostInvokeResult(current) as T;
    }

    // In-process retry leaves state at recovering; advance before delegated work continues.
    if (state.state === 'recovering') {
      if (plan === undefined) {
        current = await this.#transitionAndCheckpoint(state, current, 'planning', current.stage, {});
      } else {
        current = await this.#transitionAndCheckpoint(state, current, 'executing', current.stage, {
          plan,
        });
      }
    }

    if (!skipPlanning && plan === undefined) {
      current = await this.#ensurePlanningState(state, current);
      plan = await this.dependencies.planning.plan(input, context, signal);
      current = await this.#upsert({
        ...current,
        plan: assertCheckpointableValue(plan, 'plan'),
        stage: 'post-planning',
        state: state.state,
        history: state.history,
      });
    } else if (skipPlanning && plan === undefined) {
      throw new RuntimeError('RUNTIME_EXECUTION_FAILED', 'checkpoint missing plan for resume stage');
    }

    if (!skipWorkflow && work === undefined) {
      current = await this.#ensureExecutingState(state, current);
      work = await this.dependencies.workflow.execute(plan, context, signal);
      current = await this.#upsert({
        ...current,
        plan,
        workflowWork: assertCheckpointableValue(work, 'workflowWork'),
        stage: 'post-workflow',
        state: state.state,
        history: state.history,
      });
    } else if (skipWorkflow && work === undefined) {
      throw new RuntimeError(
        'RUNTIME_EXECUTION_FAILED',
        'checkpoint missing workflowWork for resume stage',
      );
    }

    current = await this.#upsert({
      ...current,
      plan,
      workflowWork: work,
      stage: 'pre-invoke',
      state: state.state,
      history: state.history,
    });

    if (fromStage === 'pre-invoke' && !allowPreInvokeReinvoke) {
      throw new RuntimeError(
        'RUNTIME_EXECUTION_FAILED',
        'ResumeIfSafe refuses capability re-invocation at pre-invoke',
      );
    }

    const raw = await this.dependencies.capabilities.invoke(work, context, signal);
    const capabilityResult = assertCheckpointableValue(raw, 'capabilityResult');
    await this.#upsert({
      ...current,
      plan,
      workflowWork: work,
      capabilityResult,
      stage: 'post-invoke',
      state: state.state,
      history: state.history,
    });
    return capabilityResult as T;
  }

  async #ensurePlanningState(
    state: ExecutionStateManager,
    checkpoint: ExecutionCheckpoint,
  ): Promise<ExecutionCheckpoint> {
    if (state.state === 'planning') return checkpoint;
    if (state.state === 'recovering' && transitions.recovering.includes('planning')) {
      return this.#transitionAndCheckpoint(state, checkpoint, 'planning', checkpoint.stage, {});
    }
    if (state.state === 'initializing' || state.state === 'created') {
      return this.#reachState(state, checkpoint, 'planning');
    }
    if (transitions[state.state].includes('planning')) {
      return this.#transitionAndCheckpoint(state, checkpoint, 'planning', checkpoint.stage, {});
    }
    return checkpoint;
  }

  async #ensureExecutingState(
    state: ExecutionStateManager,
    checkpoint: ExecutionCheckpoint,
  ): Promise<ExecutionCheckpoint> {
    if (state.state === 'executing') return checkpoint;
    if (transitions[state.state].includes('executing')) {
      return this.#transitionAndCheckpoint(state, checkpoint, 'executing', 'post-planning', {
        plan: checkpoint.plan,
      });
    }
    return checkpoint;
  }

  #seedCheckpoint(
    contextRequest: CreateExecutionContextRequest,
    input: unknown,
    context: ExecutionContext,
    state: ExecutionStateManager,
    started: Date,
  ): ExecutionCheckpoint {
    const timeoutMs = 30_000;
    return Object.freeze({
      executionId: context.executionId,
      state: state.state,
      stage: 'accepted' as const,
      history: state.history,
      attempts: 1,
      maxAttempts: 1,
      startedAt: started.toISOString(),
      deadlineAt: new Date(started.getTime() + timeoutMs).toISOString(),
      timeoutMs,
      cancelled: false,
      correlationId: context.correlationId,
      causationId: null,
      tenantId: context.tenantId ?? 'unknown-tenant',
      ...(context.workspaceId === undefined ? {} : { workspaceId: context.workspaceId }),
      input: assertCheckpointableValue(input, 'input'),
      contextRequest: Object.freeze({ ...contextRequest }),
      recoveryPolicy: DEFAULT_RECOVERY_POLICY,
      terminal: false,
      checkpointVersion: 1 as const,
      updatedAt: started.toISOString(),
    });
  }

  async #transitionAndCheckpoint(
    state: ExecutionStateManager,
    checkpoint: ExecutionCheckpoint,
    next: ExecutionState,
    stage: ExecutionStage,
    patch: Partial<ExecutionCheckpoint>,
  ): Promise<ExecutionCheckpoint> {
    const item = state.transition(next);
    const capabilityResult =
      patch.capabilityResult !== undefined
        ? assertCheckpointableValue(patch.capabilityResult, 'capabilityResult')
        : checkpoint.capabilityResult;
    const nextCheckpoint: ExecutionCheckpoint = Object.freeze({
      ...checkpoint,
      ...patch,
      ...(capabilityResult === undefined ? {} : { capabilityResult }),
      state: next,
      stage: isTerminalState(next) ? ('terminal' as const) : stage,
      history: state.history,
      terminal: isTerminalState(next),
      updatedAt: item.occurredAt,
    });
    if (nextCheckpoint.stage === 'post-invoke' && !hasValidCapabilityResult(nextCheckpoint)) {
      throw new RuntimeError(
        'RUNTIME_EXECUTION_FAILED',
        'Refusing to persist post-invoke checkpoint without durable capabilityResult',
      );
    }
    try {
      await this.dependencies.checkpoints.store(nextCheckpoint);
    } catch (error) {
      if (error instanceof CheckpointConflictError) throw error;
      throw new RuntimeError('RUNTIME_EXECUTION_FAILED', 'Checkpoint persistence failed', {
        cause: error,
      });
    }
    const durable =
      (await this.dependencies.checkpoints.load(nextCheckpoint.executionId)) ?? nextCheckpoint;
    const fact: RuntimeFact = Object.freeze({
      type: `runtime.execution.${next}`,
      executionId: durable.executionId,
      correlationId: durable.correlationId,
      occurredAt: item.occurredAt,
      state: next,
    });
    this.dependencies.telemetry.transition(fact);
    await this.dependencies.events.publish(fact);
    return durable;
  }

  async #upsert(checkpoint: ExecutionCheckpoint): Promise<ExecutionCheckpoint> {
    if (checkpoint.stage === 'post-invoke' && !hasValidCapabilityResult(checkpoint)) {
      throw new RuntimeError(
        'RUNTIME_EXECUTION_FAILED',
        'Refusing to persist post-invoke checkpoint without durable capabilityResult',
      );
    }
    const next = Object.freeze({
      ...checkpoint,
      terminal: isTerminalState(checkpoint.state),
      stage: isTerminalState(checkpoint.state) ? ('terminal' as const) : checkpoint.stage,
      updatedAt: (this.dependencies.now ?? (() => new Date()))().toISOString(),
    });
    try {
      await this.dependencies.checkpoints.store(next);
    } catch (error) {
      if (error instanceof CheckpointConflictError) throw error;
      throw new RuntimeError('RUNTIME_EXECUTION_FAILED', 'Checkpoint persistence failed', {
        cause: error,
      });
    }
    return (await this.dependencies.checkpoints.load(next.executionId)) ?? next;
  }

  async #terminalize(
    state: ExecutionStateManager,
    checkpoint: ExecutionCheckpoint,
    terminal: 'completed' | 'failed' | 'cancelled',
    patch: Partial<ExecutionCheckpoint>,
  ): Promise<ExecutionCheckpoint> {
    if (state.state !== terminal) {
      return this.#transitionAndCheckpoint(state, checkpoint, terminal, 'terminal', {
        ...patch,
        terminal: true,
        stage: 'terminal',
      });
    }
    return this.#upsert({
      ...checkpoint,
      ...patch,
      terminal: true,
      stage: 'terminal',
      state: terminal,
      history: state.history,
    });
  }

  async #publishRecoveryFact(
    checkpoint: ExecutionCheckpoint,
    type: string,
    state: ExecutionState,
  ): Promise<void> {
    const fact: RuntimeFact = Object.freeze({
      type,
      executionId: checkpoint.executionId,
      correlationId: checkpoint.correlationId,
      occurredAt: (this.dependencies.now ?? (() => new Date()))().toISOString(),
      state,
    });
    this.dependencies.telemetry.transition(fact);
    await this.dependencies.events.publish(fact);
  }
}
