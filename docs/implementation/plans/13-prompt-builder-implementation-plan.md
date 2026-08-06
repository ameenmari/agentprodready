# Blueprint 13 — Prompt Builder Implementation Plan

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Objective

Implement `@agentforge/prompt-builder` as a deterministic, provider-independent presentation service that transforms one immutable `ExecutionContextPackage` plus normalized instructions, a versioned prompt policy, and a provider-neutral consumer profile into one immutable canonical `PromptPackage`.

## Work

1. Define immutable build request, instruction, section, entry, policy, consumer profile, package, provenance, diagnostics, event, telemetry, and normalized-error contracts.
2. Implement request validation, source collection, section selection, whole-entry logical budgeting, deterministic ordering, canonical formatting, provenance preservation, complete/partial/empty outcomes, and deep package immutability.
3. Add replaceable policy and formatter reference implementations plus future-owned Event Bus, Observability, and Configuration integration ports.
4. Add deterministic tests for composition, policy evaluation, section selection, formatting, semantic preservation, budgets, ordering, consumer profiles, provenance/security, immutability, serialization, diagnostics, events, telemetry, error normalization, and provider-model exclusion.
5. Run repository lint, boundary verification, complete typecheck, tests with coverage, and build under Node 24 LTS before report/checklist closure.

## Boundaries

Prompt Builder consumes Context Assembly output and never assembles or retrieves information. It may wrap, order, escape, canonically serialize, or omit whole entries according to explicit policy; it never summarizes, infers, rewrites, semantically compresses, or generates information. AI Provider Framework exclusively owns provider-native translation, model selection, provider tokenization, authentication, transport, streaming, and fallback. Runtime owns operational execution decisions; Security owns authorization decisions.
