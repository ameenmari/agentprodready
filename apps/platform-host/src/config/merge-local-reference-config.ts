import type { LocalReferenceConfig } from './local-reference-config.js';
import {
  defaultHardeningConfigFields,
  defaultRoutingConfigFields,
  defaultStreamingConfigFields,
  defaultToolsConfigFields,
  defaultVectorSearchConfigFields,
} from './local-reference-config.js';

/** Fill missing v1.0 fields for hand-built test configs. */
export function mergeLocalReferenceConfig(
  partial: Partial<LocalReferenceConfig> &
    Pick<
      LocalReferenceConfig,
      | 'host'
      | 'port'
      | 'logLevel'
      | 'referenceAgentEnabled'
      | 'aiProvider'
      | 'persistenceProvider'
      | 'runtimeRecoveryEnabled'
      | 'memoryProvider'
      | 'evaluationEnabled'
      | 'evaluationResultStore'
    >,
): LocalReferenceConfig {
  return Object.freeze({
    ...defaultVectorSearchConfigFields(),
    ...defaultStreamingConfigFields(),
    ...defaultToolsConfigFields(),
    ...defaultRoutingConfigFields(),
    ...defaultHardeningConfigFields(),
    ...partial,
    aiFallbackProviders: Object.freeze([...(partial.aiFallbackProviders ?? [])]),
  });
}
