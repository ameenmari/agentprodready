AgentForge
Engineering Blueprint 16
Event Bus & Platform Messaging

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

Audience:

Platform Architects
Runtime Engineers
Plugin Developers
Infrastructure Engineers
Integration Engineers
Cursor AI
1. Purpose

The Event Bus defines the standardized architecture through which AgentForge publishes, distributes, observes, and consumes immutable platform events.

Its purpose is to decouple platform components by replacing direct subsystem-to-subsystem communication with a normalized event-driven messaging architecture.

The Event Bus provides asynchronous communication between platform capabilities while preserving ordering guarantees, delivery contracts, observability, security boundaries, and extensibility.

It is not a workflow engine, execution engine, or orchestration layer.

The Event Bus is AgentForge's platform-wide messaging backbone.

2. Responsibilities

The Event Bus owns:

Event contracts
Event publication
Event subscription
Event routing
Event delivery semantics
Event metadata
Event filtering
Event versioning
Event correlation
Event lifecycle
Event diagnostics
Event observability

The Event Bus does not own:

Workflow execution
Runtime scheduling
Business orchestration
Capability Resolution
Security authorization
Plugin lifecycle
Tool execution
AI Provider execution
Knowledge retrieval
Memory retrieval
Context Assembly
Prompt construction
Evaluation logic
4. Blueprint Dependencies

Depends upon:

Blueprint 01–15

Future dependent blueprints include:

Agent Framework
Multi-Agent Collaboration
API Gateway
Audit Platform
Analytics
Monitoring
Notification Framework
Distributed Deployment
5. Consumes → Produces → Owns
Consumes
Platform event publication requests
Event metadata
Correlation metadata
Event policies
Security context
Produces
Platform Events
Event delivery notifications
Subscription notifications
Owns

Provider-independent platform messaging and event distribution.

6. Architectural Position
Platform Component
        │
        ▼
 Event Publication
        │
        ▼
   Event Bus
        │
 ┌──────┼─────────────┐
 ▼      ▼             ▼
Memory Evaluation Plugins
 │        │            │
 ▼        ▼            ▼
Subscribers receive immutable events

The Event Bus is the communication backbone of AgentForge.

7. Messaging Philosophy

The Event Bus communicates facts.

It does not communicate commands.

Examples of facts:

Workflow Started
Node Completed
Tool Executed
Prompt Built
Evaluation Completed
Memory Stored
Knowledge Retrieved
Authorization Granted

An event reports what has already happened.

It does not instruct another subsystem what it must do.

This distinction prevents the Event Bus from becoming a hidden orchestration engine.

8. Event Principles

Every Platform Event must be:

Immutable
Versioned
Serializable
Correlated
Security-scoped
Observable
Provider-independent
Technology-independent
Self-describing
Traceable
9. Event Categories

Examples include:

Runtime Events
Execution Started
Execution Completed
Execution Cancelled
Execution Failed
Workflow Events
Workflow Started
Node Eligible
Node Completed
Workflow Completed
Tool Events
Tool Invoked
Tool Completed
Tool Failed
AI Events
Prompt Submitted
AI Response Received
Streaming Started
Streaming Completed
Memory Events
Memory Captured
Memory Consolidated
Memory Retrieved
Knowledge Events
Retrieval Started
Retrieval Completed
Index Updated
Security Events
Authorization Granted
Authorization Denied
Delegation Created
Evaluation Events
Evaluation Started
Evaluation Completed
Plugin Events
Plugin Loaded
Plugin Activated
Plugin Disabled
10. Event Philosophy

A Platform Event represents a completed state transition or observable occurrence.

Events are historical facts.

They are never mutable.

Once published, an event cannot be modified.

Corrections are represented by publishing new events rather than editing existing ones.

11. Event Contract

Every Platform Event shall include a normalized event contract containing:

Event Identifier
Event Type
Event Version
Timestamp
Producer
Correlation Identifier
Execution Reference
Tenant Scope
Security Classification
Event Payload
Metadata

Provider-specific message models must never appear outside the Event Bus.

12. Publisher Model

Any platform component may publish events.

Publishing an event does not imply ownership of downstream behavior.

The publishing component reports facts only.

Subscribers decide whether those facts are relevant to them according to their own responsibilities.

Chief Architect's Notes

Blueprint 16 introduces one of the foundational infrastructure services of AgentForge: event-driven communication.

A crucial architectural decision is that the Event Bus transports facts, not commands. This preserves the clear ownership boundaries established throughout the previous blueprints. Runtime continues to orchestrate execution, Workflow continues to interpret workflow graphs, Security continues to make authorization decisions, and Evaluation continues to assess outcomes. The Event Bus simply allows those components to announce what has occurred.

This design prevents hidden orchestration logic from emerging inside the messaging layer and enables future capabilities—such as analytics, auditing, notifications, distributed deployments, and plugins—to observe platform activity without creating direct dependencies between subsystems.



## Part II — Event Publication, Subscription & Delivery

---

# 13. Event Publication

## 13.1 Purpose

Event Publication is the standardized process through which platform components publish immutable Platform Events.

Publishing an event records an observable platform fact.

Publication must never imply ownership of downstream processing.

---

## 13.2 Publication Principles

Every published event must be:

* Immutable
* Provider-independent
* Versioned
* Correlated
* Security-scoped
* Observable
* Serializable
* Self-describing

Events must be published only after the represented state transition has occurred.

The Event Bus must never publish speculative or anticipated events.

---

## 13.3 Publication Boundary

The publishing component owns:

* Event content
* Event correctness
* Event timing
* Event classification

The Event Bus owns:

* Distribution
* Delivery
* Subscription routing
* Delivery diagnostics
* Messaging observability

---

# 14. Event Subscribers

## 14.1 Purpose

Subscribers consume Platform Events to perform responsibilities already assigned to them by their own architectural boundaries.

Subscription must never redefine ownership.

---

## 14.2 Subscriber Independence

Subscribers remain completely independent.

One subscriber must not affect:

* Event delivery to other subscribers
* Event ordering
* Event publication
* Publisher execution

A failed subscriber must not invalidate the event itself.

---

## 14.3 Multiple Subscribers

A single Platform Event may be consumed by:

* Runtime observers
* Memory Engine
* Evaluation Framework
* Audit Platform
* Notification Platform
* Analytics
* Plugins
* Monitoring
* Future components

The publisher remains unaware of subscriber identities.

---

# 15. Subscription Model

## 15.1 Purpose

Subscriptions define which Platform Events a component wishes to receive.

Subscriptions remain declarative.

---

## 15.2 Subscription Characteristics

Subscriptions should specify:

* Event types
* Event versions
* Tenant scope
* Security scope
* Event filters
* Delivery preferences
* Subscription metadata

The exact subscription implementation remains technology-independent.

---

## 15.3 Dynamic Registration

Subscriptions may be:

* Platform-defined
* Plugin-defined
* Runtime-registered
* Configuration-driven

Subscription registration must not instantiate unrelated platform components.

---

# 16. Event Routing

## 16.1 Purpose

Event Routing determines which subscribers receive a published Platform Event.

Routing is based on normalized event metadata and subscription definitions.

---

## 16.2 Routing Principles

Routing must be:

* Deterministic
* Provider-independent
* Observable
* Policy-driven
* Extensible

Routing must never depend upon subscriber implementation details.

---

## 16.3 Routing Boundary

The Event Bus determines:

* Eligible subscribers
* Delivery order where required
* Event distribution

Subscribers determine:

* Whether additional processing is required
* Whether the event is relevant to their internal behavior

---

# 17. Event Filtering

## 17.1 Purpose

Filtering prevents unnecessary event delivery.

Filtering evaluates only event metadata.

It must never alter event content.

---

## 17.2 Filter Categories

Possible filters include:

* Event Type
* Event Version
* Tenant
* Workspace
* Project
* Security Classification
* Producer
* Event Category
* Correlation Identifier
* Subscription Policy

---

## 17.3 Filtering Boundary

Filtering determines:

> Should this subscriber receive the event?

Filtering never answers:

> Should the subscriber process the event?

Processing remains entirely the subscriber's responsibility.

---

# 18. Delivery Semantics

## 18.1 Purpose

Delivery Semantics define the contractual behavior of Platform Event delivery.

Transport implementation remains independent.

---

## 18.2 Delivery Goals

The Event Bus should support configurable delivery guarantees.

Examples include:

* Best Effort
* At Least Once
* At Most Once
* Exactly Once where supported by implementation

The blueprint defines contracts rather than requiring a specific transport capability.

---

## 18.3 Delivery Independence

Delivery semantics must not expose:

* Kafka concepts
* RabbitMQ acknowledgements
* Redis channels
* Cloud messaging APIs

Those remain implementation details.

---

# 19. Event Ordering

## 19.1 Purpose

Some platform events require deterministic ordering.

Others do not.

Ordering requirements belong to event contracts.

---

## 19.2 Ordering Categories

Possible ordering characteristics include:

* Strict ordering
* Correlation ordering
* Producer ordering
* Partition ordering
* Unordered delivery

Ordering guarantees must be explicitly declared where required.

---

## 19.3 Ordering Boundary

The Event Bus preserves declared ordering semantics.

Subscribers must not assume ordering beyond the guarantees explicitly provided.

---

# 20. Delivery Lifecycle

Every Platform Event follows a standardized lifecycle.

```text
Event Created
        │
        ▼
Event Validated
        │
        ▼
Event Published
        │
        ▼
Subscriber Resolution
        │
        ▼
Delivery
        │
        ▼
Subscriber Processing
        │
        ▼
Delivery Completed
```

Subscriber Processing is outside Event Bus ownership.

---

# 21. Event Metadata

Every Platform Event carries normalized metadata.

Examples include:

* Event Identifier
* Event Type
* Event Version
* Timestamp
* Producer
* Correlation Identifier
* Execution Reference
* Security Classification
* Tenant Scope
* Delivery Metadata
* Schema Version

Metadata enables routing, diagnostics, observability, and compatibility.

---

# 22. Event Correlation

Platform Events belonging to the same execution should be correlated.

Correlation enables:

* Distributed tracing
* Diagnostics
* Audit reconstruction
* Execution replay
* Monitoring
* Evaluation
* Incident investigation

The Event Bus preserves correlation metadata.

It does not interpret execution semantics.

---

# 23. Event Versioning

Every Platform Event is versioned.

Versioning enables:

* Schema evolution
* Backward compatibility
* Forward compatibility
* Plugin compatibility
* Long-running execution support

Version compatibility rules belong to platform governance.

---

# 24. Event Compatibility

Publishers and subscribers may evolve independently.

The Event Bus must support compatible evolution through versioned contracts.

Breaking changes require:

* New event versions
* Compatibility policy
* Version negotiation where applicable

Existing event versions must remain stable.

---

# 25. Event Replay

Some Platform Events may be replayable.

Replay enables:

* Diagnostics
* Testing
* Simulation
* Audit reconstruction
* Recovery support

Replay does not recreate Runtime execution.

It republishes historical facts.

Consumers remain responsible for replay-safe behavior.

---

# 26. Event Categories vs Commands

The Event Bus transports events.

It does not transport commands.

Examples:

Correct:

* WorkflowCompleted
* ToolFinished
* PromptBuilt

Incorrect:

* ExecuteWorkflow
* InvokeTool
* BuildPrompt

Commands belong to Runtime, Workflow, or other execution owners.

Events describe completed facts.

---

# 27. Event Delivery Failures

Failure to deliver an event to one subscriber must not invalidate the event itself.

Delivery failures must produce normalized Event Delivery Errors.

Operational retry and recovery remain Runtime-owned.

Subscriber implementations must not independently redefine Event Bus delivery semantics.

---

# Chief Architect's Notes

The Event Bus intentionally separates **communication** from **execution**.

A publisher never tells subscribers what to do.

It merely reports what has already occurred.

Likewise, subscribers never influence publication decisions.

This one-way fact-based communication prevents hidden orchestration logic from emerging inside the messaging infrastructure.

Another important principle is transport independence.

The Event Bus defines:

* Publication
* Subscription
* Routing
* Ordering
* Delivery contracts

It deliberately does **not** define:

* Kafka topics
* RabbitMQ exchanges
* Redis channels
* Cloud messaging services

Those belong to infrastructure implementations.

By keeping messaging semantics independent of transport technology, AgentForge preserves the same architectural consistency already established for providers, tools, knowledge stores, memory stores, and evaluators.

---

## Part III — Reliability, Security & Governance

---

# 28. Event Reliability

## 28.1 Purpose

The Event Bus provides reliable delivery of immutable Platform Events according to configured delivery semantics.

Reliability concerns the transport and distribution of events.

It does not include business recovery or execution recovery.

---

## 28.2 Reliability Principles

Platform messaging should support:

* Reliable publication
* Reliable distribution
* Delivery acknowledgment where applicable
* Duplicate detection where supported
* Subscriber isolation
* Failure reporting
* Delivery observability

Reliability guarantees remain implementation-dependent while preserving the platform contracts defined by this blueprint.

---

## 28.3 Reliability Boundary

The Event Bus owns messaging reliability.

The Runtime owns:

* Execution retry
* Workflow retry
* Execution recovery
* Cancellation
* Timeout
* Resource management

Subscribers own recovery of their internal processing.

---

# 29. Dead Letter Handling

## 29.1 Purpose

Some events may repeatedly fail delivery or subscriber processing.

The Event Bus must support controlled handling of undeliverable events.

---

## 29.2 Dead Letter Principles

Dead-letter processing exists to preserve platform stability.

It must never silently discard events.

Events entering dead-letter handling remain:

* Immutable
* Traceable
* Correlated
* Observable
* Auditable

---

## 29.3 Dead Letter Boundary

Dead-letter handling records messaging failures.

It does not determine business recovery.

Operational recovery remains Runtime-owned.

---

# 30. Poison Events

## 30.1 Purpose

A Poison Event is an event that repeatedly causes subscriber failure.

The Event Bus must isolate poison events without destabilizing unrelated subscribers.

---

## 30.2 Isolation

A poison event affecting one subscriber must not block delivery to unrelated subscribers.

The Event Bus isolates subscriber failures rather than global event processing.

---

## 30.3 Recovery

Recovery strategies may include:

* Retry according to messaging policy
* Dead-letter handling
* Administrative intervention
* Diagnostic replay

Business semantics remain unchanged.

---

# 31. Event Security

## 31.1 Purpose

Platform Events may contain protected information.

The Event Bus must preserve security boundaries established by the Security Platform.

---

## 31.2 Security Principles

Every Platform Event inherits:

* Tenant scope
* Workspace scope
* Project scope
* Security classification
* Correlation metadata

Security metadata accompanies the event throughout its lifecycle.

---

## 31.3 Authorization Boundary

The Event Bus does not make authorization decisions.

Authorization remains exclusively owned by Blueprint 15.

The Event Bus enforces the security scope supplied with each event.

Subscribers receive only events they are authorized to observe.

---

## 31.4 Event Visibility

Visibility may depend on:

* Principal
* Tenant
* Workspace
* Project
* Subscription permissions
* Security classification
* Administrative policy

Visibility is evaluated before delivery.

---

# 32. Event Isolation

Events belonging to different tenants, workspaces, projects, or executions remain logically isolated.

Isolation applies to:

* Publication
* Delivery
* Replay
* Diagnostics
* Observability
* Dead-letter handling

Isolation prevents unrelated executions from interfering with one another.

---

# 33. Event Idempotency

## 33.1 Purpose

Subscribers should tolerate duplicate event delivery where messaging semantics permit.

The Event Bus therefore distinguishes:

* Event Identity
* Event Delivery

A single event may be delivered more than once depending on configured delivery guarantees.

---

## 33.2 Subscriber Responsibility

Subscribers requiring idempotent behavior must use the immutable Event Identifier.

The Event Bus provides stable event identity.

Subscriber-specific deduplication remains subscriber-owned.

---

# 34. Event Observability

## 34.1 Purpose

The Event Bus contributes messaging-domain telemetry.

---

## 34.2 Metrics

Examples include:

* Publication rate
* Delivery rate
* Delivery latency
* Subscriber latency
* Dead-letter count
* Replay count
* Delivery failures
* Duplicate deliveries
* Event throughput
* Subscription count
* Queue depth where applicable

Messaging metrics remain separate from Runtime execution metrics.

---

# 35. Event Diagnostics

Diagnostics may include:

* Event Identifier
* Event Version
* Publisher
* Subscriber
* Delivery Status
* Delivery Attempts
* Correlation Identifier
* Replay Status
* Dead-letter Status
* Routing Information
* Delivery Duration

Diagnostics must never expose unauthorized payload data.

---

# 36. Event Lifecycle Events

The Event Bus publishes its own lifecycle events.

Examples include:

* Event Published
* Event Delivered
* Delivery Failed
* Subscriber Registered
* Subscriber Removed
* Replay Started
* Replay Completed
* Dead Letter Recorded
* Event Expired

These events follow the same immutable contracts defined by this blueprint.

---

# 37. Event Expiration

Some Platform Events may have limited operational value.

Event expiration policies may be defined for:

* Temporary notifications
* Diagnostic events
* Monitoring events
* Replay windows

Expiration never modifies historical events.

It only affects future operational availability.

---

# 38. Event Bus Health

The Event Bus shall expose normalized health information.

Examples include:

* Publisher availability
* Subscriber availability
* Delivery backlog
* Dead-letter backlog
* Replay availability
* Subscription registry status
* Transport health

Infrastructure-specific health details remain implementation-specific.

---

# 39. Cursor Implementation Guide

## 39.1 Objective

Cursor should implement a provider-independent Event Bus capable of publishing immutable Platform Events, routing them to authorized subscribers, and exposing standardized messaging contracts.

The implementation must remain independent of any specific transport technology.

---

## 39.2 Required Deliverables

Implement:

* Platform Event
* Event Publisher
* Event Subscriber
* Subscription Registry
* Event Router
* Event Filter
* Delivery Engine
* Correlation support
* Dead-letter abstraction
* Replay abstraction
* Event metadata
* Event diagnostics
* Event observability
* Event health checks

---

## 39.3 Reference Implementations

Cursor may provide lightweight reference implementations for:

* In-process Event Bus
* In-memory Subscription Registry
* Default Router
* Default Filter
* Simple Replay Store
* Basic Dead-letter Store

Reference implementations must remain replaceable.

---

## 39.4 Deferred Responsibilities

Do not implement within Blueprint 16:

* Kafka integration
* RabbitMQ integration
* Redis Pub/Sub integration
* Cloud messaging services
* Distributed cluster coordination
* Cross-region replication
* Workflow orchestration
* Business retries
* Execution recovery
* Scheduling
* Notification channels

These belong to infrastructure implementations or later blueprints.

---

# 40. Testing Requirements

Automated tests must cover:

* Event publication
* Event immutability
* Subscription registration
* Routing
* Filtering
* Ordering
* Correlation
* Replay
* Dead-letter handling
* Poison event isolation
* Security filtering
* Tenant isolation
* Delivery guarantees
* Version compatibility
* Failure normalization
* Diagnostics
* Observability

Contract tests must verify that transport-specific messaging APIs never appear outside the Event Bus boundary.

---

# 41. Acceptance Criteria

Blueprint 16 is complete when:

* Every Platform Event is immutable.
* Event publication is provider-independent.
* Publishers remain unaware of subscribers.
* Subscribers remain isolated from publishers.
* Event routing is deterministic.
* Delivery guarantees are configurable through normalized contracts.
* Event ordering is explicitly defined where required.
* Event replay preserves historical facts.
* Dead-letter handling preserves failed events.
* Poison events remain isolated.
* Event security preserves authorization boundaries.
* Tenant and workspace isolation are maintained.
* Transport technologies remain hidden behind Event Bus contracts.
* Messaging failures are normalized.
* Diagnostics, telemetry, and health information are available.

---

# 42. Ownership Boundaries

## The Event Bus may:

* Publish events
* Route events
* Deliver events
* Filter events
* Correlate events
* Replay events
* Version events
* Report messaging failures
* Publish messaging diagnostics

## The Event Bus must not:

* Execute workflows
* Schedule Runtime work
* Retry business operations
* Recover executions
* Invoke providers
* Execute tools
* Interpret security policies
* Make authorization decisions
* Perform orchestration
* Execute business logic

---

# Chief Architect's Notes

Blueprint 16 establishes AgentForge's messaging backbone.

One architectural principle is intentionally repeated throughout this blueprint:

> **Events are facts—not commands.**

This single decision prevents the Event Bus from gradually becoming an orchestration engine.

Equally important is the distinction between **messaging reliability** and **execution reliability**.

The Event Bus ensures that events are distributed according to messaging contracts.

The Runtime remains responsible for execution retries, workflow recovery, timeout management, cancellation, and operational coordination.

Finally, the Event Bus is intentionally transport-independent.

Whether future deployments use an in-process publisher, Kafka, RabbitMQ, Redis, NATS, Azure Service Bus, Google Pub/Sub, or another technology has no effect on the architectural contracts defined here.

This allows infrastructure to evolve independently while preserving a stable messaging model across the entire AgentForge platform.

---

## Part IV — Final Reliability, Consistency & Governance Amendments

These amendments close the remaining reliability and governance boundaries of the Event Bus.

They are authoritative for all Event Bus transports, publishers, subscribers, plugins, replay mechanisms, and future distributed messaging implementations.

---

# 43. Transactional Event Publication

## 43.1 Purpose

A platform state change and the event describing that state change must not silently diverge.

Without a transactional publication boundary, the platform may successfully persist a state transition but fail to publish its corresponding event, or publish an event for a state transition that was never committed.

This creates inconsistent platform history.

---

## 43.2 Required Consistency

Where a Platform Event describes a durable state transition, the originating state change and event publication intent must participate in a reliable consistency mechanism.

The preferred architectural pattern is a transactional event record or equivalent outbox mechanism.

Conceptually:

```text
Domain State Change
        │
        ▼
Persist State + Event Publication Record
        │
        ▼
Commit
        │
        ▼
Outbox Publisher
        │
        ▼
Event Bus
        │
        ▼
Subscribers
```

The exact implementation may vary according to storage technology, but the consistency guarantee must remain.

---

## 43.3 Publication Outcomes

The system must prevent these invalid states:

```text
State committed
Event permanently lost
```

and:

```text
Event published
State rolled back
```

Where atomic publication cannot be supported directly, the system must preserve sufficient durable publication intent to complete delivery later.

---

## 43.4 Ownership Boundary

The domain component owns the correctness of the state transition and event payload.

The Event Bus owns event transport and delivery.

The transactional publication mechanism owns reliable transfer between committed state and Event Bus publication.

The Event Bus must not become the owner of domain transactions.

---

# 44. Messaging Retry vs Business Retry Boundary

Messaging retries and business-operation retries are different architectural concerns.

## Event Bus Retry

The Event Bus may retry:

* Event publication to the configured transport
* Event delivery to a subscriber endpoint
* Delivery acknowledgment processing
* Temporary messaging-infrastructure failures

These retries repeat delivery of the same immutable event.

They do not recreate the original business operation.

---

## Runtime Retry

The Runtime may retry:

* Workflow operations
* Tool invocations
* Provider interactions
* Knowledge operations
* Memory operations
* Evaluations
* Other executable platform work

Runtime retries may produce new state transitions and new events.

---

## Constitutional Rule

The Event Bus must never retry or recreate the business operation represented by an event.

A delivery failure does not authorize the Event Bus to:

* Re-execute a workflow
* Invoke a tool
* Call an AI provider
* Rebuild a prompt
* Repeat a payment
* Repeat a knowledge mutation
* Repeat a memory mutation
* Trigger business recovery directly

The Event Bus retries delivery.

The Runtime retries execution.

---

# 45. Delivery Guarantee & Idempotency Default

## 45.1 Default Delivery Model

The default AgentForge delivery model is:

> **At-least-once delivery with stable event identity and idempotent subscriber processing.**

This model provides a practical, transport-independent reliability baseline.

---

## 45.2 Duplicate Delivery

A Platform Event may be delivered more than once.

Duplicate delivery does not create a new event.

Every repeated delivery retains the same:

* Event Identifier
* Event Type
* Event Version
* Producer
* Timestamp
* Correlation Identifier
* Causation Identifier
* Payload identity

---

## 45.3 Subscriber Idempotency

Subscribers performing persistent or externally observable work must declare and implement appropriate idempotency behavior.

Possible approaches include:

* Processed-event records
* Inbox patterns
* Idempotency keys
* Conditional writes
* Version checks
* Deduplication stores
* Transactional subscriber processing

The Event Bus supplies stable event identity.

Each subscriber owns the idempotency of its domain processing.

---

## 45.4 Exactly-Once Claims

AgentForge must not claim end-to-end exactly-once processing unless the complete publication, delivery, and subscriber-processing path genuinely provides it.

Transport-level exactly-once delivery does not automatically mean business-level exactly-once processing.

Exactly-once behavior, where supported, is an explicit capability rather than a universal platform assumption.

---

# 46. Correlation, Causation & Ordering Keys

## 46.1 Correlation Identifier

The Correlation Identifier groups events belonging to the same broader execution, request, workflow, or business interaction.

---

## 46.2 Causation Identifier

The Causation Identifier identifies the immediate event, command, execution step, or state transition that caused the current event.

Conceptually:

```text
Execution Started
        │
        ▼
Workflow Started
        │
        ▼
Node Completed
        │
        ▼
Tool Completed
```

Each event may share one Correlation Identifier while preserving its own Causation Identifier.

---

## 46.3 Parent Event Reference

Where event-driven processing produces additional events, the new event should preserve a reference to the event that triggered its processing.

This supports:

* Trace reconstruction
* Audit investigation
* Cycle detection
* Replay analysis
* Failure diagnosis
* Event-chain visualization

---

## 46.4 Ordering Key

Events requiring ordered delivery must declare an explicit Ordering Key.

Possible keys include:

* Execution Identifier
* Workflow Identifier
* Aggregate Identifier
* Resource Identifier
* Tenant Identifier
* Subscription-specific partition key

Ordering is guaranteed only within the scope of the declared ordering contract.

Subscribers must not assume global ordering unless explicitly provided.

---

# 47. Security Authorization & Event Visibility

## 47.1 Authoritative Decision Ownership

Blueprint 15 remains the sole owner of authorization decisions.

The Event Bus does not determine whether a principal should be permitted to observe an event.

It enforces authoritative visibility constraints supplied by the Security Platform.

---

## 47.2 Visibility Evaluation

Before delivering a protected event, the Event Bus must evaluate the applicable normalized authorization outcome or security scope.

The decision may consider:

* Subscriber principal
* Subscription identity
* Tenant scope
* Workspace scope
* Project scope
* Event classification
* Resource scope
* Purpose
* Delegation
* Policy version
* Event visibility restrictions

---

## 47.3 Security Flow

```text
Security Platform
        │
        │ decides
        ▼
Authorization Decision
        │
        ▼
Event Visibility Constraints
        │
        ▼
Event Bus
        │
        │ enforces
        ▼
Authorized Subscriber
```

The Security Platform decides who may observe.

The Event Bus transports and enforces visibility.

The subscriber processes the event.

---

## 47.4 No Permission Expansion

The Event Bus may further restrict delivery when required for secure operation.

It must never expand permissions beyond the authoritative Authorization Decision.

Possession of transport credentials does not imply permission to subscribe to or inspect Platform Events.

---

# 48. Replay Security & Governance

## 48.1 Replay Is a Privileged Operation

Event replay may expose historical, sensitive, or previously restricted facts.

Replay must therefore be explicitly authorized.

A principal authorized to consume current events is not automatically authorized to replay historical events.

---

## 48.2 Replay Request

A replay operation must identify:

* Requesting principal
* Subscription or consumer
* Event types
* Tenant scope
* Workspace and project scope
* Time range
* Correlation range
* Replay purpose
* Security scope
* Replay policy
* Correlation metadata

---

## 48.3 Replay Visibility

Events must be security-filtered according to the authorization valid for the replay operation.

Historical authorization alone does not automatically establish current replay permission.

Replay must not expose events whose current classification or policy prohibits access.

---

## 48.4 Replay Identification

Replayed delivery must be distinguishable from original live delivery.

Replay metadata should include:

* Replay Identifier
* Replay timestamp
* Original publication timestamp
* Replay initiator
* Replay reason
* Replay policy
* Original event identity

The original event itself remains immutable.

---

## 48.5 Replay Side Effects

Subscribers must declare whether they support replay.

Possible subscriber modes include:

* Replay-safe
* Diagnostic replay only
* Read-model rebuild
* Explicit administrative replay
* Replay prohibited

Replay must not unintentionally repeat non-idempotent external side effects.

A subscriber that cannot safely process replayed events must reject or isolate replay delivery.

---

# 49. Backpressure & Subscriber Flow Control

## 49.1 Purpose

Subscribers may process events more slowly than publishers produce them.

The Event Bus must support flow-control contracts that prevent slow subscribers from destabilizing publishers, unrelated subscribers, or the wider platform.

---

## 49.2 Backpressure Principles

Backpressure must remain:

* Subscriber-isolated
* Observable
* Configurable
* Transport-independent
* Security-aware
* Bounded

---

## 49.3 Flow-Control Options

Normalized policies may support:

* Delivery concurrency limits
* Subscriber batch sizes
* Rate limits
* Bounded queues
* Acknowledgment windows
* Delivery suspension
* Circuit breaking at the messaging boundary
* Subscriber isolation
* Load shedding where explicitly allowed

---

## 49.4 Publisher Isolation

A slow subscriber must not directly block unrelated subscribers.

Whether a publisher waits for durable acceptance depends on the publication contract, not on completion of every subscriber’s processing.

---

## 49.5 Overflow Handling

When messaging capacity is exhausted, the Event Bus must apply an explicit policy.

Possible outcomes include:

* Reject publication
* Delay publication
* Persist backlog
* Throttle publisher
* Isolate subscriber
* Dead-letter delivery
* Drop only events explicitly classified as disposable

Silent data loss is prohibited for durable event categories.

---

# 50. Event Retention & Payload Policy

## 50.1 Event Retention

Event retention must be explicit and policy-controlled.

Retention may depend on:

* Event category
* Tenant policy
* Security classification
* Audit requirements
* Replay requirements
* Compliance requirements
* Operational usefulness
* Storage limitations

---

## 50.2 Retention Categories

Possible categories include:

* Ephemeral
* Operational
* Replayable
* Audit-relevant
* Compliance-controlled
* Permanent where legally required

Expiration of Event Bus availability does not automatically authorize deletion of an independent audit record.

---

## 50.3 Large Payload Boundary

Platform Events should describe facts without becoming general-purpose transport containers for large documents, binaries, model outputs, or unrestricted execution state.

Large content should normally be stored through the appropriate platform-owned storage mechanism.

The event should carry a secure reference.

Conceptually:

```text
Large Artifact
        │
        ▼
Authorized Artifact Storage
        │
        ▼
Secure Artifact Reference
        │
        ▼
Platform Event
```

---

## 50.4 Payload Requirements

Event payloads must:

* Be bounded
* Be schema-defined
* Preserve security classification
* Avoid raw credentials
* Avoid secret material
* Avoid provider SDK objects
* Avoid unnecessary sensitive data
* Avoid full mutable domain aggregates where a reference is sufficient

---

## 50.5 Payload Availability

A referenced payload may have a different lifecycle from the event.

Consumers must handle:

* Expired references
* Revoked access
* Deleted artifacts
* Version changes
* Unavailable external content

An event reference does not guarantee permanent artifact availability unless policy explicitly provides that guarantee.

---

# 51. Event Bus Lifecycle Recursion Protection

## 51.1 Purpose

The Event Bus may emit messaging-domain lifecycle events such as:

* Event Published
* Delivery Completed
* Delivery Failed
* Dead Letter Recorded
* Replay Started
* Replay Completed

Without safeguards, publishing an event about event publication may recursively generate another event about that publication.

---

## 51.2 Recursion Boundary

Event Bus lifecycle telemetry must not create unbounded recursive event publication.

Implementations must distinguish between:

* Domain Platform Events
* Event Bus operational lifecycle records
* Observability telemetry
* Audit records

Not every internal Event Bus operation should be published back through the same unrestricted event path.

---

## 51.3 Protection Mechanisms

Possible mechanisms include:

* Dedicated internal event categories
* Non-recursive lifecycle channels
* Recursion-depth limits
* Lifecycle-event suppression rules
* Internal telemetry pipelines
* Explicit event-origin markers
* Prohibition of lifecycle-on-lifecycle publication

The implementation must prevent infinite or uncontrolled event amplification.

---

## 51.4 Subscriber Cycle Protection

Event-driven subscribers may publish new legitimate domain events.

Such chains must preserve correlation and causation metadata.

Where event loops are possible, policies should support:

* Cycle detection
* Maximum event-chain depth
* Duplicate causation detection
* Rate limits
* Circuit breaking
* Administrative isolation

Cycle protection must not prohibit legitimate event-driven domain behavior.

---

# 52. Final Event Processing Model

The canonical messaging flow is:

```text
Committed Platform State
        │
        ▼
Transactional Publication Record
        │
        ▼
Event Bus Publication
        │
        ▼
Security Visibility Enforcement
        │
        ▼
Routing & Subscription Resolution
        │
        ▼
Delivery Under Flow-Control Policy
        │
        ▼
Idempotent Subscriber Processing
        │
        ▼
Subscriber-Owned Domain Outcome
```

The ownership boundaries are:

```text
Publisher
    Owns event correctness

Transactional Publication Mechanism
    Owns state-to-event consistency

Security Platform
    Owns authorization decisions

Event Bus
    Owns messaging transport and delivery semantics

Subscriber
    Owns domain processing and processing idempotency

Runtime
    Owns executable business recovery and orchestration
```

---

# 53. Additional Cursor Implementation Requirements

In addition to the deliverables defined earlier, Cursor must implement contracts for:

* Transactional event publication
* Outbox or equivalent publication records
* Correlation identifiers
* Causation identifiers
* Ordering keys
* Subscriber idempotency metadata
* Replay authorization
* Replay metadata
* Subscriber replay capability
* Backpressure policies
* Subscriber concurrency limits
* Event-retention policies
* Payload-size policies
* Secure external payload references
* Event-chain depth
* Event recursion protection
* Messaging retry policies distinct from Runtime retry policies

Reference implementations may use in-memory stores, but all contracts must remain suitable for later distributed transports.

---

# 54. Additional Testing Requirements

Automated tests must cover:

* State committed with delayed event publication
* Publication recovery from an outbox record
* Prevention of event publication for rolled-back state
* Duplicate delivery
* Idempotent subscriber handling
* Messaging retry without business-operation retry
* Correlation preservation
* Causation preservation
* Ordering-key enforcement
* Unauthorized subscription prevention
* Replay authorization
* Replay-safe and replay-prohibited subscribers
* Backpressure isolation
* Slow-subscriber behavior
* Queue overflow policy
* Retention expiration
* Large-payload reference handling
* Revoked payload references
* Lifecycle-event recursion protection
* Event-chain cycle detection
* Subscriber event amplification controls

---

# 55. Additional Acceptance Criteria

Implementation must satisfy the following additional acceptance criteria:

* Durable state transitions can reliably produce corresponding Platform Events.
* Event publication failures cannot permanently lose committed publication intent.
* Event Bus retries remain distinct from Runtime business retries.
* At-least-once delivery is the default reliability assumption.
* Subscribers can safely handle duplicate delivery.
* Every event supports correlation and causation metadata.
* Ordering requirements use explicit Ordering Keys.
* Blueprint 15 remains the authority for event visibility decisions.
* Replay is explicitly authorized, governed, identifiable, and auditable.
* Replay cannot silently repeat unsafe external side effects.
* Slow subscribers cannot destabilize unrelated subscribers.
* Backpressure and overflow behavior are explicit.
* Event retention is policy-controlled.
* Large event payloads use bounded contracts or secure external references.
* Event Bus lifecycle reporting cannot create recursive event storms.
* Event-driven subscriber chains preserve causation and support cycle protection.

---

# Chief Architect Amendment

Blueprint 16 defines messaging, not business execution.

Reliable messaging requires more than transport abstraction. It requires consistency between committed state and published facts, explicit delivery guarantees, duplicate-tolerant consumers, controlled replay, security-governed visibility, bounded payloads, flow control, and protection from recursive event amplification.

The final constitutional boundaries are:

> The publisher owns the truth of the event.

> The transactional publication mechanism preserves state-to-event consistency.

> The Security Platform decides who may observe the event.

> The Event Bus transports the event according to messaging contracts.

> The subscriber owns domain processing and processing idempotency.

> The Runtime owns business execution, orchestration, retry, and recovery.

No Event Bus implementation, transport adapter, subscriber, or plugin may collapse these responsibilities.



# Part V — Final Contract Clarifications

These clarifications finalize the Event Bus contracts established in Blueprint 16.

They do not alter the architecture defined in Parts I–IV. Their purpose is to remove the final implementation ambiguities around security enforcement, event identity, delivery identity, causation, transactional publication ownership, and event immutability.

These rules are authoritative for all Event Bus implementations, transports, publishers, subscribers, replay systems, plugins, and delivery adapters.

---

# 56. Authorization Outcome Enforcement

## 56.1 Purpose

The Event Bus enforces event-visibility restrictions but does not make authorization decisions.

Blueprint 15 — Security & Authorization Platform remains the sole authority responsible for deciding whether a principal or subscriber may observe a Platform Event.

---

## 56.2 Canonical Security Flow

```text
Security Platform
        │
        │ produces authoritative decision
        ▼
Authorization Decision
        │
        ▼
Normalized Visibility Constraints
        │
        ▼
Event Bus
        │
        │ enforces supplied constraints
        ▼
Authorized Subscriber
```

The Security Platform decides.

The Event Bus enforces.

The subscriber processes the event.

---

## 56.3 Terminology

Throughout Blueprint 16, the term:

> Security Visibility Enforcement

should be interpreted as:

> **Authorization Outcome Enforcement**

The Event Bus applies normalized security constraints supplied by the Security Platform.

It must never:

* Determine authorization independently
* Reinterpret security policies
* Expand subscriber permissions
* Convert an indeterminate decision into permission
* Infer authorization from transport credentials
* Treat subscription registration as authorization
* Bypass tenant, workspace, project, or resource scope

The Event Bus may further restrict event delivery when required for secure operation.

It must never grant access beyond the authoritative Authorization Decision.

---

# 57. Event Identifier & Delivery Identifier

## 57.1 Event Identifier

The **Event Identifier** represents the identity of the immutable logical Platform Event.

It remains stable across:

* Initial publication
* Delivery retries
* Duplicate deliveries
* Replay
* Transport changes
* Subscriber redelivery
* Serialization and deserialization

Conceptually:

```text
Platform Event
EventId = EVT-123
```

The Event Identifier identifies the fact that occurred.

---

## 57.2 Delivery Identifier

The **Delivery Identifier** represents one specific delivery instance or attempt for a Platform Event.

Each delivery attempt receives its own Delivery Identifier.

Example:

```text
Platform Event
EventId = EVT-123

First Delivery
DeliveryId = DEL-001

Retry Delivery
DeliveryId = DEL-002

Replay Delivery
DeliveryId = DEL-003
```

The same immutable event may therefore have multiple delivery records.

---

## 57.3 Delivery Metadata

A delivery record may include:

* Delivery Identifier
* Event Identifier
* Subscriber Identifier
* Subscription Identifier
* Delivery attempt number
* Delivery timestamp
* Delivery mode
* Replay Identifier where applicable
* Acknowledgment status
* Failure category
* Delivery diagnostics
* Transport metadata reference

Delivery metadata is separate from the Platform Event itself.

---

## 57.4 Replay Identity

Replay must preserve the original Event Identifier.

Each replay delivery receives:

* A new Delivery Identifier
* Replay metadata
* The original Event Identifier
* The original publication timestamp
* The replay timestamp

Replay creates a new delivery of an existing event.

It does not create a new logical event.

---

## 57.5 Ownership Boundary

The Event Bus owns delivery identity and delivery diagnostics.

The publisher owns the logical event identity and event content.

Subscribers may use both identifiers for:

* Deduplication
* Inbox processing
* Acknowledgment
* Diagnostics
* Replay detection
* Delivery auditing

Subscriber idempotency must be based primarily on stable Event Identity rather than Delivery Identity.

---

# 58. Causation Identifier Semantics

## 58.1 Purpose

The Causation Identifier identifies the immediate event or operation that caused a Platform Event to be produced.

It allows AgentForge to reconstruct event chains rather than relying only on broad execution correlation.

---

## 58.2 Root Events

A root event may have no preceding event.

For root events:

```text
CausationId = null
```

or an explicitly defined equivalent empty value.

Example:

```text
ExecutionStarted
EventId = EVT-100
CorrelationId = EXEC-001
CausationId = null
```

A null Causation Identifier means that the event is the root of the recorded event chain.

It must not be interpreted as missing or invalid metadata when the event is legitimately a root event.

---

## 58.3 Derived Events

Events caused by another event preserve the parent Event Identifier as their Causation Identifier.

Example:

```text
ExecutionStarted
EventId = EVT-100
CorrelationId = EXEC-001
CausationId = null

WorkflowStarted
EventId = EVT-101
CorrelationId = EXEC-001
CausationId = EVT-100

NodeCompleted
EventId = EVT-102
CorrelationId = EXEC-001
CausationId = EVT-101
```

This creates an explicit event graph.

---

## 58.4 Non-Event Causes

A Platform Event may also be caused directly by:

* A Runtime execution step
* A user request
* A workflow transition
* A command handled outside the Event Bus
* A scheduled Runtime operation
* An external integration callback

Where the cause is not itself a Platform Event, the event contract may preserve a normalized **Cause Reference** containing:

* Cause type
* Cause identifier
* Execution reference
* Producer reference
* Correlation metadata

The Causation Identifier remains reserved for referencing an immediate parent Platform Event where one exists.

---

## 58.5 Correlation vs Causation

The distinction is:

```text
Correlation Identifier
    Groups related events within a broader execution or interaction.

Causation Identifier
    Identifies the immediate parent event.

Cause Reference
    Identifies a non-event operation that directly caused the event.
```

Subscribers, diagnostics, tracing systems, and replay mechanisms must preserve these distinctions.

---

# 59. Transactional Publication & Outbox Ownership

## 59.1 Purpose

Transactional publication preserves consistency between a durable domain-state transition and the Platform Event describing that transition.

The Event Bus does not own the domain transaction.

---

## 59.2 Outbox Ownership

The outbox or equivalent transactional publication record belongs to:

* The originating domain component
* The component’s transactional persistence boundary
* Or a dedicated transactional publication service operating within that boundary

It does **not** belong to the Event Bus as domain state.

Conceptually:

```text
Domain Component
        │
        ├── Domain State
        └── Transactional Outbox
                  │
                  ▼
          Outbox Publisher
                  │
                  ▼
              Event Bus
```

---

## 59.3 Responsibility Separation

### Domain Component

Owns:

* Domain transaction
* State-transition correctness
* Event truth
* Event payload correctness
* Creation of publication intent

### Transactional Publication Mechanism

Owns:

* Atomic persistence of state and publication intent
* Detection of unpublished records
* Reliable transfer of committed publication intent
* Publication status tracking
* Safe duplicate publication handling

### Event Bus

Owns:

* Event validation at its public boundary
* Transport publication
* Routing
* Delivery
* Delivery retries
* Replay
* Messaging diagnostics

The Event Bus must not become the owner of domain persistence, aggregate transactions, or business-state consistency.

---

## 59.4 Outbox Processing

Outbox publication may occur asynchronously after the domain transaction commits.

The publication process must be:

* Idempotent
* Observable
* Recoverable
* Traceable
* Safe under duplicate processing
* Independent of business-operation replay

A publication retry must republish the same immutable event identity.

It must not recreate the originating state transition.

---

## 59.5 Failure Semantics

A failure to publish an outbox record means:

> Committed publication intent remains pending.

It does not mean:

> The original business operation should be executed again.

The outbox publisher retries transfer of the committed event.

The Runtime remains the owner of business-operation recovery.

---

# 60. Logical Event Immutability

## 60.1 Constitutional Rule

A Platform Event is an immutable logical fact.

The following operations must never mutate the logical Platform Event:

* Publication retry
* Delivery retry
* Duplicate delivery
* Replay
* Serialization
* Deserialization
* Compression
* Encryption
* Transport adaptation
* Subscriber routing
* Dead-letter handling
* Diagnostic inspection
* Persistence migration

---

## 60.2 Stable Logical Content

The following logical event properties must remain unchanged:

* Event Identifier
* Event Type
* Event Contract Version
* Producer
* Original timestamp
* Correlation Identifier
* Causation Identifier
* Cause Reference
* Tenant and ownership scope
* Security classification
* Logical payload
* Source metadata
* Original event provenance

Example:

```text
Original Publication
EventId = EVT-123
Version = 1
Payload = X

Delivery Retry
EventId = EVT-123
Version = 1
Payload = X

Replay Delivery
EventId = EVT-123
Version = 1
Payload = X
```

Only delivery-specific or replay-specific metadata may differ.

---

## 60.3 Transport Transformation

Transport implementations may transform the physical representation of an event for technical delivery.

Examples include:

* JSON serialization
* Binary serialization
* Compression
* Encryption
* Envelope wrapping
* Transport headers
* Partition metadata

These transformations must preserve the same logical event when decoded.

Transport transformation must never:

* Rewrite event meaning
* Change payload values
* Change Event Identity
* Change event contract version
* Remove required security metadata
* Replace original timestamps
* Convert one logical event type into another

---

## 60.4 Corrections

An incorrect published event must never be edited in place.

A correction requires publication of a new event.

The correcting event should preserve:

* Its own new Event Identifier
* Reference to the original event
* Correction reason
* Corrected information
* Correlation and causation metadata
* Applicable security scope

Conceptually:

```text
Original Event
EventId = EVT-123

Correction Event
EventId = EVT-456
CorrectsEventId = EVT-123
```

Historical facts remain immutable.

Corrections become additional facts.

---

## 60.5 Dead-Letter & Replay Immutability

Dead-letter handling preserves the original Platform Event.

It may attach separate failure metadata but must not modify the event payload.

Replay preserves the original Platform Event and adds separate replay-delivery metadata.

This ensures that:

* Auditing remains reliable
* Diagnostics remain reproducible
* Replay remains trustworthy
* Subscriber deduplication remains consistent
* Event history remains tamper-evident

---

# 61. Final Contract Model

The completed Event Bus contract is:

```text
Domain Component
        │
        │ owns state and event truth
        ▼
Transactional Persistence Boundary
        │
        │ persists state + publication intent
        ▼
Outbox Publisher
        │
        │ transfers committed event
        ▼
Immutable Platform Event
        │
        ├── Event Identifier
        ├── Correlation Identifier
        ├── Causation Identifier
        ├── Cause Reference
        └── Security Scope
        │
        ▼
Security Platform
        │
        │ produces authorization outcome
        ▼
Event Bus
        │
        │ enforces visibility and delivers
        ▼
Delivery Instance
        │
        └── Unique Delivery Identifier
        │
        ▼
Subscriber
        │
        │ owns processing and idempotency
        ▼
Subscriber Domain Outcome
```

The final ownership rules are:

```text
Security Platform
    Owns event-observation authorization.

Event Bus
    Enforces normalized visibility constraints.

Publisher
    Owns the logical Platform Event.

Transactional Publication Boundary
    Owns durable state-to-event consistency.

Event Bus Delivery Layer
    Owns Delivery Identifiers and delivery diagnostics.

Subscriber
    Owns domain processing and processing idempotency.

Runtime
    Owns business execution, retry, recovery, scheduling, and cancellation.
```

---

# Chief Architect Final Clarification

Blueprint 16 defines two distinct identities:

> **Event Identity identifies the immutable fact.**

> **Delivery Identity identifies one attempt to deliver that fact.**

Retries and replay create new delivery instances, not new logical events.

Root events may have no parent event and therefore carry a null Causation Identifier. Derived events preserve explicit parent-event causation, allowing complete event-chain reconstruction.

Transactional publication remains owned by the originating domain persistence boundary. The Event Bus transports committed facts but never owns the domain transaction that created them.

Finally, serialization, transport adaptation, retry, replay, and dead-letter handling must never mutate the logical Platform Event. Any correction requires publication of a new immutable event.

These clarifications complete the Event Bus contract and remove the final implementation ambiguities identified during architectural review.
