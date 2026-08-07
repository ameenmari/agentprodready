import { createRequire } from 'node:module';
import {
  DEFAULT_OPENAI_EMBEDDING_DIMENSIONS,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  loadOpenAiProviderConfig,
  type OpenAiProviderConfig,
} from '@agentprodready/ai-provider-openai';
import {
  REFERENCE_EMBEDDING_DIMENSIONS,
  REFERENCE_EMBEDDING_MODEL_ID,
} from '@agentprodready/ai-provider';
import {
  loadPersistenceProviderSelection,
  loadPostgresPersistenceConfig,
  type PersistenceProviderSelection,
  type PostgresPersistenceConfig,
} from '@agentprodready/persistence-postgres';

const requirePackageJson = createRequire(import.meta.url);
const hostPackageJson = requirePackageJson('../../package.json') as { readonly version?: unknown };
const hostPackageVersion =
  typeof hostPackageJson.version === 'string' ? hostPackageJson.version : '';
if (hostPackageVersion.trim() === '') {
  throw new Error('@agentprodready/platform-host package.json is missing version');
}

export type AiProviderSelection = 'reference' | 'openai';
export type AiRoutingMode = 'fixed' | 'fallback';
export type MemoryProviderSelection = 'in-memory' | 'persistent';
export type EvaluationResultStoreSelection = 'in-memory' | 'persistent';
export type VectorStoreProviderSelection = 'none' | 'pgvector' | 'memory';
export type EmbeddingProviderSelection = 'none' | 'reference' | 'openai';
export type VectorIndexProfileSelection = 'reference-32' | 'openai-1536-small';

export interface LocalReferenceConfig {
  readonly host: string;
  readonly port: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly referenceAgentEnabled: boolean;
  readonly aiProvider: AiProviderSelection;
  /** v1.0 multi-provider routing. Default fixed. */
  readonly aiRoutingMode: AiRoutingMode;
  /** Ordered fallback selectors (not including primary). */
  readonly aiFallbackProviders: readonly AiProviderSelection[];
  readonly openAi?: OpenAiProviderConfig;
  readonly persistenceProvider: PersistenceProviderSelection;
  readonly postgres?: PostgresPersistenceConfig;
  /** Boot-time Runtime.recoverIncomplete. Default false. */
  readonly runtimeRecoveryEnabled: boolean;
  /** Memory storage selection. Default in-memory. */
  readonly memoryProvider: MemoryProviderSelection;
  /** Evaluation productization. Default false. */
  readonly evaluationEnabled: boolean;
  /** Evaluation result store. Default in-memory. */
  readonly evaluationResultStore: EvaluationResultStoreSelection;
  /** Semantic / hybrid Memory retrieval. Default false. */
  readonly vectorSearchEnabled: boolean;
  readonly vectorStoreProvider: VectorStoreProviderSelection;
  readonly embeddingProvider: EmbeddingProviderSelection;
  readonly embeddingModel: string;
  readonly embeddingDimensions: number;
  readonly vectorIndexProfile: VectorIndexProfileSelection | 'none';
  /** SSE comment heartbeat interval. 0 disables. Default 15000. */
  readonly streamingHeartbeatIntervalMs: number;
  /** Max wait for response drain before Runtime cancel. Default 30000. */
  readonly streamingMaxDrainWaitMs: number;
  /** Tool calling / agent actions. Default false. */
  readonly toolsEnabled: boolean;
  readonly toolMaxCallsPerInvocation: number;
  readonly toolMaxTurns: number;
  readonly toolMaxArgumentBytes: number;
  readonly toolMaxResultBytes: number;
  /** Graceful shutdown drain timeout. Default 30000. */
  readonly shutdownTimeoutMs: number;
  /** Max JSON request body bytes. Default 1048576 (1 MiB). */
  readonly maxJsonBodyBytes: number;
  /** Allow LocalReference auth when NODE_ENV=production (unsafe demo). */
  readonly allowReferenceAuth: boolean;
}

export const LOCAL_TENANT = 'local-tenant';
export const LOCAL_WORKSPACE = 'local-workspace';
export const LOCAL_PROJECT = 'local-project';
export const LOCAL_USER = 'local-user';
export const LOCAL_AGENT_PRINCIPAL = 'agent-principal:reference-agent';
export const REFERENCE_AGENT_ID = 'reference-agent';
export const REFERENCE_AGENT_VERSION = hostPackageVersion;
export const REFERENCE_AI_ID = 'reference-ai';
export const LOCAL_POLICY_VERSION = 'local-1';
/** Always derived from apps/platform-host/package.json — do not hardcode. */
export const PRODUCT_VERSION = hostPackageVersion;
export const MAX_TOOL_MAX_CALLS = 64;
export const MAX_TOOL_MAX_TURNS = 32;
export const MAX_TOOL_ARGUMENT_BYTES = 1_048_576;
export const MAX_TOOL_RESULT_BYTES = 4_194_304;
export const MAX_SHUTDOWN_TIMEOUT_MS = 300_000;
export const MAX_JSON_BODY_BYTES = 16_777_216;
export const DEFAULT_JSON_BODY_BYTES = 1_048_576;

const REFERENCE_PROFILE = Object.freeze({
  embeddingProvider: 'reference' as const,
  embeddingModel: REFERENCE_EMBEDDING_MODEL_ID,
  embeddingDimensions: REFERENCE_EMBEDDING_DIMENSIONS,
  vectorIndexProfile: 'reference-32' as const,
});

const OPENAI_PROFILE = Object.freeze({
  embeddingProvider: 'openai' as const,
  embeddingModel: DEFAULT_OPENAI_EMBEDDING_MODEL,
  embeddingDimensions: DEFAULT_OPENAI_EMBEDDING_DIMENSIONS,
  vectorIndexProfile: 'openai-1536-small' as const,
});

function parseBooleanFlag(raw: string | undefined, name: string, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = raw.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function assertProfileMatch(
  embeddingProvider: EmbeddingProviderSelection,
  embeddingModel: string,
  embeddingDimensions: number,
  vectorIndexProfile: VectorIndexProfileSelection | 'none',
): void {
  if (embeddingProvider === 'reference') {
    if (embeddingModel !== REFERENCE_PROFILE.embeddingModel) {
      throw new Error(
        `EMBEDDING_MODEL must be ${REFERENCE_PROFILE.embeddingModel} when EMBEDDING_PROVIDER=reference`,
      );
    }
    if (embeddingDimensions !== REFERENCE_PROFILE.embeddingDimensions) {
      throw new Error(
        `EMBEDDING_DIMENSIONS must be ${String(REFERENCE_PROFILE.embeddingDimensions)} when EMBEDDING_PROVIDER=reference`,
      );
    }
    if (vectorIndexProfile !== REFERENCE_PROFILE.vectorIndexProfile) {
      throw new Error(
        `VECTOR_INDEX_PROFILE must be ${REFERENCE_PROFILE.vectorIndexProfile} when EMBEDDING_PROVIDER=reference`,
      );
    }
    return;
  }
  if (embeddingProvider === 'openai') {
    if (embeddingModel !== OPENAI_PROFILE.embeddingModel) {
      throw new Error(
        `EMBEDDING_MODEL must be ${OPENAI_PROFILE.embeddingModel} when EMBEDDING_PROVIDER=openai`,
      );
    }
    if (embeddingDimensions !== OPENAI_PROFILE.embeddingDimensions) {
      throw new Error(
        `EMBEDDING_DIMENSIONS must be ${String(OPENAI_PROFILE.embeddingDimensions)} when EMBEDDING_PROVIDER=openai`,
      );
    }
    if (vectorIndexProfile !== OPENAI_PROFILE.vectorIndexProfile) {
      throw new Error(
        `VECTOR_INDEX_PROFILE must be ${OPENAI_PROFILE.vectorIndexProfile} when EMBEDDING_PROVIDER=openai`,
      );
    }
  }
}

export function loadLocalReferenceConfig(env: NodeJS.ProcessEnv = process.env): LocalReferenceConfig {
  const portRaw = (env['PORT'] ?? '3000').trim();
  if (!/^\d+$/u.test(portRaw)) throw new Error('PORT must be a valid TCP port');
  const port = Number.parseInt(portRaw, 10);
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

  const aiRoutingModeRaw = (env['AI_ROUTING_MODE'] ?? 'fixed').trim().toLowerCase();
  if (aiRoutingModeRaw !== 'fixed' && aiRoutingModeRaw !== 'fallback') {
    throw new Error('AI_ROUTING_MODE must be fixed or fallback');
  }
  const aiRoutingMode: AiRoutingMode = aiRoutingModeRaw;
  const aiFallbackProviders = parseFallbackProviders(env['AI_FALLBACK_PROVIDERS'], aiProvider, aiRoutingMode);

  const persistenceProvider = loadPersistenceProviderSelection(env);
  const postgres =
    persistenceProvider === 'postgres' ? loadPostgresPersistenceConfig(env) : undefined;

  const memoryProviderRaw = (env['MEMORY_PROVIDER'] ?? 'in-memory').trim().toLowerCase();
  if (memoryProviderRaw !== 'in-memory' && memoryProviderRaw !== 'persistent') {
    throw new Error('MEMORY_PROVIDER must be in-memory or persistent');
  }
  const memoryProvider: MemoryProviderSelection = memoryProviderRaw;

  const evaluationEnabled = parseBooleanFlag(env['EVALUATION_ENABLED'], 'EVALUATION_ENABLED', false);

  const evaluationResultStoreRaw = (env['EVALUATION_RESULT_STORE'] ?? 'in-memory')
    .trim()
    .toLowerCase();
  if (evaluationResultStoreRaw !== 'in-memory' && evaluationResultStoreRaw !== 'persistent') {
    throw new Error('EVALUATION_RESULT_STORE must be in-memory or persistent');
  }
  const evaluationResultStore: EvaluationResultStoreSelection = evaluationResultStoreRaw;

  const vectorSearchEnabled = parseBooleanFlag(
    env['VECTOR_SEARCH_ENABLED'],
    'VECTOR_SEARCH_ENABLED',
    false,
  );

  const vectorStoreRaw = (env['VECTOR_STORE_PROVIDER'] ?? 'none').trim().toLowerCase();
  let vectorStoreProvider: VectorStoreProviderSelection = 'none';
  if (vectorStoreRaw === 'none' || vectorStoreRaw === 'pgvector' || vectorStoreRaw === 'memory') {
    vectorStoreProvider = vectorStoreRaw;
  } else {
    throw new Error('VECTOR_STORE_PROVIDER must be none, memory, or pgvector');
  }

  const embeddingProviderRaw = (env['EMBEDDING_PROVIDER'] ?? 'none').trim().toLowerCase();
  let embeddingProvider: EmbeddingProviderSelection = 'none';
  if (
    embeddingProviderRaw === 'none' ||
    embeddingProviderRaw === 'reference' ||
    embeddingProviderRaw === 'openai'
  ) {
    embeddingProvider = embeddingProviderRaw;
  } else {
    throw new Error('EMBEDDING_PROVIDER must be none, reference, or openai');
  }

  let embeddingModel = (env['EMBEDDING_MODEL'] ?? '').trim();
  let embeddingDimensionsRaw = (env['EMBEDDING_DIMENSIONS'] ?? '').trim();
  let vectorIndexProfileRaw = (env['VECTOR_INDEX_PROFILE'] ?? '').trim().toLowerCase();

  if (vectorSearchEnabled) {
    if (vectorStoreProvider === 'none') {
      throw new Error('VECTOR_STORE_PROVIDER must be memory or pgvector when VECTOR_SEARCH_ENABLED=true');
    }
    if (embeddingProvider === 'none') {
      throw new Error('EMBEDDING_PROVIDER must be reference or openai when VECTOR_SEARCH_ENABLED=true');
    }
    if (
      vectorStoreProvider === 'pgvector' &&
      (env['DATABASE_URL'] ?? '').trim() === '' &&
      (env['POSTGRES_HOST'] ?? '').trim() === ''
    ) {
      throw new Error(
        'DATABASE_URL (or POSTGRES_HOST) is required when VECTOR_STORE_PROVIDER=pgvector',
      );
    }

    const defaults = embeddingProvider === 'openai' ? OPENAI_PROFILE : REFERENCE_PROFILE;
    if (embeddingModel === '') embeddingModel = defaults.embeddingModel;
    if (embeddingDimensionsRaw === '') {
      embeddingDimensionsRaw = String(defaults.embeddingDimensions);
    }
    if (vectorIndexProfileRaw === '') {
      vectorIndexProfileRaw = defaults.vectorIndexProfile;
    }
  }

  let embeddingDimensions = 0;
  if (embeddingDimensionsRaw !== '') {
    embeddingDimensions = Number.parseInt(embeddingDimensionsRaw, 10);
    if (!Number.isFinite(embeddingDimensions) || embeddingDimensions < 1) {
      throw new Error('EMBEDDING_DIMENSIONS must be a positive integer');
    }
  }

  let vectorIndexProfile: VectorIndexProfileSelection | 'none' = 'none';
  if (vectorIndexProfileRaw !== '') {
    if (vectorIndexProfileRaw !== 'reference-32' && vectorIndexProfileRaw !== 'openai-1536-small') {
      throw new Error('VECTOR_INDEX_PROFILE must be reference-32 or openai-1536-small');
    }
    vectorIndexProfile = vectorIndexProfileRaw;
  }

  if (vectorSearchEnabled) {
    assertProfileMatch(embeddingProvider, embeddingModel, embeddingDimensions, vectorIndexProfile);
  }

  const streamingHeartbeatIntervalMs = parseNonNegativeInt(
    env['STREAMING_HEARTBEAT_INTERVAL_MS'],
    'STREAMING_HEARTBEAT_INTERVAL_MS',
    15_000,
  );
  const streamingMaxDrainWaitMs = parsePositiveInt(
    env['STREAMING_MAX_DRAIN_WAIT_MS'],
    'STREAMING_MAX_DRAIN_WAIT_MS',
    30_000,
  );

  const toolsEnabled = parseBooleanFlag(env['TOOLS_ENABLED'], 'TOOLS_ENABLED', false);
  const toolMaxCallsPerInvocation = parseBoundedPositiveInt(
    env['TOOL_MAX_CALLS_PER_INVOCATION'],
    'TOOL_MAX_CALLS_PER_INVOCATION',
    8,
    MAX_TOOL_MAX_CALLS,
  );
  const toolMaxTurns = parseBoundedPositiveInt(env['TOOL_MAX_TURNS'], 'TOOL_MAX_TURNS', 4, MAX_TOOL_MAX_TURNS);
  const toolMaxArgumentBytes = parseBoundedPositiveInt(
    env['TOOL_MAX_ARGUMENT_BYTES'],
    'TOOL_MAX_ARGUMENT_BYTES',
    16_384,
    MAX_TOOL_ARGUMENT_BYTES,
  );
  const toolMaxResultBytes = parseBoundedPositiveInt(
    env['TOOL_MAX_RESULT_BYTES'],
    'TOOL_MAX_RESULT_BYTES',
    65_536,
    MAX_TOOL_RESULT_BYTES,
  );
  const shutdownTimeoutMs = parseBoundedPositiveInt(
    env['SHUTDOWN_TIMEOUT_MS'],
    'SHUTDOWN_TIMEOUT_MS',
    30_000,
    MAX_SHUTDOWN_TIMEOUT_MS,
  );
  const maxJsonBodyBytes = parseBoundedPositiveInt(
    env['MAX_JSON_BODY_BYTES'],
    'MAX_JSON_BODY_BYTES',
    DEFAULT_JSON_BODY_BYTES,
    MAX_JSON_BODY_BYTES,
  );
  const allowReferenceAuth = parseBooleanFlag(
    env['AGENTPRODREADY_ALLOW_REFERENCE_AUTH'],
    'AGENTPRODREADY_ALLOW_REFERENCE_AUTH',
    false,
  );

  const needsOpenAiKey =
    aiProvider === 'openai' ||
    aiFallbackProviders.includes('openai') ||
    (vectorSearchEnabled && embeddingProvider === 'openai');
  const resolvedOpenAi = needsOpenAiKey ? loadOpenAiProviderConfig(env) : undefined;

  return Object.freeze({
    host: env['HOST'] ?? '127.0.0.1',
    port,
    logLevel,
    referenceAgentEnabled: parseBooleanFlag(env['REFERENCE_AGENT_ENABLED'], 'REFERENCE_AGENT_ENABLED', true),
    aiProvider,
    aiRoutingMode,
    aiFallbackProviders,
    ...(resolvedOpenAi === undefined ? {} : { openAi: resolvedOpenAi }),
    persistenceProvider,
    ...(postgres === undefined ? {} : { postgres }),
    runtimeRecoveryEnabled: parseBooleanFlag(
      env['RUNTIME_RECOVERY_ENABLED'],
      'RUNTIME_RECOVERY_ENABLED',
      false,
    ),
    memoryProvider,
    evaluationEnabled,
    evaluationResultStore,
    vectorSearchEnabled,
    vectorStoreProvider,
    embeddingProvider,
    embeddingModel,
    embeddingDimensions,
    vectorIndexProfile,
    streamingHeartbeatIntervalMs,
    streamingMaxDrainWaitMs,
    toolsEnabled,
    toolMaxCallsPerInvocation,
    toolMaxTurns,
    toolMaxArgumentBytes,
    toolMaxResultBytes,
    shutdownTimeoutMs,
    maxJsonBodyBytes,
    allowReferenceAuth,
  });
}

function parseFallbackProviders(
  raw: string | undefined,
  primary: AiProviderSelection,
  mode: AiRoutingMode,
): readonly AiProviderSelection[] {
  const text = (raw ?? '').trim();
  if (text === '') {
    if (mode === 'fallback') {
      throw new Error('AI_FALLBACK_PROVIDERS is required when AI_ROUTING_MODE=fallback');
    }
    return Object.freeze([]);
  }
  const parts = text.split(',').map((part) => part.trim().toLowerCase()).filter((part) => part !== '');
  if (parts.length === 0) {
    throw new Error('AI_FALLBACK_PROVIDERS contains an empty token');
  }
  const seen = new Set<string>([primary]);
  const result: AiProviderSelection[] = [];
  for (const part of parts) {
    if (part !== 'reference' && part !== 'openai') {
      throw new Error('AI_FALLBACK_PROVIDERS entries must be reference or openai');
    }
    if (seen.has(part)) {
      throw new Error(`Duplicate AI provider in routing list: ${part}`);
    }
    seen.add(part);
    result.push(part);
  }
  if (mode === 'fallback' && result.length === 0) {
    throw new Error('AI_FALLBACK_PROVIDERS is required when AI_ROUTING_MODE=fallback');
  }
  return Object.freeze(result);
}

function parseNonNegativeInt(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const text = raw.trim();
  if (!/^\d+$/u.test(text)) throw new Error(`${name} must be a non-negative integer`);
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function parsePositiveInt(raw: string | undefined, name: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const text = raw.trim();
  if (!/^\d+$/u.test(text)) throw new Error(`${name} must be a positive integer`);
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function parseBoundedPositiveInt(
  raw: string | undefined,
  name: string,
  fallback: number,
  max: number,
): number {
  const value = parsePositiveInt(raw, name, fallback);
  if (value > max) throw new Error(`${name} must be <= ${String(max)}`);
  return value;
}

/** Defaults for hand-built LocalReferenceConfig objects in tests/smoke. */
export function defaultVectorSearchConfigFields(): Pick<
  LocalReferenceConfig,
  | 'vectorSearchEnabled'
  | 'vectorStoreProvider'
  | 'embeddingProvider'
  | 'embeddingModel'
  | 'embeddingDimensions'
  | 'vectorIndexProfile'
> {
  return Object.freeze({
    vectorSearchEnabled: false,
    vectorStoreProvider: 'none',
    embeddingProvider: 'none',
    embeddingModel: '',
    embeddingDimensions: 0,
    vectorIndexProfile: 'none',
  });
}

export function defaultStreamingConfigFields(): Pick<
  LocalReferenceConfig,
  'streamingHeartbeatIntervalMs' | 'streamingMaxDrainWaitMs'
> {
  return Object.freeze({
    streamingHeartbeatIntervalMs: 15_000,
    streamingMaxDrainWaitMs: 30_000,
  });
}

export function defaultToolsConfigFields(): Pick<
  LocalReferenceConfig,
  | 'toolsEnabled'
  | 'toolMaxCallsPerInvocation'
  | 'toolMaxTurns'
  | 'toolMaxArgumentBytes'
  | 'toolMaxResultBytes'
> {
  return Object.freeze({
    toolsEnabled: false,
    toolMaxCallsPerInvocation: 8,
    toolMaxTurns: 4,
    toolMaxArgumentBytes: 16_384,
    toolMaxResultBytes: 65_536,
  });
}

export function defaultRoutingConfigFields(): Pick<
  LocalReferenceConfig,
  'aiRoutingMode' | 'aiFallbackProviders'
> {
  return Object.freeze({
    aiRoutingMode: 'fixed' as const,
    aiFallbackProviders: Object.freeze([]),
  });
}

export function defaultHardeningConfigFields(): Pick<
  LocalReferenceConfig,
  'shutdownTimeoutMs' | 'maxJsonBodyBytes' | 'allowReferenceAuth'
> {
  return Object.freeze({
    shutdownTimeoutMs: 30_000,
    maxJsonBodyBytes: DEFAULT_JSON_BODY_BYTES,
    allowReferenceAuth: false,
  });
}

export function assertProductionAuthPolicy(config: LocalReferenceConfig, env: NodeJS.ProcessEnv = process.env): void {
  if ((env['NODE_ENV'] ?? '').trim() !== 'production') return;
  if (config.allowReferenceAuth) {
    process.stderr.write(
      'WARNING: AGENTPRODREADY_ALLOW_REFERENCE_AUTH=true — LocalReference authentication is NOT production authentication.\n',
    );
    return;
  }
  throw new Error(
    'LocalReference authentication is not permitted when NODE_ENV=production. Set AGENTPRODREADY_ALLOW_REFERENCE_AUTH=true only for explicit demos.',
  );
}
