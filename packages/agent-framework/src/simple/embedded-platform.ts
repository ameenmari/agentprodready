import {
  AiProviderFramework,
  FactoryAiAdapterResolver,
  InMemoryAiDiagnostics,
  InMemoryAiEvents,
  NoopAiTelemetry,
  ReferenceAiProviderAdapter,
  type AiToolDefinition,
} from '@agentprodready/ai-provider';
import {
  CapabilityResolver,
  DeterministicResolutionPolicy,
  InMemoryResolutionDiagnostics,
  InMemoryResolutionEvents,
  NoopResolutionTelemetry,
} from '@agentprodready/capability-resolution';
import { CompositionRoot } from '@agentprodready/composition';
import {
  DEFAULT_RECOVERY_POLICY,
  InMemoryExecutionCheckpointPort,
  InMemoryRuntimeEventPublisher,
  NoopRuntimeTelemetry,
  RuntimeOrchestrator,
  StaticRuntimePolicyProvider,
} from '@agentprodready/runtime';
import { SecurityRuntimeAdapter } from '@agentprodready/security';
import {
  FactoryToolAdapterResolver,
  InMemoryToolDiagnostics,
  InMemoryToolEvents,
  NoopToolTelemetry,
  ToolInvocationCoordinator,
  ToolRegistry,
  ToolValidator,
  type NormalizedToolResult,
  type ToolAdapter,
} from '@agentprodready/tool-framework';
import {
  AgentFramework,
  buildAgentDefinition,
  DeterministicAgentValidator,
  InMemoryAgentAudit,
  InMemoryAgentDiagnostics,
  InMemoryAgentFacts,
  InMemoryAgentLifecycleStore,
  InMemoryAgentRegistry,
} from '../index.js';
import {
  ANTHROPIC_AI_ID,
  OPENAI_AI_ID,
  OPENAI_COMPATIBLE_AI_ID,
  REFERENCE_AI_ID,
  seedEmbeddedCapabilities,
} from './embedded-capabilities.js';
import { EmbeddedCapabilityExecution } from './embedded-capability-execution.js';
import { buildEmbeddedManifest, embeddedValidationCatalog } from './embedded-manifest.js';
import { createEmbeddedPlanningAdapter, createEmbeddedWorkflowAdapter } from './embedded-planning.js';
import { EmbeddedPromptService } from './embedded-prompt.js';
import { EmbeddedRuntimePort } from './embedded-runtime-port.js';
import type { EmbeddedToolLoopDeps } from './embedded-tool-loop.js';
import {
  EMBEDDED_MAX_ARGUMENT_BYTES,
  EMBEDDED_MAX_RESULT_BYTES,
  EMBEDDED_MAX_TOOL_CALLS,
  EMBEDDED_MAX_TOOL_TURNS,
} from './embedded-tool-loop-limits.js';
import {
  EMBEDDED_PROJECT,
  EMBEDDED_TENANT,
  EMBEDDED_USER,
  EMBEDDED_WORKSPACE,
  EmbeddedSecurity,
  embeddedPrincipal,
} from './embedded-security.js';
import { EmbeddedMemorySession } from './memory.js';
import { SimpleAgentError } from './errors.js';
import type { SimpleTool } from './tool.js';
import type { AgentModel } from './types.js';
import type { NormalizedCreateAgentOptions } from './validate-options.js';

export interface EmbeddedPlatform {
  readonly agentId: string;
  readonly agentPrincipalId: string;
  readonly hasTools: boolean;
  readonly hasMemory: boolean;
  readonly model: AgentModel;
  readonly configuredToolCount: number;
  readonly scope: {
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly projectId: string;
  };
  readonly framework: AgentFramework;
  readonly runtimePort: EmbeddedRuntimePort;
  readonly security: EmbeddedSecurity;
  readonly compositionRoot: CompositionRoot;
  dispose(): Promise<void>;
}

export async function buildEmbeddedPlatform(options: NormalizedCreateAgentOptions): Promise<EmbeddedPlatform> {
  const agentId = `agent-${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const agentPrincipalId = `agent-principal:${agentId}`;
  const scope = Object.freeze({
    tenantId: EMBEDDED_TENANT,
    workspaceId: EMBEDDED_WORKSPACE,
    projectId: EMBEDDED_PROJECT,
  });

  const toolIds = options.tools.map((tool) => tool.contract.id);
  const implementationId = await resolveImplementationId(options.model);
  const { capabilities, providers, configuration } = seedEmbeddedCapabilities(implementationId, options.tools);

  const aiResolver = new FactoryAiAdapterResolver();
  if (options.model.provider === 'reference') {
    aiResolver.bind(REFERENCE_AI_ID, async () => new ReferenceAiProviderAdapter());
  } else if (options.model.provider === 'openai') {
    await bindOpenAiAdapter(aiResolver, options.model.modelId);
  } else if (options.model.provider === 'anthropic') {
    await bindAnthropicAdapter(aiResolver, options.model.modelId);
  } else {
    await bindOpenAiCompatibleAdapter(aiResolver, options.model);
  }

  const aiFramework = new AiProviderFramework(
    aiResolver,
    new InMemoryAiDiagnostics(),
    new InMemoryAiEvents(),
    new NoopAiTelemetry(),
  );

  const capabilityResolver = new CapabilityResolver(
    capabilities,
    providers,
    new DeterministicResolutionPolicy(),
    configuration,
    new InMemoryResolutionDiagnostics(),
    new InMemoryResolutionEvents(),
    new NoopResolutionTelemetry(),
  );

  const toolRegistry = new ToolRegistry();
  const toolAdapterResolver = new FactoryToolAdapterResolver();
  for (const simpleTool of options.tools) {
    toolRegistry.register(simpleTool.contract);
    toolAdapterResolver.bind(simpleTool.contract.id, async () => new SimpleToolAdapter(simpleTool));
  }

  const toolCoordinator = new ToolInvocationCoordinator(
    toolRegistry,
    toolAdapterResolver,
    new ToolValidator(),
    new InMemoryToolDiagnostics(),
    new InMemoryToolEvents(),
    new NoopToolTelemetry(),
  );

  const security = new EmbeddedSecurity({
    allowedToolIds: toolIds,
    memoryEnabled: options.memory !== undefined,
  });

  const toolDefinitions = (): readonly AiToolDefinition[] =>
    Object.freeze(
      options.tools.map((simpleTool) =>
        Object.freeze({
          name: simpleTool.contract.id,
          description: simpleTool.description,
          inputSchema: simpleTool.parameters,
        }),
      ),
    );

  const toolLoopDeps: EmbeddedToolLoopDeps | undefined =
    options.tools.length > 0
      ? Object.freeze({
          ai: aiFramework,
          tools: toolRegistry,
          coordinator: toolCoordinator,
          validator: new ToolValidator(),
          adapters: toolAdapterResolver,
          events: new InMemoryToolEvents(),
          security: security.platform,
          resolver: capabilityResolver,
          principal: embeddedPrincipal(new Date().toISOString()),
          limits: Object.freeze({
            maxCallsPerInvocation: EMBEDDED_MAX_TOOL_CALLS,
            maxTurns: EMBEDDED_MAX_TOOL_TURNS,
            maxArgumentBytes: EMBEDDED_MAX_ARGUMENT_BYTES,
            maxResultBytes: EMBEDDED_MAX_RESULT_BYTES,
          }),
          toolDefinitions,
        })
      : undefined;

  const memorySession =
    options.memory === undefined ? undefined : new EmbeddedMemorySession(agentId, options.memory);

  const prompts = new EmbeddedPromptService();
  const capabilityExecution = new EmbeddedCapabilityExecution(
    capabilityResolver,
    aiFramework,
    prompts,
    options.instructions,
    EMBEDDED_TENANT,
    EMBEDDED_WORKSPACE,
    toolLoopDeps,
    memorySession,
  );

  const compositionRoot = new CompositionRoot();
  compositionRoot.build();

  const runtime = new RuntimeOrchestrator({
    scopes: compositionRoot,
    policies: new StaticRuntimePolicyProvider({
      timeoutMs: 30_000,
      maxAttempts: 1,
      maxConcurrency: 4,
      isRetryable: (): boolean => false,
      recovery: DEFAULT_RECOVERY_POLICY,
    }),
    planning: createEmbeddedPlanningAdapter(),
    workflow: createEmbeddedWorkflowAdapter(),
    capabilities: capabilityExecution,
    security: new SecurityRuntimeAdapter(security.contexts, (decisionId) => security.validityFor(decisionId)),
    events: new InMemoryRuntimeEventPublisher(),
    telemetry: new NoopRuntimeTelemetry(),
    checkpoints: new InMemoryExecutionCheckpointPort(),
  });

  const runtimePort = new EmbeddedRuntimePort(runtime, security.contexts, EMBEDDED_TENANT, EMBEDDED_WORKSPACE);

  const framework = new AgentFramework(
    new InMemoryAgentRegistry(),
    new InMemoryAgentLifecycleStore(),
    new DeterministicAgentValidator(),
    runtimePort,
    new InMemoryAgentFacts(),
    new InMemoryAgentAudit(),
    new InMemoryAgentDiagnostics(),
  );

  const manifest = buildEmbeddedManifest({
    agentId,
    agentPrincipalId,
    name: options.name,
    description: options.description,
    purpose: options.description,
    tools: options.tools,
    memoryEnabled: options.memory !== undefined,
  });
  const definition = buildAgentDefinition(manifest, ['validation:embedded-1']);
  const catalog = embeddedValidationCatalog();
  const validation = framework.validate(definition, catalog);
  if (validation.status === 'invalid') {
    const detail = validation.findings.map((item) => item.message).join('; ');
    throw new SimpleAgentError(
      'AGENT_INIT_FAILED',
      `Agent initialization failed validation: ${detail}`,
      validation.diagnosticsReference,
    );
  }

  const at = new Date().toISOString();
  await framework.register(
    definition,
    validation,
    security.lifecycleAuthorization('register', scope, agentPrincipalId),
    EMBEDDED_USER,
    at,
  );
  await framework.transition(
    agentId,
    definition.version,
    scope,
    'approved',
    security.lifecycleAuthorization('lifecycle', scope, agentPrincipalId),
    'embedded-approved',
    at,
  );
  await framework.transition(
    agentId,
    definition.version,
    scope,
    'active',
    security.lifecycleAuthorization('lifecycle', scope, agentPrincipalId),
    'embedded-activated',
    at,
    {
      approvalReference: 'approval:embedded',
      evaluationReference: 'evaluation:embedded',
      compatibilityReference: 'compatibility:embedded',
    },
  );

  return Object.freeze({
    agentId,
    agentPrincipalId,
    hasTools: options.tools.length > 0,
    hasMemory: options.memory !== undefined,
    model: options.model,
    configuredToolCount: options.tools.length,
    scope,
    framework,
    runtimePort,
    security,
    compositionRoot,
    async dispose(): Promise<void> {
      await memorySession?.dispose();
      await runtimePort.dispose();
      await compositionRoot.dispose();
    },
  });
}

class SimpleToolAdapter implements ToolAdapter {
  public readonly id: string;

  public constructor(private readonly simpleTool: SimpleTool) {
    this.id = simpleTool.contract.id;
  }

  public async invoke(
    request: Parameters<ToolAdapter['invoke']>[0],
  ): Promise<NormalizedToolResult> {
    if (request.signal?.aborted === true) {
      throw Object.assign(new Error('cancelled'), { kind: 'rejected' });
    }
    const data = await Promise.resolve(this.simpleTool.execute({ ...request.parameters }));
    return {
      requestId: request.requestId,
      status: 'completed',
      data,
      tool: {
        id: request.binding.implementationId,
        version: request.binding.implementationVersion,
        sideEffect: this.simpleTool.sideEffect,
        idempotency: this.simpleTool.idempotency,
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
      metadata: Object.freeze({ source: 'simple-tool' }),
    };
  }

  public async health(): Promise<{ readonly name: string; readonly status: 'healthy' }> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

async function resolveImplementationId(model: AgentModel): Promise<string> {
  if (model.provider === 'reference') return REFERENCE_AI_ID;
  if (model.provider === 'openai-compatible') return OPENAI_COMPATIBLE_AI_ID;
  if (model.provider === 'anthropic') return ANTHROPIC_AI_ID;
  return OPENAI_AI_ID;
}

async function bindAnthropicAdapter(resolver: FactoryAiAdapterResolver, modelId: string): Promise<void> {
  try {
    const anthropicModule = await import('@agentprodready/ai-provider-anthropic');
    const apiKey = process.env['ANTHROPIC_API_KEY']?.trim() ?? '';
    if (apiKey === '') {
      throw new SimpleAgentError(
        'AGENT_MISSING_ANTHROPIC_KEY',
        'ANTHROPIC_API_KEY is required when using anthropic(...). Set it in the environment (the library does not load .env files).',
      );
    }

    const baseUrl = process.env['ANTHROPIC_BASE_URL']?.trim();
    const config = Object.freeze({
      apiKey,
      model: modelId,
      implementationId: ANTHROPIC_AI_ID,
      ...(baseUrl !== undefined && baseUrl !== '' ? { baseUrl } : {}),
    });

    resolver.bind(ANTHROPIC_AI_ID, async () => new anthropicModule.AnthropicProviderAdapter(config));
  } catch (error) {
    if (error instanceof SimpleAgentError) throw error;
    throw new SimpleAgentError(
      'AGENT_MISSING_ANTHROPIC_PACKAGE',
      'Anthropic support requires @agentprodready/ai-provider-anthropic. Install it with:\n npm install @agentprodready/ai-provider-anthropic',
      undefined,
      { cause: error },
    );
  }
}

async function bindOpenAiAdapter(resolver: FactoryAiAdapterResolver, modelId: string): Promise<void> {
  try {
    const openAiModule = await import('@agentprodready/ai-provider-openai');
    const apiKey = process.env['OPENAI_API_KEY']?.trim() ?? '';
    if (apiKey === '') {
      throw new SimpleAgentError(
        'AGENT_MISSING_OPENAI_KEY',
        'OPENAI_API_KEY is required when using openai(...). Set it in the environment (the library does not load .env files).',
      );
    }

    const baseUrl = process.env['OPENAI_BASE_URL']?.trim();
    const organization = process.env['OPENAI_ORGANIZATION']?.trim();
    const project = process.env['OPENAI_PROJECT']?.trim();
    const config = Object.freeze({
      apiKey,
      model: modelId,
      implementationId: OPENAI_AI_ID,
      authMode: 'api-key' as const,
      ...(baseUrl !== undefined && baseUrl !== '' ? { baseUrl } : {}),
      ...(organization !== undefined && organization !== '' ? { organization } : {}),
      ...(project !== undefined && project !== '' ? { project } : {}),
    });

    resolver.bind(OPENAI_AI_ID, async () => new openAiModule.OpenAiProviderAdapter(config));
  } catch (error) {
    if (error instanceof SimpleAgentError) throw error;
    throw new SimpleAgentError(
      'AGENT_MISSING_OPENAI_PACKAGE',
      'OpenAI support requires @agentprodready/ai-provider-openai. Install it with:\n npm install @agentprodready/ai-provider-openai',
      undefined,
      { cause: error },
    );
  }
}

async function bindOpenAiCompatibleAdapter(
  resolver: FactoryAiAdapterResolver,
  model: Extract<AgentModel, { provider: 'openai-compatible' }>,
): Promise<void> {
  try {
    const openAiModule = await import('@agentprodready/ai-provider-openai');
    // Re-validate baseUrl with package SSRF helper (production blocks).
    const baseUrl = openAiModule.validateOpenAiBaseUrl(model.baseUrl, { envName: 'baseUrl' });

    let apiKey = '';
    let authMode: 'api-key' | 'none' = model.auth;
    if (model.auth === 'none') {
      apiKey = openAiModule.OPENAI_NO_AUTH_API_KEY_PLACEHOLDER;
    } else {
      apiKey = model.apiKey?.trim() || process.env['OPENAI_COMPATIBLE_API_KEY']?.trim() || '';
      if (apiKey === '') {
        throw new SimpleAgentError(
          'AGENT_INVALID_CONFIG',
          'openaiCompatible requires options.apiKey or OPENAI_COMPATIBLE_API_KEY when auth is "api-key". OPENAI_API_KEY is never used for compatible endpoints.',
        );
      }
      // Security invariant: never read OPENAI_API_KEY here.
      authMode = 'api-key';
    }

    const config = Object.freeze({
      apiKey,
      model: model.modelId,
      baseUrl,
      implementationId: OPENAI_COMPATIBLE_AI_ID,
      authMode,
      ...(model.organization === undefined ? {} : { organization: model.organization }),
      ...(model.project === undefined ? {} : { project: model.project }),
    });

    resolver.bind(
      OPENAI_COMPATIBLE_AI_ID,
      async () => new openAiModule.OpenAiProviderAdapter(config),
    );
  } catch (error) {
    if (error instanceof SimpleAgentError) throw error;
    if (error instanceof Error && /not permitted|absolute http/i.test(error.message)) {
      throw new SimpleAgentError('AGENT_INVALID_MODEL', error.message, undefined, { cause: error });
    }
    throw new SimpleAgentError(
      'AGENT_MISSING_OPENAI_PACKAGE',
      'OpenAI-compatible support requires @agentprodready/ai-provider-openai. Install it with:\n npm install @agentprodready/ai-provider-openai',
      undefined,
      { cause: error },
    );
  }
}
