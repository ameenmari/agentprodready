import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/memory/src/vector-search.spec.ts',
      'packages/memory/src/hybrid-rrf.spec.ts',
      'packages/vector-store-pgvector/src/**/*.integration.spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
