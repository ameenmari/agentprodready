import type { ExecutionContext } from '@agentprodready/foundation';
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  InMemoryMemoryProvider,
  MemoryEngine,
  NoopMemoryAiPort,
  NoopMemoryTelemetry,
  WeightedMemoryRanking,
  type MemoryAuthorization,
  type MemoryRetrievalResult,
} from '@agentprodready/memory';
import { SimpleAgentError } from './errors.js';
import {
  EMBEDDED_TENANT,
  EMBEDDED_USER,
  EMBEDDED_WORKSPACE,
} from './embedded-security.js';

export interface SimpleMemory {
  readonly __simpleMemory: true;
  readonly kind: 'in-memory';
  readonly namespace: string;
}

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

export function isSimpleMemory(value: unknown): value is SimpleMemory {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __simpleMemory?: unknown }).__simpleMemory === true &&
    typeof (value as { namespace?: unknown }).namespace === 'string'
  );
}

/** Process-local MemoryEngine session scoped to one createAgent instance. */
export class EmbeddedMemorySession {
  readonly #engine: MemoryEngine;
  readonly #provider: InMemoryMemoryProvider;
  readonly #agentId: string;
  readonly #namespace: string;
  #closed = false;
  #sequence = 0;

  public constructor(agentId: string, memory: SimpleMemory) {
    this.#agentId = agentId;
    this.#namespace = memory.namespace;
    this.#provider = new InMemoryMemoryProvider();
    this.#engine = new MemoryEngine(
      this.#provider,
      this.#provider,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      new InMemoryMemoryDiagnostics(),
      new InMemoryMemoryEvents(),
      new NoopMemoryTelemetry(),
    );
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
        lifetime: 'session' as const,
        visibility: 'user' as const,
      }),
      retention: Object.freeze({ policyId: 'embedded-ephemeral', category: 'session-only' as const }),
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

export function formatMemoryForPrompt(result: MemoryRetrievalResult): string {
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
  return ['Ephemeral agent memory (process-local, not durable):', ...lines].join('\n');
}
