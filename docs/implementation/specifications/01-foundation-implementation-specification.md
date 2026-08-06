# Blueprint 01 — Foundation Implementation Specification

**Document Version:** 1.0  
**Blueprint:** 01 — Engineering Constitution & Platform Foundation  
**Blueprint Version:** 2.0  
**Implementation Mode:** Autonomous  
**Status:** Approved

## Package

```text
Package name: @agentforge/foundation
Package path: packages/foundation
Public entry point: src/index.ts
```

The package owns only Foundation behavior. Contracts marked `Bootstrap owner` are temporary public ports whose final ownership transfers to the named blueprint when it is implemented; their contract compatibility and replacement are reviewed at that boundary.

## Public TypeScript Contracts

```ts
export type LifecycleStatus = 'registered' | 'starting' | 'started' | 'stopping' | 'stopped' | 'failed';

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
  readonly attributes?: Readonly<Record<string, string>>;
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

export interface HealthResult {
  readonly name: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly details?: Readonly<Record<string, string>>;
}
```

Classes provide `ApplicationHost`, `ExecutionContextFactory`, `ConfigurationSnapshotFactory`, `PluginManifestValidator`, `InMemoryPluginRegistry`, `InMemoryCapabilityRegistry`, `DeterministicCapabilityResolver`, `HealthService`, and `ReadinessService`.

## Future-Owned Bootstrap Ports

| Port | Bootstrap owner | Foundation behavior |
|---|---:|---|
| `PluginDiscovery`, `PluginRegistry` | 02 | empty discovery and metadata-only registry |
| DI tokens and composition registration | 03 | Nest bootstrap wiring only |
| `RuntimePort` | 04 | contract only |
| `CapabilityRegistry`, `CapabilityResolver` | 07 | deterministic metadata registry/resolver |
| `AuthorizationService` | 15 | contract plus deny-by-default reference |
| `EventPublisher` | 16 | contract plus in-memory fact collector |
| `AuditPublisher` | 17 | contract plus in-memory record collector |
| `Telemetry` | 22 | contract plus no-op reference |
| `ConfigurationProvider`, `SecretProvider` | 23 | immutable object configuration and unresolved secret reference behavior |
| `Repository`, `TransactionManager`, `SnapshotStore` | 24 | contracts only |
| test fixtures and architecture checks | 30 | replaceable Blueprint 01 test bootstrap |

## Dependency-Injection Tokens and Lifetimes

All tokens are exported `symbol` values prefixed `AGENTFORGE_`. Registries, host infrastructure, configuration, telemetry, health, and readiness are Singleton. `ExecutionContext` is created per execution and is never stored by a Singleton. Stateless validators and factories are Singleton-safe.

## Validation and Errors

`FoundationError` contains a stable code and optional cause. Codes are:

| Code | Meaning | Retry classification |
|---|---|---|
| `FOUNDATION_INVALID_ARGUMENT` | malformed public input | Non-retryable |
| `FOUNDATION_DUPLICATE_REGISTRATION` | duplicate identity or binding | Non-retryable |
| `FOUNDATION_MISSING_DEPENDENCY` | lifecycle dependency absent | Non-retryable |
| `FOUNDATION_DEPENDENCY_CYCLE` | lifecycle graph is cyclic | Non-retryable |
| `FOUNDATION_STARTUP_FAILED` | component startup failed and rollback ran | Runtime-decided |
| `FOUNDATION_NOT_READY` | required readiness contributor is unavailable | Runtime-decided |
| `FOUNDATION_CAPABILITY_NOT_FOUND` | capability has no binding | Non-retryable |

Identifiers and required strings must be non-empty. Dates must be valid ISO-8601 values. Plugin semantic versions must be `major.minor.patch`. Priorities are finite integers. Duplicate registrations are rejected. Lifecycle dependency graphs must contain every dependency and be acyclic.

## Events

Foundation publishes only completed lifecycle facts: `FoundationHostStartedV1`, `FoundationHostStoppedV1`, and `FoundationHostStartupFailedV1`. Payloads contain component identifiers only, never credentials or mutable service objects. In-memory publication is reference behavior owned eventually by Blueprint 16.

## Serialization and Immutability

Dates serialize as ISO-8601 UTC strings; identifiers and enum values serialize as strings. Public records are copied at boundaries. Execution contexts, configuration snapshots, descriptors, event payloads, arrays, and maps exposed as objects are deeply frozen. Unknown serialized fields are ignored by readers; missing required fields fail validation.

## Runtime Boundary

Foundation creates execution contexts but does not schedule, retry, cancel, recover, or execute work. `RuntimePort` is contract-only. Runtime will own operational execution and context lifecycle in Blueprint 04.

## Security Boundary

Foundation propagates normalized authorization requests and decisions and provides deny-by-default reference behavior. It does not authenticate identities, evaluate policy, or grant permissions. Blueprint 15 owns authorization.

## Provider and Persistence Boundaries

No SDK, transport, database entity, infrastructure exception, raw credential, or secret value crosses a public contract. Persistence ports do not promise a concrete transaction, isolation, or durability implementation.

## Compatibility

Additive optional fields and exports are minor-compatible. Internal fixes are patch-compatible. Removing or changing a public field, token, error code, event schema, or semantic guarantee is breaking and requires governance under Blueprint 31 and an ADR when architecture-affecting.

## Acceptance Mapping

Every Blueprint 01 acceptance criterion maps one-to-one to the components and tests listed in the implementation plan. Test names will carry the criterion language and the implementation report will record commands and results.

## Open Implementation Decisions Resolved

- Lifecycle ordering uses stable lexical tie-breaking after dependency ordering.
- Startup failure stops already-started components in exact reverse order and leaves the host failed.
- Shutdown is idempotent after successful shutdown.
- Capability precedence sorts lower numeric priority first, then provider identifier.
- Readiness requires every contributor to be healthy; degraded health is not ready.
- Reference identifiers use caller-supplied strings; Foundation does not impose a UUID library.

## Approval

Autonomously finalized under `Implementation Mode: Autonomous` on 2026-08-06.

