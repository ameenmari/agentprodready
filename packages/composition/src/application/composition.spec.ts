import { describe, expect, it, vi } from 'vitest';
import { ApplicationHost, ExecutionContextFactory } from '@agentprodready/foundation';
import type { CreateExecutionContextRequest, LifecycleComponent } from '@agentprodready/foundation';
import type { ModuleRegistrar, ServiceLifetime, ServiceRegistration } from '../contracts/composition.js';
import { EXECUTION_CONTEXT, createServiceToken } from '../contracts/composition.js';
import { CompositionError } from '../errors/composition-error.js';
import { CompositionRoot } from './composition-root.js';
import { CompositionImplementationActivator, PluginCompositionRegistrar } from './plugin-composition.js';

const contextRequest = (id: string): CreateExecutionContextRequest => ({
  executionId: id,
  correlationId: `correlation-${id}`,
  configurationVersion: 'v1',
  securityContextId: `security-${id}`,
});

describe('Composition Root registration and validation', () => {
  it('is the single build authority for module and plugin registrations', () => {
    const root = new CompositionRoot();
    const moduleToken = createServiceToken<string>('module-service');
    const pluginToken = createServiceToken<object>('plugin-service');
    const module: ModuleRegistrar = {
      id: 'module',
      register: (builder) => { builder.register({ token: moduleToken, lifetime: 'singleton', dependencies: [], factory: () => 'module', provenance: 'module:test', factoryId: 'module.factory' }); },
    };
    root.registerModule(module);
    const pluginRegistration: ServiceRegistration<unknown> = { token: pluginToken, lifetime: 'singleton', dependencies: [], factory: () => ({ plugin: true }), provenance: 'ignored', factoryId: 'plugin.factory' };
    new PluginCompositionRegistrar(root).register('example', [pluginRegistration]);
    root.build();
    expect(root.diagnostics().registrations.map((item) => item.provenance)).toEqual(['module:test', 'plugin:example']);
    expect(() => { root.registerModule(module); }).toThrowError(CompositionError);
  });

  it('supports exactly singleton, scoped, and transient lifetimes', () => {
    const lifetimes = ['singleton', 'scoped', 'transient'] as const satisfies readonly ServiceLifetime[];
    expect(lifetimes).toEqual(['singleton', 'scoped', 'transient']);
  });

  it('rejects duplicates, missing dependencies, cycles, and singleton scope leakage before use', () => {
    const duplicate = createServiceToken<object>('duplicate');
    const root = new CompositionRoot();
    root.register({ token: duplicate, lifetime: 'singleton', dependencies: [], factory: () => ({}), provenance: 'test', factoryId: 'first' });
    expect(() => { root.register({ token: duplicate, lifetime: 'singleton', dependencies: [], factory: () => ({}), provenance: 'test', factoryId: 'second' }); }).toThrowError(CompositionError);

    const missingRoot = new CompositionRoot();
    const missing = createServiceToken<object>('missing');
    const consumer = createServiceToken<object>('consumer');
    missingRoot.register({ token: consumer, lifetime: 'transient', dependencies: [missing], factory: () => ({}), provenance: 'test', factoryId: 'consumer' });
    expect(() => { missingRoot.build(); }).toThrowError(CompositionError);

    const cycleRoot = new CompositionRoot();
    const a = createServiceToken<object>('a'); const b = createServiceToken<object>('b');
    cycleRoot.register({ token: a, lifetime: 'transient', dependencies: [b], factory: () => ({}), provenance: 'test', factoryId: 'a' });
    cycleRoot.register({ token: b, lifetime: 'transient', dependencies: [a], factory: () => ({}), provenance: 'test', factoryId: 'b' });
    expect(() => { cycleRoot.build(); }).toThrowError(CompositionError);

    const lifetimeRoot = new CompositionRoot();
    const scoped = createServiceToken<object>('scoped'); const singleton = createServiceToken<object>('singleton');
    lifetimeRoot.register({ token: scoped, lifetime: 'scoped', dependencies: [], factory: () => ({}), provenance: 'test', factoryId: 'scoped' });
    lifetimeRoot.register({ token: singleton, lifetime: 'singleton', dependencies: [scoped], factory: async (resolver) => resolver.resolve(scoped), provenance: 'test', factoryId: 'singleton' });
    expect(() => { lifetimeRoot.build(); }).toThrowError(CompositionError);
  });
});

describe('lifetimes, execution scopes, and disposal', () => {
  it('creates lazy lifetime-correct instances and isolated execution scopes', async () => {
    const root = new CompositionRoot();
    const singleton = createServiceToken<object>('singleton');
    const scoped = createServiceToken<object>('scoped');
    const transient = createServiceToken<object>('transient');
    let singletonCount = 0; let scopedCount = 0; let transientCount = 0;
    root.register({ token: singleton, lifetime: 'singleton', dependencies: [], factory: () => ({ id: ++singletonCount }), provenance: 'test', factoryId: 'singleton' });
    root.register({ token: scoped, lifetime: 'scoped', dependencies: [EXECUTION_CONTEXT], factory: async (resolver) => ({ id: ++scopedCount, context: await resolver.resolve(EXECUTION_CONTEXT) }), provenance: 'test', factoryId: 'scoped' });
    root.register({ token: transient, lifetime: 'transient', dependencies: [], factory: () => ({ id: ++transientCount }), provenance: 'test', factoryId: 'transient' });
    root.build();
    expect(singletonCount + scopedCount + transientCount).toBe(0);
    expect(await root.resolve(singleton)).toBe(await root.resolve(singleton));
    const first = root.createExecutionScope(contextRequest('one'));
    const second = root.createExecutionScope(contextRequest('two'));
    expect(await first.resolve(scoped)).toBe(await first.resolve(scoped));
    expect(await first.resolve(scoped)).not.toBe(await second.resolve(scoped));
    expect(await first.resolve(transient)).not.toBe(await first.resolve(transient));
    expect((await first.resolve(scoped) as { context: { executionId: string } }).context.executionId).toBe('one');
    await first.dispose(); await second.dispose(); await root.dispose();
  });

  it('creates each ExecutionContext exclusively through the factory and disposes in reverse order', async () => {
    const factory = new ExecutionContextFactory();
    const create = vi.spyOn(factory, 'create');
    const root = new CompositionRoot(factory);
    const events: string[] = [];
    const first = createServiceToken<{ dispose(): void }>('first');
    const second = createServiceToken<{ dispose(): void }>('second');
    root.register({ token: first, lifetime: 'scoped', dependencies: [], factory: () => ({ dispose: (): void => { events.push('first'); } }), provenance: 'test', factoryId: 'first' });
    root.register({ token: second, lifetime: 'scoped', dependencies: [first], factory: async (resolver) => { await resolver.resolve(first); return { dispose: (): void => { events.push('second'); } }; }, provenance: 'test', factoryId: 'second' });
    root.build();
    const scope = root.createExecutionScope(contextRequest('factory'));
    expect(create).toHaveBeenCalledOnce();
    expect(scope.context).toBe(await scope.resolve(EXECUTION_CONTEXT));
    await scope.resolve(second); await scope.dispose();
    expect(events).toEqual(['second', 'first']);
  });
});

describe('lazy activation, decorators, diagnostics, and failures', () => {
  it('delegates Blueprint 02 lazy implementation activation to Composition', async () => {
    const root = new CompositionRoot();
    const provider = createServiceToken<object>('provider');
    let constructions = 0;
    root.register({ token: provider, lifetime: 'singleton', dependencies: [], factory: () => ({ sequence: ++constructions }), provenance: 'plugin:example', factoryId: 'provider.factory' });
    const activator = new CompositionImplementationActivator(root);
    activator.bind('example', 'provider', provider);
    root.build();
    expect(constructions).toBe(0);
    await activator.activate('example', 'provider');
    expect(constructions).toBe(1);
  });

  it('applies decorators deterministically and exposes immutable diagnostics', async () => {
    const root = new CompositionRoot();
    const token = createServiceToken<string>('decorated');
    root.register({
      token, lifetime: 'singleton', dependencies: [], factory: () => 'service', provenance: 'module:test', factoryId: 'service.factory',
      decorators: [
        { id: 'second', order: 20, decorate: (value): string => `${value}:second` },
        { id: 'first', order: 10, decorate: (value): string => `${value}:first` },
      ],
    });
    root.build();
    expect(await root.resolve(token)).toBe('service:first:second');
    const diagnostics = root.diagnostics();
    expect(diagnostics.registrations[0]).toMatchObject({ token: 'decorated', lifetime: 'singleton', factoryId: 'service.factory', instantiated: true });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(Object.isFrozen(diagnostics.registrations)).toBe(true);
  });

  it('prevents resolution before validation and after disposal', async () => {
    const root = new CompositionRoot();
    const token = createServiceToken<object>('service');
    root.register({ token, lifetime: 'singleton', dependencies: [], factory: () => ({}), provenance: 'test', factoryId: 'service' });
    await expect(root.resolve(token)).rejects.toMatchObject({ code: 'COMPOSITION_RESOLUTION_FAILED' });
    root.build(); await root.dispose();
    await expect(root.resolve(token)).rejects.toMatchObject({ code: 'COMPOSITION_DISPOSED' });
  });

  it('prevents platform startup when composition validation fails', async () => {
    const root = new CompositionRoot();
    const consumer = createServiceToken<object>('invalid-consumer');
    const absent = createServiceToken<object>('absent');
    root.register({ token: consumer, lifetime: 'singleton', dependencies: [absent], factory: () => ({}), provenance: 'test', factoryId: 'invalid' });
    const compositionLifecycle: LifecycleComponent = {
      id: 'composition',
      dependencies: [],
      start: async (): Promise<void> => { root.build(); },
      stop: async (): Promise<void> => undefined,
    };
    const host = new ApplicationHost([compositionLifecycle]);
    await expect(host.start()).rejects.toMatchObject({ code: 'FOUNDATION_STARTUP_FAILED' });
    expect(host.status().state).toBe('failed');
  });

  it('rejects hidden factory dependencies that were not declared', async () => {
    const root = new CompositionRoot();
    const dependency = createServiceToken<object>('declared-service');
    const consumer = createServiceToken<object>('hidden-consumer');
    root.register({ token: dependency, lifetime: 'singleton', dependencies: [], factory: () => ({}), provenance: 'test', factoryId: 'dependency' });
    root.register({ token: consumer, lifetime: 'transient', dependencies: [], factory: async (resolver) => resolver.resolve(dependency), provenance: 'test', factoryId: 'consumer' });
    root.build();
    await expect(root.resolve(consumer)).rejects.toMatchObject({ code: 'COMPOSITION_MISSING_DEPENDENCY' });
  });
});
