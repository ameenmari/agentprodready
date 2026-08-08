#!/usr/bin/env node
/**
 * Clean-machine DX gate for create-agentprodready (packed artifacts only).
 * Generates a reference project outside the workspace, installs packed
 * @agentprodready tarballs (no workspace linking), runs npm run dev.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const useShell =
    options.shell ?? (process.platform === 'win32' && !/node(\.exe)?$/i.test(command));
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    shell: useShell,
    stdio: options.stdio ?? 'pipe',
  });
  if ((result.status ?? 1) !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${command} ${args.join(' ')} failed:\n${detail}`);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function packPackage(filter, packDir) {
  const pack = run(pnpm, ['--filter', filter, 'pack', '--pack-destination', packDir]);
  const packOut = `${pack.stdout ?? ''}\n${pack.stderr ?? ''}`;
  const packLine = packOut
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.endsWith('.tgz'));
  assert(packLine !== undefined, `Could not determine tarball for ${filter}:\n${packOut}`);
  const tarballPath = isAbsolute(packLine) ? packLine : join(packDir, packLine);
  assert(existsSync(tarballPath), `Missing tarball at ${tarballPath}`);
  return tarballPath;
}

process.stdout.write('Building agent-framework graph...\n');
run(pnpm, ['--filter', '@agentprodready/agent-framework...', 'build']);

const packDir = join(root, '.npm-pack-scaffold-dx');
rmSync(packDir, { recursive: true, force: true });
mkdirSync(packDir, { recursive: true });

process.stdout.write('Packing create-agentprodready + framework deps...\n');
const createTarball = packPackage('create-agentprodready', packDir);
const aiProviderTarball = packPackage('@agentprodready/ai-provider', packDir);
const frameworkTarball = packPackage('@agentprodready/agent-framework', packDir);

const externalRoot = mkdtempSync(join(tmpdir(), 'agentprodready-scaffold-dx-'));
const workDir = join(externalRoot, 'work');
mkdirSync(workDir, { recursive: true });

for (const tarball of [createTarball, aiProviderTarball, frameworkTarball]) {
  copyFileSync(tarball, join(workDir, basename(tarball)));
}

const toolsDir = join(workDir, 'tools');
mkdirSync(toolsDir, { recursive: true });
run(npm, ['init', '-y'], { cwd: toolsDir });
run(npm, ['install', join(workDir, basename(createTarball))], { cwd: toolsDir });

const createBin = join(
  toolsDir,
  'node_modules',
  'create-agentprodready',
  'bin',
  'create-agentprodready.js',
);
assert(existsSync(createBin), `Missing create bin at ${createBin}`);

const projectName = 'demo-agent';
process.stdout.write('Generating reference project...\n');
run(process.execPath, [createBin, projectName, '--template', 'reference'], { cwd: workDir });

const projectDir = join(workDir, projectName);
assert(existsSync(join(projectDir, 'src', 'index.ts')), 'Generated src/index.ts missing');
assert(existsSync(join(projectDir, 'package.json')), 'Generated package.json missing');

const generatedPkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
assert(
  generatedPkg.dependencies?.['@agentprodready/agent-framework'] !== undefined,
  'Generated project missing agent-framework dependency',
);
assert(
  !JSON.stringify(generatedPkg).includes('workspace:'),
  'Generated project must not use workspace: protocol',
);

copyFileSync(aiProviderTarball, join(projectDir, basename(aiProviderTarball)));
copyFileSync(frameworkTarball, join(projectDir, basename(frameworkTarball)));

process.stdout.write('Installing generated project (packed framework + tsx)...\n');
run(
  npm,
  [
    'install',
    `./${basename(aiProviderTarball)}`,
    `./${basename(frameworkTarball)}`,
    'tsx@^4.20.0',
    'typescript@^5.9.2',
    '@types/node@^22.17.0',
  ],
  { cwd: projectDir },
);

const installedPkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
assert(
  !JSON.stringify(installedPkg).includes('workspace:'),
  'Installed package.json must not contain workspace:',
);

process.stdout.write('Running npm run dev (reference hello)...\n');
const started = Date.now();
const dev = run(npm, ['run', 'dev'], { cwd: projectDir });
const elapsedMs = Date.now() - started;
const lines = (dev.stdout ?? '')
  .trim()
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const text = lines.at(-1);
assert(text === 'Hello', `Expected Hello from scaffold, got: ${JSON.stringify(dev.stdout)}`);

process.stdout.write(`PASS — scaffold DX (${elapsedMs}ms to first agent response)\n`);
process.stdout.write(`DX note: TIME TO FIRST AGENT measured here as ${elapsedMs}ms (target <5 min)\n`);

rmSync(externalRoot, { recursive: true, force: true });
rmSync(packDir, { recursive: true, force: true });
