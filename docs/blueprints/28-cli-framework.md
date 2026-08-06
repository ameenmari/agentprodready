# AgentForge

# Engineering Blueprint 28

# CLI Framework

**Version:** 2.0

**Status:** Approved


---

# 1. Purpose

The CLI Framework defines the standardized command-line interface for developing, managing, deploying, and operating AgentForge.

The CLI is a thin client over the platform APIs.

It provides a consistent developer and administrator experience without duplicating platform logic.

This blueprint governs CLI architecture.

It does **not** govern:

* Runtime execution
* Business logic
* Workflow execution
* Security authorization
* Plugin execution
* Agent execution

---

# 2. Responsibilities

The CLI Framework owns:

* Command definitions
* Command parsing
* Command lifecycle
* Output formatting
* Interactive mode
* Non-interactive mode
* CLI configuration
* CLI plugins
* Diagnostics
* Shell integration

It does **not** own:

* Business execution
* Runtime scheduling
* Security authorization
* Workflow progression
* API implementation
* Provider execution

---

# 3. Dependencies

Blueprint 28 depends on:

* Blueprint 21 — Plugin Marketplace
* Blueprint 26 — API Framework
* Blueprint 27 — SDK Framework
* Blueprint 22 — Observability
* Blueprint 23 — Configuration & Policy

---

# 4. Public Contracts

## Consumes

* CLI Commands
* Configuration
* Authentication Credentials
* API Contracts

## Produces

* CLI Output
* CLI Diagnostics
* Command Results
* Exit Codes

---

# 5. Command Model

Every CLI command is represented as an immutable command definition.

A command may define:

* Command name
* Description
* Arguments
* Options
* Validation rules
* Required permissions
* Output type

---

# 6. Core Commands

The CLI may provide commands for:

* Project creation
* Agent management
* Workflow management
* Package management
* Plugin management
* Configuration
* Diagnostics
* Health
* Deployment
* Administration

Additional commands may be added through CLI plugins.

---

# 7. Interactive Mode

Interactive mode supports:

* Guided configuration
* Prompts
* Confirmation
* Selection menus
* Progress indicators

Interactive behavior must never alter business semantics.

---

# 8. Non-Interactive Mode

The CLI must support automation.

Requirements include:

* Script-friendly output
* Stable exit codes
* Machine-readable responses
* No required prompts

---

# 9. Output Formats

Supported output formats may include:

* Human-readable text
* JSON
* YAML
* Table
* Compact mode

Output formatting must not modify platform results.

---

# 10. Authentication

Authentication is delegated to the Security Platform through the API Framework.

The CLI may support:

* Login
* Logout
* API tokens
* OAuth device flow
* SSO

Credential validation remains server-side.

---

# 11. Configuration

CLI configuration may include:

* API endpoint
* Active profile
* Default workspace
* Output format
* Logging level
* Proxy
* TLS settings

Configuration remains local to the client.

---

# 12. Plugin Support

The CLI supports extension through CLI plugins.

Plugins may add:

* Commands
* Output formatters
* Project templates
* Administrative utilities

CLI plugins must not bypass platform APIs.

---

# 13. Diagnostics

Diagnostics include:

* Command execution time
* Request identifiers
* API version
* CLI version
* SDK version
* Error diagnostics

---

# 14. Events

The CLI may emit local operational events for diagnostics.

These are client-side events.

Platform Events remain owned by Blueprint 16.

---

# 15. Audit

Administrative CLI actions may become audit-relevant through platform APIs.

The CLI itself does not create Audit Records.

Blueprint 17 preserves accountability.

---

# 16. Error Normalization

Normalized CLI errors include:

* Invalid Command
* Invalid Arguments
* Authentication Failed
* Authorization Denied
* Configuration Invalid
* Connection Failed
* API Error
* Command Failed

Shell-specific errors remain internal.

---

# 16A. Implementation Specification Scope

This blueprint defines a reusable CLI framework and reference command surface, not a complete end-user command product.

The Blueprint Implementation Specification must define a reference command tree that maps directly to the approved Blueprint 26 API and Blueprint 27 SDK surface, including command names, arguments, options, output formats, exit codes, and automation behavior.

In Autonomous Mode, Cursor may implement the smallest command tree needed to verify parsing, configuration, authentication, output, diagnostics, and API delegation. Product-specific commands require separate approved product requirements.

---

# 17. Cursor Implementation Guide

Implement:

* Command parser
* Command registry
* Interactive mode
* Output formatter
* Configuration manager
* Authentication integration
* Plugin loader
* Diagnostics
* Error normalization

Reference implementations:

* Local CLI
* JSON formatter
* Table formatter

Do not implement:

* Business logic
* Runtime execution
* Authorization engine
* Workflow execution
* Provider SDK logic

---

# 18. Testing Requirements

Verify:

* Command parsing
* Argument validation
* Interactive mode
* Non-interactive mode
* Output formatting
* Authentication
* Configuration
* Plugin loading
* Diagnostics
* Error normalization

---

# 19. Acceptance Criteria

Blueprint 28 is complete when:

* Commands are standardized.
* CLI remains a thin client.
* Output formats are replaceable.
* Automation is supported.
* Interactive mode is optional.
* Authentication is delegated.
* Platform logic remains server-side.

---

# 20. Final Ownership

## CLI Framework

Owns:

* Commands
* Parsing
* Output
* Interactive mode
* Configuration
* Diagnostics

## SDK Framework

Owns:

* API communication
* Serialization
* Authentication integration

## API Framework

Owns:

* Request processing

## Runtime

Owns:

* Execution

---

# 21. Chief Architect's Notes

The CLI Framework provides a consistent operational interface for developers and administrators.

The constitutional flow is:

```text id="cli28"
User
   │
   ▼
CLI Command
   │
   ▼
SDK
   │
   ▼
API Framework
   │
   ▼
AgentForge Platform
   │
   ▼
CLI Output
```

The CLI answers:

> **"How do developers and operators interact with AgentForge from the command line?"**

It does **not** answer:

> **"How does AgentForge execute platform logic?"**

That responsibility remains with the server-side architecture.

---
