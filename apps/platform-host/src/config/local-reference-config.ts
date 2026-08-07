import { loadOpenAiProviderConfig, type OpenAiProviderConfig } from '@agentforge/ai-provider-openai';
import {
  loadPersistenceProviderSelection,
  loadPostgresPersistenceConfig,
  type PersistenceProviderSelection,
  type PostgresPersistenceConfig,
} from '@agentforge/persistence-postgres';

export type AiProviderSelection = 'reference' | 'openai';
export type MemoryProviderSelection = 'in-memory' | 'persistent';

export interface LocalReferenceConfig {
  readonly host: string;
  readonly port: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly referenceAgentEnabled: boolean;
  readonly aiProvider: AiProviderSelection;
  readonly openAi?: OpenAiProviderConfig;
  readonly persistenceProvider: PersistenceProviderSelection;
  readonly postgres?: PostgresPersistenceConfig;
  /** Boot-time Runtime.recoverIncomplete. Default false. */
  readonly runtimeRecoveryEnabled: boolean;
  /** Memory storage selection. Default in-memory. */
  readonly memoryProvider: MemoryProviderSelection;
}

export const LOCAL_TENANT = 'local-tenant';
export const LOCAL_WORKSPACE = 'local-workspace';
export const LOCAL_PROJECT = 'local-project';
export const LOCAL_USER = 'local-user';
export const LOCAL_AGENT_PRINCIPAL = 'agent-principal:reference-agent';
export const REFERENCE_AGENT_ID = 'reference-agent';
export const REFERENCE_AGENT_VERSION = '1.0.0';
export const REFERENCE_AI_ID = 'reference-ai';
export const LOCAL_POLICY_VERSION = 'local-1';
export const PRODUCT_VERSION = '0.5.0';

export function loadLocalReferenceConfig(env: NodeJS.ProcessEnv = process.env): LocalReferenceConfig {
  const port = Number.parseInt(env['PORT'] ?? '3000', 10);
  const logLevel = env['LOG_LEVEL'] ?? 'info';
  if (!Number.isFinite(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (logLevel !== 'debug' && logLevel !== 'info' && logLevel !== 'warn' && logLevel !== 'error') {
    throw new Error('LOG_LEVEL must be debug, info, warn, or error');
  }

  const aiProviderRaw = (env['AI_PROVIDER'] ?? 'reference').trim().toLowerCase();
  if (aiProviderRaw !== 'reference' && aiProviderRaw !== 'openai') {
    throw new Error('AI_PROVIDER must be reference or openai');
  }
  const aiProvider: AiProviderSelection = aiProviderRaw;

  const openAi = aiProvider === 'openai' ? loadOpenAiProviderConfig(env) : undefined;
  const persistenceProvider = loadPersistenceProviderSelection(env);
  const postgres =
    persistenceProvider === 'postgres' ? loadPostgresPersistenceConfig(env) : undefined;

  const memoryProviderRaw = (env['MEMORY_PROVIDER'] ?? 'in-memory').trim().toLowerCase();
  if (memoryProviderRaw !== 'in-memory' && memoryProviderRaw !== 'persistent') {
    throw new Error('MEMORY_PROVIDER must be in-memory or persistent');
  }
  const memoryProvider: MemoryProviderSelection = memoryProviderRaw;

  return Object.freeze({
    host: env['HOST'] ?? '127.0.0.1',
    port,
    logLevel,
    referenceAgentEnabled: (env['REFERENCE_AGENT_ENABLED'] ?? 'true') !== 'false',
    aiProvider,
    ...(openAi === undefined ? {} : { openAi }),
    persistenceProvider,
    ...(postgres === undefined ? {} : { postgres }),
    runtimeRecoveryEnabled: (env['RUNTIME_RECOVERY_ENABLED'] ?? 'false') === 'true',
    memoryProvider,
  });
}
