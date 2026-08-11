import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type { AiExecutionRequest } from '@agentprodready/ai-provider';
import { describe, expect, it } from 'vitest';
import { GeminiProviderAdapter, type GeminiGenerativeClient } from './gemini-ai-provider-adapter.js';
import { GEMINI_AI_ID } from './config.js';
import type { GeminiGenerateContentResponse } from './translate-response.js';
import type { GeminiGenerateContentChunk } from './translate-stream.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'resolution',
  capability: 'text-generation',
  capabilityContractVersion: '1',
  implementationId: 'gemini-ai',
  implementationVersion: '1',
  provider: Object.freeze({ id: 'gemini', pluginId: 'gemini', contributionId: 'c' }),
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

describe('GeminiProviderAdapter', () => {
  it('executes and translates text + functionCall', async () => {
    const client: GeminiGenerativeClient = {
      async generateContent() {
        return {
          model: 'gemini-2.0-flash',
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  { text: 'Calling tool' },
                  {
                    functionCall: {
                      name: 'lookup',
                      args: { id: 'T-1' },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
        };
      },
      async generateContentStream() {
        throw new Error('not used');
      },
    };

    const adapter = new GeminiProviderAdapter(
      { apiKey: 'test-key', model: 'gemini-2.0-flash' },
      client,
    );
    const result = await adapter.execute(
      baseRequest({
        tools: Object.freeze([
          Object.freeze({
            name: 'lookup',
            description: 'Lookup',
            inputSchema: Object.freeze({
              type: 'object',
              properties: Object.freeze({ id: Object.freeze({ type: 'string' }) }),
            }),
          }),
        ]),
      }),
    );

    expect(adapter.id).toBe(GEMINI_AI_ID);
    expect(result.content[0]).toEqual({ type: 'text', text: 'Calling tool' });
    expect(result.toolCalls).toEqual([
      { id: 'gemini-lookup-0', name: 'lookup', arguments: { id: 'T-1' } },
    ]);
    expect(result.finishReason).toBe('tool-calls');
    expect(result.usage.totalTokens).toBe(15);
  });

  it('streams text deltas to completion', async () => {
    async function* chunks(): AsyncGenerator<{
      readonly candidates: readonly [
        {
          readonly finishReason?: 'STOP';
          readonly content: { readonly parts: readonly { readonly text?: string }[] };
        },
      ];
      readonly usageMetadata?: {
        readonly promptTokenCount: number;
        readonly candidatesTokenCount: number;
        readonly totalTokenCount: number;
      };
    }> {
      yield {
        candidates: [{ content: { parts: [{ text: 'Hi' }] } }],
      };
      yield {
        candidates: [{ finishReason: 'STOP', content: { parts: [] } }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1, totalTokenCount: 4 },
      };
    }

    const client: GeminiGenerativeClient = {
      async generateContent() {
        throw new Error('not used');
      },
      async generateContentStream() {
        return chunks();
      },
    };

    const adapter = new GeminiProviderAdapter(
      { apiKey: 'test-key', model: 'gemini-2.0-flash' },
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
    const adapter = new GeminiProviderAdapter(
      { apiKey: 'test-key', model: 'gemini-2.0-flash' },
      {
        async generateContent(): Promise<GeminiGenerateContentResponse> {
          return {
            candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'x' }] } }],
          };
        },
        async generateContentStream(): Promise<AsyncIterable<GeminiGenerateContentChunk>> {
          throw new Error('not used');
        },
      },
    );
    await expect(adapter.health()).resolves.toEqual({ name: GEMINI_AI_ID, status: 'healthy' });
  });
});
