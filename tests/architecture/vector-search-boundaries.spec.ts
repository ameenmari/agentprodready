import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const memoryRoot = fileURLToPath(new URL('../../packages/memory/src', import.meta.url));
const contextRoot = fileURLToPath(new URL('../../packages/context-assembly/src', import.meta.url));

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) files.push(path);
  }
  return files;
}

describe('Vector search package import boundaries', () => {
  it('memory must not import openai, ai-provider-openai, pg, or vector-store-pgvector', () => {
    const sources = walk(memoryRoot).map((path) => readFileSync(path, 'utf8'));
    const joined = sources.join('\n');
    expect(joined).not.toMatch(/from ['"]openai['"]/u);
    expect(joined).not.toMatch(/@agentforge\/ai-provider-openai/u);
    expect(joined).not.toMatch(/from ['"]pg['"]/u);
    expect(joined).not.toMatch(/@agentforge\/vector-store-pgvector/u);
  });

  it('context-assembly must not import vector-store, vector-store-pgvector, or pg', () => {
    const sources = walk(contextRoot).map((path) => readFileSync(path, 'utf8'));
    const joined = sources.join('\n');
    expect(joined).not.toMatch(/@agentforge\/vector-store(?:-pgvector)?/u);
    expect(joined).not.toMatch(/from ['"]pg['"]/u);
  });
});
