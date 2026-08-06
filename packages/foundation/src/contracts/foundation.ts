export type LifecycleStatus =
  | 'registered'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'failed';

export interface LifecycleComponent {
  readonly id: string;
  readonly dependencies: readonly string[];
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface HostStatus {
  readonly state: 'idle' | 'starting' | 'started' | 'stopping' | 'stopped' | 'failed';
  readonly components: Readonly<Record<string, LifecycleStatus>>;
}

export interface ExecutionContext {
  readonly executionId: string;
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly workspaceId?: string;
  readonly startedAt: string;
  readonly configurationVersion: string;
  readonly securityContextId: string;
  /** Security-owned immutable context reference incorporated by the sole ExecutionContextFactory. */
  readonly securityContext?: SecurityContextReference;
  readonly attributes: Readonly<Record<string, string>>;
}

export interface CreateExecutionContextRequest {
  readonly executionId: string;
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly workspaceId?: string;
  readonly startedAt?: string;
  readonly configurationVersion: string;
  readonly securityContextId: string;
  /** Supplied by Blueprint 15; Foundation incorporates but never derives authority. */
  readonly securityContext?: SecurityContextReference;
  readonly attributes?: Readonly<Record<string, string>>;
}

/** Bootstrap projection owned semantically by Blueprint 15 Security & Authorization. */
export interface SecurityContextReference {
  readonly id: string;
  readonly version: string;
  readonly principalId: string;
  readonly decisionId: string;
  readonly expiresAt: string;
}

export interface EffectiveConfiguration {
  readonly version: string;
  readonly values: Readonly<Record<string, unknown>>;
}

export interface SecretReference {
  readonly provider: string;
  readonly key: string;
  readonly version?: string;
}

export interface PluginDescriptor {
  readonly id: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly capabilities: readonly string[];
}

export interface CapabilityDescriptor {
  readonly capability: string;
  readonly providerId: string;
  readonly priority: number;
  readonly version: string;
}

export interface AuthorizationRequest {
  readonly principalId: string;
  readonly operation: string;
  readonly resource: string;
}

export interface AuthorizationDecision {
  readonly authorized: boolean;
  readonly decisionId: string;
  readonly reason?: string;
}

export interface PlatformEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly type: string;
  readonly version: 1;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly payload: TPayload;
}

export interface AuditRecord {
  readonly recordId: string;
  readonly action: string;
  readonly occurredAt: string;
  readonly correlationId: string;
}

export interface HealthResult {
  readonly name: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly details?: Readonly<Record<string, string>>;
}

/** Bootstrap owner: Blueprint 02. */
export interface PluginDiscovery { discover(): Promise<readonly PluginDescriptor[]>; }
/** Bootstrap owner: Blueprint 02. */
export interface PluginRegistry {
  register(descriptor: PluginDescriptor): void;
  get(id: string): PluginDescriptor | undefined;
  list(): readonly PluginDescriptor[];
}
/** Bootstrap owner: Blueprint 04. Contract only. */
export interface RuntimePort { execute(request: unknown): Promise<unknown>; }
/** Bootstrap owner: Blueprint 07. */
export interface CapabilityRegistry {
  register(descriptor: CapabilityDescriptor): void;
  find(capability: string): readonly CapabilityDescriptor[];
}
/** Bootstrap owner: Blueprint 07. */
export interface CapabilityResolver { resolve(capability: string): CapabilityDescriptor; }
/** Bootstrap owner: Blueprint 15. */
export interface AuthorizationService { authorize(request: AuthorizationRequest): Promise<AuthorizationDecision>; }
/** Bootstrap owner: Blueprint 16. */
export interface EventPublisher { publish<T>(event: PlatformEvent<T>): Promise<void>; }
/** Bootstrap owner: Blueprint 17. */
export interface AuditPublisher { publish(record: AuditRecord): Promise<void>; }
/** Bootstrap owner: Blueprint 22. */
export interface Telemetry {
  log(message: string, attributes?: Readonly<Record<string, string>>): void;
  record(metric: string, value: number): void;
}
/** Bootstrap owner: Blueprint 22. */
export interface HealthContributor { health(): Promise<HealthResult>; }
/** Bootstrap owner: Blueprint 23. */
export interface ConfigurationProvider { load(): Promise<EffectiveConfiguration>; }
/** Bootstrap owner: Blueprint 23. */
export interface SecretProvider { resolve(reference: SecretReference): Promise<string>; }
/** Bootstrap owner: Blueprint 24. Contract only. */
export interface Repository<T> { get(id: string): Promise<T | undefined>; save(id: string, value: T): Promise<void>; }
/** Bootstrap owner: Blueprint 24. Contract only. */
export interface TransactionManager { transaction<T>(work: () => Promise<T>): Promise<T>; }
/** Bootstrap owner: Blueprint 24. Contract only. */
export interface SnapshotStore<T> { load(id: string): Promise<T | undefined>; store(id: string, value: T): Promise<void>; }
