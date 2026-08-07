import type {
  AiEmbeddingAdapterResolver,
  AiEmbeddingRequest,
} from '@agentprodready/ai-provider';
import { ProviderAdapterError } from '@agentprodready/ai-provider';
import type { CapabilityBinding, CapabilityResolver } from '@agentprodready/capability-resolution';
import type { ExecutionContext, HealthResult } from '@agentprodready/foundation';
import type { VectorStorePort } from '@agentprodready/vector-store';
import { VectorStoreError } from '@agentprodready/vector-store';
import { ExternalMemoryError } from './memory-errors.js';
import type {
  IndexableMemoryRecord,
  MemoryIndexProvider,
  MemoryIndexRemoveReason,
} from './memory-index-provider.js';

export interface VectorMemoryIndexProviderOptions {
  readonly vectors: VectorStorePort;
  readonly capabilityResolver: CapabilityResolver;
  readonly embeddingResolver: AiEmbeddingAdapterResolver;
  readonly embeddingModelId: string;
  readonly embeddingDimensions: number;
  /** Labels that must not be embedded; default empty. */
  readonly sensitiveLabels?: readonly string[];
  readonly now?: () => Date;
}

export class VectorMemoryIndexProvider implements MemoryIndexProvider {
  readonly #vectors: VectorStorePort;
  readonly #capabilities: CapabilityResolver;
  readonly #embeddings: AiEmbeddingAdapterResolver;
  readonly #modelId: string;
  readonly #dimensions: number;
  readonly #sensitive: ReadonlySet<string>;
  readonly #now: () => Date;

  public constructor(options: VectorMemoryIndexProviderOptions) {
    this.#vectors = options.vectors;
    this.#capabilities = options.capabilityResolver;
    this.#embeddings = options.embeddingResolver;
    this.#modelId = options.embeddingModelId;
    this.#dimensions = options.embeddingDimensions;
    this.#sensitive = new Set(options.sensitiveLabels ?? []);
    this.#now = options.now ?? ((): Date => new Date());
  }

  public async index(record: IndexableMemoryRecord, context: ExecutionContext): Promise<void> {
    if (record.securityLabels.some((label) => this.#sensitive.has(label))) {
      throw new ExternalMemoryError('index-unavailable', 'Memory marked sensitive; embedding refused');
    }
    const text = serializeEmbeddable(record.content);
    if (text.trim() === '') {
      throw new ExternalMemoryError('index-unavailable', 'Memory content is not embeddable');
    }

    try {
      const binding = await this.#resolveEmbeddingBinding(context, `memory-index:${record.id}`);
      const adapter = await this.#embeddings.resolve(binding);
      const request: AiEmbeddingRequest = {
        requestId: `embed-index:${record.id}:${String(record.lifecycleVersion)}`,
        binding,
        context,
        inputs: Object.freeze([{ id: record.id, text }]),
        model: Object.freeze({ id: this.#modelId, dimensions: this.#dimensions }),
        metadata: Object.freeze({ operation: 'memory-index' }),
      };
      const result = await adapter.embed(request);
      const embedding = result.embeddings[0];
      if (embedding === undefined || embedding.dimensions !== this.#dimensions) {
        throw new ExternalMemoryError('index-unavailable', 'Embedding result dimension mismatch');
      }
      const timestamp = this.#now().toISOString();
      await this.#vectors.upsert({
        record: {
          memoryId: record.id,
          tenantId: record.ownership.tenantId,
          vector: embedding.vector,
          dimensions: embedding.dimensions,
          embeddingModelId: this.#modelId,
          contentVersion: record.version,
          lifecycleVersion: record.lifecycleVersion,
          createdAt: timestamp,
          updatedAt: timestamp,
          metadata: Object.freeze({}),
        },
      });
    } catch (error) {
      throw mapIndexError(error);
    }
  }

  public async remove(
    memoryId: string,
    tenantId: string,
    _context: ExecutionContext,
    _reason: MemoryIndexRemoveReason,
  ): Promise<void> {
    try {
      await this.#vectors.remove({ memoryId, tenantId });
    } catch (error) {
      throw mapIndexError(error);
    }
  }

  public async health(): Promise<HealthResult> {
    return this.#vectors.health();
  }

  async #resolveEmbeddingBinding(context: ExecutionContext, requestId: string): Promise<CapabilityBinding> {
    return this.#capabilities.resolve({
      requestId,
      capability: 'embedding',
      context,
      node: {
        workflowId: 'memory',
        nodeId: 'embed',
        kind: 'capability',
        capability: 'embedding',
      },
      constraints: Object.freeze({}),
    });
  }
}

function serializeEmbeddable(content: unknown): string {
  return JSON.stringify(content);
}

function mapIndexError(error: unknown): ExternalMemoryError {
  if (error instanceof ExternalMemoryError) return error;
  if (error instanceof ProviderAdapterError) {
    return new ExternalMemoryError('index-unavailable', error.message);
  }
  if (error instanceof VectorStoreError) {
    return new ExternalMemoryError('index-unavailable', error.message);
  }
  if (error instanceof Error) {
    return new ExternalMemoryError('index-unavailable', error.message);
  }
  return new ExternalMemoryError('index-unavailable', 'Memory index operation failed');
}
