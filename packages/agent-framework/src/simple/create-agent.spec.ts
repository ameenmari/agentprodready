import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgent, openai, reference, SimpleAgentError } from './index.js';

afterEach(async () => {
  vi.unstubAllEnvs();
});

describe('simple model helpers', () => {
  it('builds reference and openai descriptors', () => {
    expect(reference()).toEqual({ provider: 'reference', modelId: 'reference' });
    expect(openai('gpt-4o-mini')).toEqual({ provider: 'openai', modelId: 'gpt-4o-mini' });
  });

  it('rejects empty openai model ids', () => {
    expect(() => openai('')).toThrow(SimpleAgentError);
    try {
      openai('   ');
    } catch (error) {
      expect(error).toMatchObject({ code: 'AGENT_INVALID_MODEL' });
    }
  });
});

describe('createAgent validation', () => {
  it('rejects invalid instructions and unknown fields', () => {
    expect(() =>
      createAgent({ model: reference(), instructions: '   ' }),
    ).toThrowError(/instructions/);
    expect(() =>
      createAgent({ model: reference(), instructions: 'ok', tools: [] } as never),
    ).toThrowError(/Unknown createAgent option/);
    expect(() => createAgent({ model: { provider: 'x' } as never, instructions: 'ok' })).toThrow(
      SimpleAgentError,
    );
  });
});

describe('createAgent reference path', () => {
  it('invokes and returns result.text from the reference provider', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are a helpful assistant.',
      name: 'demo',
    });
    try {
      const result = await agent.invoke('Hello');
      expect(result.text).toBe('Hello');
      expect(result.executionId).toMatch(/^execution:/);
      expect(result.metadata).toMatchObject({ mode: 'simple' });
      expect(result.raw).toBeDefined();
      const output = result.output as { promptPackageId?: string; aiResult?: { metadata?: { promptPackageId?: string } } };
      expect(typeof output.promptPackageId).toBe('string');
      expect(output.promptPackageId?.startsWith('prompt:')).toBe(true);
    } finally {
      await agent.close();
    }
  });

  it('streams text events and completes', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
    });
    try {
      const events = [];
      for await (const event of agent.stream('Hi')) {
        events.push(event);
      }
      expect(events[0]).toMatchObject({ type: 'start' });
      expect(events.some((event) => event.type === 'text')).toBe(true);
      expect(events.at(-1)).toMatchObject({ type: 'complete' });
      const text = events
        .filter((event): event is { type: 'text'; text: string } => event.type === 'text')
        .map((event) => event.text)
        .join('');
      expect(text).toBe('Hi');
    } finally {
      await agent.close();
    }
  });

  it('rejects invoke/stream after close and keeps close idempotent', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
    });
    await agent.invoke('ping');
    await agent.close();
    await agent.close();
    await expect(agent.invoke('again')).rejects.toMatchObject({ code: 'AGENT_CLOSED' });
    await expect(agent.stream('again')[Symbol.asyncIterator]().next()).rejects.toMatchObject({
      code: 'AGENT_CLOSED',
    });
  });

  it('isolates multiple agents', async () => {
    const a = createAgent({ model: reference(), instructions: 'A', name: 'a' });
    const b = createAgent({ model: reference(), instructions: 'B', name: 'b' });
    try {
      const [ra, rb] = await Promise.all([a.invoke('one'), b.invoke('two')]);
      expect(ra.text).toBe('one');
      expect(rb.text).toBe('two');
      expect(ra.executionId).not.toBe(rb.executionId);
    } finally {
      await Promise.all([a.close(), b.close()]);
    }
  });
});

describe('createAgent openai configuration', () => {
  it('fails clearly when OPENAI_API_KEY is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const agent = createAgent({
      model: openai('gpt-4o-mini'),
      instructions: 'You are helpful.',
    });
    try {
      await expect(agent.invoke('Hello')).rejects.toMatchObject({
        code: 'AGENT_MISSING_OPENAI_KEY',
      });
    } finally {
      await agent.close();
    }
  });
});
