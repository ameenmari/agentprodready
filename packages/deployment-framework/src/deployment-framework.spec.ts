import { describe, expect, it } from 'vitest';
import {
  containerizedReferenceDeployment,
  DeploymentError,
  DeploymentManager,
  InMemoryDeploymentAudit,
  InMemoryDeploymentDiagnostics,
  InMemoryDeploymentEvents,
  InMemoryDeploymentStore,
  localReferenceDeployment,
  RecordingDeploymentProvider,
  StaticDeploymentConfiguration,
  StaticDeploymentHealth,
  validateDeployment,
  type DeploymentManagerDependencies,
} from './index.js';
const at = '2026-08-06T00:00:00.000Z';
interface Fixture {
  readonly manager: DeploymentManager;
  readonly provider: RecordingDeploymentProvider;
  readonly health: StaticDeploymentHealth;
  readonly events: InMemoryDeploymentEvents;
  readonly audit: InMemoryDeploymentAudit;
  readonly diagnostics: InMemoryDeploymentDiagnostics;
  readonly store: InMemoryDeploymentStore;
}
function fixture(overrides: Partial<DeploymentManagerDependencies> = {}): Fixture {
  const provider = new RecordingDeploymentProvider(),
    health = new StaticDeploymentHealth(),
    events = new InMemoryDeploymentEvents(),
    audit = new InMemoryDeploymentAudit(),
    diagnostics = new InMemoryDeploymentDiagnostics(),
    store = new InMemoryDeploymentStore();
  return {
    manager: new DeploymentManager({
      configuration: new StaticDeploymentConfiguration(),
      health,
      provider,
      events,
      audit,
      diagnostics,
      store,
      now: (): Date => new Date(at),
      ...overrides,
    }),
    provider,
    health,
    events,
    audit,
    diagnostics,
    store,
  };
}
describe('definitions, environments, lifecycle, configuration, and health', () => {
  it('standardizes immutable local and containerized definitions', () => {
    expect(localReferenceDeployment).toMatchObject({
      environment: 'development',
      model: 'local',
      topology: 'modular-monolith',
    });
    expect(containerizedReferenceDeployment).toMatchObject({
      environment: 'production',
      model: 'containerized',
      topology: 'distributed-services',
    });
    expect(Object.isFrozen(localReferenceDeployment)).toBe(true);
    expect(Object.isFrozen(containerizedReferenceDeployment.components)).toBe(true);
  });
  it('declares configuration/secret references and persistent/ephemeral requirements', () => {
    expect(containerizedReferenceDeployment.secretReferences).toEqual([
      'secret:api',
      'secret:persistence',
    ]);
    expect(containerizedReferenceDeployment.components.map((item) => item.storage)).toContain(
      'persistent',
    );
    expect(containerizedReferenceDeployment.components.map((item) => item.storage)).toContain(
      'ephemeral',
    );
    expect(JSON.stringify(containerizedReferenceDeployment)).not.toContain('password');
  });
  it('validates definitions and infrastructure-neutral scaling bounds', () => {
    expect(() => {
      validateDeployment(localReferenceDeployment);
    }).not.toThrow();
    expect(() => {
      validateDeployment({ ...localReferenceDeployment, components: [] });
    }).toThrowError(DeploymentError);
    expect(() => {
      validateDeployment({
        ...localReferenceDeployment,
        scaling: { ...localReferenceDeployment.scaling, desired: 2 },
      });
    }).toThrowError(DeploymentError);
  });
  it('starts in declared order and becomes ready from health integration', async () => {
    const value = fixture(),
      status = await value.manager.deploy(containerizedReferenceDeployment);
    expect(status.state).toBe('ready');
    expect(value.provider.operations.slice(0, 5)).toEqual([
      'prepare:containerized-single-node',
      'start:persistence',
      'start:api',
      'start:scheduler',
      'start:worker',
    ]);
    expect(status.health?.ready).toBe(true);
  });
  it('stops in reverse startup order', async () => {
    const value = fixture();
    await value.manager.deploy(containerizedReferenceDeployment);
    await value.manager.stop(containerizedReferenceDeployment);
    expect(value.provider.operations.slice(-4)).toEqual([
      'stop:worker',
      'stop:scheduler',
      'stop:api',
      'stop:persistence',
    ]);
    expect(value.store.get(containerizedReferenceDeployment.id)?.state).toBe('stopped');
  });
  it('rejects missing effective configuration before startup', async () => {
    const value = fixture({ configuration: new StaticDeploymentConfiguration(false) });
    await expect(value.manager.deploy(localReferenceDeployment)).rejects.toMatchObject({
      code: 'CONFIGURATION_MISSING',
    });
    expect(value.provider.operations).toHaveLength(0);
  });
  it('fails readiness using the Observability-owned health port', async () => {
    const health = new StaticDeploymentHealth(false),
      value = fixture({ health });
    await expect(value.manager.deploy(localReferenceDeployment)).rejects.toMatchObject({
      code: 'HEALTH_CHECK_FAILED',
    });
    expect(value.store.get(localReferenceDeployment.id)?.state).toBe('failed');
  });
});
describe('scaling, upgrade, rollback, events, audit, and providers', () => {
  it('delegates infrastructure-neutral scaling', async () => {
    const value = fixture();
    await value.manager.deploy(containerizedReferenceDeployment);
    await value.manager.scale(containerizedReferenceDeployment, {
      ...containerizedReferenceDeployment.scaling,
      desired: 3,
    });
    expect(value.provider.operations).toContain('scale:3');
    expect(value.audit.values.at(-1)?.action).toBe('scale');
  });
  it('upgrades deterministically and records previous version', async () => {
    const value = fixture();
    await value.manager.deploy(containerizedReferenceDeployment);
    const status = await value.manager.upgrade(containerizedReferenceDeployment, '0.2.0');
    expect(status).toMatchObject({
      state: 'ready',
      activeVersion: '0.2.0',
      previousVersion: '0.1.0',
    });
    expect(value.provider.operations).toContain('upgrade:blue-green:0.2.0');
  });
  it('rolls back deterministically with traceability', async () => {
    const value = fixture();
    await value.manager.deploy(containerizedReferenceDeployment);
    await value.manager.upgrade(containerizedReferenceDeployment, '0.2.0');
    const status = await value.manager.rollback(containerizedReferenceDeployment);
    expect(status).toMatchObject({ activeVersion: '0.1.0', previousVersion: '0.2.0' });
    expect(value.audit.values.at(-1)?.action).toBe('rollback');
  });
  it('automatically restores the prior version after failed upgrade health', async () => {
    const health = new StaticDeploymentHealth(),
      value = fixture({ health });
    await value.manager.deploy(containerizedReferenceDeployment);
    health.ready = false;
    await expect(
      value.manager.upgrade(containerizedReferenceDeployment, '0.2.0'),
    ).rejects.toMatchObject({ code: 'HEALTH_CHECK_FAILED' });
    expect(value.provider.operations).toContain('rollback:previous-version:0.1.0');
    expect(value.store.get(containerizedReferenceDeployment.id)?.activeVersion).toBe('0.1.0');
  });
  it('produces lifecycle events audit references and diagnostics without transporting or persisting them', async () => {
    const value = fixture();
    await value.manager.deploy(containerizedReferenceDeployment);
    expect(value.events.values.map((item) => item.type)).toEqual([
      'deployment.started',
      'deployment.health-changed',
      'deployment.completed',
    ]);
    expect(value.audit.values).toHaveLength(1);
    expect(value.diagnostics.values.length).toBeGreaterThan(0);
    expect(value.events.values[0]).not.toHaveProperty('deliveryAttempt');
  });
  it('keeps providers replaceable and platform behavior deployment-independent', async () => {
    for (const kind of ['docker', 'compose'] as const) {
      const provider = new RecordingDeploymentProvider(kind),
        value = fixture({ provider }),
        status = await value.manager.deploy(localReferenceDeployment);
      expect(status).toMatchObject({ state: 'ready', providerKind: kind });
      expect(status).not.toHaveProperty('runtimeState');
    }
    expect(containerizedReferenceDeployment.metadata).toEqual({ profile: 'container' });
  });
});
