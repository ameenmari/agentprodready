# Evaluation Framework (Host Productization)

**Version:** 0.6.0

AgentProdReady Evaluation (Blueprint 14) is the platform quality-assessment engine. Package `@agentprodready/evaluation@0.1.0` is complete; v0.6 wires it into the local reference host.

## Ownership

| Concern | Owner |
|---|---|
| Criteria, scoring, evidence, aggregation, descriptive results | Evaluation |
| Evaluator scheduling / timeout / retry / cancel / recovery | Runtime (via `EvaluatorExecutionPort`) |
| Evaluator / AI judge capability selection | Capability Resolution |
| Instantiation | Composition |
| Prompt packages for AI judges | Prompt Builder |
| Provider SDKs | AI Provider Framework |
| Authorization | Security |
| Result durability bytes | Persistence |

Evaluation Results are immutable descriptive facts (`descriptive: true`). They do **not** automatically retry, fail workflows, authorize access, or mutate Runtime policy.

## Configuration

| Variable | Default | Values |
|---|---|---|
| `EVALUATION_ENABLED` | `false` | `true` \| `false` |
| `EVALUATION_RESULT_STORE` | `in-memory` | `in-memory` \| `persistent` |

Combinations:

| Enabled | Result store | Persistence | Meaning |
|---|---|---|---|
| false | * | * | Evaluation inactive; `/invoke` unchanged |
| true | in-memory | any | Process-local results |
| true | persistent | in-memory | Persistence-backed, not cross-process durable |
| true | persistent | postgres | Durable Evaluation Results |

## Evaluator categories

Local host seeds all five:

- deterministic (`ExactMatchEvaluator`)
- heuristic (`ExactMatchEvaluator` heuristic descriptor)
- AI-assisted (`NormalizedAiAssistedEvaluator` → Cap → Prompt → AI)
- human (`InMemoryHumanEvaluator` wait/resume)
- composite (host wrapper over `WeightedCompositeEvaluator`)

## AI-assisted boundary

```text
NormalizedAiAssistedEvaluator
  → NormalizedAiEvaluationPort (host)
    → Capability Resolution
    → Prompt Builder
    → AI Provider Framework
    → NormalizedAiAssessment (+ provenance refs)
```

No OpenAI SDK in Evaluation. Provenance requires:

- `capabilityBindingReference`
- `promptPackageReference`
- `normalizedAiResultReference`

## Human review limitation

v0.6 proves semantic `waiting` → `resume` → completed. It does **not** productize review UI, notifications, or durable Runtime suspension/timeout for long-lived human review.

## Persistence mapping

When `EVALUATION_RESULT_STORE=persistent`:

- Repository: `evaluation-results`
- Entity id: `EvaluationResult.id`
- Scope: `{ tenantId }` only
- Data: full immutable `EvaluationResult`
- No new SQL tables/migrations

## Runtime boundary

v0.6 does **not** add a Runtime `ExecutionStage` for evaluation. Host implements `EvaluatorExecutionPort` (sequential/parallel). Timeout/retry/recovery policies remain thin in the host adapter (documented limitation).

## /invoke

Default `EVALUATION_ENABLED=false` leaves `/invoke` unchanged. When enabled, evaluation is observational — low scores do not automatically fail a successful invoke.

## Local commands

```bash
# enable evaluation (in-memory results)
$env:EVALUATION_ENABLED='true'
pnpm start

# durable results
pnpm db:up
pnpm db:migrate
$env:EVALUATION_ENABLED='true'
$env:EVALUATION_RESULT_STORE='persistent'
$env:PERSISTENCE_PROVIDER='postgres'
$env:DATABASE_URL='postgres://agentprodready:agentprodready@127.0.0.1:5432/agentprodready'
pnpm start

# suites / probe
pnpm test:evaluation-persistence
node scripts/evaluation-probe.mjs
```

## CI

- Default `verify` / `docker`: evaluation disabled
- Additive job `evaluation-persistence-postgres` runs `pnpm test:evaluation-persistence`
