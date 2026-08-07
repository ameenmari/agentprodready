# @agentforge/evaluation

Blueprint 14 provider-independent assessment of immutable normalized platform artifacts.

**Package version:** `0.1.0` (package-complete)

## Ownership

Evaluation owns criteria, scoring, evidence, aggregation, and descriptive immutable `EvaluationResult` facts.

It does **not** own:

- evaluator scheduling / timeout / retry / cancel / recovery (Runtime via `EvaluatorExecutionPort`)
- AI SDKs or prompt package construction
- authorization (Security)
- Persistence bytes / SQL
- Runtime execution stages

## Host productization (v0.6)

Local reference host wires this package when `EVALUATION_ENABLED=true`. See [docs/guides/evaluation.md](../../docs/guides/evaluation.md).

Default CI / smoke leave evaluation disabled. Durable results use Persistence repository `evaluation-results` (no Evaluation → `pg` dependency).
