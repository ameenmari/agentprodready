import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type { AiExecutionRequest } from '@agentprodready/ai-provider';
import { describe, expect, it } from 'vitest';
import { AnthropicProviderAdapter, type AnthropicMessagesClient } from './anthropic-ai-provider-adapter.js';
import { ANTHROPIC_AI_ID } from './config.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'resolution',
  capability: 'text-generation',
  capabilityContractVersion: '1',
  implementationId: 'anthropic-ai',
  implementationVersion: '1',
  provider: Object.freeze({ id: 'anthropic', pluginId: 'anthropic', contributionId: 'c' }),
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
        role: 'system' as const,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'Be brief.' })]),
      }),
      Object.freeze({
        role: 'user' as const,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'Hello' })]),
      }),
    ]),
    generation: Object.freeze({ maximumOutputTokens: 32 }),
    metadata: Object.freeze({}),
    constraints: Object.freeze({}),
    ...overrides,
  });
}

describe('AnthropicProviderAdapter', () => {
  it('executes and translates text + tool_use', async () => {
    const client: AnthropicMessagesClient = {
      messages: {
        async create() {
          return {
            model: 'claude-sonnet-4-20250514',
            stop_reason: 'tool_use',
            content: [
              { type: 'text', text: 'Calling tool' },
              {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'lookup',
                input: { id: 'T-1' },
              },
            ],
            usage: { input_tokens: 10, output_tokens: 5 },
          };
        },
      },
    };

    const adapter = new AnthropicProviderAdapter(
      { apiKey: 'sk-ant-test', model: 'claude-sonnet-4-20250514' },
      client,
    );
    const result = await adapter.execute(
      baseRequest({
        tools: Object.freeze([
          Object.freeze({
            name: 'lookup',
            description: 'Lookup',
            inputSchema: Object.freeze({ type: 'object', properties: Object.freeze({ id: Object.freeze({ type: 'string' }) }) }),
          }),
        ]),
      }),
    );

    expect(adapter.id).toBe(ANTHROPIC_AI_ID);
    expect(result.content[0]).toEqual({ type: 'text', text: 'Calling tool' });
    expect(result.toolCalls).toEqual([
      { id: 'toolu_1', name: 'lookup', arguments: { id: 'T-1' } },
    ]);
    expect(result.finishReason).toBe('tool-calls');
    expect(result.usage.totalTokens).toBe(15);
  });

  it('streams text deltas to completion', async () => {
    async function* events(): AsyncGenerator<
      | { readonly type: 'message_start'; readonly message: { readonly usage: { readonly input_tokens: number } } }
      | { readonly type: 'content_block_delta'; readonly delta: { readonly type: 'text_delta'; readonly text: string } }
      | {
          readonly type: 'message_delta';
          readonly delta: { readonly stop_reason: 'end_turn' };
          readonly usage: { readonly output_tokens: number };
        }
      | { readonly type: 'message_stop' }
    > {
      yield { type: 'message_start', message: { usage: { input_tokens: 3 } } };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hi' },
      };
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 1 },
      };
      yield { type: 'message_stop' };
    }

    const client: AnthropicMessagesClient = {
      messages: {
        async create(): Promise<AsyncIterable<never>> {
          return events() as AsyncIterable<never>;
        },
      },
    };

    const adapter = new AnthropicProviderAdapter(
      { apiKey: 'sk-ant-test', model: 'claude-sonnet-4-20250514' },
      client,
    );

    const collected: string[] = [];
    for await (const event of adapter.stream(
      baseRequest({ streaming: Object.freeze({ enabled: true, includeUsage: true }) }),
    )) {
      if (event.type === 'content' && event.part.type === 'text') collected.push(event.part.text);
      if (event.type === 'completed') expect(event.finishReason).toBe('completed');
    }
    expect(collected.join('')).toBe('Hi');
  });

  it('reports healthy', async () => {
    const adapter = new AnthropicProviderAdapter(
      { apiKey: 'sk-ant-test', model: 'claude-sonnet-4-20250514' },
      {
        messages: {
          async create(): Promise<{
            readonly content: readonly [{ readonly type: 'text'; readonly text: string }];
            readonly stop_reason: 'end_turn';
          }> {
            return { content: [{ type: 'text', text: 'x' }], stop_reason: 'end_turn' };
          },
        },
      },
    );
    await expect(adapter.health()).resolves.toEqual({ name: ANTHROPIC_AI_ID, status: 'healthy' });
  });
});
