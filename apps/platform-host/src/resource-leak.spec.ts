import { describe, expect, it } from 'vitest';
import { bootstrapLocalReferenceHost } from './bootstrap-local.js';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';

describe('v1.0 resource cleanup', () => {
  it('repeated invoke + stop cycles do not retain runaway process listeners', async () => {
    const before = process.listenerCount('SIGTERM') + process.listenerCount('SIGINT');
    for (let i = 0; i < 3; i += 1) {
      const host = await bootstrapLocalReferenceHost(
        loadLocalReferenceConfig({
          HOST: '127.0.0.1',
          PORT: '0',
          LOG_LEVEL: 'error',
          SHUTDOWN_TIMEOUT_MS: '5000',
        }),
      );
      await host.composition.invoke(`leak-${String(i)}`, {}, `corr-leak-${String(i)}`, undefined);
      await host.stop();
    }
    const after = process.listenerCount('SIGTERM') + process.listenerCount('SIGINT');
    // bootstrapLocalReferenceHost itself does not register process listeners; only bootstrap() does.
    expect(after).toBeLessThanOrEqual(before + 2);
  });
});
