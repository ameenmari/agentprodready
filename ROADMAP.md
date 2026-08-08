# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- **Developer Adoption Sprint** — implemented in-tree; **publish pending** (`create-agentprodready@0.1.0`, `@agentprodready/agent-framework@1.3.1`)  
  See [report](docs/implementation/reports/agentprodready-developer-adoption-sprint-implementation-report.md)
- Record shareable demo GIF (manual; not a technical release gate) — [demo-script](docs/community/demo-script.md)
- Apply manual GitHub About / Discussions / labels — [manual-actions](docs/implementation/manual-actions/github-repository-metadata.md)

---

## Next (after Adoption Sprint)

Ordered for discovery → trust → expand (not architecture depth first):

1. **Anthropic** provider (named-vendor credibility)
2. **Diagnostics & debugging** (Simple-path DX)
3. **Production deployment improvements** (evidence-driven; recipe starts in Adoption Sprint)
4. Observe real users
5. **Durable Simple Memory / HITL** only when justified by demand

Also: official GHCR image publication; CodeQL / dependency review; community labels/Discussions (started in Adoption Sprint).

The prior “five developer-job” track remains, but **Agent in My App** / front-door Deploy credibility are partially absorbed by the Adoption Sprint — do not duplicate those releases.

---

## Later

- SSE reconnect / stream replay
- Durable HITL approval wait / resume (demand-gated)
- Additional model providers (Gemini / Bedrock / etc.)
- Distributed Runtime (leader election / multi-node)
- Public documentation site
- Real-user showcase (only projects that actually exist)
- Measured public performance baselines (`docs/benchmarks/` — local baseline, not an SLA)

---

## Shipped recently

- v1.2 / v1.2.1 Simple Tools + Simple Memory + DX honesty (`tool()`, `memory: true` / `inMemory()`, honest `reference()` memory story)
- v1.3 (in-tree) OpenAI-compatible provider facade — see CHANGELOG when published

---

## Out of scope claims

This roadmap does not imply:

- third-party security audit completion
- enterprise adoption guarantees
- hosted SaaS
- exactly-once external tool side effects

See [CHANGELOG.md](CHANGELOG.md) for what has already shipped.
