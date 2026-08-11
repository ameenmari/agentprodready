import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AiMessage } from '@agentprodready/ai-provider';
import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ToolLoopCheckpoint } from '@agentprodready/runtime';
import { SimpleAgentError } from './errors.js';

export type ApprovalDecisionOutcome = 'approved' | 'rejected';

export interface PendingApprovalRecord {
  readonly approvalId: string;
  readonly executionId: string;
  readonly toolId: string;
  readonly toolCallId: string;
  readonly toolLoop: ToolLoopCheckpoint;
  readonly messages: readonly AiMessage[];
  readonly binding: CapabilityBinding;
  readonly objective: string;
  readonly createdAt: string;
  readonly status: 'awaiting' | ApprovalDecisionOutcome;
  readonly reason?: string;
}

export interface EmbeddedHitlStore {
  save(record: PendingApprovalRecord): Promise<void>;
  get(approvalId: string): Promise<PendingApprovalRecord | undefined>;
  getByExecution(executionId: string): Promise<PendingApprovalRecord | undefined>;
  update(record: PendingApprovalRecord): Promise<void>;
}

export class InMemoryHitlStore implements EmbeddedHitlStore {
  readonly #byApproval = new Map<string, PendingApprovalRecord>();
  readonly #byExecution = new Map<string, string>();

  public async save(record: PendingApprovalRecord): Promise<void> {
    this.#byApproval.set(record.approvalId, freezeClone(record));
    this.#byExecution.set(record.executionId, record.approvalId);
  }

  public async get(approvalId: string): Promise<PendingApprovalRecord | undefined> {
    const value = this.#byApproval.get(approvalId);
    return value === undefined ? undefined : freezeClone(value);
  }

  public async getByExecution(executionId: string): Promise<PendingApprovalRecord | undefined> {
    const approvalId = this.#byExecution.get(executionId);
    if (approvalId === undefined) return undefined;
    return this.get(approvalId);
  }

  public async update(record: PendingApprovalRecord): Promise<void> {
    if (!this.#byApproval.has(record.approvalId)) {
      throw new SimpleAgentError('AGENT_APPROVAL_NOT_FOUND', `Unknown approval id ${record.approvalId}`);
    }
    await this.save(record);
  }
}

export class FileHitlStore implements EmbeddedHitlStore {
  public constructor(private readonly directory: string) {}

  public async save(record: PendingApprovalRecord): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.#path(record.approvalId), JSON.stringify(record), 'utf8');
    await writeFile(
      path.join(this.directory, `exec__${safe(record.executionId)}.json`),
      JSON.stringify({ approvalId: record.approvalId }),
      'utf8',
    );
  }

  public async get(approvalId: string): Promise<PendingApprovalRecord | undefined> {
    try {
      const raw = await readFile(this.#path(approvalId), 'utf8');
      return JSON.parse(raw) as PendingApprovalRecord;
    } catch {
      return undefined;
    }
  }

  public async getByExecution(executionId: string): Promise<PendingApprovalRecord | undefined> {
    try {
      const raw = await readFile(path.join(this.directory, `exec__${safe(executionId)}.json`), 'utf8');
      const { approvalId } = JSON.parse(raw) as { approvalId: string };
      return this.get(approvalId);
    } catch {
      return undefined;
    }
  }

  public async update(record: PendingApprovalRecord): Promise<void> {
    const existing = await this.get(record.approvalId);
    if (existing === undefined) {
      throw new SimpleAgentError('AGENT_APPROVAL_NOT_FOUND', `Unknown approval id ${record.approvalId}`);
    }
    await this.save(record);
  }

  #path(approvalId: string): string {
    return path.join(this.directory, `approval__${safe(approvalId)}.json`);
  }
}

export class EmbeddedHitlController {
  public constructor(private readonly store: EmbeddedHitlStore) {}

  public async park(record: Omit<PendingApprovalRecord, 'status'>): Promise<PendingApprovalRecord> {
    const parked = freezeClone({ ...record, status: 'awaiting' as const });
    await this.store.save(parked);
    return parked;
  }

  public async approve(approvalId: string): Promise<PendingApprovalRecord> {
    const current = await this.#require(approvalId);
    if (current.status !== 'awaiting') {
      throw new SimpleAgentError(
        'AGENT_RESUME_FAILED',
        `Approval ${approvalId} is already ${current.status}`,
        approvalId,
      );
    }
    const next = freezeClone({ ...current, status: 'approved' as const });
    await this.store.update(next);
    return next;
  }

  public async reject(approvalId: string, reason?: string): Promise<PendingApprovalRecord> {
    const current = await this.#require(approvalId);
    if (current.status !== 'awaiting') {
      throw new SimpleAgentError(
        'AGENT_RESUME_FAILED',
        `Approval ${approvalId} is already ${current.status}`,
        approvalId,
      );
    }
    const next = freezeClone({
      ...current,
      status: 'rejected' as const,
      ...(reason === undefined ? {} : { reason }),
    });
    await this.store.update(next);
    return next;
  }

  public async requireApproved(executionId: string): Promise<PendingApprovalRecord> {
    const record = await this.store.getByExecution(executionId);
    if (record === undefined) {
      throw new SimpleAgentError(
        'AGENT_RESUME_FAILED',
        `No paused approval found for execution ${executionId}`,
        executionId,
      );
    }
    if (record.status === 'rejected') {
      throw new SimpleAgentError(
        'AGENT_TOOL_REJECTED',
        record.reason ?? 'Tool approval was rejected',
        record.approvalId,
      );
    }
    if (record.status !== 'approved') {
      throw new SimpleAgentError(
        'AGENT_RESUME_FAILED',
        `Approval ${record.approvalId} is still awaiting a decision. Call agent.approve(...) first.`,
        record.approvalId,
      );
    }
    return record;
  }

  async #require(approvalId: string): Promise<PendingApprovalRecord> {
    const current = await this.store.get(approvalId);
    if (current === undefined) {
      throw new SimpleAgentError('AGENT_APPROVAL_NOT_FOUND', `Unknown approval id ${approvalId}`, approvalId);
    }
    return current;
  }
}

function safe(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9:_-]/gu, '_').replaceAll(':', '__');
}

function freezeClone<T>(value: T): T {
  return Object.freeze(JSON.parse(JSON.stringify(value)) as T);
}
