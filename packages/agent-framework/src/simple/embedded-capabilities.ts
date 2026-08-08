import {
  CapabilityRegistry,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '@agentprodready/capability-resolution';

/** Matches @agentprodready/ai-provider ReferenceAiProviderAdapter.id */
export const REFERENCE_AI_ID = 'reference-ai';
/** Matches @agentprodready/ai-provider-openai OPENAI_AI_ID — string only (no package import). */
export const OPENAI_AI_ID = 'openai-ai';

export function seedEmbeddedCapabilities(implementationId: string): {
  readonly capabilities: CapabilityRegistry;
  readonly providers: ProviderRegistry;
  readonly configuration: StaticResolutionConfiguration;
} {
  const capabilities = new CapabilityRegistry();
  const providers = new ProviderRegistry();

  capabilities.register(
    Object.freeze({
      id: 'text-generation',
      contractVersions: Object.freeze(['1']),
      defaultImplementationId: implementationId,
      metadata: Object.freeze({ embeddedSimple: 'true' }),
    }),
  );

  providers.register(
    Object.freeze({
      id: implementationId,
      capabilityId: 'text-generation',
      providerId: 'agentprodready-embedded',
      pluginId: 'simple-facade',
      contributionId: `contribution:${implementationId}`,
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 0,
      attributes: Object.freeze({ locality: 'local', compliance: 'embedded' }),
    }),
  );

  const configuration = new StaticResolutionConfiguration({
    global: Object.freeze({ 'text-generation': implementationId }),
  });

  return Object.freeze({ capabilities, providers, configuration });
}
