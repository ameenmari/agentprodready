import { describe, expect, it } from 'vitest';
import { loadOpenAiProviderConfig } from '../config.js';
import { OpenAiProviderAdapter } from '../openai-ai-provider-adapter.js';
import type { CapabilityBinding } from '@agentforge/capability-resolution';
import type { ExecutionContext } from '@agentforge/foundation';
import type { AiExecutionRequest } from '@agentforge/ai-provider';

const live = process.env['AI_LIVE_TESTS'] === '1';

describe.skipIf(!live)('openai live', () => {
  it('completes a small text-generation request', async () => {
    const config = loadOpenAiProviderConfig(process.env);
    const adapter = new OpenAiProviderAdapter(config);
    const binding: CapabilityBinding = Object.freeze({
      bindingId: 'live-b',
      requestId: 'live-r',
      capability: 'text-generation',
      capabilityContractVersion: '1',
      implementationId: 'openai-ai',
      implementationVersion: '1',
      provider: Object.freeze({ id: 'openai', pluginId: 'openai', contributionId: 'c' }),
      source: 'default',
      diagnosticId: 'live',
    });
    const context: ExecutionContext = Object.freeze({
      executionId: 'live-e',
      correlationId: 'live-c',
      startedAt: new Date().toISOString(),
      configurationVersion: 'v',
      securityContextId: 's',
      attributes: Object.freeze({}),
    });
    const request: AiExecutionRequest = Object.freeze({
      requestId: 'live-req',
      binding,
      context,
      messages: Object.freeze([
        Object.freeze({
          role: 'user' as const,
          content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'Reply with exactly: pong' })]),
        }),
      ]),
      generation: Object.freeze({ maximumOutputTokens: 32 }),
      metadata: Object.freeze({}),
      constraints: Object.freeze({}),
    });

    const result = await adapter.execute(request);
    const text = result.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
    expect(text.trim().length).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBe(result.usage.inputTokens + result.usage.outputTokens);
    expect(result.metadata.adapter).toBe('openai-ai');
  }, 60_000);
});
