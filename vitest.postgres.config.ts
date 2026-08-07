import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/persistence-postgres/src/**/*.integration.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
