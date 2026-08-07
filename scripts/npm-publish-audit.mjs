#!/usr/bin/env node
/**
 * Audit workspace packages for npm publish readiness.
 * Does not publish anything.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packagesDir = join(root, 'packages');
const pkgs = new Map();

for (const dir of readdirSync(packagesDir)) {
  const pkgPath = join(packagesDir, dir, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@agentprodready/')) continue;
  pkgs.set(pkg.name, {
    dir,
    pkg,
    hasReadme: existsSync(join(packagesDir, dir, 'README.md')),
    hasDist: existsSync(join(packagesDir, dir, 'dist', 'index.js')),
    hasTypes: existsSync(join(packagesDir, dir, 'dist', 'index.d.ts')),
  });
}

const errors = [];
const warnings = [];

for (const [name, meta] of pkgs) {
  const { pkg, dir, hasReadme, hasDist, hasTypes } = meta;
  if (pkg.private === true) {
    warnings.push(`${name}: marked private (will be skipped by recursive publish)`);
    continue;
  }
  if (pkg.publishConfig?.access !== 'public') {
    errors.push(`${name}: missing publishConfig.access=public`);
  }
  if (!Array.isArray(pkg.files) || !pkg.files.includes('dist')) {
    errors.push(`${name}: files must include dist`);
  }
  if (!hasReadme) errors.push(`${name}: missing README.md`);
  if (!hasDist) errors.push(`${name}: missing dist/index.js (run pnpm build)`);
  if (!hasTypes) errors.push(`${name}: missing dist/index.d.ts`);
  if (!pkg.license) warnings.push(`${name}: missing license field`);
  for (const [dep, range] of Object.entries(pkg.dependencies ?? {})) {
    if (!dep.startsWith('@agentprodready/')) continue;
    if (typeof range === 'string' && range.startsWith('workspace:')) {
      // expected in repo; pnpm publish rewrites this
      continue;
    }
    if (!pkgs.has(dep)) warnings.push(`${name}: depends on unknown ${dep}`);
  }
  // pack dry-run hint path
  void dir;
}

// Detect cycles (informational — first publish must still ship all peers together)
const color = new Map([...pkgs.keys()].map((k) => [k, 0]));
const stack = [];
const cycles = new Set();
function dfs(node) {
  color.set(node, 1);
  stack.push(node);
  const deps = Object.keys(pkgs.get(node)?.pkg.dependencies ?? {}).filter((d) => pkgs.has(d));
  for (const dep of deps) {
    if (color.get(dep) === 1) {
      const start = stack.indexOf(dep);
      cycles.add([...stack.slice(start), dep].join(' -> '));
    } else if (color.get(dep) === 0) {
      dfs(dep);
    }
  }
  stack.pop();
  color.set(node, 2);
}
for (const name of pkgs.keys()) {
  if (color.get(name) === 0) dfs(name);
}

const publishable = [...pkgs.entries()].filter(([, m]) => m.pkg.private !== true).map(([n]) => n);

process.stdout.write(`npm-publish-audit\n`);
process.stdout.write(`publishable packages: ${String(publishable.length)}\n`);
process.stdout.write(`dependency cycles detected: ${String(cycles.size)}\n`);
if (cycles.size > 0) {
  process.stdout.write(
    'NOTE: cycles exist. First public release must publish ALL @agentprodready packages at the same version in one pnpm -r publish.\n',
  );
}
for (const warning of warnings) process.stdout.write(`WARN  ${warning}\n`);
for (const error of errors) process.stdout.write(`ERROR ${error}\n`);

if (errors.length > 0) {
  process.exitCode = 1;
  process.stderr.write(`Audit failed with ${String(errors.length)} error(s).\n`);
} else {
  process.stdout.write('Audit OK — ready for dry-run pack / gated publish.\n');
  process.stdout.write('Recommended first developer installs:\n');
  for (const name of [
    '@agentprodready/agent-framework',
    '@agentprodready/runtime',
    '@agentprodready/ai-provider',
    '@agentprodready/ai-provider-openai',
    '@agentprodready/memory',
    '@agentprodready/tool-framework',
  ]) {
    process.stdout.write(`  npm install ${name}\n`);
  }
}
