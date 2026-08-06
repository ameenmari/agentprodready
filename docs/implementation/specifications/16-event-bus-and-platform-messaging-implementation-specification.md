# Blueprint 16 — Event Bus & Platform Messaging Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Public Contract Decisions

### Logical Events

`PlatformEvent<T>` contains `eventId`, fact-style `type`, contract/schema versions, original timestamp, producer, correlation ID, nullable parent-event causation ID, optional non-event cause reference, optional ordering key, execution reference, tenant/workspace/project scope, classification/labels, bounded payload or secure external payload reference, source/provenance metadata, retention policy, and event-chain depth. The factory validates serializability, fact-style naming, scopes, size, causation, and depth, then deep-clones and deep-freezes the logical event.

The publisher supplies logical event identity/content. Retry, replay, serialization, delivery, and dead-letter handling retain the same frozen event and create separate records.

### Subscriptions and Routing

`EventSubscription` declares event type/version matching, normalized metadata filters, observation scope, a Blueprint 15 authorization-decision reference, delivery guarantee (default `at-least-once`), ordering mode, replay capability, retry, flow-control/overflow, and compatibility policy. Registration does not instantiate subscribers. `SubscriptionRegistry` and `EventRouter` are separate contracts; the reference router sorts deterministically by subscription ID.

### Security

`EventVisibilityAuthorizer` returns an authoritative normalized decision reference. The Event Bus requires an authorized, active outcome and matching tenant/workspace/project/classification constraints. It may restrict but never expand that decision. Registration and transport credentials never imply authorization.

### Delivery

Every attempt receives a unique `deliveryId`; repeated delivery retains `eventId`. `DeliveryRecord` contains attempt/mode/acknowledgment/failure metadata without changing the event. Subscribers receive a frozen `EventDelivery` and own processing/idempotency. `SubscriberInbox` is an optional reference helper keyed by event identity.

Messaging retry repeats delivery only. Retry exhaustion creates an immutable subscriber-specific dead-letter record and does not affect unrelated subscriptions. Ordering is enforced only for an explicit ordering key. Per-subscription queues and concurrency isolate backpressure. Overflow policy is explicit; durable categories cannot silently drop.

### Replay

`ReplayRequest` identifies initiator, purpose, scope, ranges, authorization reference, and replay ID. Replay is separately authorized, security-filtered, auditable through a port, and uses new delivery IDs while preserving the original event. Replay-prohibited subscribers are rejected; unsafe modes require explicit administrative allowance.

### Transactional Publication

`PublicationIntentStore` is owned by the originating persistence boundary and exposes committed publication intents. `OutboxPublisher` transfers committed intents idempotently, keeps failed intent pending, republishes the same immutable event identity, and never runs domain logic. The in-memory store is reference/test infrastructure, not Event Bus-owned domain persistence.

### Governance and Operations

Normalized policies cover retention, payload size/reference, delivery guarantees, messaging retry, flow control, overflow, and chain depth. Event Bus lifecycle activity is emitted to dedicated telemetry/diagnostic/audit ports rather than recursively through unrestricted publication. Errors use `EventBusError` with provider-neutral codes. Health exposes normalized publication, subscription, dead-letter, and replay state.

## Package Shape

- `@agentforge/event-bus`
- `src/index.ts`: public contracts, factories, facade, normalized errors.
- `src/reference.ts`: replaceable in-memory stores, deterministic router, delivery engine, outbox transfer, telemetry/diagnostics/health helpers.
- `src/event-bus.spec.ts`: contract, unit, and integration verification.

## Dependency Decisions

The package depends on Foundation for the bootstrapped publisher compatibility boundary and Security for authoritative decision semantics. It does not depend on concrete Runtime, workflow, provider, tool, memory, knowledge, evaluation, or transport implementations. Audit, observability, configuration, and persistence remain future-owned ports with explicit replacement points.

## Deferred Work

Distributed brokers, durable production stores, cluster coordination, cross-region replication, production outbox integration, business retries, scheduling, orchestration, notification channels, and final Blueprint 17/22/23/24 adapters are deferred.

