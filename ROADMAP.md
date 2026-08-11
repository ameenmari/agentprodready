# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- **v1.6 Production Durability** — **published** (`agent-framework@1.6.0`, tag `v1.6.0`)
- v1.5.1 Community Gravity **published** (package READMEs on npm + root visual CTAs)
- v1.5 Simple diagnostics **published** (`agent-framework@1.5.0`, tag `v1.5.0`)
- v1.4 Anthropic **published** (tag `v1.4.0`)
- Record shareable demo GIF (manual) — drop at [docs/community/assets/demo.gif](docs/community/assets/demo.gif) per [demo-script](docs/community/demo-script.md)
- Apply manual GitHub About / Discussions / labels / Release notes if `gh` unavailable
- Ship [content-plan](docs/community/content-plan.md) Post 1 after GIF

---

## Next

1. **Production deployment improvements** (evidence-driven) — keep Simple → graduate path intact
2. Observe real users (stars, issues, Discussions)
3. Official GHCR image publication; CodeQL / dependency review

---

## Later

- Additional model providers (Bedrock / Azure native / etc.)
- Distributed Runtime (leader election / multi-node)
- Public documentation site
- Real-user showcase (only projects that actually exist)
- Measured public performance baselines (`docs/benchmarks/` — local baseline, not an SLA)
- HTTP host SSE reconnect tokens (Simple library replay shipped in v1.6)

---

## Shipped recently

- **v1.6 Production Durability** — durable Simple Memory (`fileMemory` / `postgresMemory`), HITL `approve` / `reject` / `resume` (Amendment D), stream replay (`resumeFrom` / `replayStream`), idempotent tool ledger, Gemini provider
- v1.5.2 Search metadata (npm + GitHub topics)
- v1.5.1 Community Gravity (package README surface)
- v1.5.0 Simple diagnostics (`result.metadata`)
- v1.4.0 Anthropic provider
- v1.2 / v1.2.1 Simple Tools + Simple Memory + DX honesty
- v1.3 OpenAI-compatible provider facade

---

## Out of scope claims

This roadmap does not imply:

- third-party security audit completion
- enterprise adoption guarantees
- hosted SaaS
- exactly-once external tool side effects for **non-idempotent** tools

See [CHANGELOG.md](CHANGELOG.md) for what has already shipped.
