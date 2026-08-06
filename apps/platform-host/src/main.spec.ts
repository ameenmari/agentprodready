import { describe, expect, it } from 'vitest';
import { bootstrap } from './main.js';

describe('minimal platform host', () => {
  it('starts, initializes dependency injection, and shuts down', async () => {
    await expect(bootstrap()).resolves.toBeUndefined();
  });
});
