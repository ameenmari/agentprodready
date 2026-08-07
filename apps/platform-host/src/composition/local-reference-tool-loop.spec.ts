import { describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import {
  CapabilityResolver,
  DeterministicResolutionPolicy,
  InMemoryResolutionDiagnostics,
  InMemoryResolutionEvents,
  NoopResolutionTelemetry,
} from '@agentprodready/capability-resolution';
import {
  AiProviderFramework,
  FactoryAiAdapterResolver,
  InMemoryAiDiagnostics,
  InMemoryAiEvents,
  ReferenceAiProviderAdapter,
  type AiExecutionRequest,
  type AiProviderAdapter,
  type NormalizedAiResult,
} from '@agentprodready/ai-provider';
import type { CapabilityExecutionControl, ToolLoopCheckpoint } from '@agentprodready/runtime';
import type { AuthorizationDecision, AuthorizationRequest, SecurityPlatform } from '@agentprodready/security';
import {
  AiToolCallHandoff,
  FactoryToolAdapterResolver,
  InMemoryToolDiagnostics,
  InMemoryToolEvents,
  NoopToolTelemetry,
  NormalizedToolError,
  REFERENCE_COUNTER_TOOL_ID,
  REFERENCE_ECHO_TOOL_ID,
  ReferenceCounterToolAdapter,
  ReferenceEchoToolAdapter,
  ToolInvocationCoordinator,
  ToolRegistry,
  ToolValidator,
  referenceCounterContract,
  referenceEchoContract,
  type ToolAdapter,
  type ToolContract,
} from '@agentprodready/tool-framework';
import type { ExecutionContext } from '@agentprodready/foundation';
import { seedReferenceCapabilities, referenceResolutionConfiguration } from '../seed/reference-capabilities.seed.js';
import { localAuthenticationEvidence, localPrincipal } from './local-reference-security.js';
import { LOCAL_TENANT, LOCAL_USER, REFERENCE_AI_ID } from '../config/local-reference-config.js';
import { runAiToolLoop, type ToolLoopDeps } from './local-reference-tool-loop.js';

const context: ExecutionContext = Object.freeze({
  executionId: 'exec-tool-1',
  correlationId: 'corr-tool-1',
  startedAt: '2026-08-07T00:00:00.000Z',
  configurationVersion: '1',
  securityContextId: 'sec-1',
  attributes: Object.freeze({}),
});

const aiBinding: CapabilityBinding = Object.freeze({
  bindingId: 'binding:ai',
  requestId: 'r-ai',
  capability: 'text-generation',
  capabilityContractVersion: '1',
  implementationId: REFERENCE_AI_ID,
  implementationVersion: '1.0.0',
  provider: Object.freeze({ id: 'agentprodready-local', pluginId: 'local-reference', contributionId: 'contribution:reference-ai' }),
  source: 'default',
  diagnosticId: 'd-ai',
});

function allowDecision(request: AuthorizationRequest): AuthorizationDecision {
  return Object.freeze({
    id: `decision:${request.requestId}`,
    requestId: request.requestId,
    outcome: 'permit',
    authorized: true,
    principalId: request.principal.id,
    effectivePrincipalId: request.principal.id,
    action: request.action,
    resource: Object.freeze({ id: request.resource.id, type: request.resource.type, version: request.resource.version }),
    effectiveScope: request.scope,
    appliedPolicies: Object.freeze(['policy:test']),
    conditions: Object.freeze([]),
    restrictions: Object.freeze([]),
    obligations: Object.freeze([]),
    reason: 'permit',
    policyVersions: Object.freeze(['1']),
    evidenceReferences: Object.freeze([]),
    issuedAt: request.occurredAt,
    expiresAt: '2099-01-01T00:00:00.000Z',
    correlation: request.execution,
    schemaVersion: '1',
    cacheKey: request.requestId,
  });
}

function denyDecision(request: AuthorizationRequest): AuthorizationDecision {
  return Object.freeze({ ...allowDecision(request), outcome: 'deny' as const, authorized: false, reason: 'deny' });
}

function countingAdapter(inner: ToolAdapter): ToolAdapter & { readonly invokes: number } {
  let invokes = 0;
  return {
    id: inner.id,
    get invokes(): number {
      return invokes;
    },
    async invoke(request: Parameters<ToolAdapter['invoke']>[0]): Promise<Awaited<ReturnType<ToolAdapter['invoke']>>> {
      invokes += 1;
      return inner.invoke(request);
    },
    health: (): ReturnType<ToolAdapter['health']> => inner.health(),
  };
}

function memoryControl(initial?: ToolLoopCheckpoint): CapabilityExecutionControl & { snaps: ToolLoopCheckpoint[] } {
  const snaps: ToolLoopCheckpoint[] = initial === undefined ? [] : [initial];
  return {
    snaps,
    persistToolLoop: async (toolLoop: ToolLoopCheckpoint): Promise<void> => {
      snaps.push(toolLoop);
    },
    loadToolLoop: async (): Promise<ToolLoopCheckpoint | undefined> => snaps.at(-1),
  };
}

function fixture(options?: {
  readonly denyToolId?: string;
  readonly extraContracts?: readonly ToolContract[];
  readonly extraAdapters?: Readonly<Record<string, ToolAdapter>>;
  readonly ai?: AiProviderAdapter;
}): {
  readonly deps: ToolLoopDeps;
  readonly events: InMemoryToolEvents;
  readonly echo: ToolAdapter & { readonly invokes: number };
  readonly counter: ToolAdapter & { readonly invokes: number };
  readonly aiExecuteCount: () => number;
} {
  const { capabilities, providers } = seedReferenceCapabilities();
  const resolver = new CapabilityResolver(
    capabilities,
    providers,
    new DeterministicResolutionPolicy(),
    referenceResolutionConfiguration(),
    new InMemoryResolutionDiagnostics(),
    new InMemoryResolutionEvents(),
    new NoopResolutionTelemetry(),
  );

  const tools = new ToolRegistry();
  tools.register(referenceEchoContract());
  tools.register(referenceCounterContract());
  for (const contract of options?.extraContracts ?? []) {
    tools.register(contract);
    capabilities.register(
      Object.freeze({
        id: contract.capability,
        contractVersions: Object.freeze(['1']),
        defaultImplementationId: contract.id,
        metadata: Object.freeze({}),
      }),
    );
    providers.register(
      Object.freeze({
        id: contract.id,
        capabilityId: contract.capability,
        providerId: 'test',
        pluginId: 'test',
        contributionId: contract.id,
        contractVersions: Object.freeze(['1']),
        implementationVersion: '1',
        enabled: true,
        health: 'healthy' as const,
        priority: 0,
        attributes: Object.freeze({}),
      }),
    );
  }

  const echo = countingAdapter(new ReferenceEchoToolAdapter());
  const counter = countingAdapter(new ReferenceCounterToolAdapter());
  const adapters = new FactoryToolAdapterResolver();
  adapters.bind(REFERENCE_ECHO_TOOL_ID, async () => echo);
  adapters.bind(REFERENCE_COUNTER_TOOL_ID, async () => counter);
  for (const [id, adapter] of Object.entries(options?.extraAdapters ?? {})) {
    adapters.bind(id, async () => adapter);
  }

  const events = new InMemoryToolEvents();
  const validator = new ToolValidator();
  const coordinator = new ToolInvocationCoordinator(
    tools,
    adapters,
    validator,
    new InMemoryToolDiagnostics(),
    events,
    new NoopToolTelemetry(),
    65_536,
  );

  const aiResolver = new FactoryAiAdapterResolver();
  let aiExecutes = 0;
  const baseAi = options?.ai ?? new ReferenceAiProviderAdapter();
  const wrappedAi: AiProviderAdapter = {
    id: baseAi.id,
    async execute(request) {
      aiExecutes += 1;
      return baseAi.execute(request);
    },
    stream: (request) => baseAi.stream(request),
    health: () => baseAi.health(),
  };
  aiResolver.bind(REFERENCE_AI_ID, async () => wrappedAi);
  const ai = new AiProviderFramework(aiResolver, new InMemoryAiDiagnostics(), new InMemoryAiEvents(), {
    completed: (): void => {},
    failed: (): void => {},
    streamed: (): void => {},
  });

  const security = {
    authorize: async (request: AuthorizationRequest) => {
      if (options?.denyToolId !== undefined && request.resource.id === `tool:${options.denyToolId}`) {
        return denyDecision(request);
      }
      return allowDecision(request);
    },
  } as unknown as SecurityPlatform;

  const deps: ToolLoopDeps = Object.freeze({
    ai,
    tools,
    coordinator,
    validator,
    adapters,
    handoff: new AiToolCallHandoff(),
    events,
    security,
    resolver,
    principal: localPrincipal(localAuthenticationEvidence({ principalId: LOCAL_USER, tenantId: LOCAL_TENANT }, context.startedAt)),
    limits: Object.freeze({
      enabled: true,
      maxCallsPerInvocation: 8,
      maxTurns: 4,
      maxArgumentBytes: 16_384,
      maxResultBytes: 65_536,
      agentMaxToolInvocations: 8,
    }),
    toolDefinitions: () =>
      Object.freeze(
        tools.list().map((contract) =>
          Object.freeze({
            name: contract.id,
            description: contract.id,
            inputSchema: contract.inputSchema,
          }),
        ),
      ),
  });

  return { deps, events, echo, counter, aiExecuteCount: () => aiExecutes };
}

function scriptedAi(results: readonly NormalizedAiResult[]): AiProviderAdapter {
  let index = 0;
  return {
    id: REFERENCE_AI_ID,
    async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
      const next = results[index];
      if (next === undefined) throw new Error('Unexpected AI execute');
      index += 1;
      return Object.freeze({
        ...next,
        requestId: request.requestId,
        diagnosticId: `ai:${request.requestId}`,
      });
    },
    stream(_request: AiExecutionRequest): AsyncIterable<never> {
      throw new Error('not used');
    },
    async health(): Promise<{ name: string; status: 'healthy' }> {
      return { name: REFERENCE_AI_ID, status: 'healthy' as const };
    },
  };
}

describe('local-reference tool loop', () => {
  it('runs reference.echo once with authorize → pre-tool → invoke → post-tool → continuation', async () => {
    const { deps, events, echo, aiExecuteCount } = fixture();
    const control = memoryControl();
    const result = await runAiToolLoop(deps, aiBinding, context, 'USE_TOOL_ECHO: hello', new AbortController().signal, control);
    expect(result.content[0]).toMatchObject({ type: 'text', text: 'Tool returned: hello' });
    expect(echo.invokes).toBe(1);
    expect(aiExecuteCount()).toBe(2);
    expect(events.facts.filter((f) => f.type === 'tool.requested')).toHaveLength(1);
    expect(events.facts.filter((f) => f.type === 'tool.authorized')).toHaveLength(1);
    expect(events.facts.filter((f) => f.type === 'tool.started')).toHaveLength(1);
    expect(events.facts.filter((f) => f.type === 'tool.denied')).toHaveLength(0);
    expect(control.snaps.some((s) => s.calls.length === 0 && s.proposedCalls.length === 1)).toBe(true);
    expect(control.snaps.some((s) => s.calls[0]?.stage === 'pre-tool')).toBe(true);
    expect(control.snaps.at(-1)?.calls[0]?.stage).toBe('post-tool');
    expect(control.snaps.at(-1)?.calls[0]?.idempotencyKey).toBe('exec-tool-1:call-echo-1');
  });

  it('dedupes reference.counter across pre-tool restart with same idempotency key', async () => {
    const shared = countingAdapter(new ReferenceCounterToolAdapter());
    const fx = fixture({ extraAdapters: { [REFERENCE_COUNTER_TOOL_ID]: shared } });
    const c1 = memoryControl();
    await runAiToolLoop(fx.deps, aiBinding, context, 'USE_TOOL_COUNTER', new AbortController().signal, c1);
    expect(shared.invokes).toBe(1);
    const preSnap = c1.snaps.find((s) => s.calls[0]?.stage === 'pre-tool');
    expect(preSnap).toBeDefined();
    if (preSnap === undefined) throw new Error('missing pre-tool snapshot');
    const preCall = preSnap.calls[0];
    if (preCall === undefined) throw new Error('missing pre-tool call');
    const resumeControl = memoryControl(
      Object.freeze({
        turn: preSnap.turn,
        maxTurns: preSnap.maxTurns,
        baseMessages: preSnap.baseMessages,
        proposedCalls: preSnap.proposedCalls,
        calls: Object.freeze([Object.freeze({ ...preCall, stage: 'pre-tool' as const })]),
      }),
    );
    const resumed = await runAiToolLoop(fx.deps, aiBinding, context, 'ignored', new AbortController().signal, resumeControl);
    expect(shared.invokes).toBe(2);
    expect(resumed.content[0]).toMatchObject({ type: 'text', text: 'Tool returned: 1' });
    expect(resumeControl.snaps.at(-1)?.calls[0]?.idempotencyKey).toBe('exec-tool-1:call-counter-1');
  });

  it('security deny: no pre-tool, zero adapter invokes, tool.denied', async () => {
    const { deps, events, echo } = fixture({ denyToolId: REFERENCE_ECHO_TOOL_ID });
    const control = memoryControl();
    await expect(
      runAiToolLoop(deps, aiBinding, context, 'USE_TOOL_ECHO: nope', new AbortController().signal, control),
    ).rejects.toMatchObject({ code: 'TOOL_AUTHORIZATION' });
    expect(echo.invokes).toBe(0);
    expect(events.facts.filter((f) => f.type === 'tool.denied')).toHaveLength(1);
    expect(events.facts.filter((f) => f.type === 'tool.started')).toHaveLength(0);
    expect(control.snaps.every((s) => s.calls.every((c) => c.stage !== 'pre-tool'))).toBe(true);
  });

  it('approvalRequirement=required fails closed without pre-tool', async () => {
    const approvalTool: ToolContract = Object.freeze({
      ...referenceEchoContract(),
      id: 'reference.approval',
      capability: 'tool:reference.approval',
      approvalRequirement: 'required',
      contributionId: 'reference.approval',
    });
    const adapter = countingAdapter({
      id: 'approval-adapter',
      invoke: async () => {
        throw new Error('should not run');
      },
      health: async () => ({ name: 'approval-adapter', status: 'healthy' as const }),
    });
    const scripted = scriptedAi([
      Object.freeze({
        requestId: 'x',
        content: Object.freeze([]),
        usage: Object.freeze({ inputTokens: 1, outputTokens: 1, totalTokens: 2 }),
        model: Object.freeze({ id: 'reference-model', capabilities: Object.freeze(['text-generation']) }),
        finishReason: 'tool-calls' as const,
        toolCalls: Object.freeze([
          Object.freeze({ id: 'call-appr-1', name: 'reference.approval', arguments: Object.freeze({ message: 'x' }) }),
        ]),
        diagnosticId: 'd',
        metadata: Object.freeze({}),
      }),
    ]);
    const { deps, events } = fixture({
      extraContracts: [approvalTool],
      extraAdapters: { 'reference.approval': adapter },
      ai: scripted,
    });
    const control = memoryControl();
    await expect(
      runAiToolLoop(deps, aiBinding, context, 'approval', new AbortController().signal, control),
    ).rejects.toMatchObject({ code: 'TOOL_APPROVAL_REQUIRED' });
    expect(adapter.invokes).toBe(0);
    expect(events.facts.filter((f) => f.type === 'tool.approval-required')).toHaveLength(1);
    expect(control.snaps.flatMap((s) => s.calls).filter((c) => c.stage === 'pre-tool')).toHaveLength(0);
  });

  it('fails closed on duplicate toolCallId in one turn', async () => {
    const scripted = scriptedAi([
      Object.freeze({
        requestId: 'x',
        content: Object.freeze([]),
        usage: Object.freeze({ inputTokens: 1, outputTokens: 1, totalTokens: 2 }),
        model: Object.freeze({ id: 'm', capabilities: Object.freeze(['text-generation']) }),
        finishReason: 'tool-calls' as const,
        toolCalls: Object.freeze([
          Object.freeze({ id: 'dup', name: REFERENCE_ECHO_TOOL_ID, arguments: Object.freeze({ message: 'a' }) }),
          Object.freeze({ id: 'dup', name: REFERENCE_ECHO_TOOL_ID, arguments: Object.freeze({ message: 'b' }) }),
        ]),
        diagnosticId: 'd',
        metadata: Object.freeze({}),
      }),
    ]);
    const { deps, echo } = fixture({ ai: scripted });
    await expect(
      runAiToolLoop(deps, aiBinding, context, 'dup', new AbortController().signal, memoryControl()),
    ).rejects.toMatchObject({ code: 'TOOL_VALIDATION' });
    expect(echo.invokes).toBe(0);
  });

  it('proposal-only restart re-admits and executes once', async () => {
    const { deps, echo } = fixture();
    const envelope: ToolLoopCheckpoint = Object.freeze({
      turn: 0,
      maxTurns: 4,
      baseMessages: [{ role: 'user', content: [{ type: 'text', text: 'USE_TOOL_ECHO: restart' }] }],
      proposedCalls: Object.freeze([
        Object.freeze({ id: 'call-echo-1', name: REFERENCE_ECHO_TOOL_ID, arguments: Object.freeze({ message: 'restart' }) }),
      ]),
      calls: Object.freeze([]),
    });
    const control = memoryControl(envelope);
    const result = await runAiToolLoop(deps, aiBinding, context, 'ignored', new AbortController().signal, control);
    expect(echo.invokes).toBe(1);
    expect(result.content[0]).toMatchObject({ type: 'text', text: 'Tool returned: restart' });
  });

  it('post-tool restart does not re-execute adapter', async () => {
    const { deps, echo } = fixture();
    const control = memoryControl();
    await runAiToolLoop(deps, aiBinding, context, 'USE_TOOL_ECHO: once', new AbortController().signal, control);
    expect(echo.invokes).toBe(1);
    const post = control.snaps.find((s) => s.calls[0]?.stage === 'post-tool');
    expect(post).toBeDefined();
    if (post === undefined) throw new Error('missing post-tool snapshot');
    const resume = memoryControl(
      Object.freeze({
        turn: post.turn,
        maxTurns: post.maxTurns,
        baseMessages: [{ role: 'user', content: [{ type: 'text', text: 'USE_TOOL_ECHO: once' }] }],
        proposedCalls: post.proposedCalls,
        calls: post.calls,
      }),
    );
    const again = await runAiToolLoop(deps, aiBinding, context, 'ignored', new AbortController().signal, resume);
    expect(echo.invokes).toBe(1);
    expect(again.content[0]).toMatchObject({ type: 'text', text: 'Tool returned: once' });
  });

  it('pre-tool non-idempotent → TOOL_UNSAFE_RECOVERY with zero silent re-exec', async () => {
    const boom: ToolContract = Object.freeze({
      id: 'reference.boom',
      capability: 'tool:reference.boom',
      version: '1',
      inputSchema: Object.freeze({ type: 'object', required: Object.freeze([]) }),
      outputSchema: Object.freeze({ type: 'object' }),
      sideEffect: 'external-side-effect' as const,
      idempotency: 'non-idempotent' as const,
      approvalRequirement: 'none' as const,
      metadata: Object.freeze({}),
      pluginId: 'test',
      contributionId: 'reference.boom',
    });
    const adapter = countingAdapter({
      id: 'boom',
      invoke: async (request) => ({
        requestId: request.requestId,
        status: 'completed' as const,
        data: Object.freeze({ ok: true }),
        tool: Object.freeze({
          id: boom.id,
          version: '1',
          sideEffect: boom.sideEffect,
          idempotency: boom.idempotency,
        }),
        execution: Object.freeze({
          executionId: request.context.executionId,
          correlationId: request.context.correlationId,
          ...(request.idempotencyKey === undefined ? {} : { idempotencyKey: request.idempotencyKey }),
        }),
        validation: Object.freeze({
          valid: true as const,
          contractId: boom.id,
          contractVersion: '1',
          checkedFields: Object.freeze([]),
        }),
        diagnosticId: `tool:${request.requestId}`,
        metadata: Object.freeze({}),
      }),
      health: async () => ({ name: 'boom', status: 'healthy' as const }),
    });
    const { deps } = fixture({
      extraContracts: [boom],
      extraAdapters: { 'reference.boom': adapter },
    });
    const pre: ToolLoopCheckpoint = Object.freeze({
      turn: 0,
      maxTurns: 4,
      baseMessages: [{ role: 'user', content: [{ type: 'text', text: 'boom' }] }],
      proposedCalls: Object.freeze([
        Object.freeze({ id: 'call-boom-1', name: 'reference.boom', arguments: Object.freeze({}) }),
      ]),
      calls: Object.freeze([
        Object.freeze({
          turn: 0,
          toolCall: Object.freeze({ id: 'call-boom-1', name: 'reference.boom', arguments: Object.freeze({}) }),
          toolId: 'reference.boom',
          sideEffect: 'external-side-effect' as const,
          idempotency: 'non-idempotent' as const,
          idempotencyKey: 'exec-tool-1:call-boom-1',
          stage: 'pre-tool' as const,
        }),
      ]),
    });
    await expect(
      runAiToolLoop(deps, aiBinding, context, 'ignored', new AbortController().signal, memoryControl(pre)),
    ).rejects.toBeInstanceOf(NormalizedToolError);
    await expect(
      runAiToolLoop(deps, aiBinding, context, 'ignored', new AbortController().signal, memoryControl(pre)),
    ).rejects.toMatchObject({ code: 'TOOL_UNSAFE_RECOVERY' });
    expect(adapter.invokes).toBe(0);
  });
});

describe('architecture boundaries (v0.9 tools)', () => {
  it('tool-framework does not import openai packages', async () => {
    const root = join(process.cwd(), 'packages', 'tool-framework', 'src');
    async function walk(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) files.push(...(await walk(path)));
        else if (entry.name.endsWith('.ts')) files.push(path);
      }
      return files;
    }
    for (const file of await walk(root)) {
      const source = await readFile(file, 'utf8');
      expect(source).not.toMatch(/from ['"]openai['"]/u);
      expect(source).not.toMatch(/@agentprodready\/ai-provider-openai/u);
    }
  });

  it('runtime checkpoint contracts stay free of openai imports', async () => {
    const source = await readFile(join(process.cwd(), 'packages', 'runtime', 'src', 'contracts', 'runtime.ts'), 'utf8');
    expect(source).not.toMatch(/openai/iu);
  });
});
