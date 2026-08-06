# Blueprint Implementation Checklist Template

**Version:** 1.0  
**Document Type:** Implementation Completion Checklist  
**Blueprint Number:** _NN_  
**Blueprint Name:** _Name_  
**Blueprint Version:** _Version_  
**Implementation Version:** _To be completed_  
**Implementation Mode:** _Review-Gated | Autonomous | Scaffolding-Only_  
**Reviewer:** _To be completed_  
**Review Date:** _To be completed_

## Required artifacts

- [ ] **Documentation Verification:** Approved blueprint reviewed.
- [ ] **Documentation Verification:** `docs/implementation/plans/NN-slug-implementation-plan.md` completed.
- [ ] **Documentation Verification:** `docs/implementation/specifications/NN-slug-implementation-specification.md` completed.
- [ ] **Documentation Verification:** `docs/implementation/reports/NN-slug-implementation-report.md` completed.
- [ ] **Manual Architecture Review:** Declared Implementation Mode and stop conditions were followed.

## Ownership and boundaries

- [ ] **Manual Architecture Review:** _Add one check per owned responsibility._
- [ ] **Manual Architecture Review:** _Add one check per prohibited responsibility._
- [ ] **Manual Architecture Review:** Dependency direction and provider independence are preserved.
- [ ] **Manual Architecture Review:** Bootstrapped contracts identify their eventual owner and replacement point.

## Integration and contracts

- [ ] **Contract Test:** _Add one check per required public contract._
- [ ] **Integration Test:** _Add one check per required integration._
- [ ] **Manual Architecture Review:** Security, Runtime, Event Bus, Audit, Observability, Configuration, and Persistence ownership remain with their approved owners where applicable.

## Acceptance criteria

Copy every acceptance criterion from the approved blueprint as a separate checkbox and assign exactly one primary label:

- [ ] **Documentation Verification:** _Criterion verified by documentation._
- [ ] **Manual Architecture Review:** _Criterion verified by architectural inspection._
- [ ] **Automated Test:** _Criterion verified by an automated unit or behavior test._
- [ ] **Integration Test:** _Criterion verified across components._
- [ ] **Contract Test:** _Criterion verified against a public or provider contract._

Do not replace the exact criteria with a generic “Blueprint acceptance criteria satisfied” item.

## Test and quality gates

- [ ] **Automated Test:** Required unit and behavior tests pass.
- [ ] **Contract Test:** Required contract and provider-conformance tests pass.
- [ ] **Integration Test:** Required integration and failure-path tests pass.
- [ ] **Documentation Verification:** Test commands and results are recorded in the implementation report.
- [ ] **Manual Architecture Review:** No unresolved architecture-affecting TODO remains.

## Completion decision

- [ ] Approved
- [ ] Requires Revision
- [ ] Blocked
- [ ] Deferred

## Reviewer notes

_Record observations, exceptions, and governed follow-up work._

