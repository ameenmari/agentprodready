# Blueprint 26 — API Framework Implementation Specification

**Implementation Mode:** Autonomous  
**Implementation Version:** 0.1.0  
**Date:** 2026-08-06

## Reference Resource Catalog

| Route                         | Method | Request schema                       | Response schema                                     | Streaming |
| ----------------------------- | ------ | ------------------------------------ | --------------------------------------------------- | --------- |
| `/v1/health`                  | GET    | no body                              | `{ healthReference: string }`                       | No        |
| `/v1/jobs`                    | POST   | `{ jobDefinitionReference: string }` | `{ operationReference: string, accepted: boolean }` | No        |
| `/v1/operations/:operationId` | GET    | `operationId` path parameter         | `{ operationReference: string, status: string }`    | No        |
| `/v1/streams/:streamId`       | GET    | `streamId` path parameter            | stream frames defined below                         | Yes       |

All routes support API `1.0` and `1.1`; an omitted minor negotiates the latest compatible minor (`1.1`). Major `2` is unsupported. Breaking changes require a new major.

`NormalizedApiRequest` contains no transport object. Authentication produces identity evidence only. Security independently returns an authorization decision; the API enforces it and response visibility restrictions. Handlers receive authorized normalized requests and return opaque domain results; they retain all business/Runtime ownership.

Stream frames are immutable `started`, `progress`, `incremental`, `completed`, or `failed` records with sequence, correlation, timestamp, payload reference, and terminal flag. The framework never interprets token/event payloads.

Rate limiting consumes Configuration-derived limits through a replaceable policy/provider and returns normalized retry metadata. Transport adapters only translate raw protocol envelopes to/from normalized contracts. Reference REST, GraphQL, WebSocket, and SSE adapters are in-memory translation contracts, not network servers.

Events and governance Audit facts use owner-provided ports. Diagnostics are descriptive. No Runtime, Workflow, Capability, Agent, Tool, AI, persistence, or scheduler business operation is implemented.

## Package

- `@agentprodready/api-framework`
- `src/index.ts`: contracts and API pipeline.
- `src/reference.ts`: deterministic versions, schemas, limits, transports, streams, and recorders.
- `src/api-framework.spec.ts`: acceptance tests.
