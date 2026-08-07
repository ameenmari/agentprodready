import type { CapabilityBinding } from '@agentforge/capability-resolution';
import type { ExecutionContext } from '@agentforge/foundation';
import { ProviderAdapterError, type AiExecutionRequest } from '@agentforge/ai-provider';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OPENAI_MODEL, loadOpenAiProviderConfig } from './config.js';
import { OpenAiProviderAdapter, type OpenAiChatClient } from './openai-ai-provider-adapter.js';
import { translateError } from './translate-error.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'resolution',
  capability: 'text-generation',
  capabilityContractVersion: '1',
  implementationId: 'openai-ai',
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

function baseRequest(overrides: Partial<AiExecutionRequest> = {}): AiExecutionRequest {
  return Object.freeze({
    requestId: 'r1',
    binding,
    context,
    messages: Object.freeze([
      Object.freeze({
        role: 'user' as const,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'hello' })]),
      }),
    ]),
    generation: Object.freeze({ maximumOutputTokens: 32 }),
    metadata: Object.freeze({}),
    constraints: Object.freeze({}),
    ...overrides,
  });
}

function mockClient(response: unknown): { client: OpenAiChatClient; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => response as never);
  return {
    create,
    client: {
      chat: {
        completions: {
          create,
        },
      },
    },
  };
}

describe('OpenAiProviderAdapter', () => {
  it('normalizes a successful chat completion', async () => {
    const { client, create } = mockClient({
      model: 'gpt-5',
      choices: [{ finish_reason: 'stop', message: { content: 'world', role: 'assistant' } }],
      usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
    });
    const adapter = new OpenAiProviderAdapter(
      { apiKey: 'sk-test', model: DEFAULT_OPENAI_MODEL },
      client,
    );
    const result = await adapter.execute(baseRequest());
    expect(result.content).toEqual([{ type: 'text', text: 'world' }]);
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 1, totalTokens: 4 });
    expect(result.finishReason).toBe('completed');
    expect(result.model.id).toBe('gpt-5');
    expect(result.metadata.adapter).toBe('openai-ai');
    expect(create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        model: 'gpt-5',
        max_completion_tokens: 32,
        messages: [{ role: 'user', content: 'hello' }],
      }),
    );
  });

  it('rejects tools and streaming', async () => {
    const adapter = new OpenAiProviderAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, mockClient({}).client);
    await expect(
      adapter.execute(
        baseRequest({
          tools: Object.freeze([{ name: 'lookup', description: 'x', inputSchema: Object.freeze({}) }]),
        }),
      ),
    ).rejects.toMatchObject({ kind: 'invalid-request' });
    const iterator = adapter.stream(baseRequest())[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toBeInstanceOf(ProviderAdapterError);
  });

  it('parses structured JSON output', async () => {
    const adapter = new OpenAiProviderAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      mockClient({
        choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }).client,
    );
    const result = await adapter.execute(
      baseRequest({
        structuredOutput: Object.freeze({ name: 'answer', schema: Object.freeze({ type: 'object' }), strict: true }),
      }),
    );
    expect(result.structuredOutput).toEqual({ ok: true });
  });

  it('maps content_filter finish reason', async () => {
    const adapter = new OpenAiProviderAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      mockClient({
        choices: [{ finish_reason: 'content_filter', message: { content: '' } }],
        usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
      }).client,
    );
    const result = await adapter.execute(baseRequest());
    expect(result.finishReason).toBe('content-filtered');
  });

  it('reports healthy without network', async () => {
    const adapter = new OpenAiProviderAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, mockClient({}).client);
    await expect(adapter.health()).resolves.toEqual({ name: 'openai-ai', status: 'healthy' });
  });
});

describe('translateError', () => {
  it.each([
    [{ status: 401, message: 'bad key' }, 'authentication', false],
    [{ status: 429, code: 'rate_limit_exceeded', message: 'slow down' }, 'rate-limit', true],
    [{ status: 429, code: 'insufficient_quota', message: 'quota' }, 'rate-limit', false],
    [{ status: 429, message: 'You have no credits remaining' }, 'rate-limit', false],
    [{ status: 400, code: 'context_length_exceeded', message: 'too long' }, 'context-limit', false],
    [{ status: 404, message: 'model not found' }, 'invalid-request', false],
    [{ status: 503, message: 'down' }, 'unavailable', true],
    [{ status: 408, message: 'timed out' }, 'timeout', true],
  ] as const)('maps %#', (error, kind, retryable) => {
    const mapped = translateError(error);
    expect(mapped.kind).toBe(kind);
    expect(mapped.retryable).toBe(retryable);
    expect(mapped.message).not.toMatch(/sk-/);
  });

  it('redacts api keys in messages', () => {
    const mapped = translateError({ status: 401, message: 'invalid sk-abc123xyz' });
    expect(mapped.message).toContain('[redacted]');
    expect(mapped.message).not.toContain('sk-abc123xyz');
  });
});

describe('loadOpenAiProviderConfig', () => {
  it('defaults model to gpt-5 and requires api key', () => {
    expect(() => loadOpenAiProviderConfig({})).toThrow(/OPENAI_API_KEY/);
    const config = loadOpenAiProviderConfig({ OPENAI_API_KEY: 'sk-test' });
    expect(config.model).toBe('gpt-5');
    expect(config.apiKey).toBe('sk-test');
  });

  it('validates base URL', () => {
    expect(() =>
      loadOpenAiProviderConfig({ OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'not-a-url' }),
    ).toThrow(/OPENAI_BASE_URL/);
  });
});
