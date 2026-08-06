# Blueprint 16 — Event Bus & Platform Messaging Implementation Plan

**Implementation Mode:** Autonomous  
**Blueprint Version:** 2.0  
**Date:** 2026-08-06

## Objective

Implement a provider-independent, in-process reference Event Bus for immutable facts with deterministic routing, Security-owned visibility decisions, isolated at-least-once delivery, replay, dead-letter handling, flow control, retention, diagnostics, and transactional-publication transfer contracts.

## Architectural Boundaries

- Publishers own event identity, truth, payload, and transactional publication intent.
- Blueprint 15 decides visibility; the Event Bus only enforces the supplied outcome.
- The Event Bus owns validation, routing, delivery identity, messaging retry, replay, dead-letter records, and messaging diagnostics.
- Subscribers own domain processing and idempotency; Runtime owns business execution, retry, recovery, scheduling, and cancellation.
- Outbox state belongs to the originating transactional persistence boundary; Blueprint 16 defines only its transfer-facing port and a replaceable test reference.
- Events are facts, never commands. Transport technology and provider SDK types remain private to future adapters.

## Work Plan

1. Define exact normalized event, subscription, delivery, security, replay, retention, payload, retry, flow-control, outbox-transfer, diagnostics, telemetry, health, and error contracts.
2. Add immutable event and subscription factories with validation, bounded payload enforcement, explicit correlation/causation/ordering, and stable logical identity.
3. Implement an in-memory subscription registry, deterministic router, security outcome enforcer, isolated delivery engine, replay/dead-letter stores, and Event Bus facade.
4. Implement duplicate-tolerant inbox support, distinct delivery identifiers, ordering queues, messaging retry, poison isolation, backpressure/overflow behavior, replay safety, cycle/recursion protection, and lifecycle telemetry that does not recursively republish.
5. Implement a reference transactional publication record store and outbox publisher that republishes the same event without owning or replaying the domain transaction.
6. Add contract, unit, and integration tests mapping every checklist acceptance criterion.
7. Wire the workspace package and verify Node 24 LTS lint, dependency boundaries, complete typecheck, tests, coverage, and build.
8. Generate the implementation report and complete the Blueprint 16 checklist only after all gates pass.

## Verification Matrix

- Contract tests: immutable/versioned provider-neutral events; event vs delivery identity; normalized guarantees, ordering, retention, flow control, payload references, replay, errors, compatibility.
- Unit tests: subscription registration, filtering, deterministic routing, correlation/causation, inbox deduplication, failure normalization, diagnostics.
- Integration tests: publication/delivery isolation, Security enforcement, tenant isolation, retries, poison/dead-letter behavior, replay authorization/safety, slow-subscriber isolation, ordering, recursion/cycle limits, outbox recovery.
- Repository gates: lint/boundaries, full typecheck, complete tests/coverage, build under Node 24 LTS.

## Stop-Condition Review

No architectural contradiction or unavailable hard dependency is present. Future-owned persistence, audit, observability, and configuration behavior can remain replaceable ports/reference implementations, as explicitly authorized by the dependency graph and blueprint.

