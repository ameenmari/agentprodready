/**
 * Community Gravity gate: every public package README must look installable on npm.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');
const errors = [];

for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const pkgPath = join(packagesDir, dir.name, 'package.json');
  const readmePath = join(packagesDir, dir.name, 'README.md');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.private === true) continue;
  const name = pkg.name ?? dir.name;

  if (!existsSync(readmePath)) {
    errors.push(`${name}: missing README.md`);
    continue;
  }

  const text = readFileSync(readmePath, 'utf8');
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 20) {
    errors.push(`${name}: README too short (${lines.length} non-empty lines; need ≥ 20)`);
  }
  if (!/```/.test(text)) {
    errors.push(`${name}: README missing fenced code sample`);
  }
  if (!/npm install|npm create/i.test(text)) {
    errors.push(`${name}: README missing install/create command`);
  }
  if (/^# .+\n\nBlueprint \d+/m.test(text) && lines.length < 30) {
    errors.push(`${name}: looks like a Blueprint stub README`);
  }
  const versionClaim = text.match(/Package version:\s*`([^`]+)`/i);
  if (versionClaim && versionClaim[1] !== pkg.version) {
    errors.push(`${name}: README claims version ${versionClaim[1]} but package.json is ${pkg.version}`);
  }
}

if (errors.length > 0) {
  process.stderr.write('verify-package-readmes FAILED\n');
  for (const error of errors) process.stderr.write(`  · ${error}\n`);
  process.exit(1);
}

process.stdout.write('PASS — package READMEs meet Community Gravity minimums\n');
