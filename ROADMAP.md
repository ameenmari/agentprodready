# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- v1.2 Simple Tools + Simple Memory facade (`tool()`, `memory: true` / `inMemory()`)
- Node 22+24 CI matrix; widen engines only after Node 22 is green
- Package compatibility documentation
- GitHub About metadata (description / homepage / topics) — apply in UI if tooling unavailable

---

## Next

- Soften engines to `>=22 <25` after Node 22 CI stays green
- OpenAI-compatible provider (preferred next provider — separate cycle)
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
