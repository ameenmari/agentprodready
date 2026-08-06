import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.spec.ts', 'apps/**/*.spec.ts', 'tests/**/*.spec.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'], include: ['packages/*/src/**/*.ts'] }
  }
});
