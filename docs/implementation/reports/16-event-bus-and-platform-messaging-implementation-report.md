# Blueprint 16 — Event Bus & Platform Messaging Implementation Report

**Implementation Version:** 0.1.0  
**Implementation Mode:** Autonomous  
**Verification Date:** 2026-08-06  
**Decision:** Approved

## Outcome

Blueprint 16 is implemented as the provider-independent `@agentprodready/event-bus` package. It transports immutable facts through separate publication, routing, Security-outcome enforcement, delivery, retry, replay, dead-letter, retention, diagnostics, and outbox-transfer boundaries without taking ownership of business execution or domain transactions.

## Delivered Artifacts

- Normalized logical event, subscription, delivery, replay, security visibility, reliability, flow-control, retention, payload-reference, outbox-transfer, diagnostic, telemetry, health, and error contracts.
- Immutable factories and an in-process Event Bus with deterministic routing and subscriber-isolated concurrent delivery.
- Replaceable in-memory registries, replay/dead-letter/journal/diagnostic stores, subscriber inbox, telemetry, replay audit, visibility adapter, and publication-intent reference store.
- Foundation bootstrap publisher adapter and Security `AuthorityState` integration.
- Plan, specification, tests, report, and completed checklist.

## Acceptance-Criteria Traceability

| # | Acceptance criterion | Evidence |
|---:|---|---|
| 1 | Every Platform Event immutable | Factory deep-clones/freezes the complete logical event; publication rejects mutable events; immutability tests. |
| 2 | Provider-independent publication | Public contracts contain no transport SDK types; Foundation adapter test and source audit. |
| 3 | Publishers unaware of subscribers | `publish` accepts only a logical event; registry/router dependencies are internal; multi-subscriber test. |
| 4 | Subscribers isolated from publishers | Separate handler contract and concurrent per-subscription delivery; slow-subscriber isolation test. |
| 5 | Deterministic routing | Metadata-only router with stable subscription-ID ordering; routing tests. |
| 6 | Configurable delivery guarantees | Normalized `DeliveryGuarantee` on immutable subscriptions; contract test; at-least-once default fixture. |
| 7 | Explicit ordering | `OrderingMode` and required `OrderingKey`; missing-key failure test. |
| 8 | Replay preserves facts | Replay store retains original frozen event and replay creates only new delivery metadata/identity; test. |
| 9 | Dead letters preserve events | Subscriber-specific dead-letter records retain the original event by identity; poison test. |
| 10 | Poison isolation | Non-retryable poison failure dead-letters only the affected subscription; test. |
| 11 | Security boundaries preserved | Blueprint 15 `AuthorityState` and authoritative normalized visibility decision are enforced fail closed. |
| 12 | Tenant/workspace isolation | Router and visibility enforcer require matching tenant/workspace/project; tests. |
| 13 | Transport hidden | `EventTransport` is normalized; source audit found no Kafka/RabbitMQ/Redis/NATS/cloud SDK terms. |
| 14 | Failures normalized | External failures become provider-neutral category/code/message/retryability records; tests. |
| 15 | Diagnostics/telemetry/health | Dedicated normalized ports and reference implementations; success/failure/health tests. |
| 16 | Durable state can produce an event | Committed `PublicationIntent` and `OutboxPublisher` transfer contract/reference; recovery test. |
| 17 | Committed intent is not lost | Failed publication remains pending and later republishes the same event; test. |
| 18 | Messaging retry distinct from Runtime retry | Retry invokes only the subscriber delivery with the same event; no business-operation callback exists; test. |
| 19 | At-least-once default | Subscription fixture and specification establish stable identity plus at-least-once baseline; contract test. |
| 20 | Duplicate-safe subscribers | `SubscriberInbox`/`IdempotentSubscriber` deduplicate on Event ID, not Delivery ID; test. |
| 21 | Correlation and causation | Every event requires correlation and has nullable parent-event causation plus optional non-event cause; contract tests. |
| 22 | Explicit Ordering Keys | Normalized key and scoped ordering contract; delivery enforcement test. |
| 23 | Blueprint 15 visibility authority | Event Bus imports Security authority state and only enforces supplied outcomes; deny/revocation tests. |
| 24 | Replay authorized/governed/identified/audited | Scoped request, distinct authorization reference, replay capability, metadata, delivery ID, and audit port; tests. |
| 25 | Replay cannot silently repeat unsafe effects | Prohibited/administrative replay modes and explicit external-side-effect allowance; rejection test. |
| 26 | Slow subscribers isolated | Eligible subscriptions deliver concurrently and failures are subscription-specific; controlled slow-subscriber test. |
| 27 | Backpressure/overflow explicit | Versioned flow policy declares concurrency, queue, batch, and explicit overflow action; contract validation test. |
| 28 | Retention policy-controlled | Required versioned retention category/expiry and immutable expiration behavior; test. |
| 29 | Large payloads bounded/referenced | Byte limit and mutually exclusive secure payload reference; rejection/reference tests. |
| 30 | Lifecycle reporting non-recursive | Lifecycle information uses dedicated telemetry/diagnostic/audit ports, not unrestricted event publication; architecture/source review. |
| 31 | Causation and cycle protection | Parent causation, self-cycle rejection, and configurable chain-depth enforcement; tests. |

## Ownership and Dependency Verification

The Event Bus owns logical-contract validation, routing, delivery identity, messaging retry, replay, dead-letter handling, and messaging diagnostics. Publishers retain event truth and event identity. Originating persistence boundaries retain transactional outbox ownership. Blueprint 15 decides visibility. Subscribers retain domain processing/idempotency. Runtime retains execution, business retry, recovery, scheduling, cancellation, and orchestration.

Foundation and Security integration is implemented. Blueprints 17, 22, 23, and 24 remain the eventual owners of production Audit, Observability, Configuration, and Persistence adapters; their current ports/reference components are documented replacement boundaries. Consumers in Blueprints 18–31 and distributed transports are later integrations.

## Verification Results

Executed under Node.js LTS `v24.19.0`:

| Gate | Result |
|---|---|
| Offline install | PASS — 18 workspace projects |
| ESLint | PASS — zero warnings |
| Dependency boundaries | PASS |
| Complete no-emit typecheck | PASS |
| Project-reference typecheck/build | PASS |
| Tests | PASS — 18 files, 168 tests |
| Repository coverage | PASS — 91.48% statements/lines, 83.52% branches, 90.12% functions |
| Event Bus coverage | PASS — 100% statements/lines, 90.43% branches, 95% functions |
| Transport/provider leakage audit | PASS — zero source matches |
| Command-contract leakage audit | PASS — zero source matches |

## Limitations and Deviations

The in-process Event Bus and in-memory stores are deterministic reference implementations. They do not claim distributed durability, end-to-end exactly-once processing, production queue persistence, production outbox atomicity, cluster coordination, or broker-specific guarantees. Flow-control policies are normalized and subscriber isolation is enforced by the reference delivery model; transport-scale queueing and overflow mechanics remain adapter responsibilities. The publication-intent store exists only as a replaceable test reference to the originating persistence boundary.

No unresolved architectural deviation was found.

## Final Decision

Blueprint 16 is fully verified. Blueprint 17 may begin as a separate implementation cycle.
