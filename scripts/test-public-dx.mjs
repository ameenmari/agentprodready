#!/usr/bin/env node
/**
 * External clean-install DX gate for @agentprodready/agent-framework simple API.
 * Packs the full @agentprodready dependency closure (including unpublished selective
 * bumps), installs outside the workspace, runs hello / stream / tools smoke.
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
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packAgentprodreadyClosure, packPackage } from './lib/pack-workspace-closure.mjs';

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

process.stdout.write('Building @agentprodready/agent-framework and dependencies...\n');
run(pnpm, ['--filter', '@agentprodready/agent-framework...', 'build']);

const packDir = join(root, '.npm-pack-dx');
rmSync(packDir, { recursive: true, force: true });
mkdirSync(packDir, { recursive: true });

process.stdout.write('Packing agent-framework workspace closure...\n');
const closureTarballs = packAgentprodreadyClosure(
  run,
  pnpm,
  root,
  '@agentprodready/agent-framework',
  packDir,
);

const externalRoot = mkdtempSync(join(tmpdir(), 'agentprodready-dx-'));
const projectDir = join(externalRoot, 'demo');
mkdirSync(projectDir, { recursive: true });

for (const tarball of closureTarballs) {
  copyFileSync(tarball, join(projectDir, basename(tarball)));
}

process.stdout.write(`External project: ${projectDir}\n`);
run(npm, ['init', '-y'], { cwd: projectDir });
run(npm, ['pkg', 'set', 'type=module'], { cwd: projectDir });

const localInstallArgs = closureTarballs.map((path) => `./${basename(path)}`);
process.stdout.write(
  `Installing ${String(localInstallArgs.length)} packed tarballs (no workspace linking)...\n`,
);
run(npm, ['install', ...localInstallArgs], { cwd: projectDir });

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

const memoryWiringSource = `import { createAgent, reference } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You are a helpful assistant.",
  memory: true,
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");
const memory = result.metadata?.memory;
console.log(JSON.stringify({
  text: result.text,
  memory,
}));
await agent.close();
`;
writeFileSync(join(projectDir, 'memory-wiring.mjs'), memoryWiringSource, 'utf8');

process.stdout.write('Running memory wiring case (no NL recall assertion)...\n');
const memoryWiring = run(process.execPath, ['memory-wiring.mjs'], { cwd: projectDir });
const memoryPayload = JSON.parse((memoryWiring.stdout ?? '').trim());
assert(
  memoryPayload.text === 'What color did I mention?',
  `reference() should echo the user message, got: ${JSON.stringify(memoryPayload.text)}`,
);
assert(memoryPayload.memory?.enabled === true, 'Expected metadata.memory.enabled');
assert(
  typeof memoryPayload.memory?.retrievedItemCount === 'number' &&
    memoryPayload.memory.retrievedItemCount >= 1,
  `Expected retrievedItemCount >= 1, got: ${JSON.stringify(memoryPayload.memory)}`,
);
assert(memoryPayload.memory?.injected === true, 'Expected metadata.memory.injected');
assert(
  /blue/i.test(memoryPayload.memory?.injectedPreview ?? ''),
  `Expected injectedPreview to include captured fact, got: ${JSON.stringify(memoryPayload.memory)}`,
);

const compatibleSource = `import { openaiCompatible } from "@agentprodready/agent-framework";

const model = openaiCompatible({
  baseUrl: "https://api.example.com/v1",
  model: "llama-3.1-70b",
  apiKey: "sk-dx-test-not-used",
});
console.log(JSON.stringify(model));
`;
writeFileSync(join(projectDir, 'compatible.mjs'), compatibleSource, 'utf8');
process.stdout.write('Running openaiCompatible construct case (no network)...\n');
const compatible = run(process.execPath, ['compatible.mjs'], { cwd: projectDir });
const compatibleModel = JSON.parse((compatible.stdout ?? '').trim());
assert(compatibleModel.provider === 'openai-compatible', 'Expected provider openai-compatible');
assert(compatibleModel.baseUrl === 'https://api.example.com/v1', 'Expected baseUrl');
assert(compatibleModel.modelId === 'llama-3.1-70b', 'Expected modelId');
assert(compatibleModel.auth === 'api-key', 'Expected default auth api-key');

if (process.env.OPENAI_API_KEY) {
  process.stdout.write('OPENAI_API_KEY present — packing/installing OpenAI peer for NL memory smoke...\n');
  const openaiProviderTarball = packPackage(run, pnpm, '@agentprodready/ai-provider-openai', packDir);
  copyFileSync(openaiProviderTarball, join(projectDir, basename(openaiProviderTarball)));
  run(npm, ['install', `./${basename(openaiProviderTarball)}`], { cwd: projectDir });

  const memoryOpenaiSource = `import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai("gpt-4o-mini"),
  instructions: "Answer using remembered user facts when present. Keep answers to one short sentence.",
  memory: true,
});

await agent.invoke("My favorite color is blue.");
const result = await agent.invoke("What color did I mention?");
console.log(result.text);
await agent.close();
`;
  writeFileSync(join(projectDir, 'memory-openai.mjs'), memoryOpenaiSource, 'utf8');
  process.stdout.write('Running optional OpenAI memory NL recall smoke...\n');
  const memoryOpenai = run(process.execPath, ['memory-openai.mjs'], { cwd: projectDir });
  const openaiText = (memoryOpenai.stdout ?? '').trim();
  assert(/blue/i.test(openaiText), `Expected OpenAI recall to mention blue, got: ${JSON.stringify(openaiText)}`);
} else {
  process.stdout.write('SKIP — OpenAI memory NL recall (OPENAI_API_KEY not set)\n');
}

process.stdout.write('Cleaning temp directory...\n');
rmSync(externalRoot, { recursive: true, force: true });
rmSync(packDir, { recursive: true, force: true });

process.stdout.write('PASS — public DX clean install succeeded\n');
