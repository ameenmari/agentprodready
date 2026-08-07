export type DeploymentEnvironment =
  'development' | 'testing' | 'staging' | 'production' | 'disaster-recovery';
export type DeploymentModel =
  | 'local'
  | 'single-node'
  | 'multi-node'
  | 'cluster'
  | 'containerized'
  | 'kubernetes'
  | 'cloud'
  | 'hybrid';
export type ServiceTopology =
  'monolith' | 'modular-monolith' | 'distributed-services' | 'microservices';
export type DeploymentState =
  | 'defined'
  | 'validating'
  | 'preparing'
  | 'starting'
  | 'verifying'
  | 'ready'
  | 'degraded'
  | 'upgrading'
  | 'rolling-back'
  | 'stopping'
  | 'stopped'
  | 'failed';
export type UpgradeStrategy = 'rolling' | 'blue-green' | 'canary' | 'replacement';
export type RollbackStrategy =
  'previous-version' | 'previous-configuration' | 'previous-deployment';
export interface DeploymentComponent {
  readonly id: string;
  readonly kind: 'api' | 'runtime' | 'persistence' | 'scheduler' | 'worker' | 'platform-host';
  readonly startupOrder: number;
  readonly required: boolean;
  readonly storage: 'persistent' | 'ephemeral' | 'none';
}
export interface ScalingPolicy {
  readonly mode: 'manual' | 'automatic';
  readonly dimension: 'horizontal' | 'vertical';
  readonly minimum: number;
  readonly desired: number;
  readonly maximum: number;
  readonly metricReference: string | null;
}
export interface HealthPolicy {
  readonly requiredChecks: readonly string[];
  readonly readinessTimeoutMs: number;
}
export interface DeploymentDefinition {
  readonly id: string;
  readonly environment: DeploymentEnvironment;
  readonly model: DeploymentModel;
  readonly topology: ServiceTopology;
  readonly version: string;
  readonly configurationProfileReference: string;
  readonly secretReferences: readonly string[];
  readonly components: readonly DeploymentComponent[];
  readonly scaling: ScalingPolicy;
  readonly health: HealthPolicy;
  readonly upgrade: UpgradeStrategy;
  readonly rollback: RollbackStrategy;
  readonly metadata: Readonly<Record<string, string>>;
}
export interface ResolvedDeploymentConfiguration {
  readonly configurationReference: string;
  readonly secretReferences: readonly string[];
  readonly complete: boolean;
}
export interface DeploymentConfiguration {
  resolve(definition: DeploymentDefinition): Promise<ResolvedDeploymentConfiguration>;
}
export interface ComponentHealth {
  readonly componentId: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly checkReference: string;
}
export interface DeploymentHealthSummary {
  readonly ready: boolean;
  readonly checks: readonly ComponentHealth[];
  readonly observedAt: string;
}
export interface DeploymentHealth {
  check(definition: DeploymentDefinition): Promise<DeploymentHealthSummary>;
}
export interface DeploymentProvider {
  readonly kind: string;
  prepare(
    definition: DeploymentDefinition,
    configuration: ResolvedDeploymentConfiguration,
  ): Promise<void>;
  start(component: DeploymentComponent): Promise<void>;
  stop(component: DeploymentComponent): Promise<void>;
  scale(definition: DeploymentDefinition, policy: ScalingPolicy): Promise<void>;
  upgrade(
    definition: DeploymentDefinition,
    targetVersion: string,
    strategy: UpgradeStrategy,
  ): Promise<void>;
  rollback(
    definition: DeploymentDefinition,
    targetVersion: string,
    strategy: RollbackStrategy,
  ): Promise<void>;
}
export interface DeploymentTransition {
  readonly deploymentId: string;
  readonly from: DeploymentState;
  readonly to: DeploymentState;
  readonly reason: string;
  readonly occurredAt: string;
}
export interface DeploymentStatus {
  readonly deploymentId: string;
  readonly state: DeploymentState;
  readonly activeVersion: string;
  readonly previousVersion: string | null;
  readonly providerKind: string;
  readonly health: DeploymentHealthSummary | null;
  readonly transitions: readonly DeploymentTransition[];
}
export interface DeploymentEvent {
  readonly type:
    | 'deployment.started'
    | 'deployment.completed'
    | 'deployment.failed'
    | 'deployment.stopped'
    | 'deployment.scaled'
    | 'deployment.upgrade-started'
    | 'deployment.upgrade-completed'
    | 'deployment.rollback-started'
    | 'deployment.rollback-completed'
    | 'deployment.health-changed';
  readonly deploymentId: string;
  readonly version: string;
  readonly occurredAt: string;
}
export interface DeploymentEvents {
  publish(event: DeploymentEvent): void;
}
export interface DeploymentAuditReference {
  readonly action: 'deploy' | 'scale' | 'upgrade' | 'rollback';
  readonly deploymentId: string;
  readonly environment: DeploymentEnvironment;
  readonly version: string;
  readonly occurredAt: string;
}
export interface DeploymentAudit {
  record(reference: DeploymentAuditReference): void;
}
export interface DeploymentDiagnostic {
  readonly deploymentId: string;
  readonly operation: string;
  readonly state: DeploymentState;
  readonly providerKind: string;
  readonly occurredAt: string;
}
export interface DeploymentDiagnostics {
  record(value: DeploymentDiagnostic): void;
}
export interface DeploymentStore {
  get(id: string): DeploymentStatus | null;
  put(status: DeploymentStatus): void;
}
export type DeploymentErrorCode =
  | 'DEPLOYMENT_FAILED'
  | 'ENVIRONMENT_INVALID'
  | 'HEALTH_CHECK_FAILED'
  | 'UPGRADE_FAILED'
  | 'ROLLBACK_FAILED'
  | 'CONFIGURATION_MISSING'
  | 'DEPLOYMENT_TIMEOUT'
  | 'DEFINITION_INVALID'
  | 'INVALID_TRANSITION';
export class DeploymentError extends Error {
  public constructor(
    public readonly code: DeploymentErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DeploymentError';
  }
}
export interface DeploymentManagerDependencies {
  readonly configuration: DeploymentConfiguration;
  readonly health: DeploymentHealth;
  readonly provider: DeploymentProvider;
  readonly events: DeploymentEvents;
  readonly audit: DeploymentAudit;
  readonly diagnostics: DeploymentDiagnostics;
  readonly store: DeploymentStore;
  readonly now: () => Date;
}
export class DeploymentManager {
  public constructor(private readonly dependencies: DeploymentManagerDependencies) {}
  public async deploy(definition: DeploymentDefinition): Promise<DeploymentStatus> {
    validateDeployment(definition);
    let status = this.initial(definition);
    status = this.transition(status, 'validating', 'definition-valid');
    this.dependencies.events.publish(
      this.event('deployment.started', definition.id, definition.version),
    );
    try {
      const configuration = await this.dependencies.configuration.resolve(definition);
      if (!configuration.complete)
        throw new DeploymentError(
          'CONFIGURATION_MISSING',
          'Deployment configuration is incomplete.',
        );
      status = this.transition(status, 'preparing', 'configuration-resolved');
      await this.dependencies.provider.prepare(definition, configuration);
      status = this.transition(status, 'starting', 'provider-prepared');
      for (const component of ordered(definition.components))
        await this.dependencies.provider.start(component);
      status = this.transition(status, 'verifying', 'components-started');
      const health = await this.dependencies.health.check(definition);
      this.dependencies.events.publish(
        this.event('deployment.health-changed', definition.id, definition.version),
      );
      if (!health.ready)
        throw new DeploymentError('HEALTH_CHECK_FAILED', 'Deployment readiness failed.');
      status = this.transition({ ...status, health }, 'ready', 'readiness-confirmed');
      this.dependencies.store.put(status);
      this.dependencies.events.publish(
        this.event('deployment.completed', definition.id, definition.version),
      );
      if (definition.environment === 'production')
        this.audit('deploy', definition, definition.version);
      return status;
    } catch (error: unknown) {
      status = this.transition(status, 'failed', 'deployment-failed');
      this.dependencies.store.put(status);
      this.dependencies.events.publish(
        this.event('deployment.failed', definition.id, definition.version),
      );
      throw normalizeDeploymentError(error, 'DEPLOYMENT_FAILED');
    }
  }
  public async stop(definition: DeploymentDefinition): Promise<DeploymentStatus> {
    const current = this.require(definition.id),
      stopping = this.transition(current, 'stopping', 'shutdown-requested');
    for (const component of [...ordered(definition.components)].reverse())
      await this.dependencies.provider.stop(component);
    const stopped = this.transition(stopping, 'stopped', 'components-stopped');
    this.dependencies.store.put(stopped);
    this.dependencies.events.publish(
      this.event('deployment.stopped', definition.id, stopped.activeVersion),
    );
    return stopped;
  }
  public async scale(
    definition: DeploymentDefinition,
    policy: ScalingPolicy,
  ): Promise<DeploymentStatus> {
    validateScaling(policy);
    const current = this.requireReady(definition.id);
    await this.dependencies.provider.scale(definition, freeze({ ...policy }));
    this.dependencies.events.publish(
      this.event('deployment.scaled', definition.id, current.activeVersion),
    );
    if (definition.environment === 'production')
      this.audit('scale', definition, current.activeVersion);
    return current;
  }
  public async upgrade(
    definition: DeploymentDefinition,
    targetVersion: string,
  ): Promise<DeploymentStatus> {
    if (!semver(targetVersion))
      throw new DeploymentError('UPGRADE_FAILED', 'Target version is invalid.');
    const current = this.requireReady(definition.id),
      upgrading = this.transition(current, 'upgrading', 'upgrade-requested');
    this.dependencies.events.publish(
      this.event('deployment.upgrade-started', definition.id, targetVersion),
    );
    try {
      await this.dependencies.provider.upgrade(definition, targetVersion, definition.upgrade);
      const health = await this.dependencies.health.check({
        ...definition,
        version: targetVersion,
      });
      if (!health.ready)
        throw new DeploymentError('HEALTH_CHECK_FAILED', 'Upgraded deployment is not ready.');
      const ready = this.transition(
        {
          ...upgrading,
          activeVersion: targetVersion,
          previousVersion: current.activeVersion,
          health,
        },
        'ready',
        'upgrade-ready',
      );
      this.dependencies.store.put(ready);
      this.dependencies.events.publish(
        this.event('deployment.upgrade-completed', definition.id, targetVersion),
      );
      this.audit('upgrade', definition, targetVersion);
      return ready;
    } catch (error: unknown) {
      await this.dependencies.provider.rollback(
        definition,
        current.activeVersion,
        definition.rollback,
      );
      const restored = this.transition(
        {
          ...upgrading,
          activeVersion: current.activeVersion,
          previousVersion: null,
          health: current.health,
        },
        'ready',
        'automatic-rollback-completed',
      );
      this.dependencies.store.put(restored);
      this.dependencies.events.publish(
        this.event('deployment.rollback-completed', definition.id, current.activeVersion),
      );
      throw normalizeDeploymentError(error, 'UPGRADE_FAILED');
    }
  }
  public async rollback(definition: DeploymentDefinition): Promise<DeploymentStatus> {
    const current = this.requireReady(definition.id);
    if (current.previousVersion === null)
      throw new DeploymentError('ROLLBACK_FAILED', 'No previous version is available.');
    const target = current.previousVersion,
      rolling = this.transition(current, 'rolling-back', 'rollback-requested');
    this.dependencies.events.publish(
      this.event('deployment.rollback-started', definition.id, target),
    );
    try {
      await this.dependencies.provider.rollback(definition, target, definition.rollback);
      const health = await this.dependencies.health.check({ ...definition, version: target });
      if (!health.ready)
        throw new DeploymentError('HEALTH_CHECK_FAILED', 'Rolled back deployment is not ready.');
      const ready = this.transition(
        { ...rolling, activeVersion: target, previousVersion: current.activeVersion, health },
        'ready',
        'rollback-ready',
      );
      this.dependencies.store.put(ready);
      this.dependencies.events.publish(
        this.event('deployment.rollback-completed', definition.id, target),
      );
      this.audit('rollback', definition, target);
      return ready;
    } catch (error: unknown) {
      throw normalizeDeploymentError(error, 'ROLLBACK_FAILED');
    }
  }
  private initial(definition: DeploymentDefinition): DeploymentStatus {
    return freeze({
      deploymentId: definition.id,
      state: 'defined',
      activeVersion: definition.version,
      previousVersion: null,
      providerKind: this.dependencies.provider.kind,
      health: null,
      transitions: Object.freeze([]),
    });
  }
  private transition(
    status: DeploymentStatus,
    to: DeploymentState,
    reason: string,
  ): DeploymentStatus {
    const transition = freeze({
        deploymentId: status.deploymentId,
        from: status.state,
        to,
        reason,
        occurredAt: this.dependencies.now().toISOString(),
      }),
      next = freeze({
        ...status,
        state: to,
        transitions: Object.freeze([...status.transitions, transition]),
      });
    this.dependencies.diagnostics.record(
      freeze({
        deploymentId: status.deploymentId,
        operation: reason,
        state: to,
        providerKind: status.providerKind,
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
    return next;
  }
  private require(id: string): DeploymentStatus {
    const value = this.dependencies.store.get(id);
    if (value === null)
      throw new DeploymentError('INVALID_TRANSITION', 'Deployment does not exist.');
    return value;
  }
  private requireReady(id: string): DeploymentStatus {
    const value = this.require(id);
    if (value.state !== 'ready')
      throw new DeploymentError('INVALID_TRANSITION', 'Deployment is not ready.');
    return value;
  }
  private event(
    type: DeploymentEvent['type'],
    deploymentId: string,
    version: string,
  ): DeploymentEvent {
    return freeze({
      type,
      deploymentId,
      version,
      occurredAt: this.dependencies.now().toISOString(),
    });
  }
  private audit(
    action: DeploymentAuditReference['action'],
    definition: DeploymentDefinition,
    version: string,
  ): void {
    this.dependencies.audit.record(
      freeze({
        action,
        deploymentId: definition.id,
        environment: definition.environment,
        version,
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
  }
}
export function validateDeployment(value: DeploymentDefinition): void {
  if (
    value.id.trim() === '' ||
    !semver(value.version) ||
    value.configurationProfileReference.trim() === '' ||
    value.components.length === 0 ||
    new Set(value.components.map((item) => item.id)).size !== value.components.length ||
    value.health.requiredChecks.length === 0 ||
    value.health.readinessTimeoutMs <= 0 ||
    value.secretReferences.some((item) => item.trim() === '')
  )
    throw new DeploymentError('DEFINITION_INVALID', 'Deployment definition is invalid.');
  validateScaling(value.scaling);
}
export function validateScaling(value: ScalingPolicy): void {
  if (
    value.minimum < 0 ||
    value.desired < value.minimum ||
    value.maximum < value.desired ||
    value.maximum < 1
  )
    throw new DeploymentError('DEFINITION_INVALID', 'Scaling policy is invalid.');
}
function ordered(values: readonly DeploymentComponent[]): readonly DeploymentComponent[] {
  return [...values].sort((a, b) => a.startupOrder - b.startupOrder || a.id.localeCompare(b.id));
}
function semver(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
}
function normalizeDeploymentError(error: unknown, fallback: DeploymentErrorCode): DeploymentError {
  return error instanceof DeploymentError
    ? error
    : new DeploymentError(fallback, 'Deployment provider operation failed.', { cause: error });
}
function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}
export * from './reference.js';
