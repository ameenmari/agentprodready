# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- **v1.5.1 Community Gravity** — **published** (package READMEs on npm + root visual CTAs; tag with this cycle)
- v1.5 Simple diagnostics **published** (`agent-framework@1.5.0`, tag `v1.5.0`)
- v1.4 Anthropic **published** (tag `v1.4.0`)
- Record shareable demo GIF (manual) — drop at [docs/community/assets/demo.gif](docs/community/assets/demo.gif) per [demo-script](docs/community/demo-script.md)
- Apply manual GitHub About / Discussions / labels / Release notes if `gh` unavailable
- Ship [content-plan](docs/community/content-plan.md) Post 1 after GIF

---

## Next

1. **Production deployment improvements** (evidence-driven) — keep Simple → graduate path intact
2. Observe real users (stars, issues, Discussions)
3. **Durable Simple Memory / HITL** only when justified by demand

Also: official GHCR image publication; CodeQL / dependency review.

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
