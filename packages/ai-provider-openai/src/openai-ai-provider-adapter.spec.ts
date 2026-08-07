import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type { AiExecutionRequest } from '@agentprodready/ai-provider';
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

  it('translates tools on execute and returns normalized tool calls', async () => {
    const { client, create } = mockClient({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'lookup', arguments: '{"q":"a"}' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    const adapter = new OpenAiProviderAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, client);
    const result = await adapter.execute(
      baseRequest({
        tools: Object.freeze([{ name: 'lookup', description: 'x', inputSchema: Object.freeze({ type: 'object' }) }]),
      }),
    );
    expect(result.finishReason).toBe('tool-calls');
    expect(result.toolCalls).toEqual([{ id: 'call_1', name: 'lookup', arguments: { q: 'a' } }]);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      tools: [{ type: 'function', function: { name: 'lookup' } }],
    });
  });

  it('translates normalized continuation assistant toolCalls and tool messages', async () => {
    const { client, create } = mockClient({
      choices: [{ finish_reason: 'stop', message: { content: 'done', role: 'assistant' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    const adapter = new OpenAiProviderAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, client);
    await adapter.execute(
      baseRequest({
        messages: Object.freeze([
          Object.freeze({
            role: 'user' as const,
            content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'hi' })]),
          }),
          Object.freeze({
            role: 'assistant' as const,
            content: Object.freeze([]),
            toolCalls: Object.freeze([
              Object.freeze({ id: 'call_1', name: 'lookup', arguments: Object.freeze({ q: 'a' }) }),
            ]),
          }),
          Object.freeze({
            role: 'tool' as const,
            toolCallId: 'call_1',
            name: 'lookup',
            content: Object.freeze([Object.freeze({ type: 'text' as const, text: '{"ok":true}' })]),
          }),
        ]),
      }),
    );
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      messages: [
        { role: 'user', content: 'hi' },
        {
          role: 'assistant',
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'lookup', arguments: '{"q":"a"}' } }],
        },
        { role: 'tool', tool_call_id: 'call_1', content: '{"ok":true}' },
      ],
    });
  });

  it('assembles streamed tool-call fragments into one NormalizedToolCall', async () => {
    async function* chunks(): AsyncGenerator<{
      choices?: {
        delta?: {
          tool_calls?: readonly {
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
        finish_reason?: string | null;
      }[];
    }> {
      yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'look' } }] } }] };
      yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'up', arguments: '{"q"' } }] } }] };
      yield {
        choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"a"}' } }] }, finish_reason: 'tool_calls' }],
      };
    }
    const create = vi.fn(async () => chunks());
    const adapter = new OpenAiProviderAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      { chat: { completions: { create } } },
    );
    const events = [];
    for await (const event of adapter.stream(
      baseRequest({
        streaming: Object.freeze({ enabled: true, includeUsage: false }),
        tools: Object.freeze([{ name: 'lookup', description: 'x', inputSchema: Object.freeze({ type: 'object' }) }]),
      }),
    )) {
      events.push(event);
    }
    expect(events.map((e) => e.type)).toEqual(['tool-call', 'completed']);
    expect(events[0]).toMatchObject({
      type: 'tool-call',
      call: { id: 'call_1', name: 'lookup', arguments: { q: 'a' } },
    });
  });

  it('fails closed once on incomplete streamed tool call at terminal', async () => {
    async function* chunks(): AsyncGenerator<{
      choices?: {
        delta?: { tool_calls?: readonly { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] };
        finish_reason?: string | null;
      }[];
    }> {
      yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'lookup', arguments: '{"q"' } }] } }] };
      yield { choices: [{ delta: {}, finish_reason: 'tool_calls' }] };
    }
    const create = vi.fn(async () => chunks());
    const adapter = new OpenAiProviderAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      { chat: { completions: { create } } },
    );
    const events = [];
    for await (const event of adapter.stream(
      baseRequest({ streaming: Object.freeze({ enabled: true, includeUsage: false }) }),
    )) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'failed', code: 'AI_INVALID_REQUEST' });
  });

  it('streams normalized deltas from mock OpenAI chunks', async () => {
    async function* chunks(): AsyncGenerator<{
      choices?: { delta?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }> {
      yield { choices: [{ delta: { content: 'hel' } }] };
      yield { choices: [{ delta: { content: 'lo' }, finish_reason: 'stop' }] };
      yield { usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } };
    }
    const create = vi.fn(async () => chunks());
    const adapter = new OpenAiProviderAdapter(
      { apiKey: 'sk-test', model: 'gpt-5' },
      { chat: { completions: { create } } },
    );
    const events = [];
    for await (const event of adapter.stream(
      baseRequest({ streaming: Object.freeze({ enabled: true, includeUsage: true }) }),
    )) {
      events.push(event);
    }
    expect(events.map((e) => e.type)).toEqual(['content', 'content', 'usage', 'completed']);
    const firstCall = create.mock.calls[0] as unknown as [{ stream?: boolean }] | undefined;
    expect(firstCall?.[0]).toEqual(expect.objectContaining({ stream: true }));
  });

  it('cancels stream when signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = new OpenAiProviderAdapter({ apiKey: 'sk-test', model: 'gpt-5' }, mockClient({}).client);
    const events = [];
    for await (const event of adapter.stream(
      baseRequest({
        streaming: Object.freeze({ enabled: true, includeUsage: false }),
        signal: controller.signal,
      }),
    )) {
      events.push(event);
    }
    expect(events).toEqual([{ type: 'cancelled', sequence: 0, diagnosticId: 'ai:r1' }]);
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

  it('rejects link-local and metadata hosts when NODE_ENV=production', () => {
    expect(() =>
      loadOpenAiProviderConfig({
        NODE_ENV: 'production',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'http://169.254.169.254/latest/meta-data',
      }),
    ).toThrow(/not permitted/);
    expect(() =>
      loadOpenAiProviderConfig({
        NODE_ENV: 'production',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'http://metadata.google.internal/',
      }),
    ).toThrow(/not permitted/);
    const ok = loadOpenAiProviderConfig({
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'sk-test',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
    });
    expect(ok.baseUrl).toBe('https://api.openai.com/v1');
  });
});
