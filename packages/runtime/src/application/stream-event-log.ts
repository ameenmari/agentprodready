import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeStreamEvent } from '../contracts/runtime.js';

export interface StreamEventRecord {
  readonly executionId: string;
  readonly sequence: number;
  readonly event: RuntimeStreamEvent;
  readonly occurredAt: string;
}

/** Durable or process-local log of Runtime stream events for reconnect / replay. */
export interface StreamEventLog {
  append(record: StreamEventRecord): Promise<void>;
  list(executionId: string, afterSequence?: number): Promise<readonly StreamEventRecord[]>;
}

export class InMemoryStreamEventLog implements StreamEventLog {
  readonly #byExecution = new Map<string, StreamEventRecord[]>();

  public async append(record: StreamEventRecord): Promise<void> {
    const list = this.#byExecution.get(record.executionId) ?? [];
    list.push(Object.freeze(JSON.parse(JSON.stringify(record)) as StreamEventRecord));
    this.#byExecution.set(record.executionId, list);
  }

  public async list(
    executionId: string,
    afterSequence = -1,
  ): Promise<readonly StreamEventRecord[]> {
    const list = this.#byExecution.get(executionId) ?? [];
    return Object.freeze(list.filter((item) => item.sequence > afterSequence).map((item) => Object.freeze({ ...item })));
  }
}

export class FileStreamEventLog implements StreamEventLog {
  public constructor(private readonly directory: string) {}

  public async append(record: StreamEventRecord): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const existing = await this.#load(record.executionId);
    existing.push(Object.freeze(JSON.parse(JSON.stringify(record)) as StreamEventRecord));
    await writeFile(this.#pathFor(record.executionId), JSON.stringify(existing), 'utf8');
  }

  public async list(
    executionId: string,
    afterSequence = -1,
  ): Promise<readonly StreamEventRecord[]> {
    const existing = await this.#load(executionId);
    return Object.freeze(existing.filter((item) => item.sequence > afterSequence));
  }

  async #load(executionId: string): Promise<StreamEventRecord[]> {
    try {
      const raw = await readFile(this.#pathFor(executionId), 'utf8');
      return JSON.parse(raw) as StreamEventRecord[];
    } catch {
      return [];
    }
  }

  #pathFor(executionId: string): string {
    const safe = executionId.replaceAll(/[^a-zA-Z0-9:_-]/gu, '_').replaceAll(':', '__');
    return path.join(this.directory, `${safe}.json`);
  }
}
