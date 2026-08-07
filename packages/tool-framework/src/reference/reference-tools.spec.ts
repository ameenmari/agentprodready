import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import { describe, expect, it } from 'vitest';
import {
  ReferenceCounterToolAdapter,
  ReferenceEchoToolAdapter,
  REFERENCE_COUNTER_TOOL_ID,
  REFERENCE_ECHO_TOOL_ID,
} from './reference-tool.js';

const context: ExecutionContext = Object.freeze({
  executionId: 'e1',
  correlationId: 'c1',
  startedAt: 't',
  configurationVersion: 'v',
  securityContextId: 's',
  attributes: Object.freeze({}),
});

function binding(id: string, capability: string): CapabilityBinding {
  return Object.freeze({
    bindingId: 'b',
    requestId: 'r',
    capability,
    capabilityContractVersion: '1',
    implementationId: id,
    implementationVersion: '1',
    provider: Object.freeze({ id: 'p', pluginId: 'plugin', contributionId: id }),
    source: 'default',
    diagnosticId: 'd',
  });
}

describe('reference tools', () => {
  it('echoes message deterministically', async () => {
    const adapter = new ReferenceEchoToolAdapter();
    const result = await adapter.invoke({
      requestId: 'e1:call',
      binding: binding(REFERENCE_ECHO_TOOL_ID, 'tool:reference.echo'),
      node: Object.freeze({ workflowId: 'w', nodeId: 'n', kind: 'capability', capability: 'tool:reference.echo' }),
      context,
      parameters: Object.freeze({ message: 'hello' }),
      authorization: Object.freeze({ authorized: true, decisionId: 'd' }),
      metadata: Object.freeze({}),
      validation: Object.freeze({ schemaVersion: '1' }),
      constraints: Object.freeze({}),
    });
    expect(result.data).toEqual({ message: 'hello' });
  });

  it('dedupes counter by idempotency key', async () => {
    const adapter = new ReferenceCounterToolAdapter();
    const base = {
      requestId: 'e1:call',
      binding: binding(REFERENCE_COUNTER_TOOL_ID, 'tool:reference.counter'),
      node: Object.freeze({
        workflowId: 'w',
        nodeId: 'n',
        kind: 'capability' as const,
        capability: 'tool:reference.counter',
      }),
      context,
      parameters: Object.freeze({}),
      authorization: Object.freeze({ authorized: true as const, decisionId: 'd' }),
      idempotencyKey: 'e1:call-counter-1',
      metadata: Object.freeze({}),
      validation: Object.freeze({ schemaVersion: '1' }),
      constraints: Object.freeze({}),
    };
    const first = await adapter.invoke(base);
    const second = await adapter.invoke({ ...base, requestId: 'e1:call-retry' });
    expect(first.data).toEqual({ value: 1, deduped: false });
    expect(second.data).toEqual({ value: 1, deduped: true });
  });
});
