#!/usr/bin/env node
/**
 * Gated recursive publish for @agentprodready/* packages.
 *
 * Usage:
 *   node scripts/npm-publish.mjs --dry-run
 *   node scripts/npm-publish.mjs --publish
 *
 * ALWAYS use pnpm publish (not npm publish) so workspace:* is rewritten.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const doPublish = args.has('--publish');

if (!dryRun && !doPublish) {
  process.stderr.write('Usage: node scripts/npm-publish.mjs --dry-run | --publish\n');
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

process.stdout.write('Running publish audit...\n');
run(process.execPath, [join(root, 'scripts/npm-publish-audit.mjs')], { shell: false });

if (!existsSync(join(root, 'packages/foundation/dist/index.js'))) {
  process.stderr.write('dist missing — run pnpm build first\n');
  process.exit(1);
}

if (dryRun) {
  const outDir = join(root, '.npm-pack');
  mkdirSync(outDir, { recursive: true });
  process.stdout.write('\nDry-run: pnpm -r publish --dry-run (no registry upload)...\n');
  run(
    pnpm,
    [
      '-r',
      '--filter',
      './packages/*',
      'publish',
      '--dry-run',
      '--access',
      'public',
      '--no-git-checks',
    ],
    { shell: process.platform === 'win32' },
  );
  process.stdout.write('\nAlso packing agent-framework sample tarball into .npm-pack/...\n');
  run(
    pnpm,
    [
      '--filter',
      '@agentprodready/agent-framework',
      'pack',
      '--pack-destination',
      outDir,
    ],
    { shell: process.platform === 'win32' },
  );
  process.stdout.write('\nDry-run complete. If OK, run: pnpm npm:publish\n');
  process.exit(0);
}

process.stdout.write('\nPublishing all public @agentprodready packages with pnpm -r publish...\n');
run(
  pnpm,
  [
    '-r',
    '--filter',
    './packages/*',
    'publish',
    '--access',
    'public',
    '--no-git-checks',
    '--report-summary',
  ],
  { shell: process.platform === 'win32' },
);

process.stdout.write('\nPublish complete. Verify with: npm view @agentprodready/agent-framework version\n');
