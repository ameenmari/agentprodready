# ADR Template

**Version:** 1.0

**Document Type:** Architectural Decision Record

---

# ADR-XXXX

## Title

Provide a short, descriptive title for the architectural decision.

Example:

> Runtime Owns Operational Execution

---

## Status

Choose one:

* Proposed
* Accepted
* Superseded
* Deprecated
* Rejected

---

## Date

```
YYYY-MM-DD
```

---

## Related Blueprints

List every blueprint affected.

Example:

```text
04 Runtime
07 Capability Resolution
16 Event Bus
```

---

## Related ADRs

List related Architectural Decision Records.

If none:

```
None
```

---

# Context

Describe the architectural problem.

Include:

* Existing architecture
* Constraints
* Why the decision is required
* What problem must be solved

Avoid implementation details.

---

# Decision

Describe the approved architectural decision.

The decision should be explicit.

Prefer short, authoritative statements.

Example:

> Runtime exclusively owns operational execution concerns.

---

# Rationale

Explain why this decision was chosen.

Discuss:

* Benefits
* Trade-offs
* Long-term architectural impact

---

# Alternatives Considered

Document the alternatives that were evaluated.

Example:

Alternative A

Pros

Cons

Alternative B

Pros

Cons

---

# Architectural Consequences

Describe how this decision affects:

* Ownership
* Dependencies
* Public Contracts
* Existing Blueprints
* Future Implementations

---

# Compatibility

Indicate compatibility.

Examples:

* Fully Backward Compatible
* Partially Compatible
* Breaking Change

If breaking:

Explain migration requirements.

---

# Migration

If implementation already exists:

Describe:

* Migration steps
* Risks
* Required changes
* Rollout strategy

If not applicable:

```
No migration required.
```

---

# Risks

Document known risks.

Examples:

* Increased complexity
* Temporary compatibility concerns
* Additional testing required

---

# Acceptance Criteria

The ADR is considered complete when:

* The architectural problem is resolved.
* Ownership is explicit.
* Related blueprints are updated.
* Implementation guidance is documented.
* Architectural review is complete.

---

# Implementation Notes

Optional.

Useful implementation guidance.

Must not redefine architecture.

---

# Review

## Reviewed By

Architecture Team

---

## Approval

Approved / Rejected

---

## Revision History

| Version | Date | Author | Summary |
| ------- | ---- | ------ | ------- |

---

# Final Architectural Statement

Summarize the permanent architectural rule established by this ADR.

Example:

> Runtime owns execution. Other frameworks define semantics but never coordinate operational execution independently.
