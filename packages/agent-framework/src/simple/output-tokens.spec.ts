import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIMPLE_MAX_OUTPUT_TOKENS,
  SIMPLE_MAX_OUTPUT_TOKENS_CEILING,
  resolveSimpleMaxOutputTokens,
  validateMaxOutputTokens,
} from './output-tokens.js';
import { openai, reference } from './models.js';
import { SimpleAgentError } from './errors.js';

describe('validateMaxOutputTokens', () => {
  it('accepts positive integers within ceiling', () => {
    expect(validateMaxOutputTokens(1800)).toBe(1800);
    expect(validateMaxOutputTokens(SIMPLE_MAX_OUTPUT_TOKENS_CEILING)).toBe(
      SIMPLE_MAX_OUTPUT_TOKENS_CEILING,
    );
  });

  it('rejects non-positive values', () => {
    expect(() => validateMaxOutputTokens(0)).toThrow(SimpleAgentError);
    expect(() => validateMaxOutputTokens(-1)).toThrow(SimpleAgentError);
  });

  it('rejects values above ceiling', () => {
    expect(() => validateMaxOutputTokens(SIMPLE_MAX_OUTPUT_TOKENS_CEILING + 1)).toThrow(
      SimpleAgentError,
    );
  });
});

describe('resolveSimpleMaxOutputTokens', () => {
  it('defaults to 512 when omitted', () => {
    expect(resolveSimpleMaxOutputTokens(openai('gpt-4o-mini'))).toBe(
      DEFAULT_SIMPLE_MAX_OUTPUT_TOKENS,
    );
    expect(resolveSimpleMaxOutputTokens(reference())).toBe(DEFAULT_SIMPLE_MAX_OUTPUT_TOKENS);
  });

  it('uses configured model limit', () => {
    expect(
      resolveSimpleMaxOutputTokens(openai({ model: 'gpt-4o-mini', maxOutputTokens: 1800 })),
    ).toBe(1800);
  });

  it('allows different agents to use different limits', () => {
    const a = openai({ model: 'gpt-4o-mini', maxOutputTokens: 1200 });
    const b = openai({ model: 'gpt-4o-mini', maxOutputTokens: 2000 });
    expect(resolveSimpleMaxOutputTokens(a)).toBe(1200);
    expect(resolveSimpleMaxOutputTokens(b)).toBe(2000);
  });
});

describe('openai model helper backward compatibility', () => {
  it('preserves string form without maxOutputTokens', () => {
    expect(openai('gpt-4o-mini')).toEqual({ provider: 'openai', modelId: 'gpt-4o-mini' });
  });

  it('supports object form with maxOutputTokens', () => {
    expect(openai({ model: 'gpt-4o-mini', maxOutputTokens: 1800 })).toEqual({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      maxOutputTokens: 1800,
    });
  });
});
