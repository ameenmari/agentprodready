import type { CapabilityBinding } from '@agentforge/capability-resolution';
import type { ExecutionContext } from '@agentforge/foundation';
import { ProviderAdapterError, type AiEmbeddingRequest } from '@agentforge/ai-provider';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_OPENAI_EMBEDDING_DIMENSIONS,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_ID,
  OpenAiEmbeddingAdapter,
  type OpenAiEmbeddingClient,
} from './openai-embedding-adapter.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'resolution',
  capability: 'embedding',
  capabilityContractVersion: '1',
  implementationId: 'openai-embedding',
  implementationVersion: '1',
  provider: Object.freeze({ id: 'openai', pluginId: 'openai', contributionId: 'c' }),
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
    model: Object.freeze({ id: DEFAULT_OPENAI_EMBEDDING_MODEL }),
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function vector(dimensions: number, fill = 0.1): number[] {
  return Array.from({ length: dimensions }, () => fill);
}

function mockClient(response: unknown): { client: OpenAiEmbeddingClient; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => response as never);
  return {
    create,
    client: {
      embeddings: {
        create,
      },
    },
  };
}

describe('OpenAiEmbeddingAdapter', () => {
  it('normalizes a successful embedding response', async () => {
    const dims = DEFAULT_OPENAI_EMBEDDING_DIMENSIONS;
    const { client, create } = mockClient({
      model: DEFAULT_OPENAI_EMBEDDING_MODEL,
      data: [{ index: 0, embedding: vector(dims) }],
      usage: { prompt_tokens: 4, total_tokens: 4 },
    });
    const adapter = new OpenAiEmbeddingAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, client);
    const result = await adapter.embed(baseRequest());

    expect(adapter.id).toBe(OPENAI_EMBEDDING_ID);
    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]?.id).toBe('a');
    expect(result.embeddings[0]?.dimensions).toBe(dims);
    expect(result.embeddings[0]?.vector).toHaveLength(dims);
    expect(result.usage).toEqual({ inputTokens: 4, outputTokens: 0, totalTokens: 4 });
    expect(result.model.capabilities).toContain('embedding');
    expect(result.metadata.adapter).toBe(OPENAI_EMBEDDING_ID);
    expect(create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        model: DEFAULT_OPENAI_EMBEDDING_MODEL,
        input: ['hello'],
        dimensions: dims,
      }),
    );
  });

  it('preserves batch ids and order by response index', async () => {
    const dims = 8;
    const { client } = mockClient({
      data: [
        { index: 1, embedding: vector(dims, 0.2) },
        { index: 0, embedding: vector(dims, 0.1) },
      ],
      usage: { prompt_tokens: 2, total_tokens: 2 },
    });
    const adapter = new OpenAiEmbeddingAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, client);
    const result = await adapter.embed(
      baseRequest({
        inputs: Object.freeze([
          Object.freeze({ id: 'first', text: 'one' }),
          Object.freeze({ id: 'second', text: 'two' }),
        ]),
        model: Object.freeze({ id: DEFAULT_OPENAI_EMBEDDING_MODEL, dimensions: dims }),
      }),
    );
    expect(result.embeddings.map((item) => item.id)).toEqual(['first', 'second']);
    expect(result.embeddings[0]?.vector[0]).toBe(0.1);
    expect(result.embeddings[1]?.vector[0]).toBe(0.2);
  });

  it('rejects empty inputs and empty text', async () => {
    const adapter = new OpenAiEmbeddingAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, mockClient({}).client);
    await expect(adapter.embed(baseRequest({ inputs: Object.freeze([]) }))).rejects.toMatchObject({
      kind: 'invalid-request',
    });
    await expect(
      adapter.embed(baseRequest({ inputs: Object.freeze([Object.freeze({ id: 'a', text: '' })]) })),
    ).rejects.toMatchObject({ kind: 'invalid-request' });
  });

  it('rejects malformed responses and dimension mismatches', async () => {
    const adapterWrongLen = new OpenAiEmbeddingAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      mockClient({ data: [] }).client,
    );
    await expect(adapterWrongLen.embed(baseRequest())).rejects.toBeInstanceOf(ProviderAdapterError);

    const adapterWrongDims = new OpenAiEmbeddingAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      mockClient({ data: [{ index: 0, embedding: vector(3) }] }).client,
    );
    await expect(
      adapterWrongDims.embed(
        baseRequest({ model: Object.freeze({ id: DEFAULT_OPENAI_EMBEDDING_MODEL, dimensions: 8 }) }),
      ),
    ).rejects.toMatchObject({ kind: 'invalid-request' });
  });

  it('translates vendor errors through translateError', async () => {
    const create = vi.fn(async () => {
      const error = Object.assign(new Error('rate limited'), { status: 429, code: 'rate_limit_exceeded' });
      throw error;
    });
    const adapter = new OpenAiEmbeddingAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      { embeddings: { create } },
    );
    await expect(adapter.embed(baseRequest())).rejects.toMatchObject({ kind: 'rate-limit', retryable: true });
  });

  it('reports healthy without network', async () => {
    const adapter = new OpenAiEmbeddingAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, mockClient({}).client);
    await expect(adapter.health()).resolves.toEqual({ name: OPENAI_EMBEDDING_ID, status: 'healthy' });
  });
});
