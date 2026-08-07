# Blueprint 28 — CLI Framework Implementation Plan

**Implementation Mode:** Autonomous  
**Blueprint Version:** 2.0  
**Date:** 2026-08-06

## Objective

Implement a thin, provider-independent CLI framework and reference command surface that delegates all platform communication to the Blueprint 27 SDK and maps directly to its Blueprint 26-backed methods.

## Scope

1. Define immutable command, argument, option, invocation, result, output, diagnostic, plugin, prompt, configuration, and shell contracts.
2. Implement parsing, validation, registry/plugin loading, lifecycle, optional interactive input, non-interactive automation, format selection, errors, exit codes, and diagnostics.
3. Implement `health`, `jobs create`, `operations get`, and `operations stream` commands.
4. Provide text, JSON, compact JSON, and table formatters plus deterministic reference adapters.
5. Verify every checklist category and all hard dependency boundaries.
6. Run lint, boundaries, typecheck, focused/full tests, coverage, and build before completing the report/checklist.

## Guardrails

- Commands delegate only to an injected SDK client.
- The CLI never validates credentials, authorizes, executes business logic, processes APIs, advances Workflows, schedules Runtime work, or invokes providers.
- Interactive input can supply missing user input but cannot change command semantics.
- Non-interactive mode never prompts and has stable machine-readable output and exit codes.
- Plugins can register CLI definitions/handlers/formatters only and cannot bypass the SDK boundary.

## Completion Rule

Blueprint 29 may begin only when Blueprint 28 is fully verified and its checklist contains no open item.
