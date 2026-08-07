AgentProdReady
Engineering Blueprint 06
Workflow Engine

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

Audience

Platform Architects
Workflow Engineers
Runtime Engineers
AI Engineers
Cursor AI
1. Purpose

The Workflow Engine is responsible for interpreting and advancing structured workflow graphs produced by the Planning Engine under Runtime-coordinated execution.

Rather than executing business operations directly, the Workflow Engine evaluates workflow structure, determines logical progression, manages workflow state, and identifies the next eligible unit of work. Operational execution remains the responsibility of the Runtime.

It is the platform's execution model.

2. Responsibilities

The Workflow Engine owns:

Workflow execution
Workflow state management
Workflow node execution
Dependency evaluation
Branch execution
Conditional routing
Loop execution
Parallel branch coordination
Human approval pauses
Workflow resumption
Workflow completion
Workflow failure propagation

The Workflow Engine does not own:

Planning
Runtime scheduling
Provider resolution
AI provider execution
Tool implementation
Knowledge retrieval
Memory persistence
Retry policies
Timeout policies
4. Blueprint Dependencies

Depends upon:

Blueprint 01
Blueprint 02
Blueprint 03
Blueprint 04
Blueprint 05

Future dependent blueprints:

Tool Framework
Knowledge Engine
Memory Engine
AI Provider Framework
Evaluation Framework
5. Workflow Philosophy

A workflow is not a business process.

A workflow is not an orchestration engine.

A workflow is an executable graph produced from an Execution Plan.

It exists only to coordinate logical work.

Execution policies remain under Runtime ownership.

Business logic remains inside specialized platform components.

6. Architectural Position
User Objective
        │
        ▼
Planning Engine
        │
        ▼
Execution Plan
        │
        ▼
Workflow Definition
        │
        ▼
Workflow Engine
        │
"What logical work is ready next?"
        │
        ▼
Runtime
        │
"When and how should it execute?"
        │
        ▼
Node Execution Contract
        │
        ▼
Capability Resolver
        │
        ▼
Provider / Tool / Knowledge / Memory

The Workflow Engine sits between planning and execution.

7. Workflow Principles
Executable

Every workflow must be executable without further planning.

Immutable

Once execution begins, the workflow becomes immutable.

Nodes are never inserted, removed, or reordered during execution.

Provider Independent

A workflow references capabilities.

Never providers.

Execution Independent

A workflow never owns:

retries
timeout
scheduling
recovery
concurrency

Those belong to Runtime.

Observable

Every workflow transition produces telemetry.

Resumable

A workflow may pause and later resume without changing its logical structure.

8. Workflow Lifecycle

Every workflow progresses through the same lifecycle.

Created
    │
    ▼
Initialized
    │
    ▼
Running
    │
    ▼
Waiting (optional)
    │
    ▼
Resumed
    │
    ▼
Completing
    │
    ▼
Completed

Failure paths:

Running
    │
    ▼
Failed

Cancellation:

Running
    │
    ▼
Cancelled

Only the Workflow Engine changes workflow state.

9. Internal Components

The Workflow Engine consists of several focused services.

Workflow Execution Coordinator

Coordinates workflow-state advancement and interaction with the Runtime. It progresses the workflow according to dependency evaluation and lifecycle rules but never performs operational execution itself.

Workflow State Manager

Tracks workflow state.

Workflow Navigator

Determines the next executable node.

Node Execution Coordinator

Converts an eligible workflow node into the appropriate Node Execution Contract for Runtime-coordinated execution. It never invokes providers directly and remains independent of execution policies.

Branch Coordinator

Coordinates conditional branches.

Parallel Coordinator

Coordinates parallel workflow branches.

Loop Controller

Controls iterative execution.

Approval Coordinator

Manages human approval pauses.

Workflow Validator

Validates workflow structure before execution.

Workflow Event Publisher

Publishes workflow lifecycle events.

10. What is a Workflow?

A workflow is a directed execution graph.

Conceptually:

Workflow
│
├── Metadata
├── Entry Node
├── Workflow Nodes
├── Connections
├── Dependencies
├── Decision Rules
├── Completion Rules
└── Exit Node

A workflow contains execution structure only.

It contains no provider implementations.

11. Workflow Nodes

A workflow consists of reusable nodes.

Examples include:

AI Node
Tool Node
Knowledge Retrieval Node
Memory Retrieval Node
Decision Node
Approval Node
Delay Node
Parallel Node
Merge Node
Completion Node

Nodes represent logical operations rather than implementation details.

12. Node Lifecycle

Each workflow node progresses through:

Ready
   │
   ▼
Executing
   │
   ▼
Completed

Possible alternative states:

Executing
      │
      ▼
Waiting
      │
      ▼
Resumed

Or

Executing
      │
      ▼
Failed

Node state is managed exclusively by the Workflow Engine.

13. Workflow Navigation

The Workflow Navigator determines the next executable node based on:

completed dependencies
decision outcomes
branch conditions
loop conditions
workflow completion rules

The navigator never evaluates business logic.

It evaluates workflow structure only.

14. Workflow Graph
14.1 Purpose

A workflow is represented internally as a directed execution graph.

The graph defines the relationships between workflow nodes, their execution order, and the dependencies required before a node may execute.

The Workflow Engine is responsible for traversing this graph during execution.

14.2 Graph Principles

Every workflow graph must satisfy the following principles:

Exactly one entry point.
One or more valid exit points.
Explicit node dependencies.
Deterministic traversal.
No unreachable nodes.
Valid dependency relationships.

The Workflow Validator ensures these rules before execution begins.

14.3 Graph Ownership

The graph structure is produced by the Planning Engine.

The Workflow Engine consumes the graph but must never modify its structure during execution.

15. Workflow Dependencies
15.1 Purpose

Workflow dependencies define when a node becomes eligible for execution.

A node may only execute after all required predecessor nodes have completed successfully.

15.2 Dependency Types

Typical dependency relationships include:

Sequential dependency
Parallel dependency
Conditional dependency
Approval dependency
Merge dependency

The Workflow Engine evaluates dependency completion continuously throughout execution.

15.3 Dependency Evaluation

Dependency evaluation considers only workflow state.

Business rules remain outside the Workflow Engine.

16. Branching
16.1 Purpose

Branching enables workflows to follow different execution paths based on planning outcomes or execution results.

16.2 Branch Types

Supported conceptual branch types include:

Conditional Branch

Exactly one path continues.

Example:

Decision
   │
 ┌─┴─────┐
 │        │
Yes      No
Multi-Branch

Multiple independent branches may execute.

Parallel Branch

Several branches execute concurrently.

The Runtime coordinates scheduling.

The Workflow Engine coordinates structure.

16.3 Architectural Boundary

The Workflow Engine determines which branch is structurally valid.

The Runtime determines when and how branches execute.

17. Parallel Workflows
17.1 Purpose

Independent workflow branches may execute in parallel.

Parallelism improves execution efficiency while preserving workflow correctness.

17.2 Responsibilities

The Workflow Engine identifies independent branches.

The Runtime performs concurrent execution.

This distinction preserves clear ownership between workflow structure and execution policy.

17.3 Synchronization

Parallel branches eventually synchronize through merge points.

A merge node executes only after all required incoming branches complete.

18. Loops
18.1 Purpose

Some workflows require repeated execution of a sequence of nodes.

Loops provide this capability without modifying the workflow graph.

18.2 Loop Principles

Loops are:

Explicit
Bounded or policy-controlled
Observable
Resumable

Loop execution never changes workflow structure.

18.3 Loop Ownership

The Workflow Engine evaluates loop conditions.

The Runtime controls execution scheduling.

19. Human Approval
19.1 Purpose

Enterprise workflows frequently require manual decisions.

The Workflow Engine supports explicit approval nodes that pause execution until a decision is received.

19.2 Approval Lifecycle
Running
   │
   ▼
Approval Required
   │
   ▼
Waiting
   │
 ┌─┴──────────┐
 │            │
Approved   Rejected

The Workflow Engine manages the waiting state.

The Runtime manages execution suspension and resumption.

19.3 Approval Independence

Approval mechanisms are independent of user interface implementations.

Approvals may originate from:

Web applications
Mobile applications
APIs
External systems
20. Workflow Persistence & Resumption
20.1 Purpose

Long-running workflows may require suspension and later continuation.

The Workflow Engine therefore defines workflows as resumable execution artifacts.

20.2 Persistence Contract

The Workflow Engine defines what must be preserved for resumption.

Examples include:

Workflow identifier
Current workflow state
Active node
Completed nodes
Pending branches
Decision outcomes

How and where this information is stored is defined by a later persistence blueprint.

20.3 Resumption

When resumed:

The workflow structure remains unchanged.
Completed nodes are not re-executed.
Pending nodes continue from the recorded state.

Resumption preserves execution correctness.

21. Workflow Events

The Workflow Engine publishes lifecycle events through the Event Bus.

Typical events include:

Workflow Created
Workflow Started
Node Started
Node Completed
Branch Selected
Parallel Branch Started
Parallel Branch Completed
Workflow Waiting
Workflow Resumed
Workflow Completed
Workflow Failed
Workflow Cancelled

Events enable loose coupling between platform components.

22. Workflow Observability

Every workflow contributes telemetry to the Observability Platform.

Logging

Workflow lifecycle events.

Metrics

Examples include:

Workflow duration
Node duration
Branch count
Parallel execution count
Approval wait time
Workflow completion rate
Workflow failure rate
Distributed Tracing

Each workflow participates in the execution trace initiated by the Runtime.

Individual nodes contribute child spans.

Diagnostics

Workflow diagnostics should expose structural information such as:

Node graph
Execution path
State transitions
Dependency relationships

without exposing sensitive execution data.

23. Workflow Boundaries

The Workflow Engine may:

Interpret and advance workflow graphs under Runtime-coordinated execution.
Navigate workflow nodes.
Evaluate dependencies.
Manage workflow state.
Pause workflows.
Resume workflows.
Coordinate branching.
Coordinate looping.

The Workflow Engine must not:

Create execution plans.
Schedule execution.
Select providers.
Execute providers directly.
Retrieve knowledge.
Persist memory.
Apply retries or timeout policies.
Make authorization decisions.

These responsibilities remain with their respective platform components.

24. Cursor Implementation Guide
Objective

Cursor should implement the structural workflow infrastructure without embedding business logic.

Required Deliverables

Implement:

Workflow model
Workflow graph
Workflow execution coordinator
Workflow state manager
Workflow navigator
Node execution coordinator
Branch coordinator
Parallel coordinator
Loop controller
Approval coordinator
Workflow validator
Workflow event publisher
Workflow observability integration
Workflow diagnostics
Deferred Responsibilities

Do not implement:

Runtime scheduling
Planning logic
Provider execution
AI integrations
Knowledge retrieval
Memory persistence
Persistence storage implementation
Human approval UI

The Workflow Engine should coordinate execution through public contracts only.

25. Acceptance Criteria

Blueprint 06 is considered complete when:

Every validated Execution Plan contains or produces a valid Workflow Definition that can be interpreted and advanced by the Workflow Engine under Runtime-coordinated execution.
Workflows are represented as immutable execution graphs.
Workflow nodes execute according to explicit dependency rules.
Branching, looping, and parallel paths are structurally supported.
Human approval workflows can pause and resume execution.
Workflow state transitions are centrally managed.
Workflow lifecycle events are published consistently.
Workflow telemetry participates in the platform's observability infrastructure.
Workflow execution remains independent of Runtime scheduling, provider resolution, and business logic.
26. Chief Architect's Notes

The Workflow Engine is the structural execution layer of AgentProdReady. Its purpose is not to decide what work should occur—that responsibility belongs to the Planning Engine—nor to decide how execution policies such as retries, timeouts, or concurrency should be applied—that belongs to the Runtime. Instead, the Workflow Engine is responsible for executing the logical graph that bridges planning and runtime orchestration.

The Workflow Engine owns workflow semantics, while the Runtime owns execution mechanics. This distinction is a constitutional architectural boundary within AgentProdReady and must not be violated by future platform components or extensions.

A deliberate architectural decision is to make workflows immutable executable artifacts. Once execution begins, the graph cannot be modified. This provides deterministic execution, simplifies debugging, enables future persistence and replay, and establishes a stable contract between planning and execution.

Another important distinction is between workflow structure and execution policy. The Workflow Engine determines which nodes, branches, and dependencies exist, while the Runtime determines scheduling, concurrency, resilience, and resource management. Maintaining this separation prevents responsibility overlap and allows both subsystems to evolve independently.





Appendix A — Architectural Clarifications (Post-Review)

This appendix records architectural clarifications identified during design review. These clarifications do not change the intent of Blueprint 06 but make the ownership boundaries between the Planning Engine, Workflow Engine, Runtime, and downstream execution components explicit. These clarifications are considered authoritative for implementation.

A.1 Workflow Engine vs Runtime Ownership

The Workflow Engine and Runtime cooperate closely during execution but own different responsibilities.

The Workflow Engine owns the logical progression of a workflow.

The Runtime owns the operational execution of that progression.

Conceptually:

Planning Engine
        │
        ▼
Execution Plan
        │
        ▼
Workflow Engine
"What logical work is ready next?"
        │
        ▼
Runtime
"When and how should it execute?"
        │
        ▼
Capability Resolver
"Who performs the work?"
        │
        ▼
Provider / Tool / Knowledge / Memory

This separation is a core architectural principle of AgentProdReady and must not be violated.

A.2 Workflow Engine Responsibilities

The Workflow Engine is responsible for interpreting and advancing the logical workflow graph.

Its responsibilities include:

Loading and validating workflow definitions
Interpreting the workflow graph
Evaluating node dependencies
Determining node eligibility
Managing workflow state
Managing node state
Evaluating branch conditions
Managing loop semantics
Managing approval states
Identifying the next logical unit of work

The Workflow Engine does not determine execution policies.

A.3 Runtime Responsibilities

The Runtime is the operational execution authority.

Its responsibilities include:

Scheduling execution
Creating execution scopes
Managing concurrency
Enforcing timeout policies
Coordinating retry behavior
Managing cancellation
Coordinating recovery
Managing execution resources
Invoking node execution contracts

The Runtime advances the workflow according to decisions made by the Workflow Engine but remains responsible for operational execution behavior.

A.4 Node Execution Clarification

Throughout this blueprint, references to "node execution" should be interpreted as logical workflow advancement, not direct business execution.

The execution sequence is:

Workflow Engine
        │
        │ determines eligible node
        ▼
Runtime
        │
        │ applies scheduling, retry,
        │ timeout, cancellation
        ▼
Node Execution Contract
        │
        ▼
Capability Resolver
        │
        ▼
Provider / Tool / Knowledge / Memory

The Workflow Engine never invokes providers directly.

The Runtime coordinates invocation through the appropriate execution contracts.

A.5 Parallel Execution Clarification

The Workflow Engine identifies opportunities for logical parallelism.

For example:

"Node A and Node B have no outstanding dependencies and are both eligible."

The Runtime determines how those operations execute.

Depending on runtime policies, they may execute:

concurrently,
sequentially,
or under constrained resource limits.

The Workflow Engine never manages threads, tasks, or scheduling primitives.

A.6 Loop Ownership

Loop behavior is divided between logical semantics and operational policies.

The Workflow Engine owns:

loop conditions,
iteration semantics,
workflow-defined iteration limits.

The Runtime owns:

execution timeout,
cancellation,
concurrency limits,
resource management,
retry policies.

This separation prevents execution policies from leaking into workflow semantics.

A.7 Workflow Definition vs Workflow Execution State

Blueprint 06 distinguishes between two separate concepts.

Workflow Definition

The immutable workflow graph.

It contains:

nodes,
edges,
dependencies,
branching structure,
loop definitions,
approval nodes.

Once execution begins, the Workflow Definition cannot change.

Workflow Execution State

The mutable state associated with an executing workflow.

Examples include:

current node,
completed nodes,
pending nodes,
branch outcomes,
loop iteration counters,
approval status,
workflow lifecycle state.

Execution State changes continuously during execution while the Workflow Definition remains immutable.

A.8 Planning Boundary

The Planning Engine is responsible for producing the workflow definition as part of the Execution Plan.

The Workflow Engine is responsible for:

validating,
loading,
interpreting,
and advancing

that workflow definition during execution.

The Workflow Engine must never generate workflow structures independently.

A.9 Terminology

For consistency throughout the platform, the following terminology should be used.

Workflow Definition

The immutable logical execution graph produced during planning.

Workflow Execution State

The mutable state describing the progress of an executing workflow.

Workflow Execution

The Runtime-coordinated process of advancing the workflow according to the Workflow Engine's logical decisions.

Future blueprints should use this terminology consistently.

