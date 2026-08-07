import { describe, expect, it } from 'vitest';
import { NormalizedAiError } from '../errors/ai-error.js';
import { buildToolContinuationMessages } from './tool-continuation.js';

describe('buildToolContinuationMessages', () => {
  it('orders base → assistant toolCalls → tool results', () => {
    const messages = buildToolContinuationMessages({
      baseMessages: Object.freeze([
        Object.freeze({
          role: 'user' as const,
          content: Object.freeze([Object.freeze({ type: 'text' as const, text: 'hi' })]),
        }),
      ]),
      toolCalls: Object.freeze([
        Object.freeze({ id: 'c1', name: 'reference.echo', arguments: Object.freeze({ message: 'x' }) }),
      ]),
      results: Object.freeze([
        Object.freeze({
          toolCallId: 'c1',
          content: Object.freeze([Object.freeze({ type: 'text' as const, text: '{"message":"x"}' })]),
        }),
      ]),
    });
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
    expect(messages[1]?.toolCalls?.[0]?.id).toBe('c1');
    expect(messages[2]?.toolCallId).toBe('c1');
  });

  it('fails closed on mismatched ids', () => {
    expect(() =>
      buildToolContinuationMessages({
        baseMessages: Object.freeze([]),
        toolCalls: Object.freeze([Object.freeze({ id: 'a', name: 't', arguments: Object.freeze({}) })]),
        results: Object.freeze([
          Object.freeze({
            toolCallId: 'b',
            content: Object.freeze([Object.freeze({ type: 'text' as const, text: '{}' })]),
          }),
        ]),
      }),
    ).toThrow(NormalizedAiError);
  });
});
