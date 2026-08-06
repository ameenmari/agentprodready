import type {
  BackgroundWorker,
  DeadLetterRecord,
  DeadLetterStore,
  JobDispatchRequest,
  JobLifecycleRecord,
  JobLifecycleStore,
  JobQueue,
  JobStore,
  QueueEntry,
  RuntimeJobAcceptance,
  RuntimeJobPort,
  ScheduledJob,
  SchedulerAudit,
  SchedulerDiagnostics,
  SchedulerEvents,
  SchedulerFact,
} from './index.js';
import { freeze } from './index.js';
export class InMemoryJobQueue implements JobQueue {
  readonly #values: QueueEntry[] = [];
  public enqueue(value: QueueEntry): boolean {
    if (this.#values.some((item) => item.id === value.id)) return false;
    this.#values.push(freeze(copy(value)));
    this.#values.sort(
      (a, b) =>
        b.priority - a.priority ||
        a.eligibleAt.localeCompare(b.eligibleAt) ||
        a.id.localeCompare(b.id),
    );
    return true;
  }
  public dequeue(at: string): QueueEntry | undefined {
    const index = this.#values.findIndex((value) => Date.parse(value.eligibleAt) <= Date.parse(at));
    if (index < 0) return undefined;
    const [value] = this.#values.splice(index, 1);
    return value === undefined ? undefined : freeze(copy(value));
  }
  public remove(jobId: string): void {
    for (let index = this.#values.length - 1; index >= 0; index--)
      if (this.#values[index]?.jobId === jobId) this.#values.splice(index, 1);
  }
  public peek(): readonly QueueEntry[] {
    return freeze(copy(this.#values));
  }
}
export class InMemoryJobStore implements JobStore {
  readonly #values = new Map<string, ScheduledJob>();
  public save(value: ScheduledJob): void {
    this.#values.set(value.id, freeze(copy(value)));
  }
  public get(id: string): ScheduledJob | undefined {
    const value = this.#values.get(id);
    return value === undefined ? undefined : freeze(copy(value));
  }
  public list(): readonly ScheduledJob[] {
    return freeze([...this.#values.values()].map(copy));
  }
}
export class InMemoryJobLifecycleStore implements JobLifecycleStore {
  readonly #values: JobLifecycleRecord[] = [];
  public append(value: JobLifecycleRecord): void {
    this.#values.push(freeze(copy(value)));
  }
  public records(id: string): readonly JobLifecycleRecord[] {
    return freeze(this.#values.filter((value) => value.jobId === id).map(copy));
  }
}
export class InMemoryDeadLetterStore implements DeadLetterStore {
  readonly #values: DeadLetterRecord[] = [];
  public record(value: DeadLetterRecord): void {
    this.#values.push(freeze(copy(value)));
  }
  public list(): readonly DeadLetterRecord[] {
    return freeze(copy(this.#values));
  }
}
export class LocalHandoffWorker implements BackgroundWorker {
  public constructor(private readonly runtime: RuntimeJobPort) {}
  public async dispatch(request: JobDispatchRequest): Promise<RuntimeJobAcceptance> {
    return this.runtime.accept(request);
  }
}
export class RecordingRuntimeJobPort implements RuntimeJobPort {
  public readonly requests: JobDispatchRequest[] = [];
  public constructor(
    private readonly outcomes: readonly ('accept' | 'reject' | 'throw')[] = ['accept'],
  ) {}
  public async accept(request: JobDispatchRequest): Promise<RuntimeJobAcceptance> {
    this.requests.push(freeze(copy(request)));
    const outcome = this.outcomes[this.requests.length - 1] ?? 'accept';
    if (outcome === 'throw') throw new Error('Runtime handoff unavailable');
    return freeze({
      dispatchId: request.id,
      accepted: outcome === 'accept',
      ...(outcome === 'accept' ? { runtimeExecutionReference: `runtime:${request.id}` } : {}),
      executionOutcomeIncluded: false,
      executionAttemptsIncluded: false,
    });
  }
}
export class InMemorySchedulerEvents implements SchedulerEvents {
  public readonly values: SchedulerFact[] = [];
  public async publish(value: SchedulerFact): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemorySchedulerAudit implements SchedulerAudit {
  public readonly values: unknown[] = [];
  public async record(value: Parameters<SchedulerAudit['record']>[0]): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemorySchedulerDiagnostics implements SchedulerDiagnostics {
  readonly #values: unknown[] = [];
  public record(value: Parameters<SchedulerDiagnostics['record']>[0]): void {
    this.#values.push(freeze(copy(value)));
  }
  public list(): readonly unknown[] {
    return freeze(copy(this.#values));
  }
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
