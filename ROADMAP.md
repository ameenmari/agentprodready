# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- **v1.5 Simple diagnostics** — in-tree; publish with this release (`agent-framework@1.5.0`, `create-agentprodready@0.1.2`)
- v1.4 Anthropic **published** (`@agentprodready/ai-provider-anthropic@1.0.0`, `@agentprodready/agent-framework@1.4.0`, tag `v1.4.0`)
- v1.3.1 Adoption Sprint **published** (`create-agentprodready@0.1.0`, `agent-framework@1.3.1`, tag `v1.3.1`)
- Record shareable demo GIF (manual) — [demo-script](docs/community/demo-script.md)
- Apply manual GitHub About / Discussions / labels / Release notes if `gh` unavailable

---

## Next

1. **Production deployment improvements** (evidence-driven)
2. Observe real users
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
