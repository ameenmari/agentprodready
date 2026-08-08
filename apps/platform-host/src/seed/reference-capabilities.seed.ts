import {
  CapabilityRegistry,
  DeterministicResolutionPolicy,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '@agentprodready/capability-resolution';
import { ANTHROPIC_AI_ID } from '@agentprodready/ai-provider-anthropic';
import { OPENAI_AI_ID, OPENAI_COMPATIBLE_AI_ID } from '@agentprodready/ai-provider-openai';
import {
  REFERENCE_COUNTER_CAPABILITY,
  REFERENCE_COUNTER_TOOL_ID,
  REFERENCE_ECHO_CAPABILITY,
  REFERENCE_ECHO_TOOL_ID,
} from '@agentprodready/tool-framework';
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
      providerId: 'agentprodready-local',
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
      providerId: 'agentprodready-local',
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
      providerId: 'agentprodready-local',
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
      id: OPENAI_COMPATIBLE_AI_ID,
      capabilityId: 'text-generation',
      providerId: 'openai-compatible',
      pluginId: 'openai',
      contributionId: 'contribution:openai-compatible-ai',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 11,
      attributes: Object.freeze({ locality: 'external', compliance: 'openai-compatible' }),
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
      id: `${OPENAI_COMPATIBLE_AI_ID}:evaluation.judge`,
      capabilityId: 'evaluation.judge',
      providerId: 'openai-compatible',
      pluginId: 'openai',
      contributionId: 'contribution:openai-compatible-ai-judge',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 11,
      attributes: Object.freeze({ locality: 'external', compliance: 'openai-compatible' }),
    }),
  );
  providers.register(
    Object.freeze({
      id: ANTHROPIC_AI_ID,
      capabilityId: 'text-generation',
      providerId: 'anthropic',
      pluginId: 'anthropic',
      contributionId: 'contribution:anthropic-ai',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 12,
      attributes: Object.freeze({ locality: 'external', compliance: 'anthropic-messages' }),
    }),
  );
  providers.register(
    Object.freeze({
      id: `${ANTHROPIC_AI_ID}:evaluation.judge`,
      capabilityId: 'evaluation.judge',
      providerId: 'anthropic',
      pluginId: 'anthropic',
      contributionId: 'contribution:anthropic-ai-judge',
      contractVersions: Object.freeze(['1']),
      implementationVersion: '1.0.0',
      enabled: true,
      health: 'healthy' as const,
      priority: 12,
      attributes: Object.freeze({ locality: 'external', compliance: 'anthropic-messages' }),
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

  for (const tool of [
    { capability: REFERENCE_ECHO_CAPABILITY, id: REFERENCE_ECHO_TOOL_ID },
    { capability: REFERENCE_COUNTER_CAPABILITY, id: REFERENCE_COUNTER_TOOL_ID },
  ]) {
    capabilities.register(
      Object.freeze({
        id: tool.capability,
        contractVersions: Object.freeze(['1']),
        defaultImplementationId: tool.id,
        metadata: Object.freeze({ referenceOnly: 'true', role: 'tool' }),
      }),
    );
    providers.register(
      Object.freeze({
        id: tool.id,
        capabilityId: tool.capability,
        providerId: 'agentprodready-local',
        pluginId: 'reference-tools',
        contributionId: `contribution:${tool.id}`,
        contractVersions: Object.freeze(['1']),
        implementationVersion: '1.0.0',
        enabled: true,
        health: 'healthy' as const,
        priority: 0,
        attributes: Object.freeze({ locality: 'local', compliance: 'reference' }),
      }),
    );
  }

  return { capabilities, providers };
}

export function referenceResolutionConfiguration(
  implementationId: string = REFERENCE_AI_ID,
  embeddingProvider: EmbeddingProviderSelection = 'none',
  routing?: Readonly<{
    mode: 'fixed' | 'fallback';
    orderedImplementationIds: readonly string[];
  }>,
): StaticResolutionConfiguration {
  const judgeImplementationId = `${implementationId}:evaluation.judge`;
  const embeddingImplementationId =
    embeddingProvider === 'openai'
      ? OPENAI_EMBEDDING_IMPLEMENTATION_ID
      : REFERENCE_EMBEDDING_IMPLEMENTATION_ID;
  const ordered =
    routing?.orderedImplementationIds ??
    Object.freeze([implementationId]);
  return new StaticResolutionConfiguration(
    Object.freeze({
      global: Object.freeze({
        'text-generation': implementationId,
        'evaluation.judge': judgeImplementationId,
        embedding: embeddingImplementationId,
        [REFERENCE_ECHO_CAPABILITY]: REFERENCE_ECHO_TOOL_ID,
        [REFERENCE_COUNTER_CAPABILITY]: REFERENCE_COUNTER_TOOL_ID,
      }),
      routing: Object.freeze({
        'text-generation': Object.freeze({
          mode: routing?.mode ?? 'fixed',
          orderedImplementationIds: Object.freeze([...ordered]),
        }),
        'evaluation.judge': Object.freeze({
          mode: 'fixed' as const,
          orderedImplementationIds: Object.freeze([judgeImplementationId]),
        }),
        embedding: Object.freeze({
          mode: 'fixed' as const,
          orderedImplementationIds: Object.freeze([embeddingImplementationId]),
        }),
      }),
    }),
  );
}

export { DeterministicResolutionPolicy };
