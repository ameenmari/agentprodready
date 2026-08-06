# Blueprint 25 — Scheduler & Background Jobs Implementation Plan

**Implementation Mode:** Autonomous  
**Blueprint Version:** 2.0  
**Date:** 2026-08-06

## Objective

Implement immutable jobs and schedules, calendar/trigger eligibility, replaceable queues, explicit lifecycle, dispatch-only workers, dispatch retry/dead-letter, expiration, cancellation, Runtime handoff, events, audit references, and diagnostics without creating an execution engine.

## Boundaries

- Scheduler decides when a job becomes eligible and retries failed dispatch infrastructure only.
- Runtime owns operational execution-resource scheduling, execution, execution retry, timeout, cancellation, and recovery.
- Security supplies separate schedule and dispatch decisions; scheduling permission never implies execution permission.
- Persistence stores queue/schedule/lifecycle state through replaceable ports; Event Bus transports facts; Audit preserves governance accountability.
- Configuration supplies normalized schedule/dispatch policies. Workflow, Planning, Capability Resolution, Tools, and AI retain their existing ownership.

## Steps

1. Define job/schedule/trigger, queue, lifecycle, dispatch, Runtime handoff, worker, retry/dead-letter, authorization, events, audit, diagnostics, stores, and errors.
2. Implement deterministic schedule validation/eligibility for one-time, delayed, interval, cron, event, and manual models.
3. Implement queueing, dispatch handoff, infrastructure-only retry, expiration, cancellation, explicit lifecycle, and dead-letter behavior.
4. Add unit, contract, and integration tests for every acceptance criterion and checklist category.
5. Run Node 24 lint, dependency boundaries, complete typecheck, tests/coverage, and build.
6. Generate the report and complete the checklist only after all gates pass.

## Stop-Condition Review

All hard dependencies are implemented and Configuration is complete. API surfaces and production queues are optional later adapters. The Runtime scheduling ADR is preserved by limiting Blueprint 25 to job eligibility and handoff.
