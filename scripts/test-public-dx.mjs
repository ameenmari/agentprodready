#!/usr/bin/env node
/**
 * External clean-install DX gate for @agentprodready/agent-framework simple API.
 * Packs local packages (including unpublished selective bumps), installs outside the
 * workspace, runs hello / stream / tools smoke.
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

process.stdout.write('Building @agentprodready/agent-framework and ai-provider...\n');
run(pnpm, ['--filter', '@agentprodready/agent-framework...', 'build']);

const packDir = join(root, '.npm-pack-dx');
rmSync(packDir, { recursive: true, force: true });
mkdirSync(packDir, { recursive: true });

process.stdout.write('Packing @agentprodready/ai-provider...\n');
const aiProviderTarball = packPackage('@agentprodready/ai-provider', packDir);
process.stdout.write('Packing @agentprodready/agent-framework...\n');
const frameworkTarball = packPackage('@agentprodready/agent-framework', packDir);

const externalRoot = mkdtempSync(join(tmpdir(), 'agentprodready-dx-'));
const projectDir = join(externalRoot, 'demo');
mkdirSync(projectDir, { recursive: true });

for (const tarball of [aiProviderTarball, frameworkTarball]) {
  copyFileSync(tarball, join(projectDir, basename(tarball)));
}

process.stdout.write(`External project: ${projectDir}\n`);
run(npm, ['init', '-y'], { cwd: projectDir });
run(npm, ['pkg', 'set', 'type=module'], { cwd: projectDir });

process.stdout.write('Installing packed tarballs (no workspace linking)...\n');
run(
  npm,
  ['install', `./${basename(aiProviderTarball)}`, `./${basename(frameworkTarball)}`],
  { cwd: projectDir },
);

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

const toolsSource = `import { createAgent, reference, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  tools: [
    tool({
      name: "getWeather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => ({ city, forecast: "sunny" }),
    }),
  ],
});

const result = await agent.invoke('USE_TOOL:getWeather:{"city":"Paris"}');
console.log(result.text);
await agent.close();
`;
writeFileSync(join(projectDir, 'tools.mjs'), toolsSource, 'utf8');

process.stdout.write('Running tools case...\n');
const tools = run(process.execPath, ['tools.mjs'], { cwd: projectDir });
const toolsText = (tools.stdout ?? '').trim();
assert(
  /Tool returned/i.test(toolsText) && /Paris|sunny/i.test(toolsText),
  `Expected tool result text, got: ${JSON.stringify(toolsText)}`,
);

process.stdout.write('Cleaning temp directory...\n');
rmSync(externalRoot, { recursive: true, force: true });
rmSync(packDir, { recursive: true, force: true });

process.stdout.write('PASS — public DX clean install succeeded\n');
