import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

describe('Blueprint 01 repository topology', () => {
  it.each(['apps', 'packages', 'docs', 'scripts', 'package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json'])(
    'contains %s',
    async (path) => { await expect(access(resolve(root, path))).resolves.toBeUndefined(); },
  );

  it('declares isolated workspace packages', async () => {
    const workspace = await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8');
    expect(workspace).toContain('apps/*');
    expect(workspace).toContain('packages/*');
  });
});
