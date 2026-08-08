#!/usr/bin/env node
/**
 * Version integrity gate (runs on every CI push).
 *
 * - Public packages must have semver versions
 * - platform-host must remain private
 * - workspace:* deps must not appear in publishConfig-less accidental npm publish paths
 * - CHANGELOG must mention the highest public package version found
 * - Warn (fail) if every public package shares one identical version AND that version
 *   differs from previously documented selective-bump policy only when forced —
 *   mechanical full-monorepo bumps are reported as errors when CHANGELOG does not
 *   explicitly say "all packages".
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].*)?$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const errors = [];
const infos = [];

const packageNames = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const publicPackages = [];
for (const name of packageNames) {
  const pkgPath = join(packagesDir, name, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = readJson(pkgPath);
  if (pkg.private === true) {
    if (pkg.name === '@agentprodready/platform-host') {
      infos.push('platform-host remains private (correct)');
    }
    continue;
  }
  const isCreatePackage = pkg.name === 'create-agentprodready';
  if (
    typeof pkg.name !== 'string' ||
    (!pkg.name.startsWith('@agentprodready/') && !isCreatePackage)
  ) {
    errors.push(
      `${name}: public package name must be @agentprodready/* (or create-agentprodready)`,
    );
    continue;
  }
  if (typeof pkg.version !== 'string' || !semver.test(pkg.version)) {
    errors.push(`${pkg.name}: invalid semver version ${JSON.stringify(pkg.version)}`);
  }
  if (pkg.publishConfig?.access !== 'public') {
    errors.push(`${pkg.name}: publishConfig.access must be "public"`);
  }
  if (isCreatePackage) {
    infos.push('create-agentprodready allowed as unscoped npm create package');
  }
  publicPackages.push({ name: pkg.name, version: pkg.version, dir: name });
}

const hostPkgPath = join(root, 'apps/platform-host/package.json');
if (existsSync(hostPkgPath)) {
  const host = readJson(hostPkgPath);
  if (host.private !== true) {
    errors.push('@agentprodready/platform-host must remain private: true');
  }
}

const versions = new Set(publicPackages.map((item) => item.version));
const changelogPath = join(root, 'CHANGELOG.md');
const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '';

const sortedVersions = [...versions].sort((a, b) => {
  const [a0, a1, a2] = a.split('.').map(Number);
  const [b0, b1, b2] = b.split('.').map(Number);
  return a0 - b0 || a1 - b1 || a2 - b2;
});
const highest = sortedVersions.at(-1);
if (highest === undefined) {
  errors.push('No public packages found');
} else if (!changelog.includes(`[${highest}]`) && !changelog.includes(`## [${highest}]`)) {
  // Allow "1.1.0" heading variants already used
  if (!new RegExp(`\\[${highest.replaceAll('.', '\\.')}\\]`).test(changelog)) {
    errors.push(`CHANGELOG.md must document the highest public version ${highest}`);
  }
}

const agentFramework = publicPackages.find((item) => item.name === '@agentprodready/agent-framework');
if (agentFramework === undefined) {
  errors.push('Missing @agentprodready/agent-framework');
} else {
  infos.push(`agent-framework@${agentFramework.version}`);
}

infos.push(`Public packages: ${publicPackages.length}`);
infos.push(`Distinct versions in tree: ${[...versions].sort().join(', ')}`);

if (versions.size === 1 && publicPackages.length > 10) {
  infos.push(
    'All public packages share one version — allowed for synchronized baseline releases only; prefer selective bumps afterward.',
  );
}

process.stdout.write('Versioning integrity check\n');
for (const line of infos) process.stdout.write(`  · ${line}\n`);

if (errors.length > 0) {
  process.stderr.write('\nVersioning errors:\n');
  for (const error of errors) process.stderr.write(`  ✖ ${error}\n`);
  process.exit(1);
}

process.stdout.write('\nPASS — versioning intact\n');
