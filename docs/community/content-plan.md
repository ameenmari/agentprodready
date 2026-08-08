# AgentProdReady — Content / Community Plan

**Purpose:** Concrete technical content based on real AgentProdReady lessons — not generic “AI agents” SEO.  
**Maintainer model:** Solo-friendly cadence (roughly one post per phase, not a media company).  
**Maturity line:** Production-oriented architecture with a young ecosystem.

---

## Distribution defaults (all posts)

| Channel | Use |
|---|---|
| GitHub Discussions / blog-style `docs/` or external blog | Canonical long form |
| X/Twitter | 3–5 beat thread + link |
| LinkedIn | Practitioner framing for backend TS |
| Reddit (`r/node`, `r/typescript`) / HN | Only when post teaches; no launch spam |
| README “Learn” links | After publish |

Do not invent traction metrics in posts.

---

## Post 1 — Agent tools without footguns

**Title:** Agent tools without footguns  
**Audience:** TS backend developers adding tools to agents for the first time  
**Developer pain:** Tutorials make `execute()` look like a harmless function; production tools have side effects, retries, and authorization.

### Outline

1. The lie of “just call a function from the model”  
2. Side effects vs pure lookups  
3. Idempotency expectations (and what AgentProdReady does **not** promise — no exactly-once external effects)  
4. Security authorization ownership — tools are not free escapes  
5. `approval-required` / fail-closed behavior (`TOOL_APPROVAL_REQUIRED`)  
6. Simple `tool()` path vs graduating to governed Tool Framework  
7. Runnable example + “what breaks if you ignore this”

### Runnable example

`examples/tools-agent` (reference) + pointer to Simple Tools guide; show a dangerous vs safe tool shape in prose.

### Claims that must NOT be made

- Exactly-once side effects  
- That Simple `tool()` is full production HTTP auth  
- That approval HITL wait/resume is durable (it is fail-closed today)

### Channels

LinkedIn + TS Reddit; README Tools section link.

---

## Post 2 — OpenAI-compatible gateways without leaking your OPENAI_API_KEY

**Title:** OpenAI-compatible gateways without leaking your `OPENAI_API_KEY`  
**Audience:** Developers on Groq/Together/Ollama/Azure-ish gateways  
**Developer pain:** “Compatible” helpers silently reuse `OPENAI_API_KEY` and send the wrong credential to the wrong host.

### Outline

1. Why baseUrl-only hacks are dangerous  
2. v1.3 decision: distinct capability id `openai-compatible-ai`  
3. Credential isolation: `OPENAI_COMPATIBLE_API_KEY` — **never** silent fallback to `OPENAI_API_KEY`  
4. `auth: "api-key" | "none"` for local gateways  
5. Runnable `openaiCompatible({ baseUrl, model })` example  
6. What compatibility actually means (Chat Completions shape — not Anthropic Messages)

### Runnable example

`examples/openai-compatible-agent` + `docs/guides/openai-compatible.md`.

### Claims that must NOT be made

- Universal gateway compatibility  
- Anthropic support via openai-compatible  
- That credential isolation replaces operator secret management

### Channels

X thread (credential punchline) + HN-safe technical tone.

---

## Post 3 — Why our memory demo lied

**Title:** Why our memory demo lied  
**Audience:** Early evaluators; trust-sensitive readers  
**Developer pain:** READMEs that show “memory” with a deterministic echo model imply the model reasoned over history.

### Outline

1. What shipped in v1.2 (`memory: true` / `inMemory()`)  
2. What was true: injection into context works  
3. What was misleading: `reference()` echoes the last user message — it does not demonstrate recall reasoning  
4. v1.2.1 correction: honest docs + `result.metadata.memory` diagnostics  
5. How to demo memory fairly (OpenAI path or explicit metadata assertions)  
6. What durable memory would mean later — without promising a date

### Runnable example

`examples/memory-agent` (reference honesty + optional OpenAI file).

### Claims that must NOT be made

- That the framework “lost data” or had a persistence bug if the issue was **demo positioning**  
- That ephemeral Simple Memory is durable  
- That Context Assembly productization already shipped on the Simple path

### Channels

Blog + LinkedIn “we corrected the docs” trust post — rare, high value.

---

## Post 4 — When createAgent stops being enough

**Title:** When `createAgent` stops being enough  
**Audience:** Developers whose weekend agent is becoming a backend dependency  
**Developer pain:** Fear of rewrite when leaving the 15-line API.

### Outline

1. Simple Agent API is the front door — not a toy trap  
2. Signals you’ve outgrown the default embedded path (auth, multi-tenant, recovery, policy, routing)  
3. Graduation map: Security, Runtime recovery/checkpoints, Capability Resolution, provider routing, platform-host  
4. What you keep vs what you add  
5. Pointers: adopting guide, production deployment, runtime recovery  
6. Honest: young ecosystem — architecture is ahead of community size

### Runnable example

Start from `examples/backend-agent`; link `docs/guides/adopting-agentprodready.md` and `production-deployment.md`.

### Claims that must NOT be made

- Zero-downtime migration guarantees  
- That graduation is automatic  
- Enterprise certifications

### Channels

README “Production path” + LinkedIn.

---

## Cadence suggestion (solo)

| Window | Ship |
|---|---|
| Phase 1 (Try it) | Demo GIF + Post 3 short “honesty” note if time (trust) |
| Phase 2 (Trust it) | Post 1 + Post 2 |
| Phase 3 (Expand it) | Post 4 alongside Anthropic announcement |

Adjust based on actual issue themes.

---

## First 10 good-first-issues (safe starters)

Open only after templates/labels exist. Favor docs/examples/tests/DX:

1. Add “expected output” screenshots/text to `hello-agent` README  
2. Improve `.env.example` comments in openai examples  
3. Add troubleshooting section to Getting Started (engine warnings)  
4. Fix stale provider catalog line anywhere still saying “OpenAI only”  
5. Add copy-paste PowerShell + bash blocks consistently  
6. Expand `why-agentprodready.md` comparison table with one more honest dimension  
7. Add `backend-agent` “graduate next” links audit  
8. Unit test for scaffold `--template` file list (once package exists)  
9. Document label meanings in CONTRIBUTING one-pager  
10. asciinema/GIF alt-text + accessibility caption for demo

Avoid good-first-issue on Runtime recovery, Security authorization core, or Persistence migrations.
