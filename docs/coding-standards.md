# AgentForge Coding Standards

**Version:** 1.0

---

# Purpose

This document defines the engineering standards for implementing AgentForge.

These standards ensure:

* Consistency
* Maintainability
* Replaceability
* Testability
* Architectural integrity

These standards apply to every package, provider, plugin, application, and tool within the AgentForge repository.

---

# Core Principles

Every implementation should strive for:

* Simplicity
* Readability
* Explicit ownership
* Small components
* Deterministic behavior
* Replaceable implementations
* Comprehensive testing

Code should be easy to understand before it is optimized.

---

# Architecture First

Implementation must follow architecture.

Never change architecture because implementation is easier.

If implementation reveals an architectural issue:

1. Stop.
2. Document the issue.
3. Create an ADR if required.
4. Continue only after approval.

Architecture always takes precedence over convenience.

---

# Single Responsibility

Every class, interface, function, and module should have one clearly defined responsibility.

Avoid components that combine unrelated concerns.

Examples:

Good

```text id="good1"
CapabilityResolver
```

Bad

```text id="bad1"
CapabilityResolverAndExecutor
```

---

# Constructor Injection

Prefer constructor injection.

Avoid:

* Global state
* Static service locators
* Hidden dependencies

Dependencies should always be explicit.

---

# Public Contracts First

Every framework should expose stable public contracts.

Implementation classes remain internal whenever possible.

Consumers should depend on interfaces rather than implementations.

---

# Keep Domain Pure

Domain models should not depend on:

* HTTP
* Database SDKs
* AI SDKs
* Message brokers
* Framework-specific APIs

Domain code should remain portable.

---

# Composition Root

Dependency registration belongs in composition.

Business logic must never register its own dependencies.

Instantiation belongs to the Composition Framework.

---

# Immutability

Prefer immutable objects.

Especially for:

* Contracts
* Events
* Value Objects
* Results
* Requests
* Responses

Mutable state should exist only where required by Runtime or execution lifecycle.

---

# Error Handling

Never expose technology-specific exceptions outside their owning framework.

Normalize errors at architectural boundaries.

Example:

```text id="errorflow"
Provider Exception
        │
        ▼
Normalized Platform Error
        │
        ▼
Higher Layers
```

---

# Logging

Logs should answer:

* What happened?
* Where?
* Why?
* Correlation Identifier
* Execution Reference

Never log:

* Secrets
* Passwords
* API keys
* Tokens
* Sensitive prompts
* Personal data unless explicitly governed

---

# Events

Platform Events represent historical facts.

Events should:

* Be immutable
* Be descriptive
* Be versioned when required

Events should never instruct another component to perform work.

---

# Naming

Names should describe architectural responsibility.

Good:

```text id="goodnames"
ExecutionContextFactory

CapabilityBinding

ToolExecutionRequest

MemoryRetrievalResult
```

Avoid:

```text id="badnames"
Manager

Processor

Utility

Stuff

Thing

Misc
```

---

# Method Size

Prefer small methods.

A method should normally perform one logical operation.

Extract private methods when behavior becomes difficult to understand.

---

# Class Size

Prefer focused classes.

Large classes usually indicate multiple responsibilities.

Split responsibilities rather than creating "God Objects."

---

# Comments

Code should explain **how**.

Comments should explain **why**.

Do not comment obvious code.

Prefer expressive names over excessive comments.

---

# Testing

Every public contract should have tests.

Recommended testing order:

1. Unit Tests
2. Contract Tests
3. Integration Tests

Tests should be deterministic.

---

# Provider Implementations

Every provider should:

* Implement one contract
* Normalize errors
* Remain replaceable
* Avoid leaking vendor types

Provider implementations should never redefine platform semantics.

---

# Configuration

Configuration should be:

* Externalized
* Validated
* Immutable during execution where appropriate

Never hardcode:

* Credentials
* API keys
* Environment-specific values

---

# Dependency Direction

Always depend on abstractions.

Never introduce reverse architectural dependencies.

Preferred flow:

```text id="dependencyflow"
Contracts
      │
      ▼
Domain
      │
      ▼
Application
      │
      ▼
Infrastructure
```

---

# Documentation

Every package should include a README describing:

* Purpose
* Responsibilities
* Public contracts
* Dependencies
* Extension points

Documentation should evolve with implementation.

---

# Code Reviews

Every implementation should verify:

* Architectural ownership
* Public contracts
* Error normalization
* Security boundaries
* Event publication
* Test coverage
* Documentation updates

Reviews should focus on correctness before optimization.

---

# Performance

Optimize only after correctness.

Measure before introducing complexity.

Performance optimizations must not violate architectural boundaries.

---

# Security

Never infer authorization from credentials.

Always rely on the Security Platform.

Validate all external inputs.

Treat external systems as untrusted.

---

# Refactoring

Refactoring should preserve:

* Public contracts
* Ownership boundaries
* Architectural intent

Behavioral changes require blueprint updates or ADRs where applicable.

---

# Final Engineering Principle

AgentForge values **architectural consistency over clever implementation**.

Readable, maintainable, well-tested code that faithfully implements the blueprints is preferred over highly optimized or overly abstract code that obscures architectural intent.

When in doubt:

1. Follow the blueprint.
2. Follow the public contract.
3. Keep responsibilities small.
4. Make dependencies explicit.
5. Write tests.
#6. Document decisions.