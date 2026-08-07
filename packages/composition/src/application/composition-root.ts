import type { CreateExecutionContextRequest, ExecutionContext } from '@agentprodready/foundation';
import { ExecutionContextFactory } from '@agentprodready/foundation';
import type {
  CompositionDiagnostics,
  CompositionTelemetry,
  DependencyResolver,
  DisposableService,
  ExecutionScope,
  ExecutionScopeFactory,
  ModuleRegistrar,
  RegistrationBuilder,
  RegistrationDiagnostic,
  ServiceDecorator,
  ServiceLifetime,
  ServiceRegistration,
  ServiceToken,
} from '../contracts/composition.js';
import { EXECUTION_CONTEXT } from '../contracts/composition.js';
import { CompositionError } from '../errors/composition-error.js';
import { NoopCompositionTelemetry } from '../reference/noop-composition-telemetry.js';

interface StoredRegistration {
  readonly token: ServiceToken<unknown>;
  readonly lifetime: ServiceLifetime;
  readonly dependencies: readonly ServiceToken<unknown>[];
  readonly factory: (resolver: DependencyResolver) => unknown;
  readonly decorators: readonly ServiceDecorator<unknown>[];
  readonly provenance: string;
  readonly factoryId: string;
}

interface ResolutionState {
  readonly scoped: Map<symbol, Promise<unknown>> | undefined;
  readonly context: ExecutionContext | undefined;
  readonly disposables: DisposableService[];
  disposed: boolean;
}

export class CompositionRoot implements RegistrationBuilder, DependencyResolver, ExecutionScopeFactory {
  readonly #registrations = new Map<symbol, StoredRegistration>();
  readonly #contextFactory: ExecutionContextFactory;
  readonly #telemetry: CompositionTelemetry;
  #container: CompositionContainer | undefined;

  public constructor(
    contextFactory = new ExecutionContextFactory(),
    telemetry: CompositionTelemetry = new NoopCompositionTelemetry(),
  ) {
    this.#contextFactory = contextFactory;
    this.#telemetry = telemetry;
  }

  public register<T>(registration: ServiceRegistration<T>): void {
    if (this.#container !== undefined) throw new CompositionError('COMPOSITION_ROOT_FROZEN', 'Composition Root is already built');
    if (this.#registrations.has(registration.token.id) || registration.token.id === EXECUTION_CONTEXT.id) {
      throw new CompositionError('COMPOSITION_DUPLICATE_REGISTRATION', `Duplicate registration: ${registration.token.description}`);
    }
    const decorators = [...(registration.decorators ?? [])].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    this.#validateDecorators(registration.token.description, decorators);
    const stored: StoredRegistration = Object.freeze({
      token: registration.token,
      lifetime: registration.lifetime,
      dependencies: Object.freeze([...registration.dependencies]),
      factory: registration.factory,
      decorators: Object.freeze(decorators),
      provenance: registration.provenance,
      factoryId: registration.factoryId,
    });
    this.#registrations.set(stored.token.id, stored);
    this.#telemetry.registration(stored.token.description, stored.lifetime, stored.provenance);
  }

  public registerModule(registrar: ModuleRegistrar): void {
    if (registrar.id.trim() === '') throw new CompositionError('COMPOSITION_RESOLUTION_FAILED', 'Module registrar id is required');
    registrar.register(this);
  }

  public build(): void {
    if (this.#container !== undefined) throw new CompositionError('COMPOSITION_ROOT_FROZEN', 'Composition Root can only be built once');
    this.#validateGraph();
    this.#container = new CompositionContainer(new Map(this.#registrations), this.#telemetry);
    this.#telemetry.built(this.#registrations.size);
  }

  public async resolve<T>(token: ServiceToken<T>): Promise<T> {
    return await this.#requiredContainer().resolve(token);
  }

  public createExecutionScope(request: CreateExecutionContextRequest): ExecutionScope {
    const container = this.#requiredContainer();
    const context = this.#contextFactory.create(request);
    this.#telemetry.scopeCreated(context.executionId);
    return container.createScope(context);
  }

  public diagnostics(): CompositionDiagnostics {
    const singletonIds = this.#container?.singletonIds() ?? new Set<symbol>();
    const registrations: RegistrationDiagnostic[] = [...this.#registrations.values()]
      .sort((a, b) => a.token.description.localeCompare(b.token.description))
      .map((item) => Object.freeze({
        token: item.token.description,
        lifetime: item.lifetime,
        dependencies: Object.freeze(item.dependencies.map((dependency) => dependency.description)),
        factoryId: item.factoryId,
        decorators: Object.freeze(item.decorators.map((decorator) => decorator.id)),
        provenance: item.provenance,
        instantiated: singletonIds.has(item.token.id),
      }));
    return Object.freeze({ built: this.#container !== undefined, registrations: Object.freeze(registrations) });
  }

  public async dispose(): Promise<void> {
    if (this.#container !== undefined) await this.#container.dispose();
  }

  #requiredContainer(): CompositionContainer {
    if (this.#container === undefined) throw new CompositionError('COMPOSITION_RESOLUTION_FAILED', 'Composition Root must be built before resolution');
    return this.#container;
  }

  #validateDecorators(token: string, decorators: readonly ServiceDecorator<unknown>[]): void {
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const decorator of decorators) {
      if (decorator.id.trim() === '' || !Number.isInteger(decorator.order) || ids.has(decorator.id) || orders.has(decorator.order)) {
        throw new CompositionError('COMPOSITION_INVALID_DECORATOR', `Invalid decorators for ${token}`);
      }
      ids.add(decorator.id);
      orders.add(decorator.order);
    }
  }

  #validateGraph(): void {
    const visiting = new Set<symbol>();
    const visited = new Set<symbol>();
    const visit = (registration: StoredRegistration): void => {
      if (visited.has(registration.token.id)) return;
      if (visiting.has(registration.token.id)) throw new CompositionError('COMPOSITION_DEPENDENCY_CYCLE', `Dependency cycle at ${registration.token.description}`);
      visiting.add(registration.token.id);
      for (const dependency of registration.dependencies) {
        if (dependency.id === EXECUTION_CONTEXT.id) continue;
        const target = this.#registrations.get(dependency.id);
        if (target === undefined) throw new CompositionError('COMPOSITION_MISSING_DEPENDENCY', `${registration.token.description} requires ${dependency.description}`);
        visit(target);
      }
      visiting.delete(registration.token.id);
      visited.add(registration.token.id);
    };
    for (const registration of this.#registrations.values()) visit(registration);
    for (const registration of this.#registrations.values()) {
      if (registration.lifetime === 'singleton' && this.#reachesScoped(registration, new Set())) {
        throw new CompositionError('COMPOSITION_INVALID_LIFETIME', `Singleton ${registration.token.description} reaches scoped state`);
      }
    }
  }

  #reachesScoped(registration: StoredRegistration, visited: Set<symbol>): boolean {
    if (visited.has(registration.token.id)) return false;
    visited.add(registration.token.id);
    for (const dependency of registration.dependencies) {
      if (dependency.id === EXECUTION_CONTEXT.id) return true;
      const target = this.#registrations.get(dependency.id);
      if (target?.lifetime === 'scoped' || (target !== undefined && this.#reachesScoped(target, visited))) return true;
    }
    return false;
  }
}

class CompositionContainer implements DependencyResolver {
  readonly #singletons = new Map<symbol, Promise<unknown>>();
  readonly #rootState: ResolutionState = { scoped: undefined, context: undefined, disposables: [], disposed: false };
  public constructor(
    private readonly registrations: ReadonlyMap<symbol, StoredRegistration>,
    private readonly telemetry: CompositionTelemetry,
  ) {}

  public resolve<T>(token: ServiceToken<T>): Promise<T> {
    return this.#resolve(token, this.#rootState);
  }

  public createScope(context: ExecutionContext): ExecutionScope {
    return new DefaultExecutionScope(context, this, this.telemetry);
  }

  public resolveInScope<T>(token: ServiceToken<T>, state: ResolutionState): Promise<T> {
    return this.#resolve(token, state);
  }

  public singletonIds(): ReadonlySet<symbol> { return new Set(this.#singletons.keys()); }

  public async dispose(): Promise<void> {
    if (this.#rootState.disposed) return;
    this.#rootState.disposed = true;
    await disposeReverse(this.#rootState.disposables);
    this.#singletons.clear();
  }

  async #resolve<T>(token: ServiceToken<T>, state: ResolutionState): Promise<T> {
    if (state.disposed || this.#rootState.disposed) throw new CompositionError('COMPOSITION_DISPOSED', `Cannot resolve ${token.description} after disposal`);
    if (token.id === EXECUTION_CONTEXT.id) {
      if (state.context === undefined) throw new CompositionError('COMPOSITION_SCOPE_REQUIRED', `${token.description} requires an execution scope`);
      return state.context as T;
    }
    const registration = this.registrations.get(token.id);
    if (registration === undefined) throw new CompositionError('COMPOSITION_MISSING_DEPENDENCY', `No registration for ${token.description}`);
    if (registration.lifetime === 'scoped' && state.scoped === undefined) throw new CompositionError('COMPOSITION_SCOPE_REQUIRED', `${token.description} requires an execution scope`);
    const cache = registration.lifetime === 'singleton' ? this.#singletons : registration.lifetime === 'scoped' ? state.scoped : undefined;
    let promise = cache?.get(token.id);
    if (promise === undefined) {
      promise = this.#create(registration, state);
      cache?.set(token.id, promise);
    }
    try { return await promise as T; }
    catch (cause) {
      cache?.delete(token.id);
      const error = cause instanceof CompositionError ? cause : new CompositionError('COMPOSITION_RESOLUTION_FAILED', `Failed to resolve ${token.description}`, { cause });
      this.telemetry.resolutionFailed(token.description, error.code);
      throw error;
    }
  }

  async #create(registration: StoredRegistration, state: ResolutionState): Promise<unknown> {
    const allowed = new Set(registration.dependencies.map((dependency) => dependency.id));
    const resolver: DependencyResolver = {
      resolve: <T>(token: ServiceToken<T>): Promise<T> => {
        if (!allowed.has(token.id)) {
          return Promise.reject(new CompositionError('COMPOSITION_MISSING_DEPENDENCY', `${registration.token.description} did not declare ${token.description}`));
        }
        return this.#resolve(token, state);
      },
    };
    let value = await registration.factory(resolver);
    for (const decorator of registration.decorators) value = await decorator.decorate(value, resolver);
    if (isDisposable(value)) state.disposables.push(value);
    return value;
  }
}

class DefaultExecutionScope implements ExecutionScope {
  readonly #state: ResolutionState;
  public constructor(
    public readonly context: ExecutionContext,
    private readonly container: CompositionContainer,
    private readonly telemetry: CompositionTelemetry,
  ) {
    this.#state = { scoped: new Map(), context, disposables: [], disposed: false };
  }
  public get disposed(): boolean { return this.#state.disposed; }
  public resolve<T>(token: ServiceToken<T>): Promise<T> { return this.container.resolveInScope(token, this.#state); }
  public async dispose(): Promise<void> {
    if (this.#state.disposed) return;
    this.#state.disposed = true;
    await disposeReverse(this.#state.disposables);
    this.#state.scoped?.clear();
    this.telemetry.scopeDisposed(this.context.executionId);
  }
}

function isDisposable(value: unknown): value is DisposableService {
  return typeof value === 'object' && value !== null && 'dispose' in value && typeof value.dispose === 'function';
}

async function disposeReverse(values: DisposableService[]): Promise<void> {
  for (const value of [...values].reverse()) await value.dispose();
  values.length = 0;
}
