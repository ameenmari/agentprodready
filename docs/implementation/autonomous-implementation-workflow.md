# Cursor Implementation Protocol

**Version:** 1.0

**Implementation Mode:** Autonomous

This protocol uses [Autonomous Mode](implementation-modes.md). It does not override the canonical mode definitions or stop conditions.

## Purpose

This document defines the mandatory workflow Cursor follows when implementing any approved Engineering Blueprint.

The protocol is independent of the blueprint being implemented.

---

# Implementation Workflow

For every blueprint, Cursor shall execute the following workflow.

Declare:

```text
Implementation Mode: Autonomous
```

1. Read the Engineering Principles.

2. Read all relevant ADRs.

3. Read the blueprint being implemented.

4. Read every directly dependent blueprint.

5. Inspect the current repository.

6. Create:

- Implementation Plan
- Implementation Specification

7. Verify ownership boundaries.

8. Implement the blueprint.

9. Execute:

- lint
- tests
- build

10. Produce:

- Implementation Report
- Completed Checklist

---

# Stop Conditions

Cursor must stop implementation if:

- architectural documents materially conflict;
- implementation requires changing architectural ownership;
- a required dependency cannot be satisfied;
- a breaking public contract must be introduced;
- an architectural decision is missing.

Minor implementation decisions do not require interruption.

---

# Autonomous Authority

When Autonomous Mode is selected, Cursor may continue from the Implementation Plan through implementation without waiting for intermediate approval.

Cursor must still:

- preserve ADRs;
- preserve blueprint responsibilities;
- preserve ownership boundaries;
- report assumptions;
- report deviations;
- complete testing;
- generate implementation reports.

Autonomous implementation does not authorize architectural redesign.

---

# Completion

A blueprint implementation is complete only after:

✓ Implementation Plan

✓ Implementation Specification

✓ Source Code

✓ Tests

✓ Build Success

✓ Implementation Report

✓ Checklist Completion


1. Inspect the repository.
2. Create the Implementation Plan.
3. Create the Blueprint Implementation Specification.
4. Continue according to the selected Implementation Mode.
