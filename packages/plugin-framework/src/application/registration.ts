import type { PluginCandidate, PluginContribution, PluginContributionRegistry } from '../contracts/plugin.js';
import { PluginError } from '../errors/plugin-error.js';

export class InMemoryContributionRegistry implements PluginContributionRegistry {
  readonly #entries = new Map<string, PluginContribution[]>();
  public constructor(public readonly kind: PluginContributionRegistry['kind']) {}
  public register(pluginId: string, contribution: PluginContribution): void {
    if (contribution.kind !== this.kind) throw new PluginError('PLUGIN_REGISTRATION_FAILED', `Expected ${this.kind}`);
    const current = this.#entries.get(pluginId) ?? [];
    if (current.some((item) => item.id === contribution.id)) return;
    this.#entries.set(pluginId, [...current, contribution]);
  }
  public remove(pluginId: string): void { this.#entries.delete(pluginId); }
  public list(): readonly PluginContribution[] { return Object.freeze([...this.#entries.values()].flat()); }
}

export class PluginRegistrationPipeline {
  readonly #registries: ReadonlyMap<PluginContribution['kind'], PluginContributionRegistry>;
  public constructor(registries: readonly PluginContributionRegistry[]) { this.#registries = new Map(registries.map((item) => [item.kind, item])); }
  public register(candidate: PluginCandidate): void {
    const touched = new Set<PluginContributionRegistry>();
    try {
      for (const contribution of candidate.manifest.contributions) {
        const registry = this.#registries.get(contribution.kind);
        if (registry === undefined) throw new PluginError('PLUGIN_REGISTRATION_FAILED', `No registry for ${contribution.kind}`);
        registry.register(candidate.manifest.id, contribution); touched.add(registry);
      }
    } catch (cause) {
      for (const registry of touched) registry.remove(candidate.manifest.id);
      if (cause instanceof PluginError) throw cause;
      throw new PluginError('PLUGIN_REGISTRATION_FAILED', `Registration failed for ${candidate.manifest.id}`, { cause });
    }
  }
  public remove(pluginId: string): void { for (const registry of this.#registries.values()) registry.remove(pluginId); }
}
