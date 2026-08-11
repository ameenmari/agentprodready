import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { HealthResult } from '@agentprodready/foundation';
import { ExternalMemoryError } from './memory-errors.js';
import type {
  MemoryCandidate,
  MemoryRecord,
  MemoryRetrievalRequest,
  MemorySearchProvider,
  MemoryStorageProvider,
} from './index.js';

/**
 * Durable file-backed Memory storage/search for Simple `fileMemory({ directory })`.
 * One JSON file per memory id under `directory/`.
 */
export class FileBackedMemoryProvider implements MemoryStorageProvider, MemorySearchProvider {
  public constructor(private readonly directory: string) {}

  public async save(record: MemoryRecord): Promise<void> {
    await this.#ensureDir();
    const file = this.#pathFor(record.id);
    try {
      await readFile(file, 'utf8');
      throw new ExternalMemoryError('duplicate', 'Memory already exists');
    } catch (error) {
      if (error instanceof ExternalMemoryError) throw error;
      // missing file → ok
    }
    await writeFile(file, JSON.stringify(record), 'utf8');
  }

  public async get(id: string): Promise<MemoryRecord | undefined> {
    try {
      const raw = await readFile(this.#pathFor(id), 'utf8');
      return JSON.parse(raw) as MemoryRecord;
    } catch {
      return undefined;
    }
  }

  public async replace(record: MemoryRecord, expectedLifecycleVersion: number): Promise<void> {
    const current = await this.get(record.id);
    if (current === undefined) {
      throw new ExternalMemoryError('unavailable', 'Memory not found');
    }
    if (current.lifecycleVersion !== expectedLifecycleVersion) {
      throw new ExternalMemoryError('version-conflict', 'Memory version conflict');
    }
    await this.#ensureDir();
    await writeFile(this.#pathFor(record.id), JSON.stringify(record), 'utf8');
  }

  public async search(
    request: MemoryRetrievalRequest,
  ): Promise<Readonly<{ candidates: readonly MemoryCandidate[]; partialReasons: readonly string[] }>> {
    const partialReasons: string[] = [];
    if (request.strategy === 'semantic' || request.strategy === 'hybrid') {
      partialReasons.push('semantic-unavailable');
    } else if (request.strategy === 'relationship') {
      partialReasons.push('relationship-unavailable');
    }

    const records = await this.#listAll();
    const terms = request.query
      .toLowerCase()
      .split(/\s+/u)
      .filter((term) => term.length > 0);
    const candidates = records.map((record) => {
      const text = JSON.stringify(record.content).toLowerCase();
      const relevance =
        terms.length === 0 ? 0 : terms.filter((term) => text.includes(term)).length / terms.length;
      return Object.freeze({
        record,
        relevance,
        frequency: 1,
        searchStrategy: request.strategy,
      });
    });
    return Object.freeze({
      candidates: Object.freeze(candidates),
      partialReasons: Object.freeze(partialReasons),
    });
  }

  public async health(): Promise<HealthResult> {
    try {
      await this.#ensureDir();
      return Object.freeze({ name: 'file-backed-memory-provider', status: 'healthy' as const });
    } catch {
      return Object.freeze({ name: 'file-backed-memory-provider', status: 'unhealthy' as const });
    }
  }

  #pathFor(id: string): string {
    const safe = id.replaceAll(/[^a-zA-Z0-9:_-]/gu, '_').replaceAll(':', '__');
    return path.join(this.directory, `${safe}.json`);
  }

  async #ensureDir(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  async #listAll(): Promise<readonly MemoryRecord[]> {
    try {
      await this.#ensureDir();
      const entries = await readdir(this.directory);
      const records: MemoryRecord[] = [];
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        try {
          const raw = await readFile(path.join(this.directory, entry), 'utf8');
          records.push(JSON.parse(raw) as MemoryRecord);
        } catch {
          // skip corrupt
        }
      }
      return records;
    } catch {
      return [];
    }
  }
}
