# Blueprint 03 — Dependency Injection and Composition Implementation Specification

**Document Version:** 1.0  
**Blueprint Version:** 2.0  
**Implementation Mode:** Autonomous  
**Status:** Approved

## Package

```text
Name: @agentprodready/composition
Path: packages/composition
Public entry point: src/index.ts
```

Public contracts are architecture-neutral and expose no NestJS/container implementation types.

## Tokens and Lifetimes

```ts
export interface ServiceToken<T> {
  readonly id: symbol;
  readonly description: string;
}
export type ServiceLifetime = 'singleton' | 'scoped' | 'transient';
```

`createServiceToken<T>(description)` is the only token constructor. Runtime support is enforced to exactly three lifetime strings.

## Registration Contracts

`ServiceRegistration<T>` contains token, lifetime, declared dependencies, a factory, optional ordered decorators, provenance, and lazy metadata. A factory receives `DependencyResolver`, which can resolve only through the active container/scope. `ModuleRegistrar` and `PluginServiceRegistrar` contribute registrations to `RegistrationBuilder`; they never build containers.

Registrations are immutable copies once accepted. Duplicate tokens are rejected. After `CompositionRoot.build()`, all registration APIs reject mutation.

## Resolution and Lifecycles

- Singleton: created lazily once in the root container and disposed with it.
- Scoped: created lazily once per execution scope and disposed with that scope.
- Transient: created for every resolution and tracked by the creating root/scope when disposable.
- Root resolution of scoped tokens is rejected.
- Singleton dependency paths may not reach scoped registrations.
- Scoped services within one scope receive the same immutable `ExecutionContext`.

`CompositionRoot.createExecutionScope(request)` invokes the injected Blueprint 01 `ExecutionContextFactory` exactly once and binds the resulting context to `EXECUTION_CONTEXT`. The returned scope exposes its context and typed resolution. Blueprint 04 will own when scopes open and close.

## Validation

`build()` deterministically validates missing registrations, duplicates, circular graphs, invalid lifetimes, singleton-to-scoped dependency paths, decorator order collisions, and invalid factory/plugin registration metadata. Any critical failure prevents the container from becoming available.

## Decorators

`ServiceDecorator<T>` contains a unique id, integer order, and a pure wrapping function. Lower order is applied first. Duplicate decorator ids/orders on one registration are rejected. Decorators preserve the registered token contract.

## Plugin Integration and Lazy Activation

`PluginCompositionRegistrar.register(pluginId, registrations)` forwards plugin-owned registrations into the same root builder with `plugin:<id>` provenance. `CompositionImplementationActivator` implements Blueprint 02's `ImplementationActivator`; an explicit `(pluginId, contributionId) -> ServiceToken` binding is registered before build. Activation resolves the bound service lazily and never performs capability selection.

## Diagnostics and Observability

Diagnostics expose immutable registration entries containing token description, lifetime, dependencies, factory/decorator metadata, provenance, and instantiated state without exposing instances or sensitive configuration. `CompositionTelemetry` is a Blueprint 22 bootstrap port with registration, build, scope, resolution-failure, and disposal notifications; a no-op reference is supplied.

## Errors

Stable codes:

- `COMPOSITION_DUPLICATE_REGISTRATION`
- `COMPOSITION_MISSING_DEPENDENCY`
- `COMPOSITION_DEPENDENCY_CYCLE`
- `COMPOSITION_INVALID_LIFETIME`
- `COMPOSITION_SCOPE_REQUIRED`
- `COMPOSITION_ROOT_FROZEN`
- `COMPOSITION_RESOLUTION_FAILED`
- `COMPOSITION_INVALID_DECORATOR`
- `COMPOSITION_IMPLEMENTATION_NOT_REGISTERED`
- `COMPOSITION_DISPOSED`

Technology-specific causes remain internal as `cause`; public messages contain token descriptions only.

## Compatibility and Ownership

Tokens, lifetimes, error codes, diagnostics schemas, and scope semantics are public contracts. Blueprint 03 permanently owns instantiation and lifecycle. Blueprint 04 owns operational scope timing and execution; Blueprint 22 owns telemetry processing. Breaking changes require Blueprint 31 governance.

## Acceptance Traceability

Every acceptance criterion maps to a named test described in the plan and will be recorded in the implementation report.

## Approval

Autonomously finalized on 2026-08-06.

