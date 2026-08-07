/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { CapabilityBinding } from '@agentforge/capability-resolution';
import type { ExecutionContext } from '@agentforge/foundation';
import { describe, expect, it, vi } from 'vitest';
import {
  AiProviderFramework,
  FactoryAiAdapterResolver,
  InMemoryAiDiagnostics,
  InMemoryAiEvents,
  ProviderAdapterError,
  ReferenceAiProviderAdapter,
  referenceStreamChunks,
  type AiExecutionRequest,
  type AiProviderAdapter,
  type NormalizedAiStreamEvent,
} from '../index.js';

const binding: CapabilityBinding = Object.freeze({
  bindingId: 'b',
  requestId: 'resolution',
  capability: 'chat',
  capabilityContractVersion: '1',
  implementationId: 'reference',
  implementationVersion: '1',
  provider: Object.freeze({ id: 'p', pluginId: 'plugin', contributionId: 'c' }),
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

function baseRequest(text: string, signal?: AbortSignal): AiExecutionRequest {
  return Object.freeze({
    requestId: 'r',
    binding,
    context,
    messages: Object.freeze([
      { role: 'user' as const, content: Object.freeze([{ type: 'text' as const, text }]) },
    ]),
    generation: Object.freeze({ maximumOutputTokens: 10 }),
    streaming: Object.freeze({ enabled: true, includeUsage: true }),
    metadata: Object.freeze({}),
    constraints: Object.freeze({}),
    ...(signal === undefined ? {} : { signal }),
  });
}

function fixture(adapter: AiProviderAdapter = new ReferenceAiProviderAdapter()) {
  const resolver = new FactoryAiAdapterResolver();
  resolver.bind('reference', async () => adapter);
  const diagnostics = new InMemoryAiDiagnostics();
  const events = new InMemoryAiEvents();
  const telemetry = { completed: vi.fn(), failed: vi.fn(), streamed: vi.fn() };
  return {
    framework: new AiProviderFramework(resolver, diagnostics, events, telemetry),
    diagnostics,
    events,
    telemetry,
  };
}

async function collect(stream: AsyncIterable<NormalizedAiStreamEvent>): Promise<NormalizedAiStreamEvent[]> {
  const events: NormalizedAiStreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe('referenceStreamChunks', () => {
  it('splits whitespace-preserving chunks', () => {
    expect(referenceStreamChunks('hello agentforge')).toEqual(['hello', ' ', 'agentforge']);
  });
});

describe('AI streaming terminals', () => {
  it('emits ordered reference chunks and one completed terminal', async () => {
    const events = await collect(fixture().framework.stream(baseRequest('hello agentforge')));
    expect(events.map((e) => e.type)).toEqual(['content', 'content', 'content', 'usage', 'completed']);
    expect(
      events.flatMap((e) => (e.type === 'content' ? [e.part] : [])),
    ).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'agentforge' },
    ]);
    expect(events.at(-1)?.type).toBe('completed');
    expect(events.filter((e) => e.type === 'completed' || e.type === 'failed' || e.type === 'cancelled')).toHaveLength(1);
  });

  it('emits cancelled only without throw when signal aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const f = fixture();
    const events = await collect(f.framework.stream(baseRequest('hello agentforge', controller.signal)));
    expect(events.map((e) => e.type)).toEqual(['cancelled']);
    expect(f.events.facts.some((fact) => fact.type === 'ai.stream.cancelled')).toBe(true);
  });

  it('maps unexpected throw before terminal to one failed event without rethrow', async () => {
    const adapter: AiProviderAdapter = {
      id: 'boom',
      execute: async () => {
        throw new Error('unused');
      },
      stream: async function* () {
        yield { type: 'content', sequence: 0, part: { type: 'text', text: 'a' } };
        throw new ProviderAdapterError('unavailable', 'provider down', true);
      },
      health: async () => ({ name: 'boom', status: 'unhealthy' }),
    };
    const f = fixture(adapter);
    const events = await collect(f.framework.stream(baseRequest('a')));
    expect(events.map((e) => e.type)).toEqual(['content', 'failed']);
    expect(events.at(-1)).toMatchObject({ type: 'failed', code: 'AI_UNAVAILABLE' });
    expect(f.events.facts.filter((fact) => fact.type === 'ai.stream.failed')).toHaveLength(1);
  });

  it('does not emit after adapter terminal failed', async () => {
    const adapter: AiProviderAdapter = {
      id: 'term',
      execute: async () => {
        throw new Error('unused');
      },
      stream: async function* () {
        yield {
          type: 'failed',
          sequence: 0,
          code: 'AI_RATE_LIMITED',
          message: 'slow down',
          diagnosticId: 'ai:r',
          retryable: true,
        };
        yield { type: 'content', sequence: 1, part: { type: 'text', text: 'late' } };
      },
      health: async () => ({ name: 'term', status: 'healthy' }),
    };
    const events = await collect(fixture(adapter).framework.stream(baseRequest('x')));
    expect(events.map((e) => e.type)).toEqual(['failed']);
  });

  it('fail-closes non-contiguous sequences as one failed terminal', async () => {
    const adapter: AiProviderAdapter = {
      id: 'gap',
      execute: async () => {
        throw new Error('unused');
      },
      stream: async function* () {
        yield { type: 'content', sequence: 0, part: { type: 'text', text: 'a' } };
        yield { type: 'content', sequence: 2, part: { type: 'text', text: 'b' } };
      },
      health: async () => ({ name: 'gap', status: 'healthy' }),
    };
    const events = await collect(fixture(adapter).framework.stream(baseRequest('a')));
    expect(events.map((e) => e.type)).toEqual(['content', 'failed']);
    expect(events.at(-1)).toMatchObject({ type: 'failed', code: 'AI_INVALID_REQUEST' });
  });

  it('rejects two terminal events by ending after the first', async () => {
    const adapter: AiProviderAdapter = {
      id: 'two',
      execute: async () => {
        throw new Error('unused');
      },
      stream: async function* () {
        yield { type: 'completed', sequence: 0, finishReason: 'completed', diagnosticId: 'ai:r' };
        yield { type: 'failed', sequence: 1, code: 'AI_UNKNOWN', message: 'x', diagnosticId: 'ai:r', retryable: false };
      },
      health: async () => ({ name: 'two', status: 'healthy' }),
    };
    const events = await collect(fixture(adapter).framework.stream(baseRequest('a')));
    expect(events.map((e) => e.type)).toEqual(['completed']);
  });
});
