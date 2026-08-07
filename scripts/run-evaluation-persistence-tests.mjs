#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const env = { ...process.env, RUN_POSTGRES_TESTS: '1' };
const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'vitest', 'run', '--config', 'vitest.evaluation-persistence.config.ts'],
  { stdio: 'inherit', env, shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
