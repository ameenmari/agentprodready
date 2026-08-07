#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'packages/capability-resolution/src/application/resolution.spec.ts',
  'packages/runtime/src/application/provider-failover.spec.ts',
  'apps/platform-host/src/composition/local-reference-ai-routing.spec.ts',
  'apps/platform-host/src/production-hardening.spec.ts',
  'apps/platform-host/src/fault-injection.spec.ts',
  'apps/platform-host/src/graceful-shutdown.spec.ts',
];

const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'vitest', 'run', ...files],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
