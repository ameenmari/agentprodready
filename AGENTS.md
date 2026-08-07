# AgentProdReady Agent Instructions

Before changing code or implementation documentation, read [docs/cursor-start-here.md](docs/cursor-start-here.md).

- Follow the architectural authority order defined in the documentation.
- Implement exactly one blueprint at a time.
- Declare one Implementation Mode from [docs/implementation/implementation-modes.md](docs/implementation/implementation-modes.md).
- Create the canonical implementation plan and Blueprint Implementation Specification before production code.
- Use only [plans](docs/implementation/plans/), [specifications](docs/implementation/specifications/), [reports](docs/implementation/reports/), [checklists](docs/implementation/checklists/), and [reviews](docs/implementation/reviews/) for implementation artifacts.
- Use [docs/architecture/dependency-graph.md](docs/architecture/dependency-graph.md) as the authoritative dependency source.
- Respect accepted ADRs, explicit ownership, Runtime control, Security authorization ownership, Composition instantiation ownership, and provider boundaries.
- Apply the documented bootstrapping rules without transferring ownership or inventing final guarantees.
- Stop only for a documented stop condition; record reasonable implementation-level decisions in the specification.
- Never claim completion without successful required tests, an implementation report, and the completed blueprint-specific checklist.
- Never silently redesign architecture or implement more than the active blueprint authorizes.
