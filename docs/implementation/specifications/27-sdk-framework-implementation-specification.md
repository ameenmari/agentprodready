# Blueprint 27 — SDK Framework Implementation Specification

**Implementation Mode:** Autonomous  
**Blueprint Version:** 2.0  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Reference Deliverable

`@agentprodready/sdk-framework` provides a language-independent core contract and a TypeScript reference binding. Other language bindings require separate product scope.

## Client Surface and API Mapping

| Client method       | Blueprint 26 route                | Input                               | Result                                            |
| ------------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------- |
| `health()`          | `GET /v1/health`                  | none                                | `{ healthReference }`                             |
| `createJob()`       | `POST /v1/jobs`                   | `{ jobDefinitionReference }`        | `{ operationReference, accepted }`                |
| `getOperation()`    | `GET /v1/operations/:operationId` | operation ID                        | `{ operationReference, status }`                  |
| `streamOperation()` | `GET /v1/streams/:streamId`       | stream ID and optional abort signal | async stream of Blueprint 26 `StreamFrame` values |

All unary calls serialize to `SdkTransportRequest`; only transport adapters translate that contract into wire operations. The client parses normalized Blueprint 26 `ApiResponse` values and never receives internal platform objects.

## Configuration

`SdkConfiguration` contains endpoint, SDK version, requested API version, timeout milliseconds, transport-retry policy, and optional client metadata. `SdkConfigurationSource.load` is replaceable. Validation rejects non-HTTPS endpoints (except explicit localhost HTTP), non-positive timeouts, invalid semantic versions, unsupported API majors, and invalid retry settings.

## Authentication

`SdkAuthenticationProvider.credentials` returns ephemeral headers for one request. The client neither stores credentials nor validates identity. API key, bearer token, OAuth, JWT, and OpenID Connect acquisition can be implemented behind this port.

## Serialization and Parsing

The serializer produces a canonical immutable request containing method, path, headers, optional JSON body, requested version, correlation/request identifiers, idempotency, and timeout. The response parser accepts normalized API responses only, returns typed result data, and maps errors into `SdkError`.

## Retry Boundary

Retries are allowed only when all are true: the request is idempotent, the transport error is retryable, and the configured attempt budget remains. Business/API errors are never retried. `POST /v1/jobs` is non-idempotent and therefore never automatically retried. Backoff is delegated to `SdkRetryScheduler`.

## Streaming and Cancellation

`SdkStreamingTransport.open` consumes the same serialized request and returns an `AsyncIterable<StreamFrame>`. Frames preserve sequence, type, correlation, and terminal semantics. Cancellation uses a platform-neutral `SdkCancellationSignal`; cancellation produces normalized code `CANCELLED`. Networking protocols remain adapter-owned.

## Errors

Codes are `CONFIGURATION_INVALID`, `AUTHENTICATION_FAILED`, `CONNECTION_FAILED`, `SERIALIZATION_FAILED`, `TIMEOUT`, `API_ERROR`, `STREAMING_ERROR`, `UNSUPPORTED_VERSION`, `CANCELLED`, and `RESPONSE_INVALID`. Networking/provider errors are retained only as safe causes and never leak as public provider-specific types.

## Diagnostics

The diagnostics port receives immutable local facts for request started/completed, retry attempted, stream opened/closed, and request failed. Facts include request/correlation IDs, SDK/client/API versions, latency, and error code where applicable. These are local SDK diagnostics, not Platform Events.

## Dependency Mapping

- Blueprint 26 supplies `ApiResponse`, `ApiError`, and `StreamFrame` contracts and the approved reference catalog semantics.
- Blueprint 22 owns observability; the SDK exposes a narrow diagnostic sink integration.
- Blueprint 23 owns effective configuration/policy; the SDK consumes configuration through a source port while local application configuration remains application-owned.
- There are no bootstrap dependencies.

## Explicit Non-Goals

No network server, API processing, authorization engine, Runtime/Workflow execution, business validation, provider SDK, credential persistence, event transport, audit storage, or additional language package is implemented.
