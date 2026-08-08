# Roadmap

AgentProdReady is a **production-oriented architecture with a young ecosystem**.

This roadmap is directional. It does **not** promise delivery dates.

---

## Now

- **v1.3 Provider Ecosystem** — OpenAI-compatible Simple path (`openaiCompatible`, `openai-compatible-ai`); publish pending authorization
- Node 22+24 CI matrix; widen engines only after Node 22 is green
- Package compatibility documentation

---

## Next

- Soften engines to `>=22 <25` after Node 22 CI stays green
- Anthropic provider (next named vendor; separate Review-Gated adapter)
- Official GHCR image publication (immutable version tags)
- Measured public performance baselines (`docs/benchmarks/` — local baseline, not an SLA)
- CodeQL / dependency review in CI
- Lightweight community contribution improvements (labels, Discussions if useful)

---

## Later

- SSE reconnect / stream replay
- Durable HITL approval wait / resume
- Additional model providers (Gemini / Bedrock / etc.)
- Distributed Runtime (leader election / multi-node)
- Public documentation site
- Real-user showcase (only projects that actually exist)

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
