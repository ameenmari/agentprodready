# AgentForge

# Engineering Blueprint 27

# SDK Framework

**Version:** 2.0

**Status:** Approved

---

# 1. Purpose

The SDK Framework defines how external developers and applications interact with AgentForge through language-specific Software Development Kits (SDKs).

It provides a consistent, provider-independent developer experience across supported programming languages.

This blueprint governs client SDK architecture.

It does **not** govern:

* Runtime execution
* Business logic
* Workflow execution
* Authorization decisions
* API implementation
* Provider interaction

---

# 2. Responsibilities

The SDK Framework owns:

* SDK contracts
* Client abstractions
* Request serialization
* Response deserialization
* SDK versioning
* Authentication integration
* Streaming clients
* Error normalization
* SDK diagnostics
* Language bindings

It does **not** own:

* Server-side execution
* Business validation
* Runtime scheduling
* Security authorization
* API transport implementation
* Event transport
* Audit persistence

---

# 3. Dependencies

Blueprint 27 depends on:

* Blueprint 26 — API Framework
* Blueprint 22 — Observability
* Blueprint 23 — Configuration & Policy

---

# 4. Public Contracts

## Consumes

* Normalized API Contracts
* Authentication Credentials
* SDK Configuration
* Request Metadata

## Produces

* SDK Client
* SDK Request
* SDK Response
* Streaming Session
* SDK Error

Owns language-independent SDK architecture.

---

# 5. Supported SDKs

Reference SDKs may include:

* TypeScript
* JavaScript
* Python
* Go
* Java
* C#
* Rust

All SDKs expose equivalent platform capabilities.

---

# 6. SDK Client

Every SDK provides a normalized client.

Example capabilities:

* Agent operations
* Workflow operations
* Knowledge APIs
* Memory APIs
* Configuration APIs
* Administration APIs
* Streaming APIs

Language syntax may differ.

Platform semantics must remain identical.

---

# 7. Serialization

The SDK serializes platform requests into normalized API contracts.

Serialization includes:

* Request payload
* Metadata
* Correlation identifiers
* Version information

Serialization format remains transport-independent.

---

# 8. Authentication

SDKs support pluggable authentication.

Examples:

* API Keys
* OAuth
* JWT
* OpenID Connect

Credential storage remains application-owned.

SDKs must never persist secrets automatically.

---

# 9. Streaming

SDKs expose unified streaming APIs.

Streaming supports:

* Token streams
* Event streams
* Progress updates
* Long-running execution
* Cancellation

Streaming implementation differs by language while preserving behavior.

---

# 10. Error Model

Every SDK exposes normalized platform errors.

Examples:

* Authentication Error
* Authorization Error
* Validation Error
* Runtime Error
* Timeout Error
* Provider Error
* Transport Error

Language-specific exceptions wrap normalized platform errors.

---

# 11. Version Compatibility

SDKs maintain compatibility with supported API versions.

Breaking changes require:

* New SDK version
* Updated contracts
* Migration documentation

SDKs should expose version negotiation where supported.

---

# 12. Configuration

SDK configuration may include:

* Endpoint
* Timeout
* Retry policy
* Logging level
* Authentication provider
* Proxy
* TLS settings

Configuration remains local to the client application.

---

# 13. Retry Boundary

SDK retry policies apply only to transport failures.

Business retries remain Runtime-owned.

SDKs must not retry:

* Non-idempotent operations
* Authorized business execution
* Workflow progression

Retry behavior must remain configurable.

---

# 14. Diagnostics

SDK diagnostics include:

* Request identifiers
* Correlation identifiers
* Client version
* SDK version
* API version
* Latency metrics

SDK diagnostics remain operational.

---

# 15. Events

SDKs may expose local client events such as:

* Request Started
* Request Completed
* Stream Opened
* Stream Closed
* Retry Attempted

These are client-side diagnostics, not Platform Events.

---

# 16. Error Normalization

Normalized SDK errors include:

* Configuration Invalid
* Authentication Failed
* Connection Failed
* Serialization Failed
* Timeout
* API Error
* Streaming Error
* Unsupported Version

Language-specific networking errors remain internal.

---

# 16A. Implementation Specification Scope

This blueprint defines a reusable SDK framework and reference client surface, not a complete commercial SDK product.

The Blueprint Implementation Specification must define reference SDK client methods that match the approved Blueprint 26 API resource catalog, routes, schemas, versioning, and streaming contracts. In Autonomous Mode, Cursor may implement the smallest reference SDK needed to verify serialization, authentication, streaming, errors, and compatibility.

Additional language SDKs and complete end-user method coverage require their own approved product scope.

---

# 17. Cursor Implementation Guide

Implement:

* SDK Core
* Authentication abstraction
* Serialization layer
* Streaming abstraction
* Retry abstraction
* Configuration
* Diagnostics
* Error normalization

Reference implementations:

* TypeScript SDK
* Python SDK
* Go SDK

Do not implement:

* Business logic
* Runtime execution
* Server-side authorization
* Provider SDK dependencies

---

# 18. Testing Requirements

Verify:

* Request serialization
* Response parsing
* Authentication
* Streaming
* Cancellation
* Retry behavior
* Error normalization
* Version compatibility
* Configuration loading
* Transport abstraction

---

# 19. Acceptance Criteria

Blueprint 27 is complete when:

* SDKs expose equivalent platform capabilities.
* Authentication is pluggable.
* Serialization is standardized.
* Streaming behavior is consistent.
* Errors are normalized.
* SDKs remain transport-independent.
* Business execution remains server-side.

---

# 20. Final Ownership

## SDK Framework

Owns:

* SDK contracts
* Client abstractions
* Serialization
* Authentication integration
* Streaming clients
* Error normalization
* Diagnostics

## API Framework

Owns:

* API contracts
* Transport
* Request processing

## Security Platform

Owns:

* Authentication validation
* Authorization decisions

## Runtime

Owns:

* Execution

---

# 21. Chief Architect's Notes

The SDK Framework provides a consistent developer experience without exposing internal platform architecture.

The constitutional flow is:

```text id="sdk27"
Application
      │
      ▼
SDK Client
      │
      ▼
Normalized API Request
      │
      ▼
API Framework
      │
      ▼
AgentForge Platform
      │
      ▼
Normalized API Response
      │
      ▼
SDK Client
      │
      ▼
Application
```

The SDK answers:

> **"How do developers integrate with AgentForge from their preferred programming language?"**

It does **not** answer:

> **"How does AgentForge internally execute requests?"**

That responsibility remains with the API Framework and Runtime.

---
