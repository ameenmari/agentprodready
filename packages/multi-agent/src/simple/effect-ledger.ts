/** Orchestration-level durable effect records (idempotency + replay protection). */

export type EffectStatus = 'started' | 'completed' | 'failed';

export interface EffectRecord {
  readonly id: string;
  readonly runId: string;
  readonly stepId?: string;
  readonly operation: string;
  readonly idempotencyKey: string;
  readonly status: EffectStatus;
  readonly result?: unknown;
  readonly error?: string;
  readonly createdAt: string;
  readonly completedAt?: string;
}

export interface EffectLedger {
  begin(input: {
    readonly runId: string;
    readonly stepId?: string;
    readonly operation: string;
    readonly idempotencyKey: string;
  }): Promise<EffectRecord>;
  complete(idempotencyKey: string, result?: unknown): Promise<EffectRecord>;
  fail(idempotencyKey: string, error: string): Promise<EffectRecord>;
  get(idempotencyKey: string): Promise<EffectRecord | undefined>;
}

export class InMemoryEffectLedger implements EffectLedger {
  readonly #byKey = new Map<string, EffectRecord>();

  public async begin(input: {
    readonly runId: string;
    readonly stepId?: string;
    readonly operation: string;
    readonly idempotencyKey: string;
  }): Promise<EffectRecord> {
    const key = input.idempotencyKey.trim();
    const existing = this.#byKey.get(key);
    if (existing?.status === 'completed') {
      return existing;
    }
    const record: EffectRecord = {
      id: `effect:${crypto.randomUUID()}`,
      runId: input.runId,
      ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
      operation: input.operation,
      idempotencyKey: key,
      status: 'started',
      createdAt: new Date().toISOString(),
    };
    this.#byKey.set(key, record);
    return record;
  }

  public async complete(idempotencyKey: string, result?: unknown): Promise<EffectRecord> {
    const key = idempotencyKey.trim();
    const existing = this.#byKey.get(key);
    if (existing?.status === 'completed') {
      return existing;
    }
    const record: EffectRecord = {
      id: existing?.id ?? `effect:${crypto.randomUUID()}`,
      runId: existing?.runId ?? 'unknown',
      ...(existing?.stepId === undefined ? {} : { stepId: existing.stepId }),
      operation: existing?.operation ?? 'unknown',
      idempotencyKey: key,
      status: 'completed',
      ...(result === undefined ? {} : { result }),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    this.#byKey.set(key, record);
    return record;
  }

  public async fail(idempotencyKey: string, error: string): Promise<EffectRecord> {
    const key = idempotencyKey.trim();
    const existing = this.#byKey.get(key);
    const record: EffectRecord = {
      id: existing?.id ?? `effect:${crypto.randomUUID()}`,
      runId: existing?.runId ?? 'unknown',
      ...(existing?.stepId === undefined ? {} : { stepId: existing.stepId }),
      operation: existing?.operation ?? 'unknown',
      idempotencyKey: key,
      status: 'failed',
      error,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    this.#byKey.set(key, record);
    return record;
  }

  public async get(idempotencyKey: string): Promise<EffectRecord | undefined> {
    return this.#byKey.get(idempotencyKey.trim());
  }
}

/**
 * Run an external side effect once per idempotency key.
 * If a completed record exists, returns the cached result without calling `execute`.
 */
export async function runEffect<T>(
  ledger: EffectLedger,
  input: {
    readonly runId: string;
    readonly stepId?: string;
    readonly operation: string;
    readonly idempotencyKey: string;
  },
  execute: () => Promise<T>,
): Promise<{ readonly record: EffectRecord; readonly result: T; readonly replayed: boolean }> {
  const existing = await ledger.get(input.idempotencyKey);
  if (existing?.status === 'completed') {
    return {
      record: existing,
      result: existing.result as T,
      replayed: true,
    };
  }
  await ledger.begin(input);
  try {
    const result = await execute();
    const record = await ledger.complete(input.idempotencyKey, result);
    return { record, result, replayed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ledger.fail(input.idempotencyKey, message);
    throw error;
  }
}
