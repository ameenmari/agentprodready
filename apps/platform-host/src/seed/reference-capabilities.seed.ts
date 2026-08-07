import {
  CapabilityRegistry,
  DeterministicResolutionPolicy,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '@agentforge/capability-resolution';
import { OPENAI_AI_ID } from '@agentforge/ai-provider-openai';
import { REFERENCE_AI_ID } from '../config/local-reference-config.js';

export function seedReferenceCapabilities(): {
  readonly capabilities: CapabilityRegistry;
  readonly providers: ProviderRegistry;
} {
  const capabilities = new CapabilityRegistry();
  const providers = new ProviderRegistry();

  capabilities.register(
    Object.freeze({
      id: 'text-generation',
      contractVersions: Object.freeze(['1']),
      defaultImplementationId: REFERENCE_AI_ID,
      metadata: Object.freeze({ referenceOnly: 'true' }),
    }),
  );

  providers.register(
    Object.freeze({
      id: REFERENCE_AI_ID,
      capabilityId: 'text-generation',
      providerId: 'agentforge-local',
      pluginId: 'local-reference',
      contributionId: 'contribution:reference-ai',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 0,
      attributes: Object.freeze({ locality: 'local', compliance: 'reference' }),
    }),
  );

  providers.register(
    Object.freeze({
      id: OPENAI_AI_ID,
      capabilityId: 'text-generation',
      providerId: 'openai',
      pluginId: 'openai',
      contributionId: 'contribution:openai-ai',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 10,
      attributes: Object.freeze({ locality: 'external', compliance: 'production-capable' }),
    }),
  );

  return { capabilities, providers };
}

export function referenceResolutionConfiguration(
  implementationId: string = REFERENCE_AI_ID,
): StaticResolutionConfiguration {
  return new StaticResolutionConfiguration(
    Object.freeze({
      global: Object.freeze({
        'text-generation': implementationId,
      }),
    }),
  );
}

export { DeterministicResolutionPolicy };
