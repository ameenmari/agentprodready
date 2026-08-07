import {
  FactoryAiEmbeddingAdapterResolver,
  ReferenceEmbeddingAdapter,
  type AiEmbeddingAdapterResolver,
} from '@agentforge/ai-provider';
import { OpenAiEmbeddingAdapter } from '@agentforge/ai-provider-openai';
import type { CapabilityResolver } from '@agentforge/capability-resolution';
import type { HealthResult } from '@agentforge/foundation';
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  InMemoryMemoryProvider,
  MemoryEngine,
  NoopMemoryAiPort,
  NoopMemoryIndexProvider,
  PersistenceBackedMemoryProvider,
  VectorCapableMemorySearchProvider,
  VectorMemoryIndexProvider,
  WeightedMemoryRanking,
  type MemoryIndexProvider,
  type MemorySearchProvider,
  type MemoryStorageProvider,
  type MemoryTelemetry,
} from '@agentforge/memory';
import type { PersistenceProvider } from '@agentforge/persistence';
import { InMemoryVectorStore, type VectorStorePort } from '@agentforge/vector-store';
import {
  loadVectorPostgresConfig,
  PgvectorVectorStore,
} from '@agentforge/vector-store-pgvector';
import type { LocalReferenceConfig } from '../config/local-reference-config.js';
import {
  OPENAI_EMBEDDING_IMPLEMENTATION_ID,
  REFERENCE_EMBEDDING_IMPLEMENTATION_ID,
} from '../seed/reference-capabilities.seed.js';

export interface LocalReferenceMemoryBundle {
  readonly storage: MemoryStorageProvider;
  /** Keyword-capable storage also used as keyword search delegate. */
  readonly keyword: MemoryStorageProvider & MemorySearchProvider;
  readonly search: MemorySearchProvider;
  readonly indexProvider: MemoryIndexProvider;
  readonly engine: MemoryEngine;
  readonly vectors: VectorStorePort | undefined;
  readonly embeddingResolver: AiEmbeddingAdapterResolver;
  readonly vectorHealth: (() => Promise<HealthResult>) | undefined;
  dispose(): Promise<void>;
}

export function buildLocalReferenceMemory(options: {
  readonly config: LocalReferenceConfig;
  readonly persistence: PersistenceProvider;
  readonly capabilityResolver: CapabilityResolver;
}): LocalReferenceMemoryBundle {
  const { config, persistence, capabilityResolver } = options;

  const keyword: MemoryStorageProvider & MemorySearchProvider =
    config.memoryProvider === 'persistent'
      ? new PersistenceBackedMemoryProvider(persistence)
      : new InMemoryMemoryProvider();

  const embeddingResolver = new FactoryAiEmbeddingAdapterResolver();
  embeddingResolver.bind(REFERENCE_EMBEDDING_IMPLEMENTATION_ID, async () => new ReferenceEmbeddingAdapter());
  if (config.embeddingProvider === 'openai' || config.aiProvider === 'openai') {
    if (config.openAi === undefined) {
      if (config.embeddingProvider === 'openai') {
        throw new Error('OpenAI configuration is required when EMBEDDING_PROVIDER=openai');
      }
    } else {
      const openAiConfig = config.openAi;
      embeddingResolver.bind(
        OPENAI_EMBEDDING_IMPLEMENTATION_ID,
        async () => new OpenAiEmbeddingAdapter(openAiConfig),
      );
    }
  }

  let vectors: VectorStorePort | undefined;
  let closeVectors: (() => Promise<void>) | undefined;
  let indexProvider: MemoryIndexProvider = new NoopMemoryIndexProvider();
  let search: MemorySearchProvider = keyword;

  if (config.vectorSearchEnabled) {
    const modelId = config.embeddingModel;
    const dimensions = config.embeddingDimensions;

    if (config.vectorStoreProvider === 'memory') {
      vectors = new InMemoryVectorStore({ dimensions, embeddingModelId: modelId });
    } else if (config.vectorStoreProvider === 'pgvector') {
      const pgStore = new PgvectorVectorStore({
        config: loadVectorPostgresConfig(process.env),
        dimensions,
        embeddingModelId: modelId,
      });
      vectors = pgStore;
      closeVectors = async (): Promise<void> => {
        await pgStore.close();
      };
    } else {
      throw new Error('VECTOR_STORE_PROVIDER must be memory or pgvector when VECTOR_SEARCH_ENABLED=true');
    }

    indexProvider = new VectorMemoryIndexProvider({
      vectors,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: modelId,
      embeddingDimensions: dimensions,
    });
    search = new VectorCapableMemorySearchProvider({
      keyword,
      storage: keyword,
      vectors,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: modelId,
      embeddingDimensions: dimensions,
      enabled: true,
    });
  } else {
    // Always wrap for honest semantic/hybrid degrade when vector search is off.
    const stub = new InMemoryVectorStore({
      dimensions: 32,
      embeddingModelId: 'reference-embedding-32',
    });
    search = new VectorCapableMemorySearchProvider({
      keyword,
      storage: keyword,
      vectors: stub,
      capabilityResolver,
      embeddingResolver,
      embeddingModelId: 'reference-embedding-32',
      embeddingDimensions: 32,
      enabled: false,
    });
  }

  const telemetry: MemoryTelemetry = {
    captured: (): void => {},
    transitioned: (): void => {},
    retrieved: (): void => {},
    failed: (): void => {},
    indexCleanupFailed: (): void => {},
  };

  const engine = new MemoryEngine(
    keyword,
    search,
    new WeightedMemoryRanking(),
    new NoopMemoryAiPort(),
    new InMemoryMemoryDiagnostics(),
    new InMemoryMemoryEvents(),
    telemetry,
    indexProvider,
  );

  const activeVectors = vectors;
  return Object.freeze({
    storage: keyword,
    keyword,
    search,
    indexProvider,
    engine,
    vectors,
    embeddingResolver,
    vectorHealth:
      activeVectors === undefined
        ? undefined
        : async (): Promise<HealthResult> => activeVectors.health(),
    dispose: async (): Promise<void> => {
      if (closeVectors !== undefined) await closeVectors();
    },
  });
}
