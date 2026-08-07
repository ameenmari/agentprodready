import type { EventPublisher, HealthResult, Telemetry } from '@agentprodready/foundation';
import type { ImplementationActivator, PluginCandidate, PluginHookResolver, PluginLifecycleEvent, PluginPermissionAuthorizer, PluginRecord } from '../contracts/plugin.js';
import { PluginError } from '../errors/plugin-error.js';
import type { PluginDependencyGraph } from './dependency-graph.js';
import type { PluginDiscoveryService } from './discovery.js';
import type { PluginRegistrationPipeline } from './registration.js';
import type { PluginManifestValidator } from './validation.js';

export class PluginManager {
  readonly #records = new Map<string, PluginRecord>();
  readonly #activationOrder: string[] = [];
  public constructor(
    private readonly discovery: PluginDiscoveryService, private readonly validator: PluginManifestValidator,
    private readonly graph: PluginDependencyGraph, private readonly registration: PluginRegistrationPipeline,
    private readonly authorizer: PluginPermissionAuthorizer, private readonly hooks: PluginHookResolver,
    private readonly implementations: ImplementationActivator, private readonly events: EventPublisher,
    private readonly telemetry: Telemetry,
  ) {}

  public async initialize(): Promise<void> {
    const discovered = await this.discovery.discover();
    const validated: PluginCandidate[] = [];
    for (const candidate of discovered) {
      this.#records.set(candidate.manifest.id, { candidate, state: 'discovered' });
      validated.push(await this.validator.validate(candidate, this.authorizer));
      this.#records.set(candidate.manifest.id, { candidate, state: 'validated' });
    }
    for (const candidate of this.graph.order(validated)) {
      this.registration.register(candidate);
      this.#records.set(candidate.manifest.id, { candidate, state: 'registered' });
      await this.#fact(candidate, 'PluginRegisteredV1', 'registered');
    }
  }

  public async activate(pluginId: string): Promise<void> {
    const record = this.#required(pluginId);
    if (record.state === 'active') return;
    if (record.state !== 'registered' && record.state !== 'inactive') throw new PluginError('PLUGIN_INVALID_TRANSITION', `Cannot activate ${pluginId} from ${record.state}`);
    this.#records.set(pluginId, { ...record, state: 'activating' });
    try { await this.hooks.resolve(pluginId)?.activate(); this.#records.set(pluginId, { ...record, state: 'active' }); this.#activationOrder.push(pluginId); await this.#fact(record.candidate, 'PluginActivatedV1', 'active'); }
    catch (cause) { this.#records.set(pluginId, { ...record, state: 'failed', failure: String(cause) }); throw new PluginError('PLUGIN_INVALID_TRANSITION', `Activation failed for ${pluginId}`, { cause }); }
  }

  public async deactivate(pluginId: string): Promise<void> {
    const record = this.#required(pluginId);
    if (record.state === 'inactive') return;
    if (record.state !== 'active') throw new PluginError('PLUGIN_INVALID_TRANSITION', `Cannot deactivate ${pluginId} from ${record.state}`);
    this.#records.set(pluginId, { ...record, state: 'deactivating' });
    await this.hooks.resolve(pluginId)?.deactivate();
    this.#records.set(pluginId, { ...record, state: 'inactive' });
    const index = this.#activationOrder.lastIndexOf(pluginId); if (index >= 0) this.#activationOrder.splice(index, 1);
    await this.#fact(record.candidate, 'PluginDeactivatedV1', 'inactive');
  }

  public async shutdown(): Promise<void> { for (const id of [...this.#activationOrder].reverse()) await this.deactivate(id); }
  public async activateImplementation<T>(pluginId: string, contributionId: string): Promise<T> { this.#required(pluginId); return this.implementations.activate<T>(pluginId, contributionId); }
  public record(pluginId: string): PluginRecord | undefined { return this.#records.get(pluginId); }
  public health(pluginId: string): HealthResult { const record = this.#required(pluginId); return Object.freeze({ name: `plugin:${pluginId}`, status: record.state === 'active' ? 'healthy' : record.state === 'failed' ? 'unhealthy' : 'degraded', details: { state: record.state } }); }
  #required(id: string): PluginRecord { const record = this.#records.get(id); if (record === undefined) throw new PluginError('PLUGIN_NOT_FOUND', `Plugin ${id} not found`); return record; }
  async #fact(candidate: PluginCandidate, type: string, state: PluginRecord['state']): Promise<void> {
    this.telemetry.log(type, { pluginId: candidate.manifest.id }); this.telemetry.record('agentprodready.plugin.lifecycle', 1);
    const event: PluginLifecycleEvent = { eventId: `${type}:${candidate.manifest.id}:${candidate.manifest.version}`, type, version: 1, occurredAt: new Date().toISOString(), correlationId: `plugin:${candidate.manifest.id}`, payload: { pluginId: candidate.manifest.id, pluginVersion: candidate.manifest.version, state } };
    await this.events.publish(event);
  }
}
