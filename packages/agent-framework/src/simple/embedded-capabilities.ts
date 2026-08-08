import {
  CapabilityRegistry,
  ProviderRegistry,
  StaticResolutionConfiguration,
} from '@agentprodready/capability-resolution';
import type { SimpleTool } from './tool.js';

/** Matches @agentprodready/ai-provider ReferenceAiProviderAdapter.id */
export const REFERENCE_AI_ID = 'reference-ai';
/** Matches @agentprodready/ai-provider-openai OPENAI_AI_ID — string only (no package import). */
export const OPENAI_AI_ID = 'openai-ai';
/** Matches @agentprodready/ai-provider-openai OPENAI_COMPATIBLE_AI_ID — string only. */
export const OPENAI_COMPATIBLE_AI_ID = 'openai-compatible-ai';
/** Matches @agentprodready/ai-provider-anthropic ANTHROPIC_AI_ID — string only. */
export const ANTHROPIC_AI_ID = 'anthropic-ai';

export function seedEmbeddedCapabilities(
  implementationId: string,
  tools: readonly SimpleTool[] = [],
): {
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

  seedEmbeddedToolCapabilities(tools, capabilities, providers);

  const global: Record<string, string> = Object.freeze({
    'text-generation': implementationId,
    ...Object.fromEntries(tools.map((tool) => [tool.contract.capability, tool.contract.id])),
  });

  const configuration = new StaticResolutionConfiguration({
    global,
  });

  return Object.freeze({ capabilities, providers, configuration });
}

export function seedEmbeddedToolCapabilities(
  tools: readonly SimpleTool[],
  capabilities: CapabilityRegistry,
  providers: ProviderRegistry,
): void {
  for (const simpleTool of tools) {
    const capabilityId = simpleTool.contract.capability;
    capabilities.register(
      Object.freeze({
        id: capabilityId,
        contractVersions: Object.freeze(['1']),
        defaultImplementationId: simpleTool.contract.id,
        metadata: Object.freeze({ embeddedSimple: 'true', source: 'simple-tool' }),
      }),
    );
    providers.register(
      Object.freeze({
        id: simpleTool.contract.id,
        capabilityId,
        providerId: 'agentprodready-embedded',
        pluginId: 'simple-facade',
        contributionId: simpleTool.contract.contributionId,
        contractVersions: Object.freeze(['1']),
        implementationVersion: '1.0.0',
        enabled: true,
        health: 'healthy' as const,
        priority: 0,
        attributes: Object.freeze({ locality: 'local', compliance: 'embedded' }),
      }),
    );
  }
}
