export type JobState =
  | 'created'
  | 'scheduled'
  | 'queued'
  | 'dispatched'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled'
  | 'expired'
  | 'dead-letter';
export type ScheduleDefinition =
  | { readonly type: 'one-time' | 'delayed'; readonly eligibleAt: string }
  | {
      readonly type: 'fixed-interval';
      readonly firstEligibleAt: string;
      readonly intervalMs: number;
    }
  | {
      readonly type: 'cron';
      readonly expression: string;
      readonly timezone: string;
      readonly nextEligibleAt: string;
    }
  | { readonly type: 'event'; readonly eventType: string; readonly filterReference: string }
  | { readonly type: 'manual' };
export interface SchedulerScope {
  readonly tenantId: string;
  readonly workspaceId?: string;
}
export interface DispatchRetryPolicy {
  readonly version: string;
  readonly maximumAttempts: number;
  readonly strategy: 'fixed' | 'exponential';
  readonly baseDelayMs: number;
  readonly maximumDelayMs: number;
  readonly retryableFailures: readonly DispatchFailureCategory[];
  readonly executionRetryOwnedByRuntime: true;
}
export interface JobDefinition {
  readonly id: string;
  readonly version: string;
  readonly type: string;
  readonly schedule: ScheduleDefinition;
  readonly executionTarget: Readonly<{
    kind: 'runtime-request' | 'agent-invocation' | 'workflow-start';
    reference: string;
    inputReference: string;
  }>;
  readonly constraints: Readonly<{
    maximumQueueAgeMs: number;
    maximumDispatchAttempts: number;
    concurrencyKey?: string;
  }>;
  readonly retry: DispatchRetryPolicy;
  readonly expiresAt: string;
  readonly priority: number;
  readonly securityRequirementReferences: readonly string[];
  readonly scope: SchedulerScope;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly metadata: Readonly<Record<string, string>>;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly immutable: true;
}
export interface SchedulerAuthorization {
  readonly decisionId: string;
  readonly principalId: string;
  readonly operation: 'schedule' | 'dispatch' | 'cancel' | 'override';
  readonly authorized: boolean;
  readonly state: 'active' | 'expired' | 'revoked' | 'superseded';
  readonly scope: SchedulerScope;
  readonly policyVersion: string;
}
export interface ScheduledJob {
  readonly id: string;
  readonly definition: JobDefinition;
  readonly nextEligibleAt?: string;
  readonly state: JobState;
  readonly dispatchAttempts: number;
  readonly runtimeExecutionAttempts: 0;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface QueueEntry {
  readonly id: string;
  readonly jobId: string;
  readonly priority: number;
  readonly eligibleAt: string;
  readonly enqueuedAt: string;
  readonly attempt: number;
  readonly correlationId: string;
}
export interface JobQueue {
  enqueue(value: QueueEntry): boolean;
  dequeue(eligibleAt: string): QueueEntry | undefined;
  remove(jobId: string): void;
  peek(): readonly QueueEntry[];
}
export interface JobStore {
  save(value: ScheduledJob): void;
  get(id: string): ScheduledJob | undefined;
  list(): readonly ScheduledJob[];
}
export interface JobLifecycleRecord {
  readonly id: string;
  readonly jobId: string;
  readonly from: JobState;
  readonly to: JobState;
  readonly reason: string;
  readonly authorizationDecisionId?: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly attempt: number;
}
export interface JobLifecycleStore {
  append(record: JobLifecycleRecord): void;
  records(jobId: string): readonly JobLifecycleRecord[];
}
export interface JobDispatchRequest {
  readonly id: string;
  readonly jobId: string;
  readonly jobVersion: string;
  readonly executionTarget: JobDefinition['executionTarget'];
  readonly securityRequirementReferences: readonly string[];
  readonly scope: SchedulerScope;
  readonly dispatchAuthorizationDecisionId: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly dispatchAttempt: number;
  readonly executionRetryOwnedByRuntime: true;
  readonly executionPerformed: false;
}
export interface RuntimeJobAcceptance {
  readonly dispatchId: string;
  readonly accepted: boolean;
  readonly runtimeExecutionReference?: string;
  readonly executionOutcomeIncluded: false;
  readonly executionAttemptsIncluded: false;
}
export interface RuntimeJobPort {
  accept(request: JobDispatchRequest): Promise<RuntimeJobAcceptance>;
}
export interface BackgroundWorker {
  dispatch(request: JobDispatchRequest): Promise<RuntimeJobAcceptance>;
}
export type DispatchFailureCategory =
  | 'queue-unavailable'
  | 'worker-unavailable'
  | 'runtime-handoff-unavailable'
  | 'infrastructure'
  | 'unknown';
export interface DispatchFailure {
  readonly category: DispatchFailureCategory;
  readonly message: string;
  readonly retryable: boolean;
}
export interface DispatchResult {
  readonly jobId: string;
  readonly dispatchId: string;
  readonly status: 'accepted' | 'retry-scheduled' | 'dead-lettered' | 'expired';
  readonly attempt: number;
  readonly nextEligibleAt?: string;
  readonly runtimeExecutionReference?: string;
  readonly executionPerformed: false;
  readonly executionOutcomeIncluded: false;
  readonly executionRetryPerformed: false;
}
export interface DeadLetterRecord {
  readonly id: string;
  readonly jobId: string;
  readonly finalAttempt: number;
  readonly failure: DispatchFailure;
  readonly recordedAt: string;
  readonly correlationId: string;
}
export interface DeadLetterStore {
  record(value: DeadLetterRecord): void;
  list(): readonly DeadLetterRecord[];
}
export interface Trigger {
  readonly type: 'clock' | 'event' | 'manual';
  readonly at: string;
  readonly eventType?: string;
  readonly eventReference?: string;
  readonly principalId?: string;
}
export interface SchedulerFact {
  readonly type:
    | 'job.scheduled'
    | 'job.queued'
    | 'job.dispatched'
    | 'job.retry-scheduled'
    | 'job.expired'
    | 'job.cancelled'
    | 'job.dead-lettered';
  readonly jobId: string;
  readonly operationId: string;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly outcome: 'completed' | 'failed';
  readonly diagnosticsReference: string;
}
export interface SchedulerEvents {
  publish(value: SchedulerFact): Promise<void>;
}
export interface SchedulerAudit {
  record(
    value: Readonly<{
      type:
        | 'scheduler.administrative-schedule'
        | 'scheduler.manual-dispatch'
        | 'scheduler.cancelled'
        | 'scheduler.retry-override'
        | 'scheduler.priority-override'
        | 'scheduler.expiration-override';
      jobId: string;
      principalId: string;
      authorizationDecisionId: string;
      correlationId: string;
    }>,
  ): Promise<void>;
}
export interface SchedulerDiagnostics {
  record(
    value: Readonly<{
      id: string;
      phase: string;
      outcome: 'completed' | 'failed';
      jobId: string;
      attempt: number;
      retryOwnership: 'dispatch-only';
      errorCode?: SchedulerErrorCode;
    }>,
  ): void;
  list(): readonly unknown[];
}
export type SchedulerErrorCode =
  | 'JOB_INVALID'
  | 'SCHEDULE_INVALID'
  | 'QUEUE_UNAVAILABLE'
  | 'DISPATCH_FAILED'
  | 'WORKER_UNAVAILABLE'
  | 'SCHEDULE_EXPIRED'
  | 'RETRY_LIMIT_EXCEEDED'
  | 'DEAD_LETTERED'
  | 'JOB_NOT_FOUND'
  | 'JOB_UNAUTHORIZED'
  | 'JOB_SCOPE_VIOLATION'
  | 'JOB_STATE_INVALID';
export class SchedulerError extends Error {
  public constructor(
    public readonly code: SchedulerErrorCode,
    message: string,
    public readonly diagnosticId: string,
  ) {
    super(message);
    this.name = 'SchedulerError';
  }
}

export function buildJobDefinition(value: Omit<JobDefinition, 'immutable'>): JobDefinition {
  validateJob(value);
  return freeze({ ...copy(value), immutable: true });
}
export class SchedulerFramework {
  public constructor(
    private readonly queue: JobQueue,
    private readonly jobs: JobStore,
    private readonly lifecycle: JobLifecycleStore,
    private readonly worker: BackgroundWorker,
    private readonly deadLetters: DeadLetterStore,
    private readonly events: SchedulerEvents,
    private readonly audit: SchedulerAudit,
    private readonly diagnostics: SchedulerDiagnostics,
  ) {}
  public async schedule(
    definition: JobDefinition,
    authorization: SchedulerAuthorization,
    at: string,
    administrative = false,
  ): Promise<ScheduledJob> {
    enforce(authorization, 'schedule', definition.scope, `scheduler:schedule:${definition.id}`);
    const existing = this.jobs.get(definition.id);
    if (existing !== undefined) return existing;
    const next = initialEligibility(definition.schedule),
      job = freeze({
        id: definition.id,
        definition: copy(definition),
        ...(next === undefined ? {} : { nextEligibleAt: next }),
        state: 'scheduled' as const,
        dispatchAttempts: 0,
        runtimeExecutionAttempts: 0 as const,
        createdAt: at,
        updatedAt: at,
      });
    this.jobs.save(job);
    this.transition(job, 'created', 'scheduled', 'schedule-created', at, authorization.decisionId);
    await this.publish('job.scheduled', job, definition.id);
    if (administrative)
      await this.audit.record({
        type: 'scheduler.administrative-schedule',
        jobId: job.id,
        principalId: authorization.principalId,
        authorizationDecisionId: authorization.decisionId,
        correlationId: job.definition.correlationId,
      });
    return job;
  }
  public async trigger(jobId: string, trigger: Trigger): Promise<QueueEntry | undefined> {
    const job = this.required(jobId);
    if (job.state === 'cancelled' || job.state === 'expired' || job.state === 'dead-letter')
      return undefined;
    if (Date.parse(trigger.at) >= Date.parse(job.definition.expiresAt)) {
      await this.expire(job, trigger.at);
      return undefined;
    }
    if (!eligible(job, trigger)) return undefined;
    const entry = freeze({
      id: `queue:${job.id}:${String(job.dispatchAttempts + 1)}`,
      jobId: job.id,
      priority: job.definition.priority,
      eligibleAt: trigger.at,
      enqueuedAt: trigger.at,
      attempt: job.dispatchAttempts + 1,
      correlationId: job.definition.correlationId,
    });
    if (!this.queue.enqueue(entry))
      throw new SchedulerError(
        'QUEUE_UNAVAILABLE',
        'Queue rejected job',
        `scheduler:queue:${job.id}`,
      );
    const queued = freeze({ ...job, state: 'queued' as const, updatedAt: trigger.at });
    this.jobs.save(queued);
    this.transition(queued, job.state, 'queued', 'trigger-eligible', trigger.at);
    await this.publish('job.queued', queued, entry.id);
    return entry;
  }
  public async dispatch(
    at: string,
    authorization: SchedulerAuthorization,
  ): Promise<DispatchResult | undefined> {
    const entry = this.queue.dequeue(at);
    if (entry === undefined) return undefined;
    const job = this.required(entry.jobId);
    enforce(authorization, 'dispatch', job.definition.scope, `scheduler:dispatch:${job.id}`);
    if (Date.parse(at) >= Date.parse(job.definition.expiresAt)) {
      await this.expire(job, at);
      return freeze({
        jobId: job.id,
        dispatchId: `dispatch:${entry.id}`,
        status: 'expired',
        attempt: entry.attempt,
        executionPerformed: false,
        executionOutcomeIncluded: false,
        executionRetryPerformed: false,
      });
    }
    const request: JobDispatchRequest = freeze({
      id: `dispatch:${entry.id}`,
      jobId: job.id,
      jobVersion: job.definition.version,
      executionTarget: copy(job.definition.executionTarget),
      securityRequirementReferences: [...job.definition.securityRequirementReferences],
      scope: copy(job.definition.scope),
      dispatchAuthorizationDecisionId: authorization.decisionId,
      correlationId: job.definition.correlationId,
      causationId: job.definition.causationId,
      dispatchAttempt: entry.attempt,
      executionRetryOwnedByRuntime: true,
      executionPerformed: false,
    });
    try {
      const acceptance = await this.worker.dispatch(request);
      if (!acceptance.accepted)
        throw new SchedulerError(
          'DISPATCH_FAILED',
          'Runtime handoff rejected',
          `scheduler:dispatch:${job.id}`,
        );
      const dispatched = freeze({
        ...job,
        state: 'dispatched' as const,
        dispatchAttempts: entry.attempt,
        updatedAt: at,
      });
      this.jobs.save(dispatched);
      this.transition(
        dispatched,
        job.state,
        'dispatched',
        'runtime-handoff-accepted',
        at,
        authorization.decisionId,
      );
      await this.publish('job.dispatched', dispatched, request.id);
      return freeze({
        jobId: job.id,
        dispatchId: request.id,
        status: 'accepted',
        attempt: entry.attempt,
        ...(acceptance.runtimeExecutionReference === undefined
          ? {}
          : { runtimeExecutionReference: acceptance.runtimeExecutionReference }),
        executionPerformed: false,
        executionOutcomeIncluded: false,
        executionRetryPerformed: false,
      });
    } catch (error) {
      return this.retry(job, entry, at, normalizeFailure(error));
    }
  }
  public async cancel(
    jobId: string,
    authorization: SchedulerAuthorization,
    at: string,
  ): Promise<ScheduledJob> {
    const job = this.required(jobId);
    enforce(authorization, 'cancel', job.definition.scope, `scheduler:cancel:${jobId}`);
    this.queue.remove(jobId);
    const cancelled = freeze({ ...job, state: 'cancelled' as const, updatedAt: at });
    this.jobs.save(cancelled);
    this.transition(
      cancelled,
      job.state,
      'cancelled',
      'authorized-cancellation',
      at,
      authorization.decisionId,
    );
    await this.publish('job.cancelled', cancelled, authorization.decisionId);
    await this.audit.record({
      type: 'scheduler.cancelled',
      jobId,
      principalId: authorization.principalId,
      authorizationDecisionId: authorization.decisionId,
      correlationId: job.definition.correlationId,
    });
    return cancelled;
  }
  private async retry(
    job: ScheduledJob,
    entry: QueueEntry,
    at: string,
    failure: DispatchFailure,
  ): Promise<DispatchResult> {
    const policy = job.definition.retry;
    if (
      !failure.retryable ||
      entry.attempt >=
        Math.min(policy.maximumAttempts, job.definition.constraints.maximumDispatchAttempts)
    ) {
      const record = freeze({
        id: `dead-letter:${job.id}:${String(entry.attempt)}`,
        jobId: job.id,
        finalAttempt: entry.attempt,
        failure,
        recordedAt: at,
        correlationId: job.definition.correlationId,
      });
      this.deadLetters.record(record);
      const dead = freeze({
        ...job,
        state: 'dead-letter' as const,
        dispatchAttempts: entry.attempt,
        updatedAt: at,
      });
      this.jobs.save(dead);
      this.transition(dead, job.state, 'dead-letter', 'dispatch-retry-exhausted', at);
      await this.publish('job.dead-lettered', dead, record.id, 'failed');
      return freeze({
        jobId: job.id,
        dispatchId: `dispatch:${entry.id}`,
        status: 'dead-lettered',
        attempt: entry.attempt,
        executionPerformed: false,
        executionOutcomeIncluded: false,
        executionRetryPerformed: false,
      });
    }
    const delay =
        policy.strategy === 'fixed'
          ? policy.baseDelayMs
          : Math.min(policy.maximumDelayMs, policy.baseDelayMs * 2 ** (entry.attempt - 1)),
      next = new Date(Date.parse(at) + delay).toISOString(),
      retryEntry = freeze({
        ...entry,
        id: `queue:${job.id}:${String(entry.attempt + 1)}`,
        eligibleAt: next,
        enqueuedAt: at,
        attempt: entry.attempt + 1,
      });
    this.queue.enqueue(retryEntry);
    const retrying = freeze({
      ...job,
      state: 'retrying' as const,
      dispatchAttempts: entry.attempt,
      updatedAt: at,
    });
    this.jobs.save(retrying);
    this.transition(retrying, job.state, 'retrying', 'dispatch-infrastructure-failure', at);
    await this.publish('job.retry-scheduled', retrying, retryEntry.id, 'failed');
    return freeze({
      jobId: job.id,
      dispatchId: `dispatch:${entry.id}`,
      status: 'retry-scheduled',
      attempt: entry.attempt,
      nextEligibleAt: next,
      executionPerformed: false,
      executionOutcomeIncluded: false,
      executionRetryPerformed: false,
    });
  }
  private async expire(job: ScheduledJob, at: string): Promise<void> {
    this.queue.remove(job.id);
    const expired = freeze({ ...job, state: 'expired' as const, updatedAt: at });
    this.jobs.save(expired);
    this.transition(expired, job.state, 'expired', 'expiration-reached', at);
    await this.publish('job.expired', expired, job.id, 'failed');
  }
  private transition(
    job: ScheduledJob,
    from: JobState,
    to: JobState,
    reason: string,
    at: string,
    decision?: string,
  ): void {
    this.lifecycle.append(
      freeze({
        id: `lifecycle:${job.id}:${to}:${String(this.lifecycle.records(job.id).length + 1)}`,
        jobId: job.id,
        from,
        to,
        reason,
        ...(decision === undefined ? {} : { authorizationDecisionId: decision }),
        occurredAt: at,
        correlationId: job.definition.correlationId,
        attempt: job.dispatchAttempts,
      }),
    );
    this.diagnostics.record({
      id: `scheduler:${job.id}:${to}`,
      phase: to,
      outcome: to === 'dead-letter' || to === 'expired' ? 'failed' : 'completed',
      jobId: job.id,
      attempt: job.dispatchAttempts,
      retryOwnership: 'dispatch-only',
    });
  }
  private required(id: string): ScheduledJob {
    const job = this.jobs.get(id);
    if (job === undefined)
      throw new SchedulerError('JOB_NOT_FOUND', 'Job not found', `scheduler:job:${id}`);
    return job;
  }
  private async publish(
    type: SchedulerFact['type'],
    job: ScheduledJob,
    operationId: string,
    outcome: SchedulerFact['outcome'] = 'completed',
  ): Promise<void> {
    await this.events.publish({
      type,
      jobId: job.id,
      operationId,
      tenantId: job.definition.scope.tenantId,
      correlationId: job.definition.correlationId,
      outcome,
      diagnosticsReference: `scheduler:${operationId}`,
    });
  }
}

function validateJob(value: Omit<JobDefinition, 'immutable'>): void {
  if (
    value.id.trim() === '' ||
    value.version.trim() === '' ||
    value.executionTarget.reference.trim() === '' ||
    value.scope.tenantId.trim() === '' ||
    value.priority < 0 ||
    value.retry.maximumAttempts < 1 ||
    value.retry.baseDelayMs < 0 ||
    value.retry.maximumDelayMs < value.retry.baseDelayMs ||
    Date.parse(value.expiresAt) <= Date.parse(value.createdAt)
  )
    throw new SchedulerError(
      'JOB_INVALID',
      'Job Definition is invalid',
      `scheduler:job:${value.id}`,
    );
  if (
    (value.schedule.type === 'fixed-interval' && value.schedule.intervalMs < 1) ||
    (value.schedule.type === 'cron' &&
      !/^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/.test(value.schedule.expression)) ||
    ('eligibleAt' in value.schedule && !Number.isFinite(Date.parse(value.schedule.eligibleAt)))
  )
    throw new SchedulerError(
      'SCHEDULE_INVALID',
      'Schedule Definition is invalid',
      `scheduler:schedule:${value.id}`,
    );
  if (
    /executionContext|runtimeState|workflowState|retryState|providerCredential|privateKey/i.test(
      JSON.stringify(value),
    )
  )
    throw new SchedulerError(
      'JOB_INVALID',
      'Job contains forbidden execution or secret content',
      `scheduler:job:${value.id}`,
    );
}
function initialEligibility(schedule: ScheduleDefinition): string | undefined {
  switch (schedule.type) {
    case 'one-time':
    case 'delayed':
      return schedule.eligibleAt;
    case 'fixed-interval':
      return schedule.firstEligibleAt;
    case 'cron':
      return schedule.nextEligibleAt;
    case 'event':
    case 'manual':
      return undefined;
  }
}
function eligible(job: ScheduledJob, trigger: Trigger): boolean {
  const schedule = job.definition.schedule;
  if (schedule.type === 'event')
    return trigger.type === 'event' && trigger.eventType === schedule.eventType;
  if (schedule.type === 'manual') return trigger.type === 'manual';
  if (trigger.type !== 'clock') return false;
  const next = job.nextEligibleAt;
  return next !== undefined && Date.parse(trigger.at) >= Date.parse(next);
}
function enforce(
  value: SchedulerAuthorization,
  operation: SchedulerAuthorization['operation'],
  scope: SchedulerScope,
  id: string,
): void {
  if (!value.authorized || value.state !== 'active' || value.operation !== operation)
    throw new SchedulerError('JOB_UNAUTHORIZED', 'Scheduler operation is unauthorized', id);
  if (
    value.scope.tenantId !== scope.tenantId ||
    (scope.workspaceId !== undefined && value.scope.workspaceId !== scope.workspaceId)
  )
    throw new SchedulerError('JOB_SCOPE_VIOLATION', 'Scheduler scope is unauthorized', id);
}
function normalizeFailure(error: unknown): DispatchFailure {
  return freeze({
    category:
      error instanceof SchedulerError ? 'runtime-handoff-unavailable' : 'worker-unavailable',
    message: 'Dispatch infrastructure failed',
    retryable: true,
  });
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export * from './reference.js';
