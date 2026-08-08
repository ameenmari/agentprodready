#!/usr/bin/env node
/**
 * Gated publish for @agentprodready/* packages.
 *
 * Usage:
 *   node scripts/npm-publish.mjs --dry-run
 *   node scripts/npm-publish.mjs --publish
 *
 * ALWAYS use pnpm publish (not npm publish) so workspace:* is rewritten.
 *
 * --publish only uploads packages whose local version is not already on npm.
 * This keeps selective bumps intact (e.g. agent-framework@1.1.0) without
 * re-publishing unchanged 1.0.x packages.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
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
    cwd: options.cwd ?? root,
    stdio: options.stdio ?? 'inherit',
    encoding: options.encoding,
    env: process.env,
    shell: options.shell,
    ...options,
  });
  if ((result.status ?? 1) !== 0 && options.allowFail !== true) {
    process.exit(result.status ?? 1);
  }
  return result;
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function listPublicPackages() {
  const packagesDir = join(root, 'packages');
  const out = [];
  for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const pkgPath = join(packagesDir, dir.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.private === true) continue;
    if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
    out.push({ name: pkg.name, version: pkg.version, dir: dir.name });
  }
  return out;
}

function isPublished(name, version) {
  const result = spawnSync(npm, ['view', `${name}@${version}`, 'version'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) return false;
  return (result.stdout ?? '').trim() === version;
}

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

const publicPackages = listPublicPackages();
const toPublish = [];
const skipped = [];
process.stdout.write('\nChecking registry for already-published versions...\n');
for (const pkg of publicPackages) {
  if (isPublished(pkg.name, pkg.version)) {
    skipped.push(`${pkg.name}@${pkg.version}`);
  } else {
    toPublish.push(pkg);
  }
}

if (skipped.length > 0) {
  process.stdout.write(`Skipping ${skipped.length} already-published package version(s).\n`);
}
if (toPublish.length === 0) {
  process.stdout.write('Nothing new to publish. Registry already has all local public versions.\n');
  process.exit(0);
}

process.stdout.write(`Publishing ${toPublish.length} package(s):\n`);
for (const pkg of toPublish) {
  process.stdout.write(`  → ${pkg.name}@${pkg.version}\n`);
}

for (const pkg of toPublish) {
  process.stdout.write(`\nPublishing ${pkg.name}@${pkg.version}...\n`);
  run(
    pnpm,
    [
      '--filter',
      pkg.name,
      'publish',
      '--access',
      'public',
      '--no-git-checks',
    ],
    { shell: process.platform === 'win32' },
  );
}

process.stdout.write('\nPublish complete. Verify with: npm view @agentprodready/agent-framework version\n');
