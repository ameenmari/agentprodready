# Blueprint 08 — AI Provider Framework Implementation Specification

**Status:** Approved  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-06

## Public Contracts

`AiExecutionRequest` contains request id, immutable Capability Binding, ExecutionContext, normalized role/content messages, generation requirements, optional JSON-schema structured output, normalized tool definitions, streaming requirements, execution metadata, and provider-neutral constraints. It contains no vendor model/deployment/authentication fields.

`NormalizedAiResult` is the sole non-stream output: normalized content, usage, model metadata, finish reason, optional structured value, normalized tool calls, diagnostic reference, and execution metadata. `NormalizedAiStreamEvent` is the sole streaming output. Both are deeply immutable.

`NormalizedAiError` has stable authentication, rate-limit, context-limit, invalid-request, unavailable, timeout, and unknown codes plus retryability facts; it carries no vendor error object.

## Execution Boundary

`AiProviderAdapter` is a provider plugin contract returning only normalized results/events or throwing internal adapter failures. `AiProviderFramework` validates requests, receives an adapter instance from `AiAdapterResolver` (a Composition-owned replacement port), delegates exactly once, validates/freezes normalized output, translates adapter failures, and records diagnostics/events/telemetry. It performs no selection or instantiation itself.

Provider configuration and model/deployment names are adapter-internal. Tool calls are data handed back to Runtime/Blueprint 09 and are never invoked here. Runtime policy mechanisms are absent; provider SDK mechanisms must be disabled by concrete adapters.

## Verification

Contract and integration tests cover multiple replaceable adapters, request/response/error/stream/structured-output/tool normalization, health/diagnostics/observability, encapsulation, and complete binding-to-result flow. Completion requires all four engineering gates under Node 24 LTS, the report, and completed checklist.
