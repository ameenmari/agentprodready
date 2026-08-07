import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const evaluationRoot = fileURLToPath(new URL('../../packages/evaluation/src', import.meta.url));

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) files.push(path);
  }
  return files;
}

describe('Evaluation package import boundaries', () => {
  it('does not import openai, pg, platform-host, or runtime production modules', () => {
    const sources = walk(evaluationRoot).map((path) => readFileSync(path, 'utf8'));
    const joined = sources.join('\n');
    expect(joined).not.toMatch(/from ['"]openai['"]/u);
    expect(joined).not.toMatch(/from ['"]pg['"]/u);
    expect(joined).not.toMatch(/@agentprodready\/platform-host/u);
    expect(joined).not.toMatch(/apps\/platform-host/u);
    expect(joined).not.toMatch(/from ['"]@agentprodready\/runtime['"]/u);
  });
});
