# ADR-009 — Historical Facts Are Immutable

**Status:** Accepted

**Version:** 1.0

---

# Context

AgentForge records numerous forms of historical information, including Platform Events, Memory Records, Audit Records, Evidence Packages, Evaluation Results, and other execution-derived artifacts.

These records represent facts that occurred at a specific point in time.

As the platform evolves, governance state, retention policies, legal requirements, classifications, and metadata may change. However, allowing historical facts themselves to be modified would compromise traceability, auditability, reproducibility, and trust.

The platform therefore requires a clear distinction between immutable historical facts and evolving governance state.

---

# Decision

Historical facts within AgentForge are immutable once created.

Changes in governance, classification, retention, legal hold, integrity verification, export, archival, or other lifecycle activities shall be represented as new governed facts rather than modifications to the original historical record.

Historical records may reference subsequent governance activities, but their original meaning, occurrence, and recorded content must remain unchanged.

---

# Rationale

Treating historical facts as immutable provides:

* Reliable auditability.
* Complete historical traceability.
* Reproducible investigations.
* Deterministic event replay.
* Strong evidence integrity.
* Simplified governance.
* Clear separation between history and lifecycle management.

This principle ensures that the platform preserves what actually occurred while allowing governance to evolve independently.

---

# Architectural Rule

Historical facts are immutable.

Governance actions create new historical facts.

The original historical record must never be silently rewritten, replaced, or reinterpreted.

---

# Consequences

The following practices are required:

* Platform Events remain immutable.
* Audit Records remain immutable.
* Memory Records remain immutable after creation.
* Evidence Packages preserve historical integrity.
* Governance changes create separate historical records.
* Corrections are represented as new facts rather than edits.

The following practices are prohibited:

* Updating historical records in place.
* Rewriting event payloads.
* Altering recorded execution outcomes.
* Modifying audit history after creation.
* Treating governance changes as historical edits.

---

# Examples

Examples of immutable historical facts:

| Historical Fact   | Immutable |
| ----------------- | --------- |
| Platform Event    | ✓         |
| Audit Record      | ✓         |
| Memory Record     | ✓         |
| Evaluation Result | ✓         |
| Evidence Package  | ✓         |

Examples of new governance facts:

| Governance Activity              | Creates New Fact |
| -------------------------------- | ---------------- |
| Legal Hold Applied               | ✓                |
| Retention Policy Updated         | ✓                |
| Integrity Verification Completed | ✓                |
| Evidence Exported                | ✓                |
| Record Archived                  | ✓                |
| Record Deleted Under Policy      | ✓                |

Conceptually:

```text id="immutabilityflow"
Historical Fact
        │
        ▼
Immutable Record
        │
        ▼
Governance Activity
        │
        ▼
New Historical Fact
```

---

# Related Blueprints

* Blueprint 10 — Knowledge Engine
* Blueprint 11 — Memory Engine
* Blueprint 14 — Evaluation Engine
* Blueprint 16 — Event Bus
* Blueprint 17 — Audit Platform

---

# Related ADRs

* ADR-002 — Explicit Ownership
* ADR-010 — Events Represent Facts, Not Commands
* ADR-013 — Audit Preserves Accountability

---

# Constitutional Rule

> **Historical facts are immutable.**
>
> Governance activities, corrections, and lifecycle changes become new historical facts and must never silently modify the original historical record.

---

# Final Statement

AgentForge preserves history as it occurred.

Historical records provide a trustworthy account of platform activity, while governance and lifecycle operations are represented as additional historical facts. This distinction protects auditability, reproducibility, evidence integrity, and long-term architectural consistency without preventing the platform from evolving its governance over time.
