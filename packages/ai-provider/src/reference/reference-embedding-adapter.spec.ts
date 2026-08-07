import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import { describe, expect, it } from 'vitest';
import { ProviderAdapterError, type AiEmbeddingRequest } from '../index.js';
import {
  FactoryAiEmbeddingAdapterResolver,
  REFERENCE_EMBEDDING_DIMENSIONS,
  REFERENCE_EMBEDDING_ID,
  REFERENCE_EMBEDDING_MODEL_ID,
  ReferenceEmbeddingAdapter,
} from './reference-embedding-adapter.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'resolution',
  capability: 'embedding',
  capabilityContractVersion: '1',
  implementationId: 'reference-embedding',
  implementationVersion: '1',
  provider: Object.freeze({ id: 'reference', pluginId: 'reference', contributionId: 'c' }),
  source: 'default',
  diagnosticId: 'resolution:r',
});

const context: ExecutionContext = Object.freeze({
  executionId: 'e',
  correlationId: 'c',
  startedAt: 'x',
  configurationVersion: 'v',
  securityContextId: 's',
  attributes: Object.freeze({}),
});

function baseRequest(overrides: Partial<AiEmbeddingRequest> = {}): AiEmbeddingRequest {
  return Object.freeze({
    requestId: 'r1',
    binding,
    context,
    inputs: Object.freeze([Object.freeze({ id: 'a', text: 'hello' })]),
    model: Object.freeze({ id: REFERENCE_EMBEDDING_MODEL_ID }),
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function assertUnitVector(vector: readonly number[]): void {
  expect(vector).toHaveLength(REFERENCE_EMBEDDING_DIMENSIONS);
  let sumSquares = 0;
  for (const value of vector) {
    expect(Number.isFinite(value)).toBe(true);
    expect(Number.isNaN(value)).toBe(false);
    sumSquares += value * value;
  }
  expect(Math.abs(Math.sqrt(sumSquares) - 1)).toBeLessThan(1e-9);
}

describe('ReferenceEmbeddingAdapter', () => {
  const adapter = new ReferenceEmbeddingAdapter();

  it('has stable reference identity and healthy status', async () => {
    expect(adapter.id).toBe(REFERENCE_EMBEDDING_ID);
    await expect(adapter.health()).resolves.toEqual({ name: REFERENCE_EMBEDDING_ID, status: 'healthy' });
  });

  it('produces stable L2-normalized 32-d vectors for the same text and model', async () => {
    const first = await adapter.embed(baseRequest());
    const second = await adapter.embed(baseRequest());
    expect(first.embeddings[0]?.vector).toEqual(second.embeddings[0]?.vector);
    const firstVector = first.embeddings[0]?.vector;
    expect(firstVector).toBeDefined();
    if (firstVector !== undefined) assertUnitVector(firstVector);
    expect(first.embeddings[0]?.dimensions).toBe(REFERENCE_EMBEDDING_DIMENSIONS);
    expect(first.model.id).toBe(REFERENCE_EMBEDDING_MODEL_ID);
    expect(first.model.capabilities).toContain('embedding');
  });

  it('changes vector when text or model id changes', async () => {
    const base = await adapter.embed(baseRequest());
    const otherText = await adapter.embed(baseRequest({ inputs: Object.freeze([Object.freeze({ id: 'a', text: 'world' })]) }));
    const otherModel = await adapter.embed(
      baseRequest({ model: Object.freeze({ id: 'reference-embedding-alt' }) }),
    );
    expect(otherText.embeddings[0]?.vector).not.toEqual(base.embeddings[0]?.vector);
    expect(otherModel.embeddings[0]?.vector).not.toEqual(base.embeddings[0]?.vector);
  });

  it('supports batches and preserves input ids', async () => {
    const result = await adapter.embed(
      baseRequest({
        inputs: Object.freeze([
          Object.freeze({ id: 'one', text: 'alpha' }),
          Object.freeze({ id: 'two', text: 'beta' }),
        ]),
      }),
    );
    expect(result.embeddings.map((item) => item.id)).toEqual(['one', 'two']);
    expect(result.embeddings).toHaveLength(2);
    const v0 = result.embeddings[0]?.vector;
    const v1 = result.embeddings[1]?.vector;
    expect(v0).toBeDefined();
    expect(v1).toBeDefined();
    if (v0 !== undefined) assertUnitVector(v0);
    if (v1 !== undefined) assertUnitVector(v1);
    expect(v0).not.toEqual(v1);
  });

  it('rejects empty inputs', async () => {
    await expect(adapter.embed(baseRequest({ inputs: Object.freeze([]) }))).rejects.toBeInstanceOf(ProviderAdapterError);
    await expect(adapter.embed(baseRequest({ inputs: Object.freeze([]) }))).rejects.toMatchObject({
      kind: 'invalid-request',
    });
  });

  it('rejects empty text on any input', async () => {
    await expect(
      adapter.embed(
        baseRequest({
          inputs: Object.freeze([
            Object.freeze({ id: 'ok', text: 'x' }),
            Object.freeze({ id: 'bad', text: '' }),
          ]),
        }),
      ),
    ).rejects.toMatchObject({ kind: 'invalid-request' });
  });

  it('rejects non-32 requested dimensions', async () => {
    await expect(
      adapter.embed(baseRequest({ model: Object.freeze({ id: REFERENCE_EMBEDDING_MODEL_ID, dimensions: 16 }) })),
    ).rejects.toMatchObject({ kind: 'invalid-request' });
  });

  it('accepts explicit dimensions of 32', async () => {
    const result = await adapter.embed(
      baseRequest({ model: Object.freeze({ id: REFERENCE_EMBEDDING_MODEL_ID, dimensions: 32 }) }),
    );
    expect(result.embeddings[0]?.dimensions).toBe(32);
  });
});

describe('FactoryAiEmbeddingAdapterResolver', () => {
  it('resolves bound embedding adapters by implementation id', async () => {
    const resolver = new FactoryAiEmbeddingAdapterResolver();
    const adapter = new ReferenceEmbeddingAdapter();
    resolver.bind('reference-embedding', async () => adapter);
    await expect(resolver.resolve(binding)).resolves.toBe(adapter);
  });

  it('throws when no factory is bound', async () => {
    const resolver = new FactoryAiEmbeddingAdapterResolver();
    await expect(resolver.resolve(binding)).rejects.toThrow(/No Composition embedding adapter binding/);
  });
});
