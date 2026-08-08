import { describe, expect, it } from 'vitest';
import { EmbeddedMemorySession, formatMemoryForPrompt, inMemory } from './memory.js';

describe('EmbeddedMemorySession', () => {
  it('recalls prior turns in retrieveForPrompt', async () => {
    const session = new EmbeddedMemorySession('agent-test-1', inMemory());
    try {
      await session.rememberTurn({
        executionId: 'exec-1',
        correlationId: 'corr-1',
        decisionId: 'decision-1',
        userInput: 'My favorite color is blue.',
        assistantText: 'Noted your favorite color.',
      });

      const retrieval = await session.retrieveForPrompt({
        executionId: 'exec-2',
        correlationId: 'corr-2',
        query: 'What is my favorite color?',
        decisionId: 'decision-2',
      });

      const block = formatMemoryForPrompt(retrieval);
      expect(block).toMatch(/blue/);
    } finally {
      await session.dispose();
    }
  });

  it('isolates memory between agent sessions', async () => {
    const sessionA = new EmbeddedMemorySession('agent-a', inMemory({ namespace: 'a' }));
    const sessionB = new EmbeddedMemorySession('agent-b', inMemory({ namespace: 'b' }));
    try {
      await sessionA.rememberTurn({
        executionId: 'exec-a',
        correlationId: 'corr-a',
        decisionId: 'decision-a',
        userInput: 'My favorite color is blue.',
        assistantText: 'Got it.',
      });

      const retrievalB = await sessionB.retrieveForPrompt({
        executionId: 'exec-b',
        correlationId: 'corr-b',
        query: 'favorite color',
        decisionId: 'decision-b',
      });

      expect(formatMemoryForPrompt(retrievalB)).toBe('');
    } finally {
      await Promise.all([sessionA.dispose(), sessionB.dispose()]);
    }
  });

  it('rejects use after dispose', async () => {
    const session = new EmbeddedMemorySession('agent-dispose', inMemory());
    await session.dispose();
    await expect(
      session.retrieveForPrompt({
        executionId: 'exec-x',
        correlationId: 'corr-x',
        query: 'hello',
        decisionId: 'decision-x',
      }),
    ).rejects.toMatchObject({ code: 'AGENT_CLOSED' });
  });
});
