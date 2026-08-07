# AgentProdReady v1.0 — npm Public Distribution & Rename Audit

**Document Version:** 1.0  
**Status:** Review-Gated (no publish performed)  
**Date:** 2026-08-08  
**Mode:** Review-Gated  
**Baseline:** repository at AgentProdReady v1.0.0 (post-rename from AgentForge)

---

## Executive verdict

**CONDITIONAL**

Packaging, rename of live package identity, verify, pack dry-runs, workspace protocol rewrite, and external clean-project consumption from local tarballs are in good shape.

A completely unrelated developer **cannot yet** succeed with:

```bash
npm install @agentprodready/agent-framework
```

because **nothing under `@agentprodready/*` is on the npm registry** (`E404` confirmed). That is the primary blocker. Secondary blockers are npm org/scope ownership and a first gated recursive publish of all 35 public packages at `1.0.0`.

This review did **not** run `npm publish`, create tags, push images, or change package versions.

---

## Final question

> Can a completely unrelated developer, on a clean machine, successfully run `npm install @agentprodready/agent-framework` and build an application without access to our private GitHub repository?

### Answer: **NO**

### Exactly what remains

1. **Claim / own the npm scope** `@agentprodready` (organization or user scope) on npmjs.com.
2. **Authenticate for publish** (granular npm token or trusted publishing) — credentials must **not** live in the repo.
3. **Publish all 35 public `@agentprodready/*` packages at `1.0.0` in one recursive `pnpm` publish** (cycles make partial first publish unsafe).
4. **Confirm registry visibility**: `npm view @agentprodready/agent-framework version` → `1.0.0`.
5. **Re-test from a clean folder** with registry install (not local tarballs).

Until those complete, `npm install` correctly fails with `E404`. GitHub privacy is not the issue; **npm publication** is.

Proven locally in this audit: the same packages **do** install and typecheck when consumed as packed tarballs outside the monorepo (simulating post-publish registry contents).

---

## 1. Rename audit

### Live package / code identity

| Pattern | Content matches (excl. `node_modules` / `.git`) | Classification |
|---|---|---|
| `@agentforge/*` | **0** | none remaining — rename complete for package identity |
| `agentforge` / `AgentForge` (file contents) | **0** | none remaining in file contents |
| Workspace deps still on old scope | **0** | none — all use `@agentprodready/*` + `workspace:*` |

### Remaining `agentforge` **filenames** (content already AgentProdReady)

These paths retain the historical product-slice prefix. **Do not blindly rename** if links / history matter; they are not npm blockers.

| Area | Count (approx.) | Classification |
|---|---|---|
| `docs/implementation/plans/agentforge-v*.md` | 11 | documentation/history only |
| `docs/implementation/specifications/agentforge-v*.md` | 11 | documentation/history only |
| `docs/implementation/reports/agentforge-v*.md` | 11 | documentation/history only |
| `docs/implementation/checklists/agentforge-v*.md` | 11 | documentation/history only |
| `docs/product/agentforge-v*.md` | 10 | documentation/history only |
| `docs/implementation/reviews/agentforge-v1.0-production-readiness-review.md` | 1 | documentation/history only |
| `.cursor/rules/agentforge-implementation.mdc` | 1 | **must rename** (active Cursor rule filename; content already AgentProdReady). Non-blocking for npm. |

### Other identity notes

| Item | Status | Classification |
|---|---|---|
| Root package name `agentprodready` | correct | OK |
| All `packages/*/package.json` names `@agentprodready/*` | correct | OK |
| `apps/platform-host` → `@agentprodready/platform-host` + `private: true` | correct | intentionally private |
| `repository` / `homepage` / `bugs` → `github.com/ameenmari/agentprodready` | present on packages | documentation metadata only; private GitHub does not block npm install once packages are published |
| Root `LICENSE` copyright `ameenmari` | packed into tarballs | OK |
| Historical CHANGELOG entries | use AgentProdReady naming | intentionally retained product history |

No rename **bugs** were found in publishable package identity or import paths.

---

## 2. Package inventory

### Root

| Field | Value |
|---|---|
| name | `agentprodready` |
| version | `1.0.0` |
| private | `true` |
| packageManager | `pnpm@10.15.1` |
| engines.node | `>=24 <25` |

### Private (not for npm library publish)

| Package | Version | private | Notes |
|---|---|---|---|
| `agentprodready` (root) | 1.0.0 | yes | workspace root |
| `@agentprodready/platform-host` | 1.0.0 | yes | reference HTTP/SSE app; Docker track, not npm SDK |

### Public publishable packages (35)

All share unless noted:

- `version`: `1.0.0`
- `private`: absent / false
- `type`: `module`
- `main`: `dist/index.js`
- `types`: `dist/index.d.ts`
- `exports["."]`: `{ types: ./dist/index.d.ts, default: ./dist/index.js }`
- `files`: `dist`, `README.md`, exclusions for `*.spec.*`, `*.map`, `*.tsbuildinfo`  
  — plus `migrations` for `@agentprodready/persistence-postgres` and `@agentprodready/vector-store-pgvector`
- `license`: `MIT`
- `publishConfig.access`: `public` (**all 35**)
- Internal deps: `workspace:*` in git; rewritten to `1.0.0` on pack/publish
- `peerDependencies` / `optionalDependencies`: **none** on any package
- Build output: TypeScript project references → `dist/**/*.js` + `dist/**/*.d.ts`

| Package | Notable non-workspace deps | Extra packed assets |
|---|---|---|
| `@agentprodready/foundation` | `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs` | — |
| `@agentprodready/ai-provider-openai` | `openai@7.4.0` | — |
| `@agentprodready/persistence-postgres` | `pg@8.22.0` | `migrations/` |
| `@agentprodready/vector-store-pgvector` | `pg@8.22.0` | `migrations/` |
| `@agentprodready/memory` | — | packed `devDependencies` still lists `@agentprodready/persistence-postgres@1.0.0` (see findings) |
| All other `@agentprodready/*` | workspace-only or none | — |

Full public set:

1. `@agentprodready/foundation`  
2. `@agentprodready/plugin-framework`  
3. `@agentprodready/composition`  
4. `@agentprodready/runtime`  
5. `@agentprodready/planning`  
6. `@agentprodready/workflow`  
7. `@agentprodready/capability-resolution`  
8. `@agentprodready/ai-provider`  
9. `@agentprodready/ai-provider-openai`  
10. `@agentprodready/tool-framework`  
11. `@agentprodready/knowledge`  
12. `@agentprodready/vector-store`  
13. `@agentprodready/vector-store-pgvector`  
14. `@agentprodready/memory`  
15. `@agentprodready/context-assembly`  
16. `@agentprodready/prompt-builder`  
17. `@agentprodready/evaluation`  
18. `@agentprodready/security`  
19. `@agentprodready/event-bus`  
20. `@agentprodready/audit`  
21. `@agentprodready/agent-framework`  
22. `@agentprodready/multi-agent`  
23. `@agentprodready/human-interaction`  
24. `@agentprodready/plugin-marketplace`  
25. `@agentprodready/observability`  
26. `@agentprodready/configuration`  
27. `@agentprodready/persistence`  
28. `@agentprodready/persistence-postgres`  
29. `@agentprodready/scheduler`  
30. `@agentprodready/api-framework`  
31. `@agentprodready/sdk-framework`  
32. `@agentprodready/cli-framework`  
33. `@agentprodready/deployment-framework`  
34. `@agentprodready/testing-verification`  
35. `@agentprodready/platform-governance`

---

## 3. Dependency graph for `npm install @agentprodready/agent-framework`

### Direct dependencies of `@agentprodready/agent-framework` (17)

`ai-provider`, `audit`, `capability-resolution`, `composition`, `context-assembly`, `evaluation`, `event-bus`, `foundation`, `knowledge`, `memory`, `planning`, `plugin-framework`, `prompt-builder`, `runtime`, `security`, `tool-framework`, `workflow`

### Full transitive `@agentprodready/*` closure (22 packages)

Must all exist on the registry for a clean external install to resolve:

| # | Package |
|---|---|
| 1 | `@agentprodready/agent-framework` |
| 2 | `@agentprodready/ai-provider` |
| 3 | `@agentprodready/audit` |
| 4 | `@agentprodready/capability-resolution` |
| 5 | `@agentprodready/composition` |
| 6 | `@agentprodready/configuration` |
| 7 | `@agentprodready/context-assembly` |
| 8 | `@agentprodready/evaluation` |
| 9 | `@agentprodready/event-bus` |
| 10 | `@agentprodready/foundation` |
| 11 | `@agentprodready/knowledge` |
| 12 | `@agentprodready/memory` |
| 13 | `@agentprodready/observability` |
| 14 | `@agentprodready/persistence` |
| 15 | `@agentprodready/planning` |
| 16 | `@agentprodready/plugin-framework` |
| 17 | `@agentprodready/prompt-builder` |
| 18 | `@agentprodready/runtime` |
| 19 | `@agentprodready/security` |
| 20 | `@agentprodready/tool-framework` |
| 21 | `@agentprodready/vector-store` |
| 22 | `@agentprodready/workflow` |

Also pulled from npm for foundation: NestJS / RxJS stack.

### Cycles (audit detected 11 cycle paths)

Representative cycle:

`security → evaluation → prompt-builder → context-assembly → memory → persistence → (observability|configuration|event-bus|audit) → … → agent-framework → …`

**Implication:** first release cannot safely publish only the 22-package closure one-by-one without the other public packages that participate in cycles / future installs. First release must publish **all 35** public packages at the **same version**.

### Exact publication order (v1.0.0)

Because of cycles, the authoritative procedure is **one recursive publish**, not a hand-maintained single-package ladder:

```bash
pnpm -r --filter ./packages/* publish --access public --no-git-checks
```

(or `pnpm npm:publish` which wraps the above)

Conceptual layering (documentation only; do not stop mid-layer on first release):

1. foundation → plugin-framework → composition → runtime → planning → workflow  
2. capability-resolution → ai-provider → tool-framework → knowledge → vector-store  
3. persistence / observability / configuration / security / event-bus / audit (cyclic cluster — publish together)  
4. memory → context-assembly → prompt-builder → evaluation  
5. agent-framework → multi-agent → human-interaction → plugin-marketplace  
6. scheduler → api-framework → sdk-framework → cli-framework → deployment-framework → testing-verification → platform-governance  
7. adapters: ai-provider-openai, persistence-postgres, vector-store-pgvector  

---

## 4. Workspace protocol handling (proved)

| Check | Result |
|---|---|
| Source `package.json` deps | `workspace:*` |
| `pnpm pack` packed `package.json` | rewritten to concrete `1.0.0` |
| Leftover `workspace:*` across all 35 tarballs | **NONE** |
| Installed external `node_modules/@agentprodready/*/package.json` | **no** `workspace:` |
| `pnpm publish --dry-run` for agent-framework | succeeds as dry-run; warns login required for real publish |

**Rule:** always publish with **pnpm** (`pnpm npm:publish` / `pnpm -r publish`). Do not use raw `npm publish` from package dirs for the first release.

---

## 5. `publishConfig`

| Check | Result |
|---|---|
| All 35 public packages have `"publishConfig": { "access": "public" }` | **PASS** |
| Changes made in this review | **none** (already present; not modified) |

---

## 6. Build / verify / pack results

### Commands run

```bash
pnpm install --frozen-lockfile   # PASS (with CI=true; cyclic workspace deps warning expected)
pnpm verify                      # PASS (lint + boundaries + typecheck + tests + build)
pnpm npm:audit                   # PASS — 35 publishable, 11 cycles noted
pnpm -r --filter ./packages/* exec pnpm pack --pack-destination .npm-pack
pnpm --filter @agentprodready/agent-framework publish --dry-run --access public --no-git-checks
```

### Pack inventory

- **35** tarballs under `.npm-pack/` (gitignored)
- Each contains: `package.json`, `README.md`, `LICENSE` (root MIT auto-included; SHA matches root `LICENSE`), `dist/index.js`, `dist/index.d.ts`, plus package-specific dist modules
- Postgres / pgvector packs include SQL migrations

### Tarball must-not-contain (inspected)

| Forbidden class | Result |
|---|---|
| `.env` / credentials / API keys / `.pem` / `.key` | **NONE** |
| Source maps | **NONE** |
| Spec build artifacts (`*.spec.js` / `*.spec.d.ts`) | **NONE** |
| Local DB files | **NONE** |
| Machine-specific absolute paths in package metadata | **NONE observed** |
| `workspace:*` | **NONE** |

### Tarball must-contain

| Required | Result |
|---|---|
| Compiled JS | PASS |
| `.d.ts` | PASS |
| package metadata | PASS |
| README | PASS |
| LICENSE | PASS (auto from root) |
| Runtime migrations where applicable | PASS |

### Minor pack finding (non-blocking)

`@agentprodready/memory` packed `package.json` still includes rewritten:

```json
"devDependencies": {
  "@agentprodready/persistence-postgres": "1.0.0"
}
```

npm does **not** install a dependency’s `devDependencies` for consumers. Cosmetic / metadata cleanup can wait for a later pass; not a release blocker.

---

## 7. External clean-project installation results

**Location:** temporary project outside the monorepo  
`%TEMP%\agentprodready-external-consume-20260808040358`

**Method:** `npm install` of the 22 packed tarballs in the agent-framework closure (registry unavailable).

| Check | Result |
|---|---|
| Install exit code | 0 |
| `workspace:*` in installed packages | none |
| Node ESM smoke importing `buildAgentDefinition` / `AgentError` | PASS |
| `tsc --noEmit` against `@agentprodready/agent-framework` types | PASS |
| NestJS pulled transitively via foundation | yes (expected from current deps) |

**Registry path today:**

```text
npm view @agentprodready/agent-framework → E404
npm view @agentforge/agent-framework → E404
```

---

## 8. Public API ergonomics recommendation

### Should developers install many low-level packages?

**Short term (v1.0 first publish): yes, but only a small recommended set.**

Recommended developer entry:

```bash
npm install @agentprodready/agent-framework
```

That single command already pulls the 22-package closure. Adding adapters as needed:

```bash
npm install @agentprodready/ai-provider-openai
npm install @agentprodready/persistence-postgres
npm install @agentprodready/vector-store-pgvector
```

### Should a future `@agentprodready/core` facade exist?

**Recommendation: YES — plan for a post-v1.0 facade, do not create it in this pass.**

Reasons:

1. Developers currently face many blueprint packages and cyclic internals they should not need to understand.
2. `@agentprodready/agent-framework` is contracts + lifecycle/handoff — not a batteries-included composition root (`platform-host` is private / Docker).
3. A facade (`@agentprodready/core` or `@agentprodready/sdk`) that re-exports the stable quickstart surface and optionally ships a minimal composition helper would materially improve DX.
4. First publish should still ship the real packages; the facade can be additive without renames.

Until then, document the small install set (already started in `docs/guides/npm-distribution.md`).

---

## 9. npm scope readiness (what you must configure)

Do **not** store npm credentials in the repository.

On [npmjs.com](https://www.npmjs.com/), while logged into the account that will own the packages:

1. **Create organization** `agentprodready` (owns scope `@agentprodready`), **or** confirm the user scope is available and you control it.
2. Ensure your user is an owner/admin of that org.
3. Create a **granular access token**:
   - Packages and scopes: `@agentprodready`
   - Permissions: read and write
   - 2FA / account requirements per current npm policy
4. For GitHub Actions later: add repository secret `NPM_TOKEN` (never commit it).
5. Optionally enable **trusted publishing** (OIDC) for the repo/workflow once the first manual publish has established the packages — current workflow is token-based (`NODE_AUTH_TOKEN`).
6. Confirm package access defaults for the org allow **public** scoped packages (avoid accidental paid-private 402s).

Local preflight:

```bash
npm login
npm whoami
```

This audit did not authenticate and did not request or store credentials.

---

## 10. Recommended eventual release workflow

### A. Manual first publish procedure

1. Confirm npm org/scope ownership (`@agentprodready`).
2. `pnpm install --frozen-lockfile`
3. `pnpm verify`
4. `pnpm npm:audit`
5. `pnpm npm:pack:dry` (or pack all into `.npm-pack/` and inspect)
6. `pnpm npm:publish` **once** (uses `pnpm -r --filter ./packages/* publish --access public --no-git-checks`)
7. `npm view @agentprodready/agent-framework version`
8. From a folder **outside** the monorepo:  
   `npm install @agentprodready/agent-framework@1.0.0` and import smoke test

### B. Dependency-safe publication order

Publish **all 35** public packages at `1.0.0` in one recursive pnpm publish. Do not hand-publish a subset for the first release.

### C. GitHub Actions / publishing strategy

Existing `.github/workflows/release.yml`:

- Always validates on `v*` / dispatch
- Optional `publish-npm` job gated on `publish_npm=true` (dispatch) or `vars.PUBLISH_NPM=true` (tag push)
- Uses `NPM_TOKEN` → `NODE_AUTH_TOKEN`

**Recommendation:**

- First publish: **manual** local `pnpm npm:publish` after dry-run inspection
- Ongoing: Actions gated publish from release tags
- Medium-term: migrate to **npm trusted publishing (OIDC)** to reduce long-lived tokens
- Keep Docker/GHCR as a separate track; do not conflate with npm

### D. Versioning strategy

- Keep **lockstep** `@agentprodready/*` versions for v1.x (already `1.0.0` across packages)
- Root + packages share product version
- Use git tags `vX.Y.Z` for releases; npm versions match
- Avoid independent per-package semver until cycles are reduced and a facade exists

### E. Preventing partial releases

| Risk | Mitigation |
|---|---|
| Package N fails after 1..N-1 published | First release: recursive publish + same version; if failure occurs, finish remaining packages at same version before announcing; do not bump versions mid-stream |
| Consumer installs during half-publish | Announce only after `npm view` confirms the entry package **and** spot-check several cycle members |
| Accidental private scoped publish | `publishConfig.access=public` + `--access public` already set |
| `workspace:*` escape | Only publish via pnpm scripts in this repo |
| Re-publish mistakes | npm does not allow mutating an existing tarball; use `1.0.1` for fixes |

There is no perfect atomic multi-package npm transaction. Operational atomicity = “do not market the release until the full 35-package set is present.”

---

## 11. Security findings

| Finding | Severity | Notes |
|---|---|---|
| No secrets in packed tarballs | OK | inspected |
| No `.env` / credentials / keys in packs | OK | |
| Source maps excluded | OK | |
| `LICENSE` correctly MIT | OK | |
| npm credentials absent from repo | OK | do not add |
| `repository` URLs point at GitHub | Info | fine if repo stays private; npm does not need GitHub access |
| NestJS bundled via `@agentprodready/foundation` | Info | increases consumer dependency surface; not a secret issue |
| LocalReference / production auth remain host concerns | Info | out of scope for library tarballs; covered by production guides |
| Historical filenames still say `agentforge-*` | Low | not a secret; brand consistency only |

---

## Recommended public developer installation command

Minimum:

```bash
npm install @agentprodready/agent-framework
```

Recommended quickstart set (library integrators):

```bash
npm install @agentprodready/agent-framework @agentprodready/runtime @agentprodready/ai-provider @agentprodready/ai-provider-openai @agentprodready/tool-framework @agentprodready/memory
```

Language-agnostic / full reference product path remains Docker/`platform-host` (not npm).

---

## Blockers before npm publication

| # | Blocker | Blocking? |
|---|---|---|
| 1 | `@agentprodready/*` not on registry (`E404`) | **YES** |
| 2 | npm org/scope `@agentprodready` must be owned by publisher | **YES** |
| 3 | Publish auth (token or trusted publishing) configured outside repo | **YES** |
| 4 | First publish must include all 35 public packages at `1.0.0` | **YES** (process) |
| 5 | Rename `.cursor/rules/agentforge-implementation.mdc` | No (npm) |
| 6 | Rename historical `docs/**/agentforge-v*` filenames | No (prefer retain) |
| 7 | Strip memory packed `devDependencies` metadata | No |
| 8 | Future `@agentprodready/core` facade | No (DX follow-up) |
| 9 | README relative doc links inside packages | No (docs UX) |

Non-blockers already green: rename of live package identity, `publishConfig`, pack contents, workspace rewrite, `pnpm verify`, external tarball consumption.

---

## Evidence summary

| Evidence | Result |
|---|---|
| Content search `@agentforge` / `AgentForge` / `agentforge` | 0 matches |
| Filename leftovers `agentforge*` | 56 historical docs + 1 Cursor rule |
| `pnpm verify` | PASS |
| `pnpm npm:audit` | PASS |
| Packed tarballs | 35 |
| `workspace:*` in tarballs | 0 |
| External tarball install + TS | PASS |
| Registry install | FAIL (`E404`) — expected until publish |

---

## Stop condition

Review complete. **No publish. No tags. No Docker image push. No version bumps.**

Await human approval before executing the manual first-publish procedure in §10.A.
