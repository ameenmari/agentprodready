import type {
  ComponentHealth,
  DeploymentAudit,
  DeploymentAuditReference,
  DeploymentConfiguration,
  DeploymentDefinition,
  DeploymentDiagnostic,
  DeploymentDiagnostics,
  DeploymentEvent,
  DeploymentEvents,
  DeploymentHealth,
  DeploymentHealthSummary,
  DeploymentProvider,
  DeploymentStatus,
  DeploymentStore,
  ResolvedDeploymentConfiguration,
  RollbackStrategy,
  ScalingPolicy,
  UpgradeStrategy,
  DeploymentComponent,
} from './index.js';
const component = (
  id: string,
  kind: DeploymentComponent['kind'],
  startupOrder: number,
  storage: DeploymentComponent['storage'],
): DeploymentComponent => Object.freeze({ id, kind, startupOrder, required: true, storage });
export const localReferenceDeployment: DeploymentDefinition = Object.freeze({
  id: 'local-development',
  environment: 'development',
  model: 'local',
  topology: 'modular-monolith',
  version: '0.1.0',
  configurationProfileReference: 'configuration:local',
  secretReferences: Object.freeze(['secret:local-api']),
  components: Object.freeze([
    component('platform-host', 'platform-host', 1, 'none'),
    component('application-data', 'persistence', 2, 'persistent'),
    component('working-cache', 'persistence', 3, 'ephemeral'),
  ]),
  scaling: Object.freeze({
    mode: 'manual',
    dimension: 'horizontal',
    minimum: 1,
    desired: 1,
    maximum: 1,
    metricReference: null,
  }),
  health: Object.freeze({
    requiredChecks: Object.freeze(['api', 'runtime', 'persistence', 'scheduler']),
    readinessTimeoutMs: 30000,
  }),
  upgrade: 'rolling',
  rollback: 'previous-version',
  metadata: Object.freeze({ profile: 'local' }),
});
export const containerizedReferenceDeployment: DeploymentDefinition = Object.freeze({
  id: 'containerized-single-node',
  environment: 'production',
  model: 'containerized',
  topology: 'distributed-services',
  version: '0.1.0',
  configurationProfileReference: 'configuration:container',
  secretReferences: Object.freeze(['secret:api', 'secret:persistence']),
  components: Object.freeze([
    component('persistence', 'persistence', 1, 'persistent'),
    component('api', 'api', 2, 'none'),
    component('scheduler', 'scheduler', 3, 'persistent'),
    component('worker', 'worker', 4, 'ephemeral'),
  ]),
  scaling: Object.freeze({
    mode: 'manual',
    dimension: 'horizontal',
    minimum: 1,
    desired: 2,
    maximum: 4,
    metricReference: null,
  }),
  health: Object.freeze({
    requiredChecks: Object.freeze(['api', 'persistence', 'scheduler', 'worker']),
    readinessTimeoutMs: 60000,
  }),
  upgrade: 'blue-green',
  rollback: 'previous-version',
  metadata: Object.freeze({ profile: 'container' }),
});
export class StaticDeploymentConfiguration implements DeploymentConfiguration {
  public constructor(private readonly complete = true) {}
  public async resolve(definition: DeploymentDefinition): Promise<ResolvedDeploymentConfiguration> {
    return Object.freeze({
      configurationReference: definition.configurationProfileReference,
      secretReferences: Object.freeze([...definition.secretReferences]),
      complete: this.complete,
    });
  }
}
export class StaticDeploymentHealth implements DeploymentHealth {
  public constructor(public ready = true) {}
  public async check(definition: DeploymentDefinition): Promise<DeploymentHealthSummary> {
    const checks: ComponentHealth[] = definition.components.map((item) =>
      Object.freeze({
        componentId: item.id,
        status: this.ready ? 'healthy' : 'unhealthy',
        checkReference: `health:${item.id}`,
      }),
    );
    return Object.freeze({
      ready: this.ready,
      checks: Object.freeze(checks),
      observedAt: '2026-08-06T00:00:00.000Z',
    });
  }
}
export class RecordingDeploymentProvider implements DeploymentProvider {
  public readonly kind: string;
  public readonly operations: string[] = [];
  public constructor(kind = 'reference') {
    this.kind = kind;
  }
  public async prepare(
    definition: DeploymentDefinition,
    _configuration: ResolvedDeploymentConfiguration,
  ): Promise<void> {
    this.operations.push(`prepare:${definition.id}`);
  }
  public async start(component: DeploymentComponent): Promise<void> {
    this.operations.push(`start:${component.id}`);
  }
  public async stop(component: DeploymentComponent): Promise<void> {
    this.operations.push(`stop:${component.id}`);
  }
  public async scale(_definition: DeploymentDefinition, policy: ScalingPolicy): Promise<void> {
    this.operations.push(`scale:${String(policy.desired)}`);
  }
  public async upgrade(
    _definition: DeploymentDefinition,
    targetVersion: string,
    strategy: UpgradeStrategy,
  ): Promise<void> {
    this.operations.push(`upgrade:${strategy}:${targetVersion}`);
  }
  public async rollback(
    _definition: DeploymentDefinition,
    targetVersion: string,
    strategy: RollbackStrategy,
  ): Promise<void> {
    this.operations.push(`rollback:${strategy}:${targetVersion}`);
  }
}
export class InMemoryDeploymentStore implements DeploymentStore {
  private readonly values = new Map<string, DeploymentStatus>();
  public get(id: string): DeploymentStatus | null {
    return this.values.get(id) ?? null;
  }
  public put(status: DeploymentStatus): void {
    this.values.set(status.deploymentId, status);
  }
}
export class InMemoryDeploymentEvents implements DeploymentEvents {
  public readonly values: DeploymentEvent[] = [];
  public publish(event: DeploymentEvent): void {
    this.values.push(event);
  }
}
export class InMemoryDeploymentAudit implements DeploymentAudit {
  public readonly values: DeploymentAuditReference[] = [];
  public record(value: DeploymentAuditReference): void {
    this.values.push(value);
  }
}
export class InMemoryDeploymentDiagnostics implements DeploymentDiagnostics {
  public readonly values: DeploymentDiagnostic[] = [];
  public record(value: DeploymentDiagnostic): void {
    this.values.push(value);
  }
}
