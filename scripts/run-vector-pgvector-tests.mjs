#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  RUN_POSTGRES_TESTS: '1',
  VECTOR_INDEX_PROFILE: process.env['VECTOR_INDEX_PROFILE'] ?? 'reference-32',
};
const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'vitest', 'run', '--config', 'vitest.vector-pgvector.config.ts'],
  { stdio: 'inherit', env, shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
