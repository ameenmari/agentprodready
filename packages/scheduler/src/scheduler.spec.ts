import { describe, expect, it } from 'vitest';
import {
  buildJobDefinition,
  InMemoryDeadLetterStore,
  InMemoryJobLifecycleStore,
  InMemoryJobQueue,
  InMemoryJobStore,
  InMemorySchedulerAudit,
  InMemorySchedulerDiagnostics,
  InMemorySchedulerEvents,
  LocalHandoffWorker,
  RecordingRuntimeJobPort,
  SchedulerError,
  SchedulerFramework,
  type JobDefinition,
  type SchedulerAuthorization,
} from './index.js';
const at = '2026-08-06T00:00:00.000Z',
  later = '2026-08-06T01:00:00.000Z',
  scope = { tenantId: 'tenant-1', workspaceId: 'workspace-1' };
function auth(
  operation: SchedulerAuthorization['operation'],
  overrides: Partial<SchedulerAuthorization> = {},
): SchedulerAuthorization {
  return {
    decisionId: `decision:${operation}`,
    principalId: 'operator-1',
    operation,
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
    ...overrides,
  };
}
function job(
  schedule: JobDefinition['schedule'] = { type: 'one-time', eligibleAt: later },
  overrides: Partial<Omit<JobDefinition, 'immutable'>> = {},
): JobDefinition {
  return buildJobDefinition({
    id: 'job-1',
    version: '1.0.0',
    type: 'platform-task',
    schedule,
    executionTarget: {
      kind: 'runtime-request',
      reference: 'runtime-target:1',
      inputReference: 'input:1',
    },
    constraints: { maximumQueueAgeMs: 60000, maximumDispatchAttempts: 3 },
    retry: {
      version: '1',
      maximumAttempts: 3,
      strategy: 'fixed',
      baseDelayMs: 1000,
      maximumDelayMs: 10000,
      retryableFailures: ['worker-unavailable', 'runtime-handoff-unavailable'],
      executionRetryOwnedByRuntime: true,
    },
    expiresAt: '2026-08-07T00:00:00.000Z',
    priority: 5,
    securityRequirementReferences: ['security:job'],
    scope,
    correlationId: 'correlation-1',
    causationId: null,
    metadata: { owner: 'platform' },
    createdAt: at,
    createdBy: 'operator-1',
    ...overrides,
  });
}
interface Fixture {
  readonly scheduler: SchedulerFramework;
  readonly queue: InMemoryJobQueue;
  readonly jobs: InMemoryJobStore;
  readonly lifecycle: InMemoryJobLifecycleStore;
  readonly deadLetters: InMemoryDeadLetterStore;
  readonly runtime: RecordingRuntimeJobPort;
  readonly events: InMemorySchedulerEvents;
  readonly audit: InMemorySchedulerAudit;
  readonly diagnostics: InMemorySchedulerDiagnostics;
}
function fixture(outcomes: readonly ('accept' | 'reject' | 'throw')[] = ['accept']): Fixture {
  const queue = new InMemoryJobQueue(),
    jobs = new InMemoryJobStore(),
    lifecycle = new InMemoryJobLifecycleStore(),
    deadLetters = new InMemoryDeadLetterStore(),
    runtime = new RecordingRuntimeJobPort(outcomes),
    events = new InMemorySchedulerEvents(),
    audit = new InMemorySchedulerAudit(),
    diagnostics = new InMemorySchedulerDiagnostics();
  return {
    scheduler: new SchedulerFramework(
      queue,
      jobs,
      lifecycle,
      new LocalHandoffWorker(runtime),
      deadLetters,
      events,
      audit,
      diagnostics,
    ),
    queue,
    jobs,
    lifecycle,
    deadLetters,
    runtime,
    events,
    audit,
    diagnostics,
  };
}
describe('immutable definitions and schedule eligibility', () => {
  it('builds immutable jobs without Runtime execution state', () => {
    const value = job();
    expect(Object.isFrozen(value)).toBe(true);
    expect(value.retry.executionRetryOwnedByRuntime).toBe(true);
    expect(JSON.stringify(value)).not.toMatch(/executionContext|runtimeState|workflowState/);
  });
  it('validates cron and fixed interval schedules', () => {
    expect(() =>
      job({ type: 'cron', expression: 'bad', timezone: 'UTC', nextEligibleAt: later }),
    ).toThrowError(SchedulerError);
    expect(() => job({ type: 'fixed-interval', firstEligibleAt: later, intervalMs: 0 })).toThrow();
    expect(
      job({ type: 'cron', expression: '0 * * * *', timezone: 'UTC', nextEligibleAt: later })
        .schedule.type,
    ).toBe('cron');
  });
  it('handles one-time and delayed clock eligibility', async () => {
    for (const schedule of [
      { type: 'one-time' as const, eligibleAt: later },
      { type: 'delayed' as const, eligibleAt: later },
    ]) {
      const value = fixture();
      await value.scheduler.schedule(job(schedule), auth('schedule'), at);
      expect(await value.scheduler.trigger('job-1', { type: 'clock', at })).toBeUndefined();
      expect(await value.scheduler.trigger('job-1', { type: 'clock', at: later })).toMatchObject({
        jobId: 'job-1',
      });
    }
  });
  it('handles cron, event, and manual triggers without a timer loop', async () => {
    for (const [schedule, trigger] of [
      [
        { type: 'cron' as const, expression: '0 * * * *', timezone: 'UTC', nextEligibleAt: later },
        { type: 'clock' as const, at: later },
      ],
      [
        { type: 'event' as const, eventType: 'artifact.created', filterReference: 'filter:1' },
        { type: 'event' as const, eventType: 'artifact.created', at: later },
      ],
      [
        { type: 'manual' as const },
        { type: 'manual' as const, at: later, principalId: 'operator-1' },
      ],
    ] as const) {
      const value = fixture();
      await value.scheduler.schedule(job(schedule), auth('schedule'), at);
      expect(await value.scheduler.trigger('job-1', trigger)).toBeDefined();
    }
  });
});
describe('queue, dispatch, retry, dead-letter, expiration, and lifecycle', () => {
  it('orders replaceable queue entries by priority and eligibility', () => {
    const queue = new InMemoryJobQueue();
    queue.enqueue({
      id: 'low',
      jobId: 'low',
      priority: 1,
      eligibleAt: at,
      enqueuedAt: at,
      attempt: 1,
      correlationId: 'c',
    });
    queue.enqueue({
      id: 'high',
      jobId: 'high',
      priority: 9,
      eligibleAt: at,
      enqueuedAt: at,
      attempt: 1,
      correlationId: 'c',
    });
    expect(queue.dequeue(at)?.jobId).toBe('high');
  });
  it('dispatches through a Runtime handoff without executing the job', async () => {
    const value = fixture();
    await value.scheduler.schedule(job(), auth('schedule'), at);
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    const result = await value.scheduler.dispatch(later, auth('dispatch'));
    expect(result).toMatchObject({
      status: 'accepted',
      executionPerformed: false,
      executionOutcomeIncluded: false,
      executionRetryPerformed: false,
    });
    expect(value.runtime.requests[0]).toMatchObject({
      executionPerformed: false,
      executionRetryOwnedByRuntime: true,
    });
  });
  it('retries dispatch infrastructure separately from Runtime execution retry', async () => {
    const value = fixture(['throw', 'accept']);
    await value.scheduler.schedule(job(), auth('schedule'), at);
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    const first = await value.scheduler.dispatch(later, auth('dispatch'));
    expect(first).toMatchObject({
      status: 'retry-scheduled',
      attempt: 1,
      executionRetryPerformed: false,
    });
    expect(
      await value.scheduler.dispatch(first?.nextEligibleAt ?? later, auth('dispatch')),
    ).toMatchObject({ status: 'accepted', attempt: 2 });
  });
  it('dead-letters exhausted dispatch attempts explicitly', async () => {
    const value = fixture(['throw', 'throw']);
    await value.scheduler.schedule(
      job(undefined, { retry: { ...job().retry, maximumAttempts: 2 } }),
      auth('schedule'),
      at,
    );
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    const first = await value.scheduler.dispatch(later, auth('dispatch'));
    const second = await value.scheduler.dispatch(first?.nextEligibleAt ?? later, auth('dispatch'));
    expect(second?.status).toBe('dead-lettered');
    expect(value.deadLetters.list()).toHaveLength(1);
  });
  it('expires jobs before dispatch and never calls Runtime', async () => {
    const value = fixture();
    await value.scheduler.schedule(
      job({ type: 'one-time', eligibleAt: later }, { expiresAt: '2026-08-06T00:30:00.000Z' }),
      auth('schedule'),
      at,
    );
    expect(await value.scheduler.trigger('job-1', { type: 'clock', at: later })).toBeUndefined();
    expect(value.jobs.get('job-1')?.state).toBe('expired');
    expect(value.runtime.requests).toHaveLength(0);
  });
  it('records explicit scheduled, queued, dispatched, cancelled, and exceptional lifecycle', async () => {
    const value = fixture();
    await value.scheduler.schedule(job(), auth('schedule'), at);
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    await value.scheduler.cancel('job-1', auth('cancel'), later);
    expect(value.lifecycle.records('job-1').map((item) => item.to)).toEqual([
      'scheduled',
      'queued',
      'cancelled',
    ]);
  });
});
describe('security, events, audit, providers, and Runtime authority', () => {
  it('requires distinct active schedule and dispatch authorization', async () => {
    const value = fixture();
    await expect(
      value.scheduler.schedule(job(), auth('schedule', { authorized: false }), at),
    ).rejects.toThrowError(/unauthorized/);
    await value.scheduler.schedule(job(), auth('schedule'), at);
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    await expect(value.scheduler.dispatch(later, auth('schedule'))).rejects.toThrow();
  });
  it('produces lifecycle events, governance audit, and diagnostics', async () => {
    const value = fixture();
    await value.scheduler.schedule(job(), auth('schedule'), at, true);
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    await value.scheduler.dispatch(later, auth('dispatch'));
    expect(value.events.values.map((item) => item.type)).toEqual([
      'job.scheduled',
      'job.queued',
      'job.dispatched',
    ]);
    expect(value.audit.values).toHaveLength(1);
    expect(value.diagnostics.list()).not.toHaveLength(0);
  });
  it('supports replaceable queues and workers through normalized contracts', async () => {
    for (const outcomes of [['accept'], ['accept']] as const) {
      const value = fixture(outcomes);
      await value.scheduler.schedule(job(), auth('schedule'), at);
      await value.scheduler.trigger('job-1', { type: 'clock', at: later });
      expect((await value.scheduler.dispatch(later, auth('dispatch')))?.status).toBe('accepted');
    }
  });
  it('never reports execution results, execution attempts, timeout, or recovery', async () => {
    const value = fixture();
    await value.scheduler.schedule(job(), auth('schedule'), at);
    await value.scheduler.trigger('job-1', { type: 'clock', at: later });
    const result = await value.scheduler.dispatch(later, auth('dispatch'));
    expect(result).not.toHaveProperty('executionResult');
    expect(result).not.toHaveProperty('timeout');
    expect(value.jobs.get('job-1')?.runtimeExecutionAttempts).toBe(0);
  });
});
