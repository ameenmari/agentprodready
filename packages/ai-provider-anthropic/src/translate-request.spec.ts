import type { CapabilityBinding } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type { AiExecutionRequest } from '@agentprodready/ai-provider';
import { describe, expect, it } from 'vitest';
import { translateRequest } from './translate-request.js';
import type { AnthropicProviderConfig } from './config.js';

const config: AnthropicProviderConfig = Object.freeze({
  apiKey: 'test',
  model: 'claude-sonnet-4-20250514',
  defaultMaxTokens: 4096,
});

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
        role: 'user' as const,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'hello' })]),
      }),
    ]),
    generation: Object.freeze({}),
    metadata: Object.freeze({}),
    constraints: Object.freeze({}),
    ...overrides,
  });
}

describe('translateRequest max output tokens', () => {
  it('falls back to provider defaultMaxTokens when maximumOutputTokens is undefined', () => {
    const body = translateRequest(
      baseRequest(),
      config,
    );
    expect(body.max_tokens).toBe(4096);
  });

  it('maps maximumOutputTokens to max_tokens', () => {
    const body = translateRequest(
      baseRequest({ generation: Object.freeze({ maximumOutputTokens: 1800 }) }),
      config,
    );
    expect(body.max_tokens).toBe(1800);
  });
});
