import type { PluginCandidate } from '../contracts/plugin.js';
import { PluginError } from '../errors/plugin-error.js';

export class PluginDependencyGraph {
  public order(candidates: readonly PluginCandidate[]): readonly PluginCandidate[] {
    const byId = new Map(candidates.map((candidate) => [candidate.manifest.id, candidate]));
    if (byId.size !== candidates.length) throw new PluginError('PLUGIN_DUPLICATE', 'Plugin ids must be unique');
    const visiting = new Set<string>(); const visited = new Set<string>(); const result: PluginCandidate[] = [];
    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new PluginError('PLUGIN_DEPENDENCY_CYCLE', `Dependency cycle at ${id}`);
      const candidate = byId.get(id); if (candidate === undefined) throw new PluginError('PLUGIN_MISSING_DEPENDENCY', `Missing plugin ${id}`);
      visiting.add(id);
      for (const dependency of [...candidate.manifest.dependencies].sort((a, b) => a.pluginId.localeCompare(b.pluginId))) {
        const found = byId.get(dependency.pluginId);
        if (found === undefined && !dependency.optional) throw new PluginError('PLUGIN_MISSING_DEPENDENCY', `${id} requires ${dependency.pluginId}`);
        if (found !== undefined) {
          if (dependency.versions.length > 0 && !dependency.versions.includes(found.manifest.version)) throw new PluginError('PLUGIN_INCOMPATIBLE', `${id} rejects ${dependency.pluginId}@${found.manifest.version}`);
          visit(dependency.pluginId);
        }
      }
      visiting.delete(id); visited.add(id); result.push(candidate);
    };
    for (const id of [...byId.keys()].sort()) visit(id);
    return Object.freeze(result);
  }
}
