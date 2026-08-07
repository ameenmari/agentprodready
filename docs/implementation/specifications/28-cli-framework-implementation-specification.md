# Blueprint 28 — CLI Framework Implementation Specification

**Implementation Mode:** Autonomous  
**Blueprint Version:** 2.0  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Reference Command Tree

| Command                                    | Arguments/options                                   | SDK delegation                            | Default output |
| ------------------------------------------ | --------------------------------------------------- | ----------------------------------------- | -------------- |
| `agentprodready health`                        | `--format text                                      | json                                      | compact        | table` | `health()` | text |
| `agentprodready jobs create <job-reference>`   | optional positional in interactive mode; `--format` | `createJob({ jobDefinitionReference })`   | text           |
| `agentprodready operations get <operation-id>` | required positional; `--format`                     | `getOperation(operationId)`               | text           |
| `agentprodready operations stream <stream-id>` | required positional; `--format`                     | `streamOperation(streamId, cancellation)` | compact        |

Global options are `--format`, `--non-interactive`, `--profile`, and `--help`. In non-interactive mode missing input fails without prompting. Unknown commands/options, duplicate singleton options, and invalid formats fail before SDK delegation.

## Exit Codes

`0` success; `2` invalid command/arguments; `3` configuration invalid; `4` authentication failed; `5` authorization denied; `6` connection failed; `7` API error; `8` command/stream failure; `130` cancellation.

## Output Contracts

Formatters receive immutable platform results and return strings without mutation. JSON is pretty, compact is single-line JSON, text is deterministic key/value output, and table is a two-column field/value representation. Machine mode uses JSON/compact and never emits prompts.

## Configuration and Authentication

`CliConfigurationSource` supplies profile, default format, interactivity, CLI version, and SDK version. Authentication credentials and API communication remain wholly inside the injected SDK client; the CLI stores and validates neither.

## Plugins

`CliPlugin` contributes immutable command definitions/handlers and output formatters through the same registry contracts. Duplicate command or formatter identifiers fail deterministically. Plugin marketplace installation/distribution remains Blueprint 21-owned.

## Diagnostics

Local immutable facts cover command started/completed/failed and include command ID, duration, exit code, CLI/SDK versions, and optional request reference. They are not Platform Events or Audit Records.

## Error Normalization

`CliError` codes are `INVALID_COMMAND`, `INVALID_ARGUMENTS`, `AUTHENTICATION_FAILED`, `AUTHORIZATION_DENIED`, `CONFIGURATION_INVALID`, `CONNECTION_FAILED`, `API_ERROR`, `COMMAND_FAILED`, and `CANCELLED`. SDK errors map deterministically to CLI errors and exit codes; shell/provider errors do not leak.

## Dependencies

Blueprint 27 is the exclusive API communication/authentication integration boundary. Blueprint 26 defines the underlying catalog. Blueprints 21, 22, and 23 own plugin distribution, platform observability, and effective configuration; the CLI consumes these through narrow local ports. No bootstrap dependency exists.

## Non-Goals

No actual terminal process, credential store, login protocol, API server, authorization engine, Runtime/Workflow/business execution, deployment command, provider SDK, event transport, or Audit persistence is implemented.
