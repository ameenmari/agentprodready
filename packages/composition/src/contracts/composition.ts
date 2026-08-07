import type { CreateExecutionContextRequest, ExecutionContext } from '@agentprodready/foundation';

declare const serviceType: unique symbol;
export interface ServiceToken<T> {
  readonly id: symbol;
  readonly description: string;
  readonly [serviceType]?: T;
}

export function createServiceToken<T>(description: string): ServiceToken<T> {
  if (description.trim() === '') throw new TypeError('Service token description must not be empty');
  return Object.freeze({ id: Symbol(description), description });
}

export type ServiceLifetime = 'singleton' | 'scoped' | 'transient';

export interface DependencyResolver {
  resolve<T>(token: ServiceToken<T>): Promise<T>;
}

export interface ServiceDecorator<T> {
  readonly id: string;
  readonly order: number;
  decorate(value: T, resolver: DependencyResolver): T | Promise<T>;
}

export interface ServiceRegistration<T> {
  readonly token: ServiceToken<T>;
  readonly lifetime: ServiceLifetime;
  readonly dependencies: readonly ServiceToken<unknown>[];
  readonly factory: (resolver: DependencyResolver) => T | Promise<T>;
  readonly decorators?: readonly ServiceDecorator<T>[];
  readonly provenance: string;
  readonly factoryId: string;
}

export interface RegistrationBuilder {
  register<T>(registration: ServiceRegistration<T>): void;
}

export interface ModuleRegistrar {
  readonly id: string;
  register(builder: RegistrationBuilder): void;
}

export interface ExecutionScope extends DependencyResolver {
  readonly context: ExecutionContext;
  readonly disposed: boolean;
  dispose(): Promise<void>;
}

/** Bootstrap consumer: Blueprint 04 Runtime owns when scopes are opened and disposed. */
export interface ExecutionScopeFactory {
  createExecutionScope(request: CreateExecutionContextRequest): ExecutionScope;
}

/** Bootstrap owner: Blueprint 22 Observability owns telemetry processing. */
export interface CompositionTelemetry {
  registration(token: string, lifetime: ServiceLifetime, provenance: string): void;
  built(registrationCount: number): void;
  scopeCreated(executionId: string): void;
  scopeDisposed(executionId: string): void;
  resolutionFailed(token: string, code: string): void;
}

export interface RegistrationDiagnostic {
  readonly token: string;
  readonly lifetime: ServiceLifetime;
  readonly dependencies: readonly string[];
  readonly factoryId: string;
  readonly decorators: readonly string[];
  readonly provenance: string;
  readonly instantiated: boolean;
}

export interface CompositionDiagnostics {
  readonly built: boolean;
  readonly registrations: readonly RegistrationDiagnostic[];
}

export interface DisposableService { dispose(): void | Promise<void>; }

export const EXECUTION_CONTEXT = createServiceToken<ExecutionContext>('agentprodready.execution-context');
