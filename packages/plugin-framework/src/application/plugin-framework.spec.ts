import { describe, expect, it, vi } from 'vitest';
import { InMemoryEventPublisher, NoopTelemetry } from '@agentprodready/foundation';
import type { ImplementationActivator, PluginCandidate, PluginContributionRegistry, PluginHookResolver, PluginPermissionAuthorizer } from '../contracts/plugin.js';
import { PluginError } from '../errors/plugin-error.js';
import { PluginDependencyGraph } from './dependency-graph.js';
import { PluginDiscoveryService } from './discovery.js';
import { PluginManager } from './plugin-manager.js';
import { InMemoryContributionRegistry, PluginRegistrationPipeline } from './registration.js';
import { PluginManifestValidator } from './validation.js';

function candidate(id: string, dependencies: PluginCandidate['manifest']['dependencies'] = []): PluginCandidate {
  return { location: `/plugins/${id}`, integrity: `sha256:${id}`, manifest: { id, name: id, version: '1.0.0', publisher: 'test', supportedPlatformVersions: ['1.0.0'], dependencies, requiredPermissions: [], contributions: [
    { kind: 'capability', id: `${id}.capability`, version: '1.0.0', metadata: {} },
    { kind: 'provider', id: `${id}.provider`, version: '1.0.0', metadata: {} },
    { kind: 'tool', id: `${id}.tool`, version: '1.0.0', metadata: {} },
    { kind: 'workflow-node', id: `${id}.node`, version: '1.0.0', metadata: {} },
    { kind: 'configuration', id: `${id}.config`, version: '1.0.0', metadata: {} },
  ] } };
}

const allow: PluginPermissionAuthorizer = { authorize: async () => ({ authorized: true, decisionId: 'allow' }) };
const hooks: PluginHookResolver = { resolve: () => ({ activate: vi.fn(async () => undefined), deactivate: vi.fn(async () => undefined) }) };

describe('discovery, validation, and dependencies', () => {
  it('discovers deterministically without executing plugin code', async () => {
    const service = new PluginDiscoveryService([{ discover: async (): Promise<readonly PluginCandidate[]> => [candidate('z'), candidate('a')] }]);
    expect((await service.discover()).map((item) => item.manifest.id)).toEqual(['a', 'z']);
  });
  it('validates manifests, compatibility, and authoritative permissions', async () => {
    const validator = new PluginManifestValidator('1.0.0');
    await expect(validator.validate(candidate('valid'), allow)).resolves.toMatchObject({ manifest: { id: 'valid' } });
    const denied: PluginPermissionAuthorizer = { authorize: async () => ({ authorized: false, decisionId: 'deny' }) };
    await expect(validator.validate(candidate('denied'), denied)).rejects.toMatchObject({ code: 'PLUGIN_PERMISSION_DENIED' });
  });
  it('orders dependencies and rejects missing dependencies and cycles', () => {
    const graph = new PluginDependencyGraph();
    const ordered = graph.order([candidate('b', [{ pluginId: 'a', optional: false, versions: ['1.0.0'] }]), candidate('a')]);
    expect(ordered.map((item) => item.manifest.id)).toEqual(['a', 'b']);
    expect(() => graph.order([candidate('x', [{ pluginId: 'missing', optional: false, versions: [] }])])).toThrowError(PluginError);
    expect(() => graph.order([candidate('a', [{ pluginId: 'b', optional: false, versions: [] }]), candidate('b', [{ pluginId: 'a', optional: false, versions: [] }])])).toThrowError(PluginError);
  });
});

describe('registration and lifecycle', () => {
  it('registers every contribution category as metadata', () => {
    const registries = ['capability', 'provider', 'tool', 'workflow-node', 'configuration'].map((kind) => new InMemoryContributionRegistry(kind as PluginContributionRegistry['kind']));
    new PluginRegistrationPipeline(registries).register(candidate('complete'));
    expect(registries.map((registry) => registry.list().length)).toEqual([1, 1, 1, 1, 1]);
  });
  it('rolls back all metadata after a registration failure', () => {
    const capability = new InMemoryContributionRegistry('capability');
    const failing: PluginContributionRegistry = { kind: 'provider', register: () => { throw new Error('failure'); }, remove: vi.fn(), list: () => [] };
    expect(() => { new PluginRegistrationPipeline([capability, failing]).register(candidate('rollback')); }).toThrowError(PluginError);
    expect(capability.list()).toEqual([]);
  });
  it('manages lifecycle and delegates lazy creation exclusively to Composition', async () => {
    const source = { discover: async (): Promise<readonly PluginCandidate[]> => [candidate('plugin')] };
    const registries = ['capability', 'provider', 'tool', 'workflow-node', 'configuration'].map((kind) => new InMemoryContributionRegistry(kind as PluginContributionRegistry['kind']));
    const implementation = { created: true };
    let activationCalls = 0;
    const activator: ImplementationActivator = {
      activate: <T>(): Promise<T> => {
        activationCalls += 1;
        return Promise.resolve(implementation as T);
      },
    };
    const events = new InMemoryEventPublisher();
    const manager = new PluginManager(new PluginDiscoveryService([source]), new PluginManifestValidator('1.0.0'), new PluginDependencyGraph(), new PluginRegistrationPipeline(registries), allow, hooks, activator, events, new NoopTelemetry());
    await manager.initialize();
    expect(activationCalls).toBe(0);
    await manager.activate('plugin');
    expect(manager.health('plugin').status).toBe('healthy');
    await expect(manager.activateImplementation('plugin', 'plugin.provider')).resolves.toEqual({ created: true });
    expect(activationCalls).toBe(1);
    await manager.shutdown();
    expect(manager.record('plugin')?.state).toBe('inactive');
    expect(events.events().map((event) => event.type)).toEqual(['PluginRegisteredV1', 'PluginActivatedV1', 'PluginDeactivatedV1']);
  });
});
