import {
  AiProviderFramework,
  FactoryAiAdapterResolver,
  InMemoryAiDiagnostics,
  InMemoryAiEvents,
  NoopAiTelemetry,
  ReferenceAiProviderAdapter,
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
  AgentFramework,
  buildAgentDefinition,
  DeterministicAgentValidator,
  InMemoryAgentAudit,
  InMemoryAgentDiagnostics,
  InMemoryAgentFacts,
  InMemoryAgentLifecycleStore,
  InMemoryAgentRegistry,
} from '../index.js';
import { OPENAI_AI_ID, REFERENCE_AI_ID, seedEmbeddedCapabilities } from './embedded-capabilities.js';
import { EmbeddedCapabilityExecution } from './embedded-capability-execution.js';
import { buildEmbeddedManifest, embeddedValidationCatalog } from './embedded-manifest.js';
import { createEmbeddedPlanningAdapter, createEmbeddedWorkflowAdapter } from './embedded-planning.js';
import { EmbeddedPromptService } from './embedded-prompt.js';
import { EmbeddedRuntimePort } from './embedded-runtime-port.js';
import {
  EMBEDDED_PROJECT,
  EMBEDDED_TENANT,
  EMBEDDED_USER,
  EMBEDDED_WORKSPACE,
  EmbeddedSecurity,
} from './embedded-security.js';
import { SimpleAgentError } from './errors.js';
import type { AgentModel } from './types.js';
import type { NormalizedCreateAgentOptions } from './validate-options.js';

export interface EmbeddedPlatform {
  readonly agentId: string;
  readonly agentPrincipalId: string;
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

  const implementationId = await resolveImplementationId(options.model);
  const { capabilities, providers, configuration } = seedEmbeddedCapabilities(implementationId);

  const aiResolver = new FactoryAiAdapterResolver();
  if (options.model.provider === 'reference') {
    aiResolver.bind(REFERENCE_AI_ID, async () => new ReferenceAiProviderAdapter());
  } else {
    await bindOpenAiAdapter(aiResolver, options.model.modelId);
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

  const prompts = new EmbeddedPromptService();
  const capabilityExecution = new EmbeddedCapabilityExecution(
    capabilityResolver,
    aiFramework,
    prompts,
    options.instructions,
    EMBEDDED_TENANT,
    EMBEDDED_WORKSPACE,
  );

  const compositionRoot = new CompositionRoot();
  compositionRoot.build();

  const security = new EmbeddedSecurity();
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
    scope,
    framework,
    runtimePort,
    security,
    compositionRoot,
    async dispose(): Promise<void> {
      await runtimePort.dispose();
      await compositionRoot.dispose();
    },
  });
}

async function resolveImplementationId(model: AgentModel): Promise<string> {
  if (model.provider === 'reference') return REFERENCE_AI_ID;
  return OPENAI_AI_ID;
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
