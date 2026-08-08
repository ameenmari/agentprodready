# Adopting AgentProdReady

Guide for engineering leads evaluating AgentProdReady for a real project.

**Maturity:** Production-oriented architecture with a young ecosystem.

This document is candid by design. It is not a sales pitch.

---

## When AgentProdReady is a good fit

- You want a **modular agent platform** with explicit ownership (Runtime, Security, Composition, Capability Resolution).
- You need a **simple entrance** (`createAgent`) and a path to production controls later.
- You prefer **provider-independent** contracts (reference + OpenAI today; adapters behind Capability Resolution).
- You can run **Node.js 24** (`>=24 <25` today) and accept an **ESM-first** library.
- You are willing to own **production HTTP authentication** and multi-tenant security integration for internet-facing services.

## When it is not a good fit

- You need a **hosted SaaS** agent product or no-code builder.
- You require **SSE reconnect/replay**, **durable HITL wait**, or **exactly-once** external tool side effects today.
- You need a large **provider catalog** or a mature multi-vendor ecosystem with broad external adoption evidence immediately.
- You need multi-maintainer / foundation-backed governance guarantees.
- You cannot accept a **young ecosystem** (limited public adoption evidence).

---

## Simple Agent API vs advanced platform API

| Path | Use when |
|---|---|
| **Simple** — `createAgent` / `reference` / `openai` / `invoke` / `stream` / `close` | Local apps, CLIs, prototypes, embedded features, learning |
| **Advanced** — `AgentFramework`, Runtime, Composition, Security, Memory, Tools, Evaluation | Production hosts, multi-tenant services, custom policies, recovery, routing |

Start simple. Move to advanced controls when requirements demand them. Advanced APIs are **not** deprecated by the Simple Agent API.

Package: [`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) (current line **1.1.x** — Simple Agent API since **1.1.0**).

---

## Architecture ownership (overview)

- **Runtime** — operational execution, timeout, retry, cancellation, streaming execution
- **Security** — authorization decisions
- **Composition** — instantiation / wiring
- **Capability Resolution** — implementation selection
- **AI Provider** — vendor-neutral normalization
- **Agent Framework** — agent definition, lifecycle, handoff; Simple Agent API assembles these for embedded use

Ownership is documented in blueprints/ADRs for contributors. Evaluators do not need Blueprints to pilot `createAgent`.

---

## Security model

- Simple/embedded `createAgent` uses **application-local** defaults. It is **not** production HTTP authentication.
- Reference host **LocalReference** auth is **development/reference only**.
- Internet-facing multi-tenant apps must authenticate users and integrate production Security.
- Tool calling uses fail-closed approval boundaries; durable HITL wait is not available in the current line.
- Report vulnerabilities via [SECURITY.md](../../SECURITY.md).

---

## Provider independence

- Contracts are vendor-neutral.
- Shipped adapters today: **reference** (deterministic, no network) and **OpenAI**.
- Selection goes through Capability Resolution — not hard-coded vendor SDKs in application contracts.

---

## Failure / recovery guarantees

**What exists**

- Runtime timeout / retry / cancellation ownership
- Checkpoint-oriented recovery paths (opt-in / configured)
- Streaming execution with explicit cancellation
- Tenant isolation tests for the reference composition

**What is not guaranteed**

- Exactly-once external tool side effects
- Durable HITL approval wait/resume
- SSE reconnect / stream replay
- Distributed Runtime leader election / multi-node consensus

---

## Bus-factor / young ecosystem risk

- Single maintainer today: [ameenmari](https://github.com/ameenmari)
- No claimed foundation or company backing
- Stars/forks/downloads are not engineering deliverables; treat social proof as immature
- Plan for dependency risk like any young OSS platform (pin versions, run the verification suite, keep an exit strategy)

---

## Versioning / migration

- Public packages use semver under `@agentprodready/*`
- Prefer **selective** package bumps (not mechanical monorepo version locks after the 1.0.0 baseline)
- Seeing `agent-framework@1.1.x` next to other packages at `1.0.x` is **expected** — see [package compatibility](./package-compatibility.md)
- [CHANGELOG.md](../../CHANGELOG.md) is the canonical release history
- Tags follow `vMAJOR.MINOR.PATCH` for product releases
- See [npm distribution](./npm-distribution.md) and [upgrading](./upgrading.md)

---

## Known limitations (summary)

See also the matrix in the [root README](../../README.md).

- Young ecosystem / limited external adoption evidence
- No official GHCR image yet
- Limited provider catalog
- No SSE reconnect/replay, durable HITL, or exactly-once tool effects
- Embedded Simple Agent ≠ hosted multi-tenant platform

---

## Recommended pilot strategy

1. **Day 0:** `npm install @agentprodready/agent-framework` + `reference()` hello-world.
2. **Day 1:** Add `@agentprodready/ai-provider-openai` + `openai(...)` behind `OPENAI_API_KEY`.
3. **Day 2:** Exercise `stream()` and resource `close()`.
4. **Week 1:** Decide whether advanced Runtime/Security/Composition is required for your host.
5. **Before production:** Replace LocalReference/simple defaults with real auth; run verification suites; read [production deployment](./production-deployment.md) and [security](./security.md).

---

## Verification commands

Run what your pilot needs (CI runs the core set on every push):

```bash
pnpm verify
pnpm verify-versioning
pnpm test:public-dx
pnpm test:tools
pnpm test:routing
pnpm test:tenant-isolation
pnpm test:streaming
```

Postgres / recovery / memory / evaluation / vector suites when those features are in scope:

```bash
pnpm test:postgres
pnpm test:runtime-recovery
pnpm test:memory-persistence
pnpm test:evaluation-persistence
pnpm test:vector-search
```

---

## Next reading

- [Getting Started](./getting-started.md)
- [Simple Agent API](./simple-agent-api.md)
- [ROADMAP.md](../../ROADMAP.md)
- [SECURITY.md](../../SECURITY.md)
- [SUPPORT.md](../../SUPPORT.md)
