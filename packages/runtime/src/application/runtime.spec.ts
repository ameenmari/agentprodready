/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it, vi } from 'vitest';
import { CompositionRoot } from '@agentprodready/composition';
import {
  assertCheckpointableValue,
  DEFAULT_RECOVERY_POLICY,
  hasValidCapabilityResult,
  InMemoryExecutionCheckpointPort,
  InMemoryRuntimeEventPublisher,
  RuntimeError,
  RuntimeOrchestrator,
  StaticRuntimePolicyProvider,
  type ExecutionCheckpoint,
  type RecoveryPolicyBundle,
} from '../index.js';

const context = {
  executionId: 'e1',
  correlationId: 'c1',
  configurationVersion: 'v1',
  securityContextId: 's1',
  tenantId: 't1',
  workspaceId: 'w1',
};

function emptyDiagnostics() {
  return {
    active: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    recoveryStarted: 0,
    recoveryResumed: 0,
    recoveryCompleted: 0,
    recoveryFailed: 0,
    recoveryDeferred: 0,
    recoveryUnsafeFail: 0,
  };
}

function fixture(overrides: Record<string, unknown> = {}) {
  const root = new CompositionRoot();
  root.build();
  const events = new InMemoryRuntimeEventPublisher();
  const checkpoints = new InMemoryExecutionCheckpointPort();
  const telemetry = {
    transition: vi.fn(),
    completed: vi.fn(),
    failed: vi.fn(),
    recovery: vi.fn(),
  };
  const planning = { plan: vi.fn(async (input: unknown) => ({ input })) };
  const workflow = { execute: vi.fn(async (plan: unknown) => plan) };
  const capabilities = { invoke: vi.fn(async (work: unknown) => work) };
  const dependencies = {
    scopes: root,
    policies: new StaticRuntimePolicyProvider({
      timeoutMs: 100,
      maxAttempts: 2,
      maxConcurrency: 1,
      isRetryable: () => false,
      recovery: DEFAULT_RECOVERY_POLICY,
    }),
    planning,
    workflow,
    capabilities,
    security: {
      authorize: vi.fn(async (ctx) => ({
        authorized: ctx.securityContextId === 's1',
        decisionId: 'd1',
      })),
    },
    events,
    telemetry,
    checkpoints,
    ...overrides,
  };
  return {
    runtime: new RuntimeOrchestrator(dependencies),
    root,
    events,
    checkpoints,
    telemetry,
    planning,
    workflow,
    capabilities,
  };
}

function baseCheckpoint(
  overrides: Partial<ExecutionCheckpoint> = {},
): ExecutionCheckpoint {
  const now = '2026-08-07T12:00:00.000Z';
  const history = [
    { state: 'created' as const, occurredAt: now },
    { state: 'initializing' as const, occurredAt: now },
    { state: 'planning' as const, occurredAt: now },
    { state: 'executing' as const, occurredAt: now },
  ];
  return Object.freeze({
    executionId: 'e1',
    state: 'executing' as const,
    stage: 'post-workflow' as const,
    history: Object.freeze(history),
    attempts: 1,
    maxAttempts: 1,
    startedAt: now,
    deadlineAt: '2026-08-07T12:01:00.000Z',
    timeoutMs: 60_000,
    cancelled: false,
    correlationId: 'c1',
    causationId: null,
    tenantId: 't1',
    workspaceId: 'w1',
    input: 'hello',
    contextRequest: context,
    plan: { input: 'hello' },
    workflowWork: { input: 'hello' },
    recoveryPolicy: DEFAULT_RECOVERY_POLICY,
    terminal: false,
    checkpointVersion: 1 as const,
    updatedAt: now,
    ...overrides,
  });
}

describe('RuntimeOrchestrator', () => {
  it('owns the complete delegated lifecycle and writes terminal checkpoints', async () => {
    const f = fixture();
    const result = await f.runtime.execute({ context, input: 'hello' });
    expect(result.state).toBe('completed');
    expect(result.history.map((x) => x.state)).toEqual([
      'created',
      'initializing',
      'planning',
      'executing',
      'completing',
      'completed',
    ]);
    expect(f.planning.plan).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ executionId: 'e1' }),
      expect.any(AbortSignal),
    );
    expect(f.events.facts().map((x) => x.state)).toEqual(result.history.slice(1).map((x) => x.state));
    const checkpoint = await f.checkpoints.load('e1');
    expect(checkpoint?.terminal).toBe(true);
    expect(checkpoint?.stage).toBe('terminal');
    expect(checkpoint?.state).toBe('completed');
    expect(checkpoint?.capabilityResult).toEqual({ input: 'hello' });
    expect(f.telemetry.completed).toHaveBeenCalledOnce();
    expect(f.runtime.diagnostics()).toEqual({ ...emptyDiagnostics(), completed: 1 });
  });

  it('coordinates recovery and retry centrally', async () => {
    let calls = 0;
    const f = fixture({
      policies: new StaticRuntimePolicyProvider({
        timeoutMs: 100,
        maxAttempts: 2,
        maxConcurrency: 1,
        isRetryable: () => true,
      }),
      capabilities: {
        invoke: vi.fn(async (value: unknown) => {
          if (++calls === 1) throw new Error('transient');
          return value;
        }),
      },
    });
    const result = await f.runtime.execute({ context, input: 1 });
    expect(result.attempts).toBe(2);
    expect(result.history.map((x) => x.state)).toContain('recovering');
  });

  it('enforces timeout and reports every failure', async () => {
    const f = fixture({
      policies: new StaticRuntimePolicyProvider({
        timeoutMs: 5,
        maxAttempts: 1,
        maxConcurrency: 1,
        isRetryable: () => false,
      }),
      planning: {
        plan: vi.fn(
          async () =>
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve('late');
              }, 30);
            }),
        ),
      },
    });
    await expect(f.runtime.execute({ context, input: 1 })).rejects.toMatchObject({
      code: 'RUNTIME_TIMEOUT',
    });
    expect(f.events.facts().at(-1)?.state).toBe('failed');
    expect(f.telemetry.failed).toHaveBeenCalledOnce();
  });

  it('propagates cancellation and reaches cancelled', async () => {
    const controller = new AbortController();
    const f = fixture({
      planning: {
        plan: vi.fn(
          async (_i, _c, signal: AbortSignal) =>
            await new Promise((_r, reject) => {
              signal.addEventListener('abort', () => {
                reject(new RuntimeError('RUNTIME_CANCELLED', 'cancelled'));
              });
            }),
        ),
      },
    });
    const pending = f.runtime.execute({ context, input: 1, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'RUNTIME_CANCELLED' });
    expect(f.events.facts().slice(-2).map((x) => x.state)).toEqual(['cancelling', 'cancelled']);
  });

  it('rejects unauthorized execution before delegated work', async () => {
    const f = fixture();
    await expect(
      f.runtime.execute({ context: { ...context, securityContextId: 'bad' }, input: 1 }),
    ).rejects.toMatchObject({ code: 'RUNTIME_UNAUTHORIZED' });
    expect(f.planning.plan).not.toHaveBeenCalled();
  });

  it('centralizes concurrency and exposes health', async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = fixture({
      planning: {
        plan: vi.fn(async () => {
          await blocked;
          return 1;
        }),
      },
    });
    const first = f.runtime.execute({ context, input: 1 });
    await vi.waitFor(() => {
      expect(f.runtime.diagnostics().active).toBe(1);
    });
    await expect(
      f.runtime.execute({ context: { ...context, executionId: 'e2' }, input: 2 }),
    ).rejects.toMatchObject({ code: 'RUNTIME_CONCURRENCY_LIMIT' });
    release();
    await first;
    expect((await f.runtime.health()).status).toBe('healthy');
  });
});

describe('capabilityResult checkpoint rules', () => {
  it('round-trips JSON-serializable values including null', () => {
    expect(assertCheckpointableValue(null, 'capabilityResult')).toBeNull();
    expect(assertCheckpointableValue({ a: 1 }, 'capabilityResult')).toEqual({ a: 1 });
  });

  it('rejects undefined and non-JSON values', () => {
    expect(() => assertCheckpointableValue(undefined, 'capabilityResult')).toThrow(RuntimeError);
    expect(() => assertCheckpointableValue(() => 1, 'capabilityResult')).toThrow(RuntimeError);
  });

  it('refuses execute when capability returns undefined', async () => {
    const f = fixture({
      capabilities: { invoke: vi.fn(async () => undefined) },
    });
    await expect(f.runtime.execute({ context, input: 1 })).rejects.toMatchObject({
      code: 'RUNTIME_EXECUTION_FAILED',
    });
  });

  it('accepts null capability results through completion', async () => {
    const f = fixture({
      capabilities: { invoke: vi.fn(async () => null) },
    });
    const result = await f.runtime.execute({ context, input: 1 });
    expect(result.output).toBeNull();
    const checkpoint = await f.checkpoints.load('e1');
    expect(checkpoint?.capabilityResult).toBeNull();
  });
});

describe('recoverIncomplete', () => {
  async function seedIncomplete(
    checkpoints: InMemoryExecutionCheckpointPort,
    checkpoint: ExecutionCheckpoint,
  ) {
    await checkpoints.store(checkpoint);
  }

  it('A: resumes from accepted and completes', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        state: 'initializing',
        stage: 'accepted',
        plan: undefined,
        workflowWork: undefined,
        history: Object.freeze([
          { state: 'created', occurredAt: '2026-08-07T12:00:00.000Z' },
          { state: 'initializing', occurredAt: '2026-08-07T12:00:00.000Z' },
        ]),
      }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.resumed).toBe(1);
    expect(f.planning.plan).toHaveBeenCalledOnce();
    expect(f.capabilities.invoke).toHaveBeenCalledOnce();
    expect((await f.checkpoints.load('e1'))?.state).toBe('completed');
  });

  it('B: post-planning does not rerun planning', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        stage: 'post-planning',
        workflowWork: undefined,
        history: Object.freeze([
          { state: 'created', occurredAt: '2026-08-07T12:00:00.000Z' },
          { state: 'initializing', occurredAt: '2026-08-07T12:00:00.000Z' },
          { state: 'planning', occurredAt: '2026-08-07T12:00:00.000Z' },
        ]),
        state: 'planning',
      }),
    );
    await f.runtime.recoverIncomplete({ now: new Date('2026-08-07T12:00:30.000Z') });
    expect(f.planning.plan).not.toHaveBeenCalled();
    expect(f.workflow.execute).toHaveBeenCalledOnce();
    expect(f.capabilities.invoke).toHaveBeenCalledOnce();
  });

  it('C: post-workflow does not rerun planning or workflow', async () => {
    const f = fixture();
    await seedIncomplete(f.checkpoints, baseCheckpoint({ stage: 'post-workflow' }));
    await f.runtime.recoverIncomplete({ now: new Date('2026-08-07T12:00:30.000Z') });
    expect(f.planning.plan).not.toHaveBeenCalled();
    expect(f.workflow.execute).not.toHaveBeenCalled();
    expect(f.capabilities.invoke).toHaveBeenCalledOnce();
  });

  it('D: pre-invoke + ResumeIfSafe fails without re-invoke', async () => {
    const f = fixture();
    await seedIncomplete(f.checkpoints, baseCheckpoint({ stage: 'pre-invoke' }));
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.failed).toBe(1);
    expect(result.outcomes[0]?.kind).toBe('failed');
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
    expect(f.runtime.diagnostics().recoveryUnsafeFail).toBe(1);
    expect((await f.checkpoints.load('e1'))?.state).toBe('failed');
  });

  it('E: pre-invoke + ResumeImmediately may re-invoke', async () => {
    const policy: RecoveryPolicyBundle = {
      onRestart: 'resume-immediately',
      failIfExpired: true,
      failIfCancelled: true,
    };
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({ stage: 'pre-invoke', recoveryPolicy: policy }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.resumed).toBe(1);
    expect(f.capabilities.invoke).toHaveBeenCalledOnce();
    expect((await f.checkpoints.load('e1'))?.state).toBe('completed');
  });

  it('F: post-invoke restores capabilityResult without re-invoke', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        stage: 'post-invoke',
        capabilityResult: { restored: true, value: 42 },
      }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.resumed).toBe(1);
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
    expect(f.planning.plan).not.toHaveBeenCalled();
    expect(f.workflow.execute).not.toHaveBeenCalled();
    const checkpoint = await f.checkpoints.load('e1');
    expect(checkpoint?.state).toBe('completed');
    expect(checkpoint?.capabilityResult).toEqual({ restored: true, value: 42 });
    expect(f.events.facts().some((fact) => fact.type === 'runtime.recovery.completed')).toBe(true);
  });

  it('G: malformed post-invoke fails without re-invoke', async () => {
    const f = fixture();
    const malformed = baseCheckpoint({ stage: 'post-invoke' });
    const rest: ExecutionCheckpoint = Object.freeze({
      ...malformed,
      stage: 'post-invoke' as const,
    });
    // Force-missing capabilityResult for malformed proof (bypass builder defaults).
    const withoutResult = JSON.parse(JSON.stringify(rest)) as ExecutionCheckpoint;
    Reflect.deleteProperty(withoutResult, 'capabilityResult');
    await seedIncomplete(f.checkpoints, Object.freeze(withoutResult));
    const loaded = await f.checkpoints.load('e1');
    expect(loaded).toBeDefined();
    if (loaded === undefined) throw new Error('expected checkpoint');
    expect(hasValidCapabilityResult(loaded)).toBe(false);
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.failed).toBe(1);
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
  });

  it('H: expired checkpoint terminalizes RUNTIME_TIMEOUT', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        deadlineAt: '2026-08-07T12:00:00.000Z',
        stage: 'post-workflow',
      }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:01.000Z'),
    });
    expect(result.failed).toBe(1);
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
    expect((await f.checkpoints.load('e1'))?.state).toBe('failed');
    expect(f.telemetry.failed).toHaveBeenCalledWith('e1', 'RUNTIME_TIMEOUT', 0);
  });

  it('I: cancelled checkpoint terminalizes cancelled', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        cancelled: true,
        cancellationReason: 'operator',
        stage: 'post-workflow',
      }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.outcomes[0]?.kind).toBe('cancelled');
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
    expect((await f.checkpoints.load('e1'))?.state).toBe('cancelled');
  });

  it('J: terminal checkpoints are never recovered', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        terminal: true,
        stage: 'terminal',
        state: 'completed',
        capabilityResult: 1,
      }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.examined).toBe(0);
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
  });

  it('ManualRecovery defers without resume', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        recoveryPolicy: {
          onRestart: 'manual-recovery',
          failIfExpired: true,
          failIfCancelled: true,
        },
      }),
    );
    const result = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:30.000Z'),
    });
    expect(result.deferred).toBe(1);
    expect((await f.checkpoints.load('e1'))?.terminal).toBe(false);
    expect(f.events.facts().some((fact) => fact.type === 'runtime.recovery.deferred')).toBe(true);
  });

  it('duplicate recoverIncomplete does not double-complete', async () => {
    const f = fixture();
    await seedIncomplete(
      f.checkpoints,
      baseCheckpoint({
        stage: 'post-invoke',
        capabilityResult: { ok: true },
      }),
    );
    await f.runtime.recoverIncomplete({ now: new Date('2026-08-07T12:00:30.000Z') });
    const second = await f.runtime.recoverIncomplete({
      now: new Date('2026-08-07T12:00:31.000Z'),
    });
    expect(second.examined).toBe(0);
    const completedFacts = f.events
      .facts()
      .filter((fact) => fact.type === 'runtime.execution.completed');
    expect(completedFacts).toHaveLength(1);
  });

  it('OCC loser stops without second terminal fact', async () => {
    const checkpoints = new InMemoryExecutionCheckpointPort();
    await checkpoints.store(
      baseCheckpoint({
        stage: 'post-invoke',
        capabilityResult: { ok: true },
      }),
    );
    const loaded = await checkpoints.load('e1');
    if (loaded === undefined) throw new Error('missing');
    // Winner terminalizes first via a second port view simulating race
    const winner = fixture({ checkpoints });
    await winner.runtime.recoverIncomplete({ now: new Date('2026-08-07T12:00:30.000Z') });
    // Stale writer loses OCC
    await expect(
      checkpoints.store({
        ...loaded,
        state: 'completed',
        stage: 'terminal',
        terminal: true,
        updatedAt: '2026-08-07T12:00:40.000Z',
      }),
    ).rejects.toMatchObject({ name: 'CheckpointConflictError' });
  });

  it('history remains append-only across recovery', async () => {
    const f = fixture();
    const seeded = baseCheckpoint({
      stage: 'post-invoke',
      capabilityResult: 'out',
    });
    await seedIncomplete(f.checkpoints, seeded);
    await f.runtime.recoverIncomplete({ now: new Date('2026-08-07T12:00:30.000Z') });
    const final = await f.checkpoints.load('e1');
    expect(final).toBeDefined();
    if (final === undefined) throw new Error('expected checkpoint');
    expect(final.history.slice(0, seeded.history.length)).toEqual([...seeded.history]);
    expect(final.history.length).toBeGreaterThan(seeded.history.length);
  });

  it('executeStream yields deltas and one completed terminal with final result', async () => {
    const stream = vi.fn(async function* (_work: unknown, _ctx: unknown, _signal: AbortSignal) {
      yield { type: 'delta' as const, sequence: 0, payload: { kind: 'text' as const, text: 'hello' } };
      yield { type: 'delta' as const, sequence: 1, payload: { kind: 'text' as const, text: '!' } };
      yield { type: 'final' as const, sequence: 2, result: { text: 'hello!' } };
    });
    const f = fixture({
      capabilities: { invoke: vi.fn(async (work: unknown) => work), stream },
    });
    const events = [];
    for await (const event of f.runtime.executeStream({ context, input: 'hello' })) {
      events.push(event);
    }
    expect(events.map((e) => e.type)).toEqual(['delta', 'delta', 'completed']);
    expect(events.filter((e) => e.type === 'completed' || e.type === 'failed' || e.type === 'cancelled')).toHaveLength(
      1,
    );
    const terminal = events.at(-1);
    expect(terminal).toMatchObject({
      type: 'completed',
      terminal: true,
      executionId: 'e1',
      result: { state: 'completed', output: { text: 'hello!' } },
    });
    expect(f.capabilities.invoke).not.toHaveBeenCalled();
    expect(stream).toHaveBeenCalledOnce();
    const checkpoint = await f.checkpoints.load('e1');
    expect(checkpoint?.capabilityResult).toEqual({ text: 'hello!' });
    expect(checkpoint?.terminal).toBe(true);
  });

  it('executeStream fails closed when capability stream is missing', async () => {
    const f = fixture();
    const events = [];
    for await (const event of f.runtime.executeStream({ context, input: 'hello' })) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'failed',
      terminal: true,
      result: { state: 'failed', error: { code: 'RUNTIME_STREAM_UNSUPPORTED' } },
    });
  });

  it('executeStream cancels once when signal aborts during stream', async () => {
    const controller = new AbortController();
    const stream = vi.fn(async function* (_work: unknown, _ctx: unknown, signal: AbortSignal) {
      yield { type: 'delta' as const, sequence: 0, payload: { kind: 'text' as const, text: 'a' } };
      controller.abort();
      if (signal.aborted) {
        throw new RuntimeError('RUNTIME_CANCELLED', 'Execution cancelled');
      }
    });
    const f = fixture({
      capabilities: { invoke: vi.fn(async (work: unknown) => work), stream },
    });
    const events = [];
    for await (const event of f.runtime.executeStream({
      context,
      input: 'hello',
      signal: controller.signal,
    })) {
      events.push(event);
    }
    expect(events.map((e) => e.type)).toEqual(['delta', 'cancelled']);
    expect(events.at(-1)).toMatchObject({ type: 'cancelled', terminal: true });
  });
});
