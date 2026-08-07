# Blueprint 28 — CLI Framework Implementation Report

**Implementation Version:** 0.1.0  
**Implementation Mode:** Autonomous  
**Verification Date:** 2026-08-06  
**Decision:** Approved

## Outcome

Blueprint 28 is implemented as `@agentforge/cli-framework`: an immutable command model, parser, registry/plugin boundary, optional interactive input, automation-safe execution, replaceable output, stable errors/exit codes, and local diagnostics. Its four reference commands map directly to Blueprint 27 SDK methods and contain no platform execution logic.

## Delivered Artifacts

- Command definitions, registrations, invocations, handlers, results, configuration, prompts, cancellation, plugins, formatters, diagnostics, and error contracts.
- `health`, `jobs create`, `operations get`, and `operations stream` reference commands.
- Deterministic long-option parsing, positional validation, longest-path command resolution, and duplicate registration rejection.
- Optional prompt-based job reference input and prompt-free `--non-interactive` automation.
- Text, pretty JSON, compact JSON, and table reference formatters.
- Stable exit codes and SDK-to-CLI error normalization.
- Twelve focused tests covering all acceptance criteria and required categories.

## Acceptance-Criteria Traceability

|   # | Criterion                  | Evidence                                                                                                                            |
| --: | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Commands standardized      | Immutable definitions describe IDs, paths, arguments, descriptions, and output; all four reference paths are tested.                |
|   2 | CLI thin client            | Handlers call only `CliSdkClient`; no API processing, authentication validation, authorization, or execution implementation exists. |
|   3 | Output replaceable         | Four implementations share `CliFormatter` and are selected by stable format identifiers.                                            |
|   4 | Automation supported       | `--non-interactive`, JSON/compact output, stdout/stderr separation, and stable exit codes are tested.                               |
|   5 | Interactive optional       | Missing job input can be prompted interactively; the identical non-interactive command fails without prompting.                     |
|   6 | Authentication delegated   | No credential contract/storage exists in the CLI; SDK authentication failures map to CLI results.                                   |
|   7 | Platform logic server-side | Job, operation, health, and stream handlers delegate to SDK methods and never execute domain behavior.                              |

## Required-Test Mapping

Focused tests cover command parsing, arguments/options, interactive/non-interactive modes, all output formats, authentication delegation, configuration rejection, plugin loading/duplicates, lifecycle diagnostics, normalized errors/exit codes, SDK delegation, immutability, and platform-ownership boundaries.

## Ownership and Dependencies

The CLI owns command definitions/parsing/lifecycle, formatting, optional interaction, automation behavior, local configuration, CLI plugins, diagnostics, and shell-facing results. Blueprint 27 owns serialization, transport, and authentication integration; Blueprint 26 owns request processing; Blueprint 21 owns plugin distribution; Blueprint 22 owns platform observability; Blueprint 23 owns effective configuration policy; Runtime owns execution.

All five hard dependencies are declared as project references and package dependencies. Narrow CLI ports prevent dependency internals from leaking into command contracts. There are no bootstrap dependencies.

## Verification Results

Executed under Node.js LTS `v24.19.0`:

| Gate                                                      | Result                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| Offline install                                           | PASS — 30 workspace projects                                      |
| ESLint                                                    | PASS — zero warnings                                              |
| Dependency boundaries                                     | PASS                                                              |
| Complete no-emit typecheck                                | PASS                                                              |
| Project-reference typecheck/build                         | PASS                                                              |
| Focused tests                                             | PASS — 1 file, 12 tests                                           |
| Repository tests                                          | PASS — 30 files, 351 tests                                        |
| Repository coverage                                       | PASS — 93.03% statements/lines, 83.21% branches, 93.31% functions |
| CLI Framework coverage                                    | PASS — 98.71% statements/lines, 85.58% branches, 100% functions   |
| Runtime/Workflow/authorization/provider ownership leakage | PASS — zero production matches                                    |
| Network/server/shell-process provider leakage             | PASS — zero production imports/calls                              |

## Limitations and Deviations

The reference framework is an embeddable CLI core, not an installed executable. Production terminal I/O, signal wiring, credential login/logout/device flows, YAML serialization, shell completion scripts, Marketplace package retrieval, deployment commands, and product-specific command trees require later product/provider scope. Table rendering is deliberately deterministic and minimal.

No unresolved architectural deviation was found.

## Final Decision

Blueprint 28 is fully verified. Blueprint 29 may begin as a separate implementation cycle.
