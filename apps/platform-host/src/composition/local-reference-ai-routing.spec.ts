/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/unbound-method */
import type { ExecutionContext } from '@agentforge/foundation';
import {
  CapabilityRegistry,
  CapabilityResolver,
  DeterministicResolutionPolicy,
  InMemoryResolutionDiagnostics,
  InMemoryResolutionEvents,
  ProviderRegistry,
  StaticResolutionConfiguration,
  validateResolutionRouting,
  type CapabilityBinding,
  type CapabilityRequest,
  type ImplementationDescriptor,
} from '@agentforge/capability-resolution';
import {
  AiProviderFramework,
  FactoryAiAdapterResolver,
  InMemoryAiDiagnostics,
  InMemoryAiEvents,
  NormalizedAiError,
  type AiExecutionRequest,
  type AiProviderAdapter,
  type NormalizedAiResult,
  type NormalizedAiStreamEvent,
} from '@agentforge/ai-provider';
import { describe, expect, it, vi } from 'vitest';
import {
  executeAiWithRouting,
  noteToolFallbackPrevented,
  streamAiWithRouting,
  type AiRoutingTelemetry,
} from './local-reference-ai-routing.js';
import { loadLocalReferenceConfig } from '../config/local-reference-config.js';

const context: ExecutionContext = Object.freeze({
  executionId: 'exec-routing-1',
  correlationId: 'corr-routing-1',
  startedAt: '2026-08-08T00:00:00.000Z',
  configurationVersion: 'v1',
  securityContextId: 'sec-1',
  tenantId: 'tenant-a',
  workspaceId: 'workspace-a',
  attributes: Object.freeze({}),
});

function implementation(
  id: string,
  overrides: Partial<ImplementationDescriptor> = {},
): ImplementationDescriptor {
  return Object.freeze({
    id,
    capabilityId: 'text-generation',
    providerId: `provider-${id}`,
    pluginId: `plugin-${id}`,
    contributionId: id,
    contractVersions: Object.freeze(['1']),
    implementationVersion: '1.0.0',
    enabled: true,
    health: 'healthy',
    priority: 0,
    attributes: Object.freeze({}),
    ...overrides,
  });
}

function successResult(request: AiExecutionRequest, text: string): NormalizedAiResult {
  return Object.freeze({
    requestId: request.requestId,
    content: Object.freeze([{ type: 'text' as const, text }]),
    usage: Object.freeze({ inputTokens: 1, outputTokens: 1, totalTokens: 2 }),
    model: Object.freeze({ id: 'test', capabilities: Object.freeze(['text-generation']) }),
    finishReason: 'completed' as const,
    toolCalls: Object.freeze([]),
    diagnosticId: `ai:${request.requestId}`,
    metadata: Object.freeze({}),
  });
}

function controllableAdapter(
  id: string,
  behavior: Readonly<{
    execute?: (request: AiExecutionRequest) => Promise<NormalizedAiResult> | NormalizedAiResult;
    stream?: (request: AiExecutionRequest) => AsyncIterable<NormalizedAiStreamEvent>;
  }>,
): AiProviderAdapter {
  return {
    id,
    execute: async (request) => {
      if (behavior.execute !== undefined) return await behavior.execute(request);
      return successResult(request, `${id}-ok`);
    },
    stream: async function* (request) {
      if (behavior.stream !== undefined) {
        yield* behavior.stream(request);
        return;
      }
      yield { type: 'content', sequence: 0, part: { type: 'text', text: `${id}-delta` } };
      yield {
        type: 'completed',
        sequence: 1,
        finishReason: 'completed',
        diagnosticId: `ai:${request.requestId}`,
      };
    },
    health: async () => Object.freeze({ name: id, status: 'healthy' as const }),
  };
}

function routingFixture(
  mode: 'fixed' | 'fallback',
  adapters: Readonly<Record<string, AiProviderAdapter>>,
  ordered: readonly string[] = ['reference-primary', 'reference-secondary'],
) {
  const capabilities = new CapabilityRegistry();
  capabilities.register(
    Object.freeze({
      id: 'text-generation',
      contractVersions: Object.freeze(['1']),
      defaultImplementationId: ordered[0] ?? 'reference-primary',
      metadata: Object.freeze({}),
    }),
  );
  const providers = new ProviderRegistry();
  for (const id of ordered) {
    providers.register(implementation(id));
  }
  validateResolutionRouting(
    'text-generation',
    Object.freeze({ mode, orderedImplementationIds: ordered }),
    providers,
  );
  const resolver = new CapabilityResolver(
    capabilities,
    providers,
    new DeterministicResolutionPolicy(),
    new StaticResolutionConfiguration(
      Object.freeze({
        global: Object.freeze({ 'text-generation': ordered[0] ?? 'reference-primary' }),
        routing: Object.freeze({
          'text-generation': Object.freeze({ mode, orderedImplementationIds: ordered }),
        }),
      }),
    ),
    new InMemoryResolutionDiagnostics(),
    new InMemoryResolutionEvents(),
    { resolved: (): void => {}, failed: (): void => {} },
  );
  const aiResolver = new FactoryAiAdapterResolver();
  for (const [id, adapter] of Object.entries(adapters)) {
    aiResolver.bind(id, async () => adapter);
  }
  const ai = new AiProviderFramework(
    aiResolver,
    new InMemoryAiDiagnostics(),
    new InMemoryAiEvents(),
    { completed: (): void => {}, failed: (): void => {}, streamed: (): void => {} },
  );
  const telemetry: AiRoutingTelemetry = {
    selected: vi.fn(),
    fallbackAttempted: vi.fn(),
    fallbackSucceeded: vi.fn(),
    fallbackExhausted: vi.fn(),
    streamFallbackPrevented: vi.fn(),
    toolFallbackPrevented: vi.fn(),
  };
  const baseRequest: CapabilityRequest = Object.freeze({
    requestId: `${context.executionId}:n1:0`,
    capability: 'text-generation',
    contractVersion: '1',
    context,
    node: Object.freeze({
      workflowId: 'wf',
      nodeId: 'n1',
      kind: 'capability' as const,
      capability: 'text-generation',
    }),
    constraints: Object.freeze({}),
  });
  return {
    deps: { resolver, ai, mode, telemetry },
    providers,
    baseRequest,
    resolveInitial: async () => resolver.resolve(baseRequest),
    buildRequest: (binding: CapabilityBinding): AiExecutionRequest =>
      Object.freeze({
        requestId: baseRequest.requestId,
        binding,
        messages: Object.freeze([
          Object.freeze({
            role: 'user' as const,
            content: Object.freeze([{ type: 'text' as const, text: 'hello' }]),
          }),
        ]),
        generation: Object.freeze({ maximumOutputTokens: 32 }),
        streaming: Object.freeze({ enabled: true, includeUsage: false }),
        context,
        metadata: Object.freeze({}),
        constraints: Object.freeze({}),
      }),
    telemetry,
  };
}

describe('v1.0 multi-provider routing', () => {
  it('1. fixed mode uses primary success only', async () => {
    const f = routingFixture('fixed', {
      'reference-primary': controllableAdapter('reference-primary', {}),
      'reference-secondary': controllableAdapter('reference-secondary', {
        execute: async () => {
          throw new Error('secondary must not run in fixed mode');
        },
      }),
    });
    const initial = await f.resolveInitial();
    const routed = await executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest);
    expect(routed.binding.implementationId).toBe('reference-primary');
    expect(routed.ledger.attemptedImplementationIds()).toEqual(['reference-primary']);
    expect(f.telemetry.fallbackAttempted).not.toHaveBeenCalled();
  });

  it('2. fallback: primary transient fail → secondary success', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        execute: async () => {
          throw new NormalizedAiError('AI_UNAVAILABLE', 'down', true, 'd1');
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    const initial = await f.resolveInitial();
    const routed = await executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest);
    expect(routed.binding.implementationId).toBe('reference-secondary');
    expect(routed.ledger.snapshot().providerAttempts.map((a) => a.implementationId)).toEqual([
      'reference-primary',
      'reference-secondary',
    ]);
    expect(f.telemetry.fallbackAttempted).toHaveBeenCalledOnce();
    expect(f.telemetry.fallbackSucceeded).toHaveBeenCalledWith(
      'reference-primary',
      'reference-secondary',
    );
    expect(routed.result.requestId).toContain(context.executionId);
  });

  it('3. AI_INVALID_REQUEST does not fallback', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        execute: async () => {
          throw new NormalizedAiError('AI_INVALID_REQUEST', 'bad', false, 'd1');
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    const initial = await f.resolveInitial();
    await expect(
      executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest),
    ).rejects.toMatchObject({ code: 'AI_INVALID_REQUEST' });
    expect(f.telemetry.fallbackAttempted).not.toHaveBeenCalled();
  });

  it('4. fallback exhausted', async () => {
    const failing = controllableAdapter('x', {
      execute: async () => {
        throw new NormalizedAiError('AI_RATE_LIMITED', 'rl', true, 'd1');
      },
    });
    const f = routingFixture('fallback', {
      'reference-primary': failing,
      'reference-secondary': failing,
    });
    const initial = await f.resolveInitial();
    await expect(
      executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest),
    ).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' });
    expect(f.telemetry.fallbackExhausted).toHaveBeenCalled();
    expect(f.telemetry.fallbackSucceeded).not.toHaveBeenCalled();
  });

  it('5. unhealthy provider skipped', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        execute: async () => {
          throw new Error('unhealthy primary must not execute');
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    f.providers.setHealth('reference-primary', 'unhealthy');
    const initial = await f.resolveInitial();
    expect(initial.implementationId).toBe('reference-secondary');
    const routed = await executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest);
    expect(routed.binding.implementationId).toBe('reference-secondary');
    expect(routed.ledger.attemptedImplementationIds()).toEqual(['reference-secondary']);
  });

  it('6. stream failure before first delta → fallback', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        stream: async function* () {
          yield {
            type: 'failed',
            sequence: 0,
            code: 'AI_PROVIDER_TIMEOUT',
            retryable: true,
            message: 'timeout',
            diagnosticId: 'd1',
          };
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    const initial = await f.resolveInitial();
    const events: string[] = [];
    let finalBinding = initial.implementationId;
    for await (const item of streamAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest)) {
      events.push(item.event.type);
      finalBinding = item.binding.implementationId;
    }
    expect(finalBinding).toBe('reference-secondary');
    expect(events).toContain('content');
    expect(f.telemetry.fallbackAttempted).toHaveBeenCalled();
  });

  it('7. stream failure after first delta → no fallback', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        stream: async function* () {
          yield { type: 'content', sequence: 0, part: { type: 'text', text: 'partial' } };
          yield {
            type: 'failed',
            sequence: 1,
            code: 'AI_UNAVAILABLE',
            retryable: true,
            message: 'down',
            diagnosticId: 'd1',
          };
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    const initial = await f.resolveInitial();
    const events: Array<{ type: string; impl: string }> = [];
    for await (const item of streamAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest)) {
      events.push({ type: item.event.type, impl: item.binding.implementationId });
    }
    expect(events.every((e) => e.impl === 'reference-primary')).toBe(true);
    expect(events.some((e) => e.type === 'failed')).toBe(true);
    expect(f.telemetry.streamFallbackPrevented).toHaveBeenCalled();
    expect(f.telemetry.fallbackAttempted).not.toHaveBeenCalled();
  });

  it('8. tool turn envelope / allowFallback=false → no fallback', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        execute: async () => {
          throw new NormalizedAiError('AI_UNAVAILABLE', 'down', true, 'd1');
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    const initial = await f.resolveInitial();
    await expect(
      executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest, {
        allowFallback: false,
      }),
    ).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    noteToolFallbackPrevented(f.deps, initial.implementationId, 'AI_UNAVAILABLE');
    expect(f.telemetry.toolFallbackPrevented).toHaveBeenCalled();
    expect(f.telemetry.fallbackAttempted).not.toHaveBeenCalled();
  });

  it('9. embedding profile mismatch → fail closed (no cross-profile routing)', () => {
    expect(() =>
      loadLocalReferenceConfig({
        VECTOR_SEARCH_ENABLED: 'true',
        VECTOR_STORE_PROVIDER: 'memory',
        EMBEDDING_PROVIDER: 'reference',
        EMBEDDING_MODEL: 'text-embedding-3-small',
        EMBEDDING_DIMENSIONS: '1536',
        VECTOR_INDEX_PROFILE: 'openai-1536-small',
      }),
    ).toThrow(/EMBEDDING_MODEL|VECTOR_INDEX_PROFILE|EMBEDDING_DIMENSIONS/);
  });

  it('10. exact attempt counts: providers attempted <= ordered unique candidates', async () => {
    const ordered = ['reference-primary', 'reference-secondary'] as const;
    const f = routingFixture(
      'fallback',
      {
        'reference-primary': controllableAdapter('reference-primary', {
          execute: async () => {
            throw new NormalizedAiError('AI_UNAVAILABLE', 'down', true, 'd1');
          },
        }),
        'reference-secondary': controllableAdapter('reference-secondary', {
          execute: async () => {
            throw new NormalizedAiError('AI_PROVIDER_TIMEOUT', 't', true, 'd2');
          },
        }),
      },
      ordered,
    );
    const initial = await f.resolveInitial();
    await expect(
      executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest),
    ).rejects.toBeTruthy();
    const attempts = f.telemetry.selected as unknown as { mock: { calls: unknown[] } };
    expect(attempts.mock.calls.length).toBeLessThanOrEqual(ordered.length);
    // ledger from last throw path is not returned; selected count is authoritative upper bound
    expect(attempts.mock.calls.length).toBe(2);
  });

  it('11. architecture: no AiRouter package/class; Cap Resolution remains selector', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const root = path.join(process.cwd());
    const pkgDirs = fs
      .readdirSync(path.join(root, 'packages'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(pkgDirs.some((n) => /ai-router|provider-router|model-router/i.test(n))).toBe(false);
    const src = fs.readFileSync(
      path.join(root, 'apps/platform-host/src/composition/local-reference-ai-routing.ts'),
      'utf8',
    );
    expect(src).toMatch(/resolveNext/);
    expect(src).not.toMatch(/class AiRouter/);
  });

  it('12. same logical execution identity retained across allowed fallback', async () => {
    const f = routingFixture('fallback', {
      'reference-primary': controllableAdapter('reference-primary', {
        execute: async () => {
          throw new NormalizedAiError('AI_UNAVAILABLE', 'down', true, 'd1');
        },
      }),
      'reference-secondary': controllableAdapter('reference-secondary', {}),
    });
    const initial = await f.resolveInitial();
    const routed = await executeAiWithRouting(f.deps, f.baseRequest, initial, f.buildRequest);
    expect(routed.result.requestId.startsWith(context.executionId)).toBe(true);
    expect(f.baseRequest.context.executionId).toBe(context.executionId);
  });
});
