import { describe, expect, it } from 'vitest';
import { bootstrapLocalReferenceHost } from './bootstrap-local.js';

describe('platform host bootstrap', () => {
  it('starts and shuts down cleanly', async () => {
    const host = await bootstrapLocalReferenceHost({
      host: '127.0.0.1',
      port: 0,
      logLevel: 'error',
      referenceAgentEnabled: true,
      aiProvider: 'reference',
      persistenceProvider: 'in-memory',
      runtimeRecoveryEnabled: false,
      memoryProvider: 'in-memory',
      evaluationEnabled: false,
      evaluationResultStore: 'in-memory',
      vectorSearchEnabled: false,
      vectorStoreProvider: 'none',
      embeddingProvider: 'none',
      embeddingModel: '',
      embeddingDimensions: 0,
      vectorIndexProfile: 'none',
      streamingHeartbeatIntervalMs: 0,
      streamingMaxDrainWaitMs: 30_000,
      toolsEnabled: false,
      toolMaxCallsPerInvocation: 8,
      toolMaxTurns: 4,
      toolMaxArgumentBytes: 16_384,
      toolMaxResultBytes: 65_536,
    });
    expect(await host.composition.readinessService.isReady()).toBe(true);
    await host.stop();
  });
});
