/**
 * Pack a workspace package and its transitive @agentprodready/* dependencies.
 * Used by public-dx / scaffold-dx so CI does not race npm publish for selective bumps.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * @param {string} root monorepo root
 * @returns {Map<string, { dir: string, version: string, dependencies: Record<string, string> }>}
 */
export function loadWorkspacePackages(root) {
  const packagesDir = join(root, 'packages');
  const map = new Map();
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
    map.set(pkg.name, {
      dir: entry.name,
      version: pkg.version,
      dependencies: Object.freeze({ ...(pkg.dependencies ?? {}) }),
    });
  }
  return map;
}

/**
 * Collect transitive @agentprodready workspace deps (cycles allowed; pack order is best-effort).
 * @param {string} rootName
 * @param {Map<string, { dir: string, version: string, dependencies: Record<string, string> }>} workspace
 * @returns {string[]} package names (deps before dependents when acyclic)
 */
export function collectAgentprodreadyClosure(rootName, workspace) {
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(name) {
    if (visited.has(name) || visiting.has(name)) return;
    const entry = workspace.get(name);
    if (entry === undefined) {
      throw new Error(`Workspace package missing for ${name}`);
    }
    visiting.add(name);
    for (const dep of Object.keys(entry.dependencies)) {
      if (!dep.startsWith('@agentprodready/') && dep !== 'create-agentprodready') continue;
      if (!workspace.has(dep)) continue;
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(name);
  }

  visit(rootName);
  return ordered;
}

/**
 * @param {(command: string, args: string[], options?: object) => { stdout?: string, stderr?: string }} run
 * @param {string} pnpm
 * @param {string} filter package name
 * @param {string} packDir
 * @returns {string} absolute tarball path
 */
export function packPackage(run, pnpm, filter, packDir) {
  const pack = run(pnpm, ['--filter', filter, 'pack', '--pack-destination', packDir]);
  const packOut = `${pack.stdout ?? ''}\n${pack.stderr ?? ''}`;
  const packLine = packOut
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.endsWith('.tgz'));
  if (packLine === undefined) {
    throw new Error(`Could not determine tarball for ${filter}:\n${packOut}`);
  }
  const tarballPath = isAbsolute(packLine) ? packLine : join(packDir, packLine);
  if (!existsSync(tarballPath)) {
    throw new Error(`Missing tarball at ${tarballPath}`);
  }
  return tarballPath;
}

/**
 * Pack root + all transitive @agentprodready workspace deps.
 * @returns {string[]} tarball absolute paths (deps before dependents)
 */
export function packAgentprodreadyClosure(run, pnpm, root, rootName, packDir) {
  const workspace = loadWorkspacePackages(root);
  const names = collectAgentprodreadyClosure(rootName, workspace);
  const tarballs = [];
  for (const name of names) {
    process.stdout.write(`Packing ${name}...\n`);
    tarballs.push(packPackage(run, pnpm, name, packDir));
  }
  return tarballs;
}
