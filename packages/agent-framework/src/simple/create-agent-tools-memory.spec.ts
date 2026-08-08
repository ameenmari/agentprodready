import { describe, expect, it } from 'vitest';
import { EMBEDDED_MAX_TOOL_CALLS } from './embedded-tool-loop-limits.js';
import { createAgent, reference, SimpleAgentError, tool } from './index.js';

function cityFromArgs(args: Readonly<Record<string, unknown>>): string {
  return typeof args['city'] === 'string' ? args['city'] : '';
}

const weatherParams = Object.freeze({
  type: 'object' as const,
  required: Object.freeze(['city']),
  properties: Object.freeze({
    city: Object.freeze({ type: 'string' }),
  }),
});

describe('createAgent tools validation', () => {
  it('rejects duplicate tool names', () => {
    const getWeather = tool({
      name: 'getWeather',
      description: 'Get weather',
      parameters: weatherParams,
      execute: () => ({ temp: 20 }),
    });
    expect(() =>
      createAgent({
        model: reference(),
        instructions: 'You are helpful.',
        tools: [getWeather, getWeather],
      }),
    ).toThrowError(/Duplicate tool name/);
  });

  it('rejects invalid tool entries', () => {
    expect(() =>
      createAgent({
        model: reference(),
        instructions: 'You are helpful.',
        tools: [{ name: 'bad' } as never],
      }),
    ).toThrow(SimpleAgentError);
  });
});

describe('createAgent tools platform wiring', () => {
  it('builds platform with tools enabled', async () => {
    const { buildEmbeddedPlatform } = await import('./embedded-platform.js');
    const { normalizeCreateAgentOptions } = await import('./validate-options.js');
    const opts = normalizeCreateAgentOptions({
      model: reference(),
      instructions: 'You are helpful.',
      tools: [
        tool({
          name: 'getWeather',
          description: 'Get weather',
          parameters: weatherParams,
          execute: (args) => Object.freeze({ city: cityFromArgs(args), temp: 20 }),
        }),
      ],
    });
    const platform = await buildEmbeddedPlatform(opts);
    try {
      expect(platform.hasTools).toBe(true);
    } finally {
      await platform.dispose();
    }
  });
});

describe('createAgent tools invoke', () => {
  it('executes a tool via reference USE_TOOL pattern', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
      tools: [
        tool({
          name: 'getWeather',
          description: 'Get weather for a city',
          parameters: weatherParams,
          execute: (args) => Object.freeze({ city: cityFromArgs(args), temp: 22, unit: 'C' }),
        }),
      ],
    });
    try {
      const result = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
      expect(result.text).toMatch(/Tool returned/);
      expect(result.text).toMatch(/Paris|22/);
      expect(result.metadata?.tools).toEqual({
        configured: 1,
        invoked: 1,
        succeeded: 1,
        failed: 0,
      });
      expect(result.metadata?.provider).toBe('reference');
      expect(typeof result.metadata?.durationMs).toBe('number');
    } finally {
      await agent.close();
    }
  });

  it('fails closed when approvalRequirement is required', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
      tools: [
        tool({
          name: 'needsApproval',
          description: 'Requires approval',
          parameters: Object.freeze({ type: 'object' as const, properties: Object.freeze({}) }),
          approvalRequirement: 'required',
          execute: () => ({ ok: true }),
        }),
      ],
    });
    try {
      await expect(agent.invoke('USE_TOOL:needsApproval:{}')).rejects.toMatchObject({
        code: 'AGENT_TOOL_APPROVAL_REQUIRED',
      });
    } finally {
      await agent.close();
    }
  });

  it('denies tools whose id starts with deny_ via Security', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
      tools: [
        tool({
          name: 'deny_blocked',
          description: 'Blocked by embedded security convention',
          parameters: Object.freeze({ type: 'object' as const, properties: Object.freeze({}) }),
          execute: () => ({ ok: true }),
        }),
      ],
    });
    try {
      await expect(agent.invoke('USE_TOOL:deny_blocked:{}')).rejects.toMatchObject({
        code: 'AGENT_TOOL_AUTHORIZATION',
      });
    } finally {
      await agent.close();
    }
  });

  it('streams tool_call and tool_result then text', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are helpful.',
      tools: [
        tool({
          name: 'getWeather',
          description: 'Get weather',
          parameters: weatherParams,
          execute: (args) => Object.freeze({ city: cityFromArgs(args), temp: 18 }),
        }),
      ],
    });
    try {
      const events = [];
      for await (const event of agent.stream('USE_TOOL:getWeather:{"city":"London"}')) {
        events.push(event);
      }
      expect(events.some((event) => event.type === 'tool_call')).toBe(true);
      expect(events.some((event) => event.type === 'tool_result')).toBe(true);
      expect(events.some((event) => event.type === 'text')).toBe(true);
      expect(events.at(-1)).toMatchObject({ type: 'complete' });
    } finally {
      await agent.close();
    }
  });
});

describe('embedded tool loop limits', () => {
  it('uses 8 max calls per invocation for simple agents with tools', () => {
    expect(EMBEDDED_MAX_TOOL_CALLS).toBe(8);
  });
});

describe('createAgent memory wiring diagnostics', () => {
  it('exposes retrieve/inject diagnostics without claiming NL recall', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are a helpful assistant.',
      memory: true,
    });
    try {
      await agent.invoke('My favorite color is blue.');
      const result = await agent.invoke('What color did I mention?');
      expect(result.text).toBe('What color did I mention?');
      expect(result.metadata).toMatchObject({
        mode: 'simple',
        provider: 'reference',
        modelId: 'reference',
        tools: { configured: 0, invoked: 0, succeeded: 0, failed: 0 },
        memory: {
          enabled: true,
          injected: true,
        },
      });
      expect(result.metadata?.memory?.retrievedItemCount).toBeGreaterThanOrEqual(1);
      expect(result.metadata?.memory?.injectedPreview).toMatch(/blue/i);
    } finally {
      await agent.close();
    }
  });

  it('omits memory diagnostics when memory is not configured', async () => {
    const agent = createAgent({
      model: reference(),
      instructions: 'You are a helpful assistant.',
    });
    try {
      const result = await agent.invoke('Hello');
      expect(result.metadata).toMatchObject({
        mode: 'simple',
        provider: 'reference',
        modelId: 'reference',
        tools: { configured: 0, invoked: 0, succeeded: 0, failed: 0 },
      });
      expect(result.metadata?.memory).toBeUndefined();
    } finally {
      await agent.close();
    }
  });
});
