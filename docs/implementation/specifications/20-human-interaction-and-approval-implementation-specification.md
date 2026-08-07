# Blueprint 20 — Human Interaction & Approval Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Contract Decisions

`HumanInteractionRequest` is a deeply frozen, versioned, classified request containing stable interaction identity, interaction type/purpose, participant requirements, execution/workflow/Agent/collaboration and artifact references, an allowed response contract, scoped Security requirements, interaction/expiration/escalation policies, and correlation/provenance. Issuance never embeds secrets or Runtime execution state.

`HumanResponse` is a deeply frozen normalized response with distinct identity, responding principal, explicit response type and decision, structured input, comments/evidence references, timestamps, authorization reference, and correlation. `HumanInteractionResult` is the sole immutable descriptive completion artifact. It never directs Runtime or Workflow and marks human input as unverified unless a separate verification reference exists.

Security supplies an `AuthorizationDecision` plus current authority state for every resolution, view, delivery, and response. The framework validates exact tenant/scope, principal, action, response type, obligations, delegation, and separation-of-duties requirements without making authorization decisions.

Lifecycle facts are append-only and separate from Runtime state. Delivery retries create new Delivery IDs under the same interaction ID. Duplicate Response IDs are idempotent; competing valid responses are handled by a versioned first-valid or all-approvers policy. Silence and expiration can only yield expired, escalated, cancelled, restricted, inconclusive, replacement, or administrative outcomes—never approval.

Runtime and Workflow integration ports receive descriptive results and return acknowledgements only. Evaluation payloads use Blueprint 14 result references and remain descriptive. Delivery, participant resolution, storage, events, audit, diagnostics, configuration, and persistence are replaceable ports. The reference delivery adapter records normalized deliveries and has no UI/network integration.

## Package

- `@agentprodready/human-interaction`
- `src/index.ts`: public contracts, builder, validation, coordinator, lifecycle, and errors.
- `src/reference.ts`: deterministic policies and in-memory/reference adapters.
- `src/human-interaction.spec.ts`: acceptance, contract, and integration tests.
