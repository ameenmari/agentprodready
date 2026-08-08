# GitHub labels (solo-maintainer)

Suggested labels for AgentProdReady. Create these in the GitHub UI if missing
(**Issues → Labels**). This is not foundation-scale governance.

| Label | Use |
|---|---|
| `bug` | Something broken vs docs/behavior |
| `documentation` | Docs / README / guides |
| `good first issue` | Docs, examples, tests, small DX only |
| `help wanted` | Maintainer would welcome a PR |
| `provider` | AI providers / openai-compatible / future vendors |
| `simple-api` | `createAgent` / Simple facade |
| `tools` | Simple tools or Tool Framework DX |
| `memory` | Simple or durable memory docs/behavior |
| `question` | Support / clarification |
| `enhancement` | Feature requests |

## `good first issue` policy

Prefer:

- docs typos / clarity
- example README polish
- tests for scaffold CLI
- small DX scripts

Avoid labeling as good-first:

- Runtime recovery internals
- Security authorization core
- Persistence migrations
- Architecture ownership changes

## Discussions (manual)

GitHub Discussions cannot be fully enabled from repo files alone.

1. Repo **Settings → General → Features → Discussions**
2. Suggested categories: **Q&A**, **Ideas**, **Show and tell**
3. Point SUPPORT.md / issue config at Discussions once enabled

Until then, use issue templates (`getting_started_problem`, `bug_report`, `feature_request`).
