import { describe, expect, it, vi } from 'vitest';
import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import {
  FactoryToolAdapterResolver,
  InMemoryToolDiagnostics,
  InMemoryToolEvents,
  InMemoryToolIdempotencyLedger,
  ToolInvocationCoordinator,
  ToolRegistry,
  ToolValidator,
  type NormalizedToolResult,
  type ToolAdapter,
  type ToolContract,
  type ToolExecutionRequest,
} from '../index.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'r',
  capability: 'external.lookup',
  capabilityContractVersion: '1',
  implementationId: 'lookup',
  implementationVersion: '1',
  provider: Object.freeze({ id: 'external', pluginId: 'plugin', contributionId: 'lookup' }),
  source: 'default',
  diagnosticId: 'resolution:r',
});

const context: ExecutionContext = Object.freeze({
  executionId: 'e',
  correlationId: 'c',
  startedAt: 'x',
  configurationVersion: 'v',
  securityContextId: 's',
  attributes: Object.freeze({}),
});

const contract: ToolContract = Object.freeze({
  id: 'lookup',
  capability: 'external.lookup',
  version: '1',
  inputSchema: Object.freeze({ type: 'object', required: Object.freeze(['query']) }),
  outputSchema: Object.freeze({ type: 'object' }),
  sideEffect: 'read-only',
  idempotency: 'idempotent',
  metadata: Object.freeze({}),
  pluginId: 'plugin',
  contributionId: 'lookup',
});

const request: ToolExecutionRequest = Object.freeze({
  requestId: 't1',
  binding,
  node: Object.freeze({
    workflowId: 'w',
    nodeId: 'n',
    kind: 'capability',
    capability: 'external.lookup',
  }),
  context,
  parameters: Object.freeze({ query: 'value' }),
  authorization: Object.freeze({ authorized: true, decisionId: 'decision' }),
  metadata: Object.freeze({}),
  validation: Object.freeze({ schemaVersion: '1' }),
  constraints: Object.freeze({}),
  idempotencyKey: 'key-1',
});

class CountingAdapter implements ToolAdapter {
  public readonly id = 'lookup';
  public invokeCount = 0;

  public async invoke(): Promise<NormalizedToolResult> {
    this.invokeCount += 1;
    return Object.freeze({
      requestId: request.requestId,
      status: 'completed',
      data: Object.freeze({ query: 'value', count: this.invokeCount }),
      tool: Object.freeze({
        id: 'lookup',
        version: '1',
        sideEffect: 'read-only' as const,
        idempotency: 'idempotent' as const,
      }),
      execution: Object.freeze({ executionId: 'e', correlationId: 'c', idempotencyKey: 'key-1' }),
      validation: Object.freeze({
        valid: true,
        contractId: 'lookup',
        contractVersion: '1',
        checkedFields: Object.freeze([]),
      }),
      diagnosticId: 'tool:t1',
      metadata: Object.freeze({}),
    });
  }

  public async health(): Promise<{ readonly name: string; readonly status: 'healthy' }> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

describe('ToolIdempotencyLedger', () => {
  it('dedupes idempotent tool invocations via coordinator ledger', async () => {
    const ledger = new InMemoryToolIdempotencyLedger();
    const registry = new ToolRegistry();
    registry.register(contract);
    const adapter = new CountingAdapter();
    const resolver = new FactoryToolAdapterResolver();
    resolver.bind('lookup', async () => adapter);
    const coordinator = new ToolInvocationCoordinator(
      registry,
      resolver,
      new ToolValidator(),
      new InMemoryToolDiagnostics(),
      new InMemoryToolEvents(),
      { completed: vi.fn(), failed: vi.fn() },
      undefined,
      ledger,
    );

    const first = await coordinator.invoke(request);
    const second = await coordinator.invoke(request);

    expect(adapter.invokeCount).toBe(1);
    expect(second.data).toEqual(first.data);
  });
});
