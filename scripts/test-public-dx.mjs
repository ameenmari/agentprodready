#!/usr/bin/env node
/**
 * External clean-install DX gate for @agentprodready/agent-framework simple API.
 * Packs the package, installs the tarball outside the workspace, runs hello + stream.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  // Windows: shell for npm/pnpm.cmd; never shell for node.exe (path has spaces).
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

process.stdout.write('Building @agentprodready/agent-framework...\n');
run(pnpm, ['--filter', '@agentprodready/agent-framework...', 'build']);

const packDir = join(root, '.npm-pack-dx');
rmSync(packDir, { recursive: true, force: true });
mkdirSync(packDir, { recursive: true });

process.stdout.write('Packing @agentprodready/agent-framework...\n');
const pack = run(pnpm, [
  '--filter',
  '@agentprodready/agent-framework',
  'pack',
  '--pack-destination',
  packDir,
]);
const packOut = `${pack.stdout ?? ''}\n${pack.stderr ?? ''}`;
const packLine = packOut
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.endsWith('.tgz'));
assert(packLine !== undefined, `Could not determine tarball name from pack output:\n${packOut}`);
const tarballPath = isAbsolute(packLine) ? packLine : join(packDir, packLine);
const tarballName = basename(tarballPath);
assert(existsSync(tarballPath), `Missing tarball at ${tarballPath}`);

const externalRoot = mkdtempSync(join(tmpdir(), 'agentprodready-dx-'));
const projectDir = join(externalRoot, 'demo');
mkdirSync(projectDir, { recursive: true });
const localTarball = join(projectDir, tarballName);
copyFileSync(tarballPath, localTarball);

process.stdout.write(`External project: ${projectDir}\n`);
run(npm, ['init', '-y'], { cwd: projectDir });
run(npm, ['pkg', 'set', 'type=module'], { cwd: projectDir });

process.stdout.write('Installing packed tarball (no workspace linking)...\n');
run(npm, ['install', `./${tarballName}`], { cwd: projectDir });

const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
assert(
  pkg.dependencies?.['@agentprodready/agent-framework'] !== undefined,
  'agent-framework missing from installed package.json dependencies',
);

const helloSource = `import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

const result = await agent.invoke("Hello");
console.log(result.text);

await agent.close();
`;

writeFileSync(join(projectDir, 'index.mjs'), helloSource, 'utf8');

process.stdout.write('Running hello world...\n');
const hello = run(process.execPath, ['index.mjs'], { cwd: projectDir });
const helloText = (hello.stdout ?? '').trim();
assert(helloText === 'Hello', `Expected Hello, got: ${JSON.stringify(helloText)}`);

const streamSource = `import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
});

let text = "";
for await (const event of agent.stream("Hello")) {
  if (event.type === "text") text += event.text;
}
console.log(text);
await agent.close();
`;
writeFileSync(join(projectDir, 'stream.mjs'), streamSource, 'utf8');

process.stdout.write('Running streaming case...\n');
const stream = run(process.execPath, ['stream.mjs'], { cwd: projectDir });
const streamText = (stream.stdout ?? '').trim();
assert(streamText === 'Hello', `Expected stream Hello, got: ${JSON.stringify(streamText)}`);

process.stdout.write('Cleaning temp directory...\n');
rmSync(externalRoot, { recursive: true, force: true });

process.stdout.write('PASS — public DX clean install succeeded\n');
