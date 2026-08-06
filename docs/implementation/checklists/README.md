# Blueprint Implementation Checklists

**Version:** 1.0

This directory contains one blueprint-specific Definition of Done checklist for every approved AgentForge Blueprint 01–31.

Each `NN-<slug>-checklist.md` file includes:

- actionable `- [ ]` items;
- blueprint number, name, and version;
- links to the canonical plan, specification, report, and blueprint;
- ownership and prohibited-responsibility checks;
- hard, bootstrap, and optional dependency gates;
- one labeled verification item for every blueprint acceptance criterion;
- required test categories; and
- implementation-version, reviewer, date, decision, and notes fields.

Acceptance criteria use one of these verification labels: **Documentation Verification**, **Manual Architecture Review**, **Automated Test**, **Integration Test**, or **Contract Test**.

## Canonical artifact locations

- Plans: [`../plans/`](../plans/)
- Specifications: [`../specifications/`](../specifications/)
- Reports: [`../reports/`](../reports/)
- Checklists: this directory
- Reviews: [`../reviews/`](../reviews/)
- Generic checklist template: [`../../templates/implementation-checklist-template.md`](../../templates/implementation-checklist-template.md)
- Authoritative dependency graph: [`../../architecture/dependency-graph.md`](../../architecture/dependency-graph.md)

Canonical checklist names use `NN-<slug>-checklist.md`, for example `01-foundation-checklist.md` and `31-platform-governance-and-evolution-checklist.md`.

## Completion rule

Complete the checklist only after implementation and testing, and after the implementation report exists. A blueprint implementation is complete only when every mandatory item is satisfied, required tests pass, deviations are governed, and the reviewer or Autonomous Mode completion process records the decision. An approved architecture status does not mean its implementation is complete.

