import { afterEach, describe, expect, it } from 'vitest';
import { createAgent, gemini, SimpleAgentError } from './index.js';

const originalKey = process.env['GEMINI_API_KEY'];

afterEach(() => {
  if (originalKey === undefined) delete process.env['GEMINI_API_KEY'];
  else process.env['GEMINI_API_KEY'] = originalKey;
});

describe('gemini helper', () => {
  it('creates a gemini model descriptor', () => {
    expect(gemini('gemini-2.0-flash')).toEqual({
      provider: 'gemini',
      modelId: 'gemini-2.0-flash',
    });
  });

  it('rejects empty model ids', () => {
    expect(() => gemini('')).toThrow(SimpleAgentError);
    expect(() => gemini('   ')).toThrow(/non-empty model id/);
  });
});

describe('createAgent gemini configuration', () => {
  it('fails clearly when GEMINI_API_KEY is missing', async () => {
    delete process.env['GEMINI_API_KEY'];
    const agent = createAgent({
      model: gemini('gemini-2.0-flash'),
      instructions: 'Be brief.',
    });
    await expect(agent.invoke('Hello')).rejects.toMatchObject({
      code: 'AGENT_MISSING_GEMINI_KEY',
    });
    await agent.close();
  });
});
