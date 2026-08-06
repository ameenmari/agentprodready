import { describe, expect, it, vi } from 'vitest';
import type { HealthContributor, LifecycleComponent } from '../contracts/foundation.js';
import { FoundationError } from '../errors/foundation-error.js';
import { ApplicationHost } from './application-host.js';
import { ConfigurationSnapshotFactory } from './configuration-snapshot-factory.js';
import { ExecutionContextFactory } from './execution-context-factory.js';
import { HealthService, ReadinessService } from './health.js';
import { DeterministicCapabilityResolver, InMemoryCapabilityRegistry, InMemoryPluginRegistry } from './registries.js';

function component(id: string, dependencies: readonly string[], events: string[], fails = false): LifecycleComponent {
  return {
    id,
    dependencies,
    start: vi.fn(async () => { events.push(`start:${id}`); if (fails) throw new Error('failure'); }),
    stop: vi.fn(async () => { events.push(`stop:${id}`); }),
  };
}

describe('ApplicationHost', () => {
  it('starts in dependency order and stops in exact reverse order', async () => {
    const events: string[] = [];
    const host = new ApplicationHost([component('extensions', ['core'], events), component('core', [], events)]);
    await host.start();
    await host.stop();
    expect(events).toEqual(['start:core', 'start:extensions', 'stop:extensions', 'stop:core']);
    expect(host.status().state).toBe('stopped');
  });

  it('rolls back started components after startup failure', async () => {
    const events: string[] = [];
    const host = new ApplicationHost([component('a', [], events), component('b', ['a'], events, true)]);
    await expect(host.start()).rejects.toMatchObject({ code: 'FOUNDATION_STARTUP_FAILED' });
    expect(events).toEqual(['start:a', 'start:b', 'stop:a']);
    expect(host.status().state).toBe('failed');
  });

  it('rejects missing and cyclic dependencies', () => {
    expect(() => new ApplicationHost([component('a', ['missing'], [])])).toThrowError(FoundationError);
    expect(() => new ApplicationHost([component('a', ['b'], []), component('b', ['a'], [])])).toThrowError(FoundationError);
  });
});

describe('immutable foundation contracts', () => {
  it('creates an immutable normalized ExecutionContext', () => {
    const context = new ExecutionContextFactory().create({
      executionId: 'execution-1', correlationId: 'correlation-1', startedAt: '2026-08-06T00:00:00Z',
      configurationVersion: 'v1', securityContextId: 'security-1', attributes: { region: 'test' },
    });
    expect(context.startedAt).toBe('2026-08-06T00:00:00.000Z');
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.attributes)).toBe(true);
  });

  it('copies and freezes configuration snapshots', () => {
    const values = { nested: { enabled: true } };
    const snapshot = new ConfigurationSnapshotFactory().create('v1', values);
    values.nested.enabled = false;
    expect(snapshot.values).toEqual({ nested: { enabled: true } });
    expect(Object.isFrozen(snapshot.values)).toBe(true);
  });
});

describe('bootstrap registries', () => {
  it('validates and stores plugin metadata without instances', () => {
    const registry = new InMemoryPluginRegistry();
    registry.register({ id: 'test', version: '1.0.0', dependencies: [], capabilities: ['example'] });
    expect(registry.get('test')?.capabilities).toEqual(['example']);
  });

  it('resolves capability metadata deterministically', () => {
    const registry = new InMemoryCapabilityRegistry();
    registry.register({ capability: 'text', providerId: 'b', priority: 10, version: '1' });
    registry.register({ capability: 'text', providerId: 'a', priority: 10, version: '1' });
    expect(new DeterministicCapabilityResolver(registry).resolve('text').providerId).toBe('a');
  });
});

describe('health and readiness', () => {
  it('is ready only when every contributor is healthy', async () => {
    const contributors: HealthContributor[] = [
      { health: async () => ({ name: 'foundation', status: 'healthy' }) },
      { health: async () => ({ name: 'dependency', status: 'degraded' }) },
    ];
    expect(await new ReadinessService(new HealthService(contributors)).isReady()).toBe(false);
  });
});
