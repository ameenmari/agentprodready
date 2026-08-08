import { afterEach, describe, expect, it } from 'vitest';
import { anthropic, createAgent, SimpleAgentError } from './index.js';

const originalKey = process.env['ANTHROPIC_API_KEY'];

afterEach(() => {
  if (originalKey === undefined) delete process.env['ANTHROPIC_API_KEY'];
  else process.env['ANTHROPIC_API_KEY'] = originalKey;
});

describe('anthropic helper', () => {
  it('creates an anthropic model descriptor', () => {
    expect(anthropic('claude-sonnet-4-20250514')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-20250514',
    });
  });

  it('rejects empty model ids', () => {
    expect(() => anthropic('')).toThrow(SimpleAgentError);
    expect(() => anthropic('   ')).toThrow(/non-empty model id/);
  });
});

describe('createAgent anthropic configuration', () => {
  it('fails clearly when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env['ANTHROPIC_API_KEY'];
    const agent = createAgent({
      model: anthropic('claude-sonnet-4-20250514'),
      instructions: 'Be brief.',
    });
    await expect(agent.invoke('Hello')).rejects.toMatchObject({
      code: 'AGENT_MISSING_ANTHROPIC_KEY',
    });
    await agent.close();
  });
});
