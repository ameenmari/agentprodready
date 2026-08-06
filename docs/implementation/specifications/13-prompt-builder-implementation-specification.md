# Blueprint 13 — Prompt Builder Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Input and Output Contracts

`PromptBuildRequest` contains one immutable `ExecutionContextPackage`, normalized `PromptInstruction` values, a versioned `PromptPolicy`, a versioned provider-neutral `ConsumerProfile`, correlation metadata, and platform version. It contains no provider identity, model identifier, provider request, SDK, transport, authentication, or provider token model.

The sole public output is an immutable `PromptPackage`. It contains ordered canonical `PromptSection` values, exact copied semantic values in `PromptEntry` records, provenance and security references, a deterministic canonical text representation, consumer presentation metadata, logical-budget evidence, omissions, versions, and a safe diagnostic reference. It is not an AI-provider request and does not use role/message models.

## Composition Pipeline

The builder validates normalized input and context identity; collects instruction entries and context elements without mutation; maps them into logical section kinds; applies configurable section selection and profile preferences; prioritizes whole entries; applies total and per-section logical-unit budgets; orders sections deterministically; and formats them through a replaceable canonical formatter. Formatting serializes the exact semantic value with stable object-key ordering and explicit section delimiters. It does not summarize, rewrite, infer, truncate, or otherwise change semantic meaning.

If information cannot fit, the builder omits the whole entry, records an explicit omission, and returns `partial`. A package with no entries is `empty`. Identical semantic input, policy, and profile produce identical semantic output.

## Ownership and Replacement Points

`PromptPolicyEvaluator` and `CanonicalPromptFormatter` are Prompt Builder-owned replaceable strategies. Blueprint 23 eventually resolves policies and consumer profiles; Blueprint 16 owns event transport; Blueprint 22 owns diagnostic and telemetry transport; Blueprint 15 remains the source of authorization already preserved in the Context Package. Composition supplies adapters at bootstrap replacement points.

Prompt Builder never retrieves Knowledge or Memory, assembles Context, resolves capabilities, selects or invokes AI providers, translates to provider-native formats, executes tools, interprets workflows, schedules Runtime operations, persists prompts, or changes authorization.

## Errors and Verification

Validation, policy, budget, formatting, serialization, and pipeline failures normalize to stable `PROMPT_*` errors with safe diagnostic identifiers. Tests prove deterministic composition, exact semantic preservation, configurable profile/policy behavior, selection, whole-entry budgets, ordering, provenance/security preservation, deep immutability, serialization, diagnostic/event/telemetry availability, normalized failures, and absence of provider-specific models.
