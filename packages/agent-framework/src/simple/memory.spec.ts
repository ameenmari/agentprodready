import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EmbeddedMemorySession, fileMemory, formatMemoryForPrompt, inMemory } from './memory.js';

describe('EmbeddedMemorySession', () => {
  it('recalls prior turns in retrieveForPrompt', async () => {
    const session = await EmbeddedMemorySession.create('agent-test-1', inMemory());
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
    const sessionA = await EmbeddedMemorySession.create('agent-a', inMemory({ namespace: 'a' }));
    const sessionB = await EmbeddedMemorySession.create('agent-b', inMemory({ namespace: 'b' }));
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
    const session = await EmbeddedMemorySession.create('agent-dispose', inMemory());
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

  it('survives process restart with file-backed durable memory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agent-memory-'));
    const memory = fileMemory({ directory, namespace: 'restart-test' });
    const agentId = 'agent-file-durable';
    try {
      const sessionA = await EmbeddedMemorySession.create(agentId, memory);
      await sessionA.rememberTurn({
        executionId: 'exec-file-1',
        correlationId: 'corr-file-1',
        decisionId: 'decision-file-1',
        userInput: 'Remember the code word: horizon.',
        assistantText: 'I will remember horizon.',
      });
      await sessionA.dispose();

      const sessionB = await EmbeddedMemorySession.create(agentId, memory);
      try {
        expect(sessionB.durable).toBe(true);
        const retrieval = await sessionB.retrieveForPrompt({
          executionId: 'exec-file-2',
          correlationId: 'corr-file-2',
          query: 'code word',
          decisionId: 'decision-file-2',
        });
        const block = formatMemoryForPrompt(retrieval, true);
        expect(block).toMatch(/Durable agent memory/);
        expect(block).toMatch(/horizon/);
      } finally {
        await sessionB.dispose();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
