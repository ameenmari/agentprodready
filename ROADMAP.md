# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- v1.1 **Simple Agent API** visibility (`createAgent`, `reference`, `openai`, `invoke`, `stream`, `close`)
- Developer onboarding and documentation navigation
- Public credibility metadata (README, badges, npm keywords/engines)
- Evaluator / adoption documentation (`docs/guides/adopting-agentprodready.md`)

---

## Next

- Simplified tools / memory developer experience on the Simple Agent path
- `examples/openai-agent`
- Official GHCR image publication (immutable version tags)
- Measured public performance baselines (`docs/benchmarks/` — local baseline, not an SLA)
- CodeQL / dependency review in CI
- Lightweight community contribution improvements (labels, Discussions if useful)

---

## Later

- SSE reconnect / stream replay
- Durable HITL approval wait / resume
- Additional model providers
- Distributed Runtime (leader election / multi-node)
- Public documentation site
- Real-user showcase (only projects that actually exist)

---

## Out of scope claims

This roadmap does not imply:

- third-party security audit completion
- enterprise adoption guarantees
- hosted SaaS
- exactly-once external tool side effects

See [CHANGELOG.md](CHANGELOG.md) for what has already shipped.
