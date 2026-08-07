#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'packages/tool-framework/src/application/tool-framework.spec.ts',
  'packages/tool-framework/src/reference/reference-tools.spec.ts',
  'packages/ai-provider/src/application/tool-continuation.spec.ts',
  'packages/ai-provider/src/application/ai-provider-framework.spec.ts',
  'packages/ai-provider-openai/src/openai-ai-provider-adapter.spec.ts',
  'apps/platform-host/src/composition/local-reference-tool-loop.spec.ts',
  'apps/platform-host/src/tool-calling.e2e.spec.ts',
];

const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'vitest', 'run', ...files],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
