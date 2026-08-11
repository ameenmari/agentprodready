import type { ExecutionContext } from '@agentprodready/foundation';
import {
  FileBackedMemoryProvider,
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  InMemoryMemoryProvider,
  MemoryEngine,
  NoopMemoryAiPort,
  NoopMemoryTelemetry,
  PersistenceBackedMemoryProvider,
  WeightedMemoryRanking,
  type MemoryAuthorization,
  type MemoryRetrievalResult,
  type MemorySearchProvider,
  type MemoryStorageProvider,
} from '@agentprodready/memory';
import { SimpleAgentError } from './errors.js';
import {
  EMBEDDED_TENANT,
  EMBEDDED_USER,
  EMBEDDED_WORKSPACE,
} from './embedded-security.js';

export type SimpleMemory =
  | {
      readonly __simpleMemory: true;
      readonly kind: 'in-memory';
      readonly namespace: string;
    }
  | {
      readonly __simpleMemory: true;
      readonly kind: 'file';
      readonly namespace: string;
      readonly directory: string;
    }
  | {
      readonly __simpleMemory: true;
      readonly kind: 'postgres';
      readonly namespace: string;
      readonly connectionString: string;
    };

export function inMemory(options?: { readonly namespace?: string }): SimpleMemory {
  const namespace = options?.namespace?.trim() || 'default';
  if (namespace === '') {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'inMemory namespace must be non-empty when provided.');
  }
  return Object.freeze({
    __simpleMemory: true as const,
    kind: 'in-memory' as const,
    namespace,
  });
}

export function fileMemory(options: {
  readonly directory: string;
  readonly namespace?: string;
}): SimpleMemory {
  const record = options as { readonly directory?: unknown; readonly namespace?: unknown };
  const directory = typeof record.directory === 'string' ? record.directory.trim() : '';
  if (directory === '') {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'fileMemory requires a non-empty directory path.');
  }
  const namespace = typeof record.namespace === 'string' ? record.namespace.trim() || 'default' : 'default';
  if (namespace === '') {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'fileMemory namespace must be non-empty when provided.');
  }
  return Object.freeze({
    __simpleMemory: true as const,
    kind: 'file' as const,
    namespace,
    directory,
  });
}

export function postgresMemory(options: {
  readonly connectionString: string;
  readonly namespace?: string;
}): SimpleMemory {
  const record = options as { readonly connectionString?: unknown; readonly namespace?: unknown };
  const connectionString =
    typeof record.connectionString === 'string' ? record.connectionString.trim() : '';
  if (connectionString === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'postgresMemory requires a non-empty connectionString.',
    );
  }
  const namespace = typeof record.namespace === 'string' ? record.namespace.trim() || 'default' : 'default';
  if (namespace === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'postgresMemory namespace must be non-empty when provided.',
    );
  }
  return Object.freeze({
    __simpleMemory: true as const,
    kind: 'postgres' as const,
    namespace,
    connectionString,
  });
}

export function isSimpleMemory(value: unknown): value is SimpleMemory {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { __simpleMemory?: unknown; kind?: unknown; namespace?: unknown };
  if (record.__simpleMemory !== true || typeof record.namespace !== 'string') return false;
  if (record.kind === 'in-memory') return true;
  if (record.kind === 'file') {
    return typeof (value as { directory?: unknown }).directory === 'string';
  }
  if (record.kind === 'postgres') {
    return typeof (value as { connectionString?: unknown }).connectionString === 'string';
  }
  return false;
}

/** MemoryEngine session scoped to one createAgent instance (ephemeral or durable). */
export class EmbeddedMemorySession {
  readonly #engine: MemoryEngine;
  readonly #agentId: string;
  readonly #namespace: string;
  readonly #durable: boolean;
  readonly #disposeProvider: (() => Promise<void>) | undefined;
  #closed = false;
  #sequence = 0;

  private constructor(
    agentId: string,
    memory: SimpleMemory,
    storage: MemoryStorageProvider & MemorySearchProvider,
    disposeProvider?: () => Promise<void>,
  ) {
    this.#agentId = agentId;
    this.#namespace = memory.namespace;
    this.#durable = memory.kind !== 'in-memory';
    this.#disposeProvider = disposeProvider;
    this.#engine = new MemoryEngine(
      storage,
      storage,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      new InMemoryMemoryDiagnostics(),
      new InMemoryMemoryEvents(),
      new NoopMemoryTelemetry(),
    );
  }

  public static async create(agentId: string, memory: SimpleMemory): Promise<EmbeddedMemorySession> {
    if (memory.kind === 'in-memory') {
      return new EmbeddedMemorySession(agentId, memory, new InMemoryMemoryProvider());
    }
    if (memory.kind === 'file') {
      const pathMod = await import('node:path');
      const directory = pathMod.default.join(memory.directory, memory.namespace);
      return new EmbeddedMemorySession(agentId, memory, new FileBackedMemoryProvider(directory));
    }
    // postgres
    try {
      const postgres = await import('@agentprodready/persistence-postgres');
      const provider = new postgres.PostgresPersistenceProvider(
        Object.freeze({
          connectionString: memory.connectionString,
          ssl: false,
          poolMin: 0,
          poolMax: 4,
        }),
      );
      await provider.assertReady();
      const storage = new PersistenceBackedMemoryProvider(provider);
      return new EmbeddedMemorySession(agentId, memory, storage, async () => {
        await provider.close();
      });
    } catch (error) {
      if (error instanceof SimpleAgentError) throw error;
      if (
        error instanceof Error &&
        /Cannot find module|Failed to resolve|Cannot find package/u.test(error.message)
      ) {
        throw new SimpleAgentError(
          'AGENT_INVALID_CONFIG',
          'postgresMemory requires @agentprodready/persistence-postgres. Install it with:\n npm install @agentprodready/persistence-postgres',
          undefined,
          { cause: error },
        );
      }
      throw new SimpleAgentError(
        'AGENT_INIT_FAILED',
        'postgresMemory failed to initialize Persistence. Ensure migrations are applied and the connection string is valid.',
        undefined,
        { cause: error },
      );
    }
  }

  public get durable(): boolean {
    return this.#durable;
  }

  public get namespace(): string {
    return this.#namespace;
  }

  public async retrieveForPrompt(params: {
    readonly executionId: string;
    readonly correlationId: string;
    readonly query: string;
    readonly decisionId: string;
  }): Promise<MemoryRetrievalResult> {
    this.#ensureOpen();
    const context = this.#context(params.executionId, params.correlationId);
    const authorization = this.#authorization(params.decisionId);
    return this.#engine.retrieve({
      requestId: `memory-retrieve:${params.executionId}`,
      query: params.query,
      node: Object.freeze({
        workflowId: `workflow:${params.executionId}`,
        nodeId: 'memory-retrieve',
        kind: 'capability',
        capability: 'text-generation',
      }),
      context,
      authorization,
      categories: Object.freeze(['episodic', 'user'] as const),
      strategy: 'keyword',
      ownership: Object.freeze({ userId: EMBEDDED_USER, agentId: this.#agentId }),
      maximumResults: 8,
      ranking: Object.freeze({
        relevanceWeight: 0.7,
        importanceWeight: 0.2,
        recencyWeight: 0.1,
        policyVersion: 'embedded-simple-memory-1',
        aiAssisted: false,
      }),
      metadata: Object.freeze({ source: 'simple-memory', namespace: this.#namespace }),
    });
  }

  public async rememberTurn(params: {
    readonly executionId: string;
    readonly correlationId: string;
    readonly decisionId: string;
    readonly userInput: string;
    readonly assistantText: string;
  }): Promise<void> {
    this.#ensureOpen();
    const context = this.#context(params.executionId, params.correlationId);
    const authorization = this.#authorization(params.decisionId);
    this.#sequence += 1;
    const sourceEventId = `evt${this.#agentId.replaceAll(/[^a-zA-Z0-9_-]/gu, '').slice(-24)}${String(this.#sequence)}`;
    let record = await this.#engine.capture({
      requestId: `memory-capture:${params.executionId}:${String(this.#sequence)}`,
      sourceEventId,
      producer: 'simple-agent',
      execution: Object.freeze({
        executionId: params.executionId,
        correlationId: params.correlationId,
      }),
      context,
      ownership: Object.freeze({
        tenantId: EMBEDDED_TENANT,
        workspaceId: EMBEDDED_WORKSPACE,
        userId: EMBEDDED_USER,
        agentId: this.#agentId,
      }),
      authorization,
      content: Object.freeze({
        namespace: this.#namespace,
        agentId: this.#agentId,
        user: params.userInput,
        assistant: params.assistantText,
      }),
      metadata: Object.freeze({ source: 'simple-memory', namespace: this.#namespace }),
      securityLabels: Object.freeze(['operations']),
      classification: Object.freeze({
        category: 'episodic' as const,
        importance: 'normal' as const,
        lifetime: this.#durable ? ('persistent' as const) : ('session' as const),
        visibility: 'user' as const,
      }),
      retention: Object.freeze({
        policyId: this.#durable ? 'embedded-durable' : 'embedded-ephemeral',
        category: this.#durable ? ('policy-based' as const) : ('session-only' as const),
      }),
      version: '1',
      occurredAt: new Date().toISOString(),
      semantics: Object.freeze({ sideEffect: 'state-producing' as const, idempotency: 'idempotent' as const }),
    });

    for (const action of ['classify', 'organize', 'index', 'make-available'] as const) {
      record = await this.#engine.transition({
        requestId: `memory-life:${params.executionId}:${action}:${String(this.#sequence)}`,
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action,
        authorization,
        context,
        semantics: Object.freeze({ sideEffect: 'mutating' as const, idempotency: 'idempotent' as const }),
      });
    }
  }

  public async dispose(): Promise<void> {
    this.#closed = true;
    await this.#disposeProvider?.();
  }

  #ensureOpen(): void {
    if (this.#closed) {
      throw new SimpleAgentError('AGENT_CLOSED', 'Memory session was closed with the agent.');
    }
  }

  #authorization(decisionId: string): MemoryAuthorization {
    return Object.freeze({
      authorized: true as const,
      decisionId,
      allowedLabels: Object.freeze(['operations']),
      allowedVisibilities: Object.freeze(['user', 'workspace'] as const),
    });
  }

  #context(executionId: string, correlationId: string): ExecutionContext {
    return Object.freeze({
      executionId,
      correlationId,
      tenantId: EMBEDDED_TENANT,
      workspaceId: EMBEDDED_WORKSPACE,
      startedAt: new Date().toISOString(),
      configurationVersion: 'config:embedded:1',
      securityContextId: 'security:embedded-memory',
      attributes: Object.freeze({ agentId: this.#agentId, memoryNamespace: this.#namespace }),
    });
  }
}

export function formatMemoryForPrompt(result: MemoryRetrievalResult, durable = false): string {
  if (result.memories.length === 0) return '';
  const lines = result.memories.map((item, index) => {
    const content = item.content;
    if (typeof content === 'object' && content !== null && 'user' in content && 'assistant' in content) {
      const row = content as { user?: unknown; assistant?: unknown };
      const user = typeof row.user === 'string' ? row.user : JSON.stringify(row.user ?? '');
      const assistant =
        typeof row.assistant === 'string' ? row.assistant : JSON.stringify(row.assistant ?? '');
      return `${String(index + 1)}. user=${user}; assistant=${assistant}`;
    }
    return `${String(index + 1)}. ${JSON.stringify(content)}`;
  });
  const header = durable
    ? 'Durable agent memory (survives process restart):'
    : 'Ephemeral agent memory (process-local, not durable):';
  return [header, ...lines].join('\n');
}
