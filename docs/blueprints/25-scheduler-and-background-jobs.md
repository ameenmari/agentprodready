# AgentProdReady

# Engineering Blueprint 25

# Scheduler & Background Jobs Framework

**Version:** 2.0

**Status:** Approved


---

# 1. Purpose

The Scheduler & Background Jobs Framework defines how AgentProdReady schedules and manages work that executes outside the immediate request lifecycle.

It standardizes:

* Scheduled execution
* Delayed execution
* Recurring jobs
* Background processing
* Job lifecycle
* Job coordination
* Job retry contracts
* Queue abstraction

It does **not** replace the Runtime or Workflow Engine.

The Runtime owns execution.

The Scheduler determines **when execution should begin**.

---

# 2. Responsibilities

The framework owns:

* Job Definitions
* Schedule Definitions
* Job Queue contracts
* Job Lifecycle
* Job Dispatch
* Trigger Policies
* Retry Policies (job scheduling only)
* Job Metadata
* Background Worker contracts
* Scheduler diagnostics

It does **not** own:

* Runtime execution
* Workflow progression
* Planning
* Capability Resolution
* Security authorization
* Tool execution
* AI execution
* Event transport
* Audit persistence

---

# 3. Dependencies

Blueprint 25 depends on:

* Blueprint 04 — Runtime
* Blueprint 15 — Security Platform
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform
* Blueprint 22 — Observability
* Blueprint 24 — Persistence Framework

---

# 4. Public Contracts

## Consumes

* Job Requests
* Schedule Requests
* Trigger Events
* Runtime Execution Requests
* Authorization Decisions

## Produces

* Job Definition
* Scheduled Job
* Job Dispatch Request
* Job Result Metadata
* Job Lifecycle Record

Owns provider-independent scheduling semantics.

---

# 5. Job Definition

Every background activity is represented by an immutable Job Definition.

A Job Definition may contain:

* Job Identifier
* Job Type
* Schedule
* Trigger
* Execution Target
* Constraints
* Retry Policy
* Expiration
* Priority
* Security Requirements
* Correlation Metadata

Job Definitions do not contain Runtime execution state.

---

# 6. Scheduling Models

The framework supports:

* One-time execution
* Delayed execution
* Fixed interval
* Cron schedules
* Event-triggered scheduling
* Manual scheduling

Scheduling determines **when** execution becomes eligible.

Runtime determines **how** execution occurs.

---

# 7. Job Lifecycle

```text id="job25"
Created
 ↓
Scheduled
 ↓
Queued
 ↓
Dispatched
 ↓
Running
 ↓
Completed
```

Exceptional states:

* Failed
* Retrying
* Cancelled
* Expired
* Dead Letter

---

# 8. Queue Abstraction

The framework exposes a provider-independent queue contract.

Possible implementations:

* In-memory queue
* Database queue
* Redis queue
* RabbitMQ
* Kafka
* Cloud queues

Queue technology remains replaceable.

---

# 9. Dispatch

Dispatch transfers an eligible Job to the Runtime.

```text id="dispatch25"
Schedule
     │
     ▼
Job Eligible
     │
     ▼
Dispatch Request
     │
     ▼
Runtime
```

Dispatch does not execute the Job.

---

# 10. Retry Semantics

The Scheduler owns **dispatch retry**.

Runtime owns **execution retry**.

These responsibilities remain distinct.

Dispatch retry covers:

* Queue availability
* Worker availability
* Infrastructure failures

Execution retry remains governed by Runtime execution policies.

---

# 11. Expiration

Jobs may expire before execution.

Expired Jobs may:

* Cancel
* Notify
* Escalate
* Produce diagnostics

Expired Jobs must never execute silently.

---

# 12. Background Workers

Workers consume dispatched Jobs.

Workers:

* Request Runtime execution
* Report status
* Publish lifecycle events

Workers do not become a Runtime replacement.

---

# 13. Security Boundary

Blueprint 15 authorizes execution.

The Scheduler enforces:

* Authorized scheduling
* Authorized dispatch

Scheduling permission does not imply execution permission.

---

# 14. Persistence

Scheduled Jobs may be persisted.

Persistence includes:

* Queue state
* Schedule metadata
* Retry state
* Lifecycle records

Persistence technology is provider-independent.

---

# 15. Events

Events include:

* Job Scheduled
* Job Queued
* Job Dispatched
* Job Started
* Job Completed
* Job Failed
* Job Retried
* Job Expired
* Job Cancelled

Blueprint 16 transports these events.

---

# 16. Audit

Audit-relevant actions include:

* Administrative scheduling
* Manual dispatch
* Cancellation
* Retry override
* Priority override
* Expiration override

Blueprint 17 preserves accountability.

---

# 17. Error Normalization

Normalized errors include:

* Job Invalid
* Schedule Invalid
* Queue Unavailable
* Dispatch Failed
* Worker Unavailable
* Schedule Expired
* Retry Limit Exceeded
* Dead Letter

Infrastructure-specific queue errors remain internal.

---

# 18. Cursor Implementation Guide

Implement:

* Job Definition
* Scheduler
* Queue abstraction
* Dispatcher
* Worker abstraction
* Retry manager
* Schedule validator
* Lifecycle manager
* Provider interfaces
* Diagnostics
* Events
* Normalized errors

Reference implementations:

* In-memory Scheduler
* Cron Scheduler
* In-memory Queue
* Local Worker

Do not implement:

* Runtime logic
* Workflow engine
* Authorization engine
* Provider-specific queue APIs

---

# 19. Testing Requirements

Verify:

* One-time schedules
* Delayed jobs
* Cron schedules
* Queue behavior
* Dispatch
* Retry
* Dead Letter
* Expiration
* Worker failures
* Event publication
* Audit references
* Provider replacement

---

# 20. Acceptance Criteria

Blueprint 25 is complete when:

* Jobs are immutable.
* Scheduling is provider-independent.
* Dispatch is separate from execution.
* Queue implementations are replaceable.
* Retry ownership is distinct from Runtime retry.
* Lifecycle is explicit.
* Events and audit facts are produced.
* Runtime remains the execution authority.

---

# 21. Final Ownership

## Scheduler Framework

Owns:

* Job Definitions
* Scheduling
* Queue abstraction
* Dispatch
* Background worker contracts
* Job lifecycle

## Runtime

Owns:

* Job execution
* Scheduling of execution resources
* Execution retry
* Timeout
* Recovery

## Security Platform

Owns:

* Authorization

## Event Bus

Owns:

* Event transport

## Audit Platform

Owns:

* Accountability

---

# 22. Chief Architect's Notes

The Scheduler introduces time-based execution without creating another execution engine.

The constitutional flow is:

```text id="sched25"
Schedule
     │
     ▼
Job Eligible
     │
     ▼
Queue
     │
     ▼
Dispatcher
     │
     ▼
Runtime
     │
     ▼
Execution
```

The Scheduler answers:

> **"When should work become eligible for execution?"**

It does **not** answer:

> **"How should the work execute?"**

That responsibility remains exclusively with the Runtime.

---
