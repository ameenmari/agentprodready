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
    });
    expect(await host.composition.readinessService.isReady()).toBe(true);
    await host.stop();
  });
});
