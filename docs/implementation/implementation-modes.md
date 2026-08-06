# AgentForge Implementation Modes

**Version:** 1.0

This document is the canonical authority for AgentForge implementation execution modes. Every blueprint implementation must declare exactly one mode before work begins.

## Default Mode

When no mode is declared, use:

```text
Implementation Mode: Review-Gated
```

## Review-Gated Mode

Use Review-Gated Mode when architectural uncertainty is high or a human must approve public contracts before production code changes.

Required workflow:

1. Read the required architecture and dependencies.
2. Inspect the repository.
3. Create the canonical Blueprint Implementation Plan.
4. Create the canonical Blueprint Implementation Specification.
5. Stop for review before modifying production code.
6. Continue only after the plan and specification are approved.
7. Implement, test, report, and complete the checklist.

## Autonomous Mode

Use Autonomous Mode only when the user explicitly declares:

```text
Implementation Mode: Autonomous
```

The agent must still create the plan and specification before production code, but it may continue without intermediate approval when:

- the blueprint is approved;
- hard dependencies are implemented or an approved contract-only bootstrap is sufficient;
- no material ownership, security, compatibility, consistency, or durability contradiction exists;
- the plan maps every acceptance criterion to code and verification;
- no breaking change to an implemented dependency is required.

Autonomous Mode authorizes execution of the approved workflow. It does not authorize architectural redesign.

## Scaffolding-Only Mode

Use Scaffolding-Only Mode to create structural artifacts without production behavior.

The agent may create:

- packages and directories;
- public contracts and provider interfaces;
- dependency-injection tokens;
- error-code declarations;
- event schemas;
- test skeletons;
- package documentation;
- approved bootstrap reference implementations explicitly permitted by the bootstrapping rules.

The agent must not implement production provider calls, production persistence mutations, business execution, or Runtime behavior beyond the declared scaffolding scope.

## Autonomous Contract-Design Authority

In Autonomous Mode, the agent may select the smallest exact TypeScript representation of concepts already authorized by the current blueprint, accepted ADRs, dependency contracts, glossary, and approved implementation specifications.

Permitted decisions include:

- interface and type-alias names;
- exact field names and types;
- required and optional fields;
- `readonly` usage;
- enums and discriminated unions;
- value-object representations;
- dependency-injection tokens and lifetimes when ownership makes them clear;
- normalized error codes;
- event payload fields and schema versions;
- serialization and validation representations;
- internal module organization and reference-provider details.

Every public decision must be recorded in the Blueprint Implementation Specification.

### Permitted TypeScript Translation

If a blueprint defines a normalized AI execution request containing a capability binding, execution reference, messages, generation requirements, and optional streaming requirements, the agent may record and implement a minimal shape such as:

```ts
export interface AiExecutionRequest {
  readonly requestId: string;
  readonly capabilityBinding: CapabilityBinding;
  readonly executionReference: ExecutionReference;
  readonly messages: readonly AiMessage[];
  readonly generation: GenerationRequirements;
  readonly streaming?: StreamingRequirements;
}
```

This translates an approved concept; it does not create new ownership.

### Prohibited Architectural Invention

The agent may not independently decide that:

- a Provider Framework owns provider selection or instantiation;
- an AI or Tool Framework owns operational retry, scheduling, timeout, or recovery;
- a provider creates an `ExecutionContext`;
- an Event Bus event is a command;
- a framework creates a new authorization model;
- a persistence provider silently weakens required consistency, isolation, or durability;
- a new platform-wide lifecycle, transaction, or compatibility guarantee exists.

## Stop Conditions

In every mode, stop the affected implementation and report the issue when:

- authoritative documents materially conflict;
- a hard dependency is unavailable and no approved bootstrap contract is sufficient;
- implementation requires changing architectural ownership or dependency direction;
- a new cross-framework contract is not implied by approved architecture;
- security semantics cannot be resolved from approved documents;
- a new consistency, durability, transaction, retry, recovery, or lifecycle guarantee is required;
- an implemented public contract must change incompatibly;
- a destructive migration lacks explicit authorization;
- required tests cannot be executed or acceptance criteria cannot be verified.

Do not stop merely because an implementation-level field name, private helper, file layout, fixture, or reference-provider detail requires a reasonable choice.

## Completion Obligations

No mode may claim blueprint completion without:

- an approved or autonomously completed implementation plan;
- a Blueprint Implementation Specification;
- source implementation within the declared scope;
- successful required lint, test, and build commands;
- acceptance-criteria traceability;
- an implementation report;
- a completed blueprint-specific checklist;
- documented assumptions, deviations, limitations, and deferred work.

## Canonical Artifact Paths

```text
docs/implementation/plans/<number>-<slug>-implementation-plan.md
docs/implementation/specifications/<number>-<slug>-implementation-specification.md
docs/implementation/reports/<number>-<slug>-implementation-report.md
docs/implementation/checklists/<number>-<slug>-checklist.md
docs/implementation/reviews/
```

The implementation mode never changes these paths or the architectural authority order.
