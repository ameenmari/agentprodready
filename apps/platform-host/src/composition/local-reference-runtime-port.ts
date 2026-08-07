import type { AgentRuntimePort, RuntimeAgentInvocation } from '@agentforge/agent-framework';
import type { RuntimeOrchestrator, RuntimeResult } from '@agentforge/runtime';
import type { SecurityContext } from '@agentforge/security';
import type { LocalCapabilityExecutionOutput } from './local-reference-capability-execution.js';
import {
  LOCAL_TENANT,
  LOCAL_WORKSPACE,
} from '../config/local-reference-config.js';

export interface StoredExecutionResult {
  readonly runtime: RuntimeResult<LocalCapabilityExecutionOutput>;
  readonly invocation: RuntimeAgentInvocation;
}

export class LocalReferenceRuntimePort implements AgentRuntimePort {
  readonly #results = new Map<string, StoredExecutionResult>();

  public constructor(
    private readonly runtime: RuntimeOrchestrator,
    private readonly securityContexts: ReadonlyMap<string, SecurityContext>,
  ) {}

  public async accept(request: RuntimeAgentInvocation): Promise<Readonly<{ executionReference: string }>> {
    const executionId = `execution:${crypto.randomUUID()}`;
    const security = this.securityContexts.get(request.securityContextReference);
    if (security === undefined) throw new TypeError('Security context is unavailable for runtime handoff');

    const runtimeResult = await this.runtime.execute({
      context: Object.freeze({
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
      }),
      input: request.objective,
    });

    this.#results.set(executionId, Object.freeze({ runtime: runtimeResult as StoredExecutionResult['runtime'], invocation: request }));
    return Object.freeze({ executionReference: executionId });
  }

  public getResult(executionReference: string): StoredExecutionResult | undefined {
    return this.#results.get(executionReference);
  }

  public clear(): void {
    this.#results.clear();
  }
}
