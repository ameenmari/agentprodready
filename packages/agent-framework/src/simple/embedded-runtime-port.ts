import type { AgentRuntimePort, RuntimeAgentInvocation } from '../index.js';
import type { CreateExecutionContextRequest } from '@agentprodready/foundation';
import type {
  RuntimeOrchestrator,
  RuntimeResult,
  RuntimeStreamEvent,
  StreamEventLog,
} from '@agentprodready/runtime';
import type { SecurityContext } from '@agentprodready/security';

export interface StoredExecutionResult {
  readonly runtime: RuntimeResult;
  readonly invocation: RuntimeAgentInvocation;
}

export class EmbeddedRuntimePort implements AgentRuntimePort {
  readonly #results = new Map<string, StoredExecutionResult>();
  readonly #streams = new Map<string, AsyncIterable<RuntimeStreamEvent>>();
  readonly #controllers = new Map<string, AbortController>();

  public constructor(
    private readonly runtime: RuntimeOrchestrator,
    private readonly securityContexts: ReadonlyMap<string, SecurityContext>,
    private readonly tenantId: string,
    private readonly workspaceId: string,
    private readonly streamLog?: StreamEventLog,
  ) {}

  public async accept(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>> {
    const executionId = `execution:${crypto.randomUUID()}`;
    const security = this.securityContexts.get(request.securityContextReference);
    if (security === undefined) {
      throw new TypeError('Security context is unavailable for runtime handoff');
    }

    const runtimeResult = await this.runtime.execute({
      context: this.#context(executionId, request, security),
      input: request.objective,
    });

    this.#results.set(executionId, Object.freeze({ runtime: runtimeResult, invocation: request }));
    return Object.freeze({ executionReference: executionId });
  }

  public async acceptStream(
    request: RuntimeAgentInvocation,
  ): Promise<Readonly<{ executionReference: string }>> {
    const executionId = `execution:${crypto.randomUUID()}`;
    const security = this.securityContexts.get(request.securityContextReference);
    if (security === undefined) {
      throw new TypeError('Security context is unavailable for runtime handoff');
    }

    const controller = new AbortController();
    this.#controllers.set(executionId, controller);
    const stream = this.runtime.executeStream({
      context: this.#context(executionId, request, security),
      input: request.objective,
      signal: controller.signal,
    });

    const tracked = this.#trackStream(executionId, request, stream);
    this.#streams.set(executionId, tracked);
    return Object.freeze({ executionReference: executionId });
  }

  public getResult(executionReference: string): StoredExecutionResult | undefined {
    return this.#results.get(executionReference);
  }

  public getStream(executionReference: string): AsyncIterable<RuntimeStreamEvent> | undefined {
    return this.#streams.get(executionReference);
  }

  public async dispose(): Promise<void> {
    for (const controller of this.#controllers.values()) {
      controller.abort();
    }
    this.#results.clear();
    this.#streams.clear();
    this.#controllers.clear();
  }

  async *#trackStream(
    executionId: string,
    request: RuntimeAgentInvocation,
    stream: AsyncIterable<RuntimeStreamEvent>,
  ): AsyncIterable<RuntimeStreamEvent> {
    let sequence = 0;
    try {
      for await (const event of stream) {
        if (this.streamLog !== undefined) {
          await this.streamLog.append(
            Object.freeze({
              executionId,
              sequence: sequence++,
              event,
              occurredAt: new Date().toISOString(),
            }),
          );
        }
        if (event.type === 'completed') {
          this.#results.set(executionId, Object.freeze({ runtime: event.result, invocation: request }));
        }
        yield event;
      }
    } finally {
      this.#controllers.delete(executionId);
    }
  }

  #context(
    executionId: string,
    request: RuntimeAgentInvocation,
    security: SecurityContext,
  ): CreateExecutionContextRequest {
    return Object.freeze({
      executionId,
      correlationId: request.correlationId,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
      configurationVersion: 'config:embedded:1',
      securityContextId: security.id,
      securityContext: Object.freeze({
        id: security.id,
        version: security.version,
        principalId: security.principalId,
        decisionId: security.decisionId,
        expiresAt: security.expiresAt,
      }),
      attributes: Object.freeze({ objective: request.objective }),
    });
  }
}
