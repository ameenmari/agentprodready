# Blueprint 25 — Scheduler & Background Jobs Implementation Report

**Implementation Version:** 0.1.0  
**Implementation Mode:** Autonomous  
**Verification Date:** 2026-08-06  
**Decision:** Approved

## Outcome

Blueprint 25 is implemented as `@agentprodready/scheduler`: a provider-independent framework for immutable jobs/schedules, explicit trigger eligibility, replaceable queues, lifecycle, Runtime dispatch handoff, dispatch-infrastructure retry, dead-letter, expiration, cancellation, events, governance audit references, and diagnostics. It does not execute jobs, progress Workflows, plan, resolve capabilities, authorize operations, invoke Tools/AI, route events, persist Audit records, or own Runtime execution retry/timeout/recovery.

## Delivered Artifacts

- Immutable job, schedule/trigger, retry, queue, lifecycle, dispatch, Runtime acceptance, worker, dead-letter, authorization, event, audit, diagnostic, store, and error contracts.
- One-time, delayed, fixed-interval, five-field cron, event, and manual schedule validation/eligibility.
- Priority/eligibility ordered queue and explicit clock/event/manual triggering without a timer loop.
- Runtime acceptance-only worker handoff with execution/output/attempt ownership explicitly absent.
- Fixed/exponential dispatch-infrastructure retry, expiration, cancellation, and retry-exhaustion dead-letter behavior.
- Replaceable in-memory queues/stores, local handoff worker, Runtime recorder, events, audit, and diagnostics.
- Fourteen focused tests covering all acceptance criteria and required categories.

## Acceptance-Criteria Traceability

| # | Criterion | Evidence |
|---:|---|---|
| 1 | Jobs immutable | Builder deep-freezes definition, schedule, target, retry, scope, constraints, and metadata. |
| 2 | Scheduling provider-independent | Schedule/trigger contracts contain no timer or queue-vendor types; explicit triggers drive eligibility. |
| 3 | Dispatch separate from execution | Worker calls only `RuntimeJobPort.accept`; requests/results fix execution performed/outcome false. |
| 4 | Queues replaceable | Narrow enqueue/dequeue/remove/peek contract and multiple reference instances pass tests. |
| 5 | Retry ownership distinct | Policy declares execution retry owned by Runtime; Scheduler retries dispatch infrastructure only. |
| 6 | Lifecycle explicit | Created/scheduled/queued/dispatched/retrying/cancelled/expired/dead-letter transitions are immutable records. |
| 7 | Events and audit facts | Schedule/queue/dispatch/retry/expiration/cancellation/dead-letter facts plus administrative Audit references are verified. |
| 8 | Runtime execution authority | No execution engine, result, execution attempts, timeout, recovery, context construction, Tool, or AI invocation exists. |

## Required-Test Mapping

Focused tests cover one-time, delayed, cron, interval validation, event/manual triggers, priority queue behavior, dispatch, worker failure, fixed retry, retry exhaustion/dead-letter, expiration before dispatch, cancellation, lifecycle, authorization separation, event publication, governance Audit references, diagnostics, and provider replacement.

## Ownership and Dependencies

Scheduler owns when work becomes eligible, queueing, dispatch handoff, and dispatch-infrastructure retry. Runtime owns execution-resource scheduling, execution, execution retry, timeout, cancellation, and recovery. Security decides authorization. Persistence stores state. Configuration supplies policies. Event Bus transports facts, Audit preserves accountability, and Observability owns telemetry.

All six hard dependencies and Configuration are declared and buildable. Blueprint 26 API surfaces and production queue providers remain later integrations.

## Verification Results

Executed under Node.js LTS `v24.19.0`:

| Gate | Result |
|---|---|
| Offline install | PASS — 27 workspace projects |
| ESLint | PASS — zero warnings |
| Dependency boundaries | PASS |
| Complete no-emit typecheck | PASS |
| Project-reference typecheck/build | PASS |
| Tests | PASS — 27 files, 315 tests |
| Repository coverage | PASS — 92.03% statements/lines, 82.86% branches, 92.73% functions |
| Scheduler coverage | PASS — 93.09% statements/lines, 82.40% branches, 95.74% functions |
| Timer/background-loop and queue-vendor SDK leakage | PASS — zero production matches |
| Runtime/Workflow/Tool/AI execution, authorization engine, ExecutionContext, and execution-outcome leakage | PASS — zero production matches |

## Limitations and Deviations

Reference providers are deterministic/in-memory and require an explicit caller-provided clock/event/manual trigger; they do not claim a production timer service, distributed leases, clock synchronization, durable queue delivery, leader election, or multi-worker concurrency control. Cron parsing validates the normalized five-field shape while production cron calculation remains a replaceable provider concern. Runtime completion callbacks and recurring next-occurrence advancement require later integration but do not change Scheduler ownership.

No unresolved architectural deviation was found.

## Final Decision

Blueprint 25 is fully verified. Blueprint 26 may begin as a separate implementation cycle.
