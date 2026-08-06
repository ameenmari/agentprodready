import type { ImplementationActivator } from '@agentforge/plugin-framework';
import type { ServiceRegistration, ServiceToken } from '../contracts/composition.js';
import { CompositionError } from '../errors/composition-error.js';
import type { CompositionRoot } from './composition-root.js';

export class PluginCompositionRegistrar {
  public constructor(private readonly root: CompositionRoot) {}

  public register(pluginId: string, registrations: readonly ServiceRegistration<unknown>[]): void {
    if (pluginId.trim() === '') throw new CompositionError('COMPOSITION_RESOLUTION_FAILED', 'Plugin id is required');
    for (const registration of registrations) {
      this.root.register({ ...registration, provenance: `plugin:${pluginId}` });
    }
  }
}

export class CompositionImplementationActivator implements ImplementationActivator {
  readonly #bindings = new Map<string, ServiceToken<unknown>>();
  public constructor(private readonly root: CompositionRoot) {}

  public bind<T>(pluginId: string, contributionId: string, token: ServiceToken<T>): void {
    const key = this.#key(pluginId, contributionId);
    if (this.#bindings.has(key)) throw new CompositionError('COMPOSITION_DUPLICATE_REGISTRATION', `Duplicate implementation binding: ${key}`);
    this.#bindings.set(key, token);
  }

  public async activate<T>(pluginId: string, contributionId: string): Promise<T> {
    const token = this.#bindings.get(this.#key(pluginId, contributionId));
    if (token === undefined) throw new CompositionError('COMPOSITION_IMPLEMENTATION_NOT_REGISTERED', `No implementation binding for ${pluginId}:${contributionId}`);
    return await this.root.resolve(token) as T;
  }

  #key(pluginId: string, contributionId: string): string {
    if (pluginId.trim() === '' || contributionId.trim() === '') throw new CompositionError('COMPOSITION_IMPLEMENTATION_NOT_REGISTERED', 'Plugin and contribution ids are required');
    return `${pluginId}:${contributionId}`;
  }
}
