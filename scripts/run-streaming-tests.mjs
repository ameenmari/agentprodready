#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const filters = [
  'packages/ai-provider/src/application/ai-streaming.spec.ts',
  'packages/ai-provider/src/application/ai-provider-framework.spec.ts',
  'packages/ai-provider-openai/src/openai-ai-provider-adapter.spec.ts',
  'packages/runtime/src/application/runtime.spec.ts',
  'packages/agent-framework/src/agent-framework.spec.ts',
  'apps/platform-host/src/local-reference.e2e.spec.ts',
];

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', '--coverage=false', ...filters],
  { stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);
