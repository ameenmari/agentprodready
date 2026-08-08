import { describe, expect, it } from 'vitest';
import { createAgent, reference, tool } from './index.js';

describe('createAgent invoke diagnostics', () => {
  it('exposes provider, model, duration, and zero tool counts without tools', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
    });
    try {
      const result = await agent.invoke('Ping');
      expect(result.metadata).toMatchObject({
        mode: 'simple',
        provider: 'reference',
        modelId: 'reference',
        tools: { configured: 0, invoked: 0, succeeded: 0, failed: 0 },
      });
      const durationMs = result.metadata?.durationMs;
      expect(typeof durationMs).toBe('number');
      expect(durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      await agent.close();
    }
  });

  it('counts configured tools even when none are invoked', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
      tools: [
        tool({
          name: 'noop',
          description: 'Unused',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
          execute: () => Object.freeze({ ok: true }),
        }),
      ],
    });
    try {
      const result = await agent.invoke('Hello');
      expect(result.metadata?.tools).toEqual({
        configured: 1,
        invoked: 0,
        succeeded: 0,
        failed: 0,
      });
    } finally {
      await agent.close();
    }
  });
});
