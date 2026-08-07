import { describe, expect, it } from 'vitest';
import { bootstrapLocalReferenceHost } from './bootstrap-local.js';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';

describe('v1.0 graceful shutdown', () => {
  it('idle shutdown disposes without hanging', async () => {
    const host = await bootstrapLocalReferenceHost(
      loadLocalReferenceConfig({
        HOST: '127.0.0.1',
        PORT: '0',
        LOG_LEVEL: 'error',
        SHUTDOWN_TIMEOUT_MS: '5000',
      }),
    );
    await expect(host.stop()).resolves.toBeUndefined();
  });

  it('shutdown after invoke completes and closes resources', async () => {
    const host = await bootstrapLocalReferenceHost(
      loadLocalReferenceConfig({
        HOST: '127.0.0.1',
        PORT: '0',
        LOG_LEVEL: 'error',
        SHUTDOWN_TIMEOUT_MS: '5000',
      }),
    );
    try {
      const result = await host.composition.invoke('shutdown-ping', {}, 'corr-shutdown', undefined);
      expect([200, 401, 403]).toContain(result.status);
    } finally {
      await host.stop();
    }
  });
});
