/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type {
  ExecutionCheckpoint,
  ExecutionCheckpointPort,
  RuntimeEventPublisher,
  RuntimeFact,
  RuntimePolicy,
  RuntimePolicyProvider,
  RuntimeTelemetry,
} from '../contracts/runtime.js';
import { CheckpointConflictError, stripConcurrencyFields } from '../application/checkpoint.js';

export class StaticRuntimePolicyProvider implements RuntimePolicyProvider {
  public constructor(private readonly policy: RuntimePolicy) {}
  public get() {
    return this.policy;
  }
}

export class InMemoryRuntimeEventPublisher implements RuntimeEventPublisher {
  readonly #facts: RuntimeFact[] = [];
  public async publish(fact: RuntimeFact) {
    this.#facts.push(fact);
  }
  public facts() {
    return Object.freeze([...this.#facts]);
  }
}

interface StoredCheckpoint {
  readonly checkpoint: ExecutionCheckpoint;
  readonly revision: number;
  readonly versionToken: string;
}

export class InMemoryExecutionCheckpointPort implements ExecutionCheckpointPort {
  readonly #items = new Map<string, StoredCheckpoint>();

  public async store(checkpoint: ExecutionCheckpoint): Promise<void> {
    const existing = this.#items.get(checkpoint.executionId);
    const payload = Object.freeze({
      ...stripConcurrencyFields(checkpoint),
    }) as ExecutionCheckpoint;

    if (existing === undefined) {
      if (
        checkpoint.concurrencyRevision !== undefined ||
        checkpoint.concurrencyToken !== undefined
      ) {
        throw new CheckpointConflictError(
          `Optimistic concurrency conflict creating ${checkpoint.executionId}`,
        );
      }
      const revision = 1;
      const versionToken = `${checkpoint.executionId}:1:${checkpoint.updatedAt}`;
      this.#items.set(
        checkpoint.executionId,
        Object.freeze({
          checkpoint: payload,
          revision,
          versionToken,
        }),
      );
      return;
    }

    const expectedRevision = checkpoint.concurrencyRevision;
    const expectedToken = checkpoint.concurrencyToken;
    if (
      expectedRevision !== existing.revision ||
      (expectedToken !== undefined && expectedToken !== existing.versionToken)
    ) {
      throw new CheckpointConflictError(
        `Optimistic concurrency conflict updating ${checkpoint.executionId}`,
      );
    }

    const revision = existing.revision + 1;
    const versionToken = `${checkpoint.executionId}:${String(revision)}:${checkpoint.updatedAt}`;
    this.#items.set(
      checkpoint.executionId,
      Object.freeze({
        checkpoint: payload,
        revision,
        versionToken,
      }),
    );
  }

  public async load(executionId: string): Promise<ExecutionCheckpoint | undefined> {
    const stored = this.#items.get(executionId);
    if (stored === undefined) return undefined;
    return Object.freeze({
      ...stored.checkpoint,
      concurrencyRevision: stored.revision,
      concurrencyToken: stored.versionToken,
    });
  }

  public async listIncomplete(
    options: { readonly limit?: number } = {},
  ): Promise<readonly ExecutionCheckpoint[]> {
    const items = [...this.#items.values()]
      .filter((item) => !item.checkpoint.terminal)
      .map((item) =>
        Object.freeze({
          ...item.checkpoint,
          concurrencyRevision: item.revision,
          concurrencyToken: item.versionToken,
        }),
      );
    const limit = options.limit ?? items.length;
    return Object.freeze(items.slice(0, limit));
  }
}

export class NoopRuntimeTelemetry implements RuntimeTelemetry {
  public transition(_fact: RuntimeFact) {}
  public completed(_id: string, _duration: number, _attempts: number) {}
  public failed(_id: string, _code: string, _duration: number) {}
  public recovery(
    _kind: 'started' | 'resumed' | 'completed' | 'failed' | 'deferred' | 'unsafe_fail',
    _executionId: string,
  ) {}
}
