import type {
  CapabilityDescriptor,
  CapabilityRegistry,
  CapabilityResolver,
  PluginDescriptor,
  PluginRegistry,
} from '../contracts/foundation.js';
import { FoundationError } from '../errors/foundation-error.js';
import { deepFreeze, requireText } from '../internal/validation.js';

export class PluginManifestValidator {
  public validate(input: PluginDescriptor): PluginDescriptor {
    if (!/^\d+\.\d+\.\d+$/u.test(input.version)) {
      throw new FoundationError('FOUNDATION_INVALID_ARGUMENT', 'Plugin version must be semantic');
    }
    return deepFreeze({
      id: requireText(input.id, 'plugin.id'),
      version: input.version,
      dependencies: [...input.dependencies],
      capabilities: [...input.capabilities],
    });
  }
}

export class InMemoryPluginRegistry implements PluginRegistry {
  readonly #plugins = new Map<string, PluginDescriptor>();
  public constructor(private readonly validator = new PluginManifestValidator()) {}
  public register(input: PluginDescriptor): void {
    const descriptor = this.validator.validate(input);
    if (this.#plugins.has(descriptor.id)) throw new FoundationError('FOUNDATION_DUPLICATE_REGISTRATION', `Plugin ${descriptor.id} exists`);
    this.#plugins.set(descriptor.id, descriptor);
  }
  public get(id: string): PluginDescriptor | undefined { return this.#plugins.get(id); }
  public list(): readonly PluginDescriptor[] { return Object.freeze([...this.#plugins.values()]); }
}

export class InMemoryCapabilityRegistry implements CapabilityRegistry {
  readonly #bindings = new Map<string, CapabilityDescriptor[]>();
  public register(input: CapabilityDescriptor): void {
    const descriptor = deepFreeze({ ...input, capability: requireText(input.capability, 'capability'), providerId: requireText(input.providerId, 'providerId') });
    if (!Number.isInteger(descriptor.priority)) throw new FoundationError('FOUNDATION_INVALID_ARGUMENT', 'priority must be an integer');
    const current = this.#bindings.get(descriptor.capability) ?? [];
    if (current.some((entry) => entry.providerId === descriptor.providerId)) throw new FoundationError('FOUNDATION_DUPLICATE_REGISTRATION', 'Capability provider exists');
    this.#bindings.set(descriptor.capability, [...current, descriptor]);
  }
  public find(capability: string): readonly CapabilityDescriptor[] {
    return Object.freeze([...(this.#bindings.get(capability) ?? [])].sort((a, b) => a.priority - b.priority || a.providerId.localeCompare(b.providerId)));
  }
}

export class DeterministicCapabilityResolver implements CapabilityResolver {
  public constructor(private readonly registry: CapabilityRegistry) {}
  public resolve(capability: string): CapabilityDescriptor {
    const selected = this.registry.find(requireText(capability, 'capability'))[0];
    if (selected === undefined) throw new FoundationError('FOUNDATION_CAPABILITY_NOT_FOUND', `No provider for ${capability}`);
    return selected;
  }
}
