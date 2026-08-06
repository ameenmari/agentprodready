import type { PluginCandidate, PluginDiscoverySource } from '../contracts/plugin.js';

export class PluginDiscoveryService {
  public constructor(private readonly sources: readonly PluginDiscoverySource[]) {}
  public async discover(): Promise<readonly PluginCandidate[]> {
    const found = (await Promise.all(this.sources.map(async (source) => source.discover()))).flat();
    return Object.freeze(found.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id) || a.manifest.version.localeCompare(b.manifest.version) || a.location.localeCompare(b.location)));
  }
}
