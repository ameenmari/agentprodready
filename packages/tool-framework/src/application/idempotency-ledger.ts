import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NormalizedToolResult } from '../contracts/tool.js';

/** Durable (or process-local) cache for idempotent tool results keyed by idempotencyKey. */
export interface ToolIdempotencyLedger {
  get(key: string): Promise<NormalizedToolResult | undefined>;
  put(key: string, result: NormalizedToolResult): Promise<void>;
}

export class InMemoryToolIdempotencyLedger implements ToolIdempotencyLedger {
  readonly #items = new Map<string, NormalizedToolResult>();

  public async get(key: string): Promise<NormalizedToolResult | undefined> {
    const trimmed = key.trim();
    if (trimmed === '') return undefined;
    return this.#items.get(trimmed);
  }

  public async put(key: string, result: NormalizedToolResult): Promise<void> {
    const trimmed = key.trim();
    if (trimmed === '') return;
    this.#items.set(trimmed, Object.freeze(JSON.parse(JSON.stringify(result)) as NormalizedToolResult));
  }
}

/** File-backed ledger — exactly-once-capable for idempotent tools across process restarts. */
export class FileToolIdempotencyLedger implements ToolIdempotencyLedger {
  public constructor(private readonly directory: string) {}

  public async get(key: string): Promise<NormalizedToolResult | undefined> {
    const trimmed = key.trim();
    if (trimmed === '') return undefined;
    try {
      const raw = await readFile(this.#pathFor(trimmed), 'utf8');
      return JSON.parse(raw) as NormalizedToolResult;
    } catch {
      return undefined;
    }
  }

  public async put(key: string, result: NormalizedToolResult): Promise<void> {
    const trimmed = key.trim();
    if (trimmed === '') return;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.#pathFor(trimmed), JSON.stringify(result), 'utf8');
  }

  #pathFor(key: string): string {
    const safe = key.replaceAll(/[^a-zA-Z0-9:_-]/gu, '_').replaceAll(':', '__');
    return path.join(this.directory, `${safe}.json`);
  }
}
