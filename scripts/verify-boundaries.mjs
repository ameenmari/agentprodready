import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const violations = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.ts')) {
      const source = await readFile(path, 'utf8');
      if (/from ['"](?:\.\.\/){2,}.*\/src\//u.test(source)) violations.push(relative(root, path));
    }
  }
}

await walk(fileURLToPath(new URL('../packages', import.meta.url)));
await walk(fileURLToPath(new URL('../apps', import.meta.url)));
if (violations.length > 0) throw new Error(`Package-boundary violations:\n${violations.join('\n')}`);
