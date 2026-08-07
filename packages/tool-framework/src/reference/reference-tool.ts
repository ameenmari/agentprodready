import type { HealthResult } from '@agentprodready/foundation';
import type {
  NormalizedToolResult,
  ToolAdapter,
  ToolAdapterResolver,
  ToolContract,
  ToolDiagnostic,
  ToolDiagnostics,
  ToolEventPublisher,
  ToolFact,
  ToolTelemetry,
} from '../contracts/tool.js';

interface PrivateExternalRequest {
  readonly operation: string;
  readonly payload: string;
}
interface PrivateExternalResponse {
  readonly body: string;
  readonly statusCode: 200;
}

export const REFERENCE_ECHO_TOOL_ID = 'reference.echo';
export const REFERENCE_COUNTER_TOOL_ID = 'reference.counter';
export const REFERENCE_ECHO_CAPABILITY = 'tool:reference.echo';
export const REFERENCE_COUNTER_CAPABILITY = 'tool:reference.counter';

export function referenceEchoContract(): ToolContract {
  return Object.freeze({
    id: REFERENCE_ECHO_TOOL_ID,
    capability: REFERENCE_ECHO_CAPABILITY,
    version: '1',
    inputSchema: Object.freeze({ type: 'object', required: Object.freeze(['message']) }),
    outputSchema: Object.freeze({ type: 'object' }),
    sideEffect: 'read-only' as const,
    idempotency: 'idempotent' as const,
    approvalRequirement: 'none' as const,
    metadata: Object.freeze({ description: 'Deterministic echo for CI' }),
    pluginId: 'reference-tools',
    contributionId: REFERENCE_ECHO_TOOL_ID,
  });
}

export function referenceCounterContract(): ToolContract {
  return Object.freeze({
    id: REFERENCE_COUNTER_TOOL_ID,
    capability: REFERENCE_COUNTER_CAPABILITY,
    version: '1',
    inputSchema: Object.freeze({ type: 'object', required: Object.freeze([]) }),
    outputSchema: Object.freeze({ type: 'object' }),
    sideEffect: 'mutating' as const,
    idempotency: 'idempotent' as const,
    approvalRequirement: 'none' as const,
    metadata: Object.freeze({ description: 'Deterministic idempotent counter for CI' }),
    pluginId: 'reference-tools',
    contributionId: REFERENCE_COUNTER_TOOL_ID,
  });
}

/** Legacy generic reference adapter (echoes parameters). */
export class ReferenceToolAdapter implements ToolAdapter {
  public readonly id = 'reference-tool';
  public async invoke(request: Parameters<ToolAdapter['invoke']>[0]): Promise<NormalizedToolResult> {
    const external: PrivateExternalRequest = {
      operation: request.binding.capability,
      payload: JSON.stringify(request.parameters),
    };
    const response: PrivateExternalResponse = { body: external.payload, statusCode: 200 };
    return {
      requestId: request.requestId,
      status: 'completed',
      data: JSON.parse(response.body) as unknown,
      tool: {
        id: request.binding.implementationId,
        version: request.binding.implementationVersion,
        sideEffect: 'read-only',
        idempotency: 'idempotent',
      },
      execution: {
        executionId: request.context.executionId,
        correlationId: request.context.correlationId,
        ...(request.idempotencyKey === undefined ? {} : { idempotencyKey: request.idempotencyKey }),
      },
      validation: {
        valid: true,
        contractId: request.binding.implementationId,
        contractVersion: request.binding.implementationVersion,
        checkedFields: [],
      },
      diagnosticId: `tool:${request.requestId}`,
      metadata: { transportStatus: String(response.statusCode) },
    };
  }
  public async health(): Promise<HealthResult> {
    return { name: this.id, status: 'healthy' };
  }
}

export class ReferenceEchoToolAdapter implements ToolAdapter {
  public readonly id = 'reference-echo-tool';
  public async invoke(request: Parameters<ToolAdapter['invoke']>[0]): Promise<NormalizedToolResult> {
    if (request.signal?.aborted === true) throw Object.assign(new Error('cancelled'), { kind: 'rejected' });
    const message = request.parameters['message'];
    if (typeof message !== 'string') {
      throw Object.assign(new Error('message must be a string'), { kind: 'validation' });
    }
    return completed(request, { message }, 'read-only', 'idempotent');
  }
  public async health(): Promise<HealthResult> {
    return { name: this.id, status: 'healthy' };
  }
}

/** Idempotent mutating counter keyed by idempotencyKey. */
export class ReferenceCounterToolAdapter implements ToolAdapter {
  public readonly id = 'reference-counter-tool';
  readonly #values = new Map<string, number>();
  readonly #next = { value: 0 };

  public async invoke(request: Parameters<ToolAdapter['invoke']>[0]): Promise<NormalizedToolResult> {
    if (request.signal?.aborted === true) throw Object.assign(new Error('cancelled'), { kind: 'rejected' });
    const key = request.idempotencyKey?.trim() ?? '';
    if (key === '') {
      throw Object.assign(new Error('idempotencyKey required'), { kind: 'validation' });
    }
    const existing = this.#values.get(key);
    if (existing !== undefined) {
      return completed(request, { value: existing, deduped: true }, 'mutating', 'idempotent');
    }
    this.#next.value += 1;
    const value = this.#next.value;
    this.#values.set(key, value);
    return completed(request, { value, deduped: false }, 'mutating', 'idempotent');
  }

  public async health(): Promise<HealthResult> {
    return { name: this.id, status: 'healthy' };
  }

  /** Test helper */
  public reset(): void {
    this.#values.clear();
    this.#next.value = 0;
  }
}

function completed(
  request: Parameters<ToolAdapter['invoke']>[0],
  data: unknown,
  sideEffect: 'read-only' | 'mutating',
  idempotency: 'idempotent',
): NormalizedToolResult {
  return {
    requestId: request.requestId,
    status: 'completed',
    data,
    tool: {
      id: request.binding.implementationId,
      version: request.binding.implementationVersion,
      sideEffect,
      idempotency,
    },
    execution: {
      executionId: request.context.executionId,
      correlationId: request.context.correlationId,
      ...(request.idempotencyKey === undefined ? {} : { idempotencyKey: request.idempotencyKey }),
    },
    validation: {
      valid: true,
      contractId: request.binding.implementationId,
      contractVersion: request.binding.implementationVersion,
      checkedFields: [],
    },
    diagnosticId: `tool:${request.requestId}`,
    metadata: { adapter: 'reference' },
  };
}

export class FactoryToolAdapterResolver implements ToolAdapterResolver {
  readonly #items = new Map<string, () => Promise<ToolAdapter>>();
  public bind(id: string, factory: () => Promise<ToolAdapter>): void {
    this.#items.set(id, factory);
  }
  public async resolve(binding: Parameters<ToolAdapterResolver['resolve']>[0]): Promise<ToolAdapter> {
    const factory = this.#items.get(binding.implementationId);
    if (factory === undefined) throw new TypeError(`No Composition tool binding: ${binding.implementationId}`);
    return await factory();
  }
}

export class InMemoryToolDiagnostics implements ToolDiagnostics {
  readonly #items = new Map<string, ToolDiagnostic>();
  public record(value: ToolDiagnostic): void {
    this.#items.set(value.id, value);
  }
  public get(id: string): ToolDiagnostic | undefined {
    return this.#items.get(id);
  }
  public list(): readonly ToolDiagnostic[] {
    return Object.freeze([...this.#items.values()]);
  }
}

export class InMemoryToolEvents implements ToolEventPublisher {
  readonly facts: ToolFact[] = [];
  public async publish(value: ToolFact): Promise<void> {
    this.facts.push(value);
  }
}

export class NoopToolTelemetry implements ToolTelemetry {
  public completed(_id: string, _duration: number): void {}
  public failed(_id: string, _code: Parameters<ToolTelemetry['failed']>[1], _duration: number): void {}
}
