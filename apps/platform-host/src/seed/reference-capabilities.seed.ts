import {
  CapabilityRegistry,
  DeterministicResolutionPolicy,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '@agentforge/capability-resolution';
import { OPENAI_AI_ID } from '@agentforge/ai-provider-openai';
import { REFERENCE_AI_ID } from '../config/local-reference-config.js';
import type { EmbeddingProviderSelection } from '../config/local-reference-config.js';

export const REFERENCE_EMBEDDING_IMPLEMENTATION_ID = `${REFERENCE_AI_ID}:embedding`;
export const OPENAI_EMBEDDING_IMPLEMENTATION_ID = `${OPENAI_AI_ID}:embedding`;

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
  capabilities.register(
    Object.freeze({
      id: 'evaluation.judge',
      contractVersions: Object.freeze(['1']),
      defaultImplementationId: REFERENCE_AI_ID,
      metadata: Object.freeze({ referenceOnly: 'true', role: 'evaluation-judge' }),
    }),
  );
  capabilities.register(
    Object.freeze({
      id: 'embedding',
      contractVersions: Object.freeze(['1']),
      defaultImplementationId: REFERENCE_EMBEDDING_IMPLEMENTATION_ID,
      metadata: Object.freeze({ referenceOnly: 'true', role: 'embedding' }),
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
      id: `${REFERENCE_AI_ID}:evaluation.judge`,
      capabilityId: 'evaluation.judge',
      providerId: 'agentforge-local',
      pluginId: 'local-reference',
      contributionId: 'contribution:reference-ai-judge',
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
      id: REFERENCE_EMBEDDING_IMPLEMENTATION_ID,
      capabilityId: 'embedding',
      providerId: 'agentforge-local',
      pluginId: 'local-reference',
      contributionId: 'contribution:reference-ai-embedding',
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
  providers.register(
    Object.freeze({
      id: `${OPENAI_AI_ID}:evaluation.judge`,
      capabilityId: 'evaluation.judge',
      providerId: 'openai',
      pluginId: 'openai',
      contributionId: 'contribution:openai-ai-judge',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 10,
      attributes: Object.freeze({ locality: 'external', compliance: 'production-capable' }),
    }),
  );
  providers.register(
    Object.freeze({
      id: OPENAI_EMBEDDING_IMPLEMENTATION_ID,
      capabilityId: 'embedding',
      providerId: 'openai',
      pluginId: 'openai',
      contributionId: 'contribution:openai-ai-embedding',
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
  embeddingProvider: EmbeddingProviderSelection = 'none',
): StaticResolutionConfiguration {
  const judgeImplementationId = `${implementationId}:evaluation.judge`;
  const embeddingImplementationId =
    embeddingProvider === 'openai'
      ? OPENAI_EMBEDDING_IMPLEMENTATION_ID
      : REFERENCE_EMBEDDING_IMPLEMENTATION_ID;
  return new StaticResolutionConfiguration(
    Object.freeze({
      global: Object.freeze({
        'text-generation': implementationId,
        'evaluation.judge': judgeImplementationId,
        embedding: embeddingImplementationId,
      }),
    }),
  );
}

export { DeterministicResolutionPolicy };
