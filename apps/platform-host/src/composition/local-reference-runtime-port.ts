import type { AgentRuntimePort, RuntimeAgentInvocation } from '@agentforge/agent-framework';
import type { CreateExecutionContextRequest } from '@agentforge/foundation';
import type { RuntimeOrchestrator, RuntimeResult, RuntimeStreamEvent } from '@agentforge/runtime';
import type { SecurityContext } from '@agentforge/security';
import type { LocalCapabilityExecutionOutput } from './local-reference-capability-execution.js';
import { LOCAL_TENANT, LOCAL_WORKSPACE } from '../config/local-reference-config.js';

export interface StoredExecutionResult {
  readonly runtime: RuntimeResult<LocalCapabilityExecutionOutput>;
  readonly invocation: RuntimeAgentInvocation;
}

export class LocalReferenceRuntimePort implements AgentRuntimePort {
  readonly #results = new Map<string, StoredExecutionResult>();
  readonly #streams = new Map<string, AsyncIterable<RuntimeStreamEvent<LocalCapabilityExecutionOutput>>>();
  readonly #executeCount = { value: 0 };
  readonly #executeStreamCount = { value: 0 };
  readonly #acceptCount = { value: 0 };
  readonly #acceptStreamCount = { value: 0 };

  public constructor(
    private readonly runtime: RuntimeOrchestrator,
    private readonly securityContexts: ReadonlyMap<string, SecurityContext>,
  ) {}

  public get counts(): Readonly<{
    accept: number;
    acceptStream: number;
    execute: number;
    executeStream: number;
  }> {
    return Object.freeze({
      accept: this.#acceptCount.value,
      acceptStream: this.#acceptStreamCount.value,
      execute: this.#executeCount.value,
      executeStream: this.#executeStreamCount.value,
    });
  }

  public async accept(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>> {
    this.#acceptCount.value++;
    const executionId = `execution:${crypto.randomUUID()}`;
    const security = this.securityContexts.get(request.securityContextReference);
    if (security === undefined) throw new TypeError('Security context is unavailable for runtime handoff');

    this.#executeCount.value++;
    const runtimeResult = await this.runtime.execute({
      context: this.#context(executionId, request, security),
      input: request.objective,
    });

    this.#results.set(
      executionId,
      Object.freeze({ runtime: runtimeResult as StoredExecutionResult['runtime'], invocation: request }),
    );
    return Object.freeze({ executionReference: executionId });
  }

  public async acceptStream(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>> {
    this.#acceptStreamCount.value++;
    const executionId = `execution:${crypto.randomUUID()}`;
    const security = this.securityContexts.get(request.securityContextReference);
    if (security === undefined) throw new TypeError('Security context is unavailable for runtime handoff');

    const controller = new AbortController();
    this.#controllers.set(executionId, controller);
    this.#executeStreamCount.value++;
    const stream = this.runtime.executeStream<LocalCapabilityExecutionOutput>({
      context: this.#context(executionId, request, security),
      input: request.objective,
      signal: controller.signal,
    });

    const tracked = this.#trackStream(executionId, request, stream);
    this.#streams.set(executionId, tracked);
    return Object.freeze({ executionReference: executionId });
  }

  public getStream(
    executionReference: string,
  ): AsyncIterable<RuntimeStreamEvent<LocalCapabilityExecutionOutput>> | undefined {
    return this.#streams.get(executionReference);
  }

  public getCancelController(executionReference: string): AbortController | undefined {
    return this.#controllers.get(executionReference);
  }

  readonly #controllers = new Map<string, AbortController>();

  public getResult(executionReference: string): StoredExecutionResult | undefined {
    return this.#results.get(executionReference);
  }

  public clear(): void {
    this.#results.clear();
    this.#streams.clear();
    this.#controllers.clear();
    this.#acceptCount.value = 0;
    this.#acceptStreamCount.value = 0;
    this.#executeCount.value = 0;
    this.#executeStreamCount.value = 0;
  }

  #context(
    executionId: string,
    request: RuntimeAgentInvocation,
    security: SecurityContext,
  ): CreateExecutionContextRequest {
    return Object.freeze({
      executionId,
      correlationId: request.correlationId,
      tenantId: LOCAL_TENANT,
      workspaceId: LOCAL_WORKSPACE,
      configurationVersion: 'config:local:1',
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

  async *#trackStream(
    executionId: string,
    request: RuntimeAgentInvocation,
    stream: AsyncIterable<RuntimeStreamEvent<LocalCapabilityExecutionOutput>>,
  ): AsyncIterable<RuntimeStreamEvent<LocalCapabilityExecutionOutput>> {
    try {
      for await (const event of stream) {
        if (event.type === 'completed') {
          this.#results.set(
            executionId,
            Object.freeze({
              runtime: event.result,
              invocation: request,
            }),
          );
        }
        yield event;
      }
    } finally {
      this.#controllers.delete(executionId);
      this.#streams.delete(executionId);
    }
  }
}
