# Blueprint 25 — Scheduler & Background Jobs Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Contract Decisions

`JobDefinition` is deeply frozen and contains stable identity/version, provider-neutral schedule/trigger, opaque Runtime target/input references, constraints, dispatch retry policy, expiration, priority, Security requirements, scope, and correlation. It contains no `ExecutionContext`, Runtime state, Workflow node, executable callback, Tool, or AI provider.

Schedules support one-time, delayed, fixed-interval, five-field cron, event-triggered, and manual models. The scheduler consumes explicit clock/event/manual inputs and calculates eligibility only. It contains no background timer loop. Cron validation is normalized; reference eligibility uses a precomputed next-eligible timestamp so production cron providers remain replaceable.

Queue entries, dispatch requests, and lifecycle records are immutable and separately identified. `RuntimeJobPort.accept` is the sole execution handoff and returns acceptance metadata only—never an execution outcome. `BackgroundWorker` requests this handoff and does not execute business code.

Dispatch retry covers queue/worker/handoff infrastructure failures only. Retry attempts and next eligibility are explicit; Runtime execution attempts are fixed absent from Scheduler results. Exhaustion produces a dead-letter record. Expired jobs never dispatch. Scheduling and dispatch require separate active Security outcomes.

Queue, state, dead-letter, worker, Runtime handoff, events, audit, diagnostics, policy, and persistence providers are replaceable. Reference adapters are deterministic/in-memory and perform no production timing or queue I/O.

## Package

- `@agentprodready/scheduler`
- `src/index.ts`: public contracts, builder/validator, scheduler, dispatcher, lifecycle, and errors.
- `src/reference.ts`: in-memory queues/stores, local handoff worker, and reference providers.
- `src/scheduler.spec.ts`: acceptance, contract, and integration tests.
