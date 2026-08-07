# npm Distribution Guide (AgentProdReady)

This guide turns AgentProdReady from a private monorepo into installable public packages:

```bash
npm install @agentprodready/agent-framework
```

GitHub can stay **private**. npm visibility is independent of GitHub visibility.

---

## Why `npm install` fails today (`E404`)

`@agentprodready/*` packages are **not on the npm registry yet**. A private GitHub repo does not publish them automatically. Until the first successful `pnpm publish`, the registry correctly returns 404.

---

## Distribution model

| Channel | Audience | Status |
|---|---|---|
| **npm `@agentprodready/*`** | Node/TypeScript integrators | Ready to configure (not published until you run gated publish) |
| **Docker `platform-host`** | Language-agnostic HTTP/SSE consumers | Separate (GHCR) — see production-deployment guide |
| **GitHub source** | Contributors / advanced forks | Tag `v1.0.0` already exists |

---

## Public SDK surface (recommended)

Developers should usually install a **small set**, not all 31 blueprints:

| Package | Role |
|---|---|
| `@agentprodready/agent-framework` | Agent definition / lifecycle |
| `@agentprodready/runtime` | Execution, cancellation, checkpoints |
| `@agentprodready/ai-provider` | Vendor-neutral AI contracts + reference adapter |
| `@agentprodready/ai-provider-openai` | OpenAI adapter |
| `@agentprodready/tool-framework` | Tool contracts + reference tools |
| `@agentprodready/memory` | Memory engine |
| `@agentprodready/vector-store` / `@agentprodready/vector-store-pgvector` | Vector NN |
| `@agentprodready/security` | Authorization decisions |
| `@agentprodready/persistence` / `@agentprodready/persistence-postgres` | Durability |
| `@agentprodready/evaluation` | Evaluation framework |

Other `@agentprodready/*` packages are still published because of **dependency cycles** and Composition needs — but they are not the “hello world” install list.

`@agentprodready/platform-host` stays **`private: true`** (Docker/app, not an npm library).

---

## Critical monorepo facts

1. Workspace deps use `workspace:*` in git. **Always publish with `pnpm publish`**, never raw `npm publish`, so versions are rewritten to `1.0.0` (etc.).
2. There are **package dependency cycles** (Security ↔ Evaluation ↔ Memory ↔ Persistence ↔ …). First release must publish **all** public packages at the **same version** in one recursive publish.
3. Every package now has `publishConfig.access: "public"`.
4. Packaged files are `dist` + `README.md` (plus `migrations` where applicable). Specs/source maps are excluded.

---

## One-time npm setup (your account `ameenmari78`)

### 1) Claim the `@agentprodready` scope

On [npmjs.com](https://www.npmjs.com/) while logged in as `ameenmari78`:

1. Create an **organization** named `agentprodready` (this owns the `@agentprodready` scope), **or**
2. If the org/name is taken, you must use a different scope (e.g. `@ameenmari`) and rename packages — do **not** publish under a scope you do not own.

Confirm:

```bash
npm login
npm whoami
# should print: ameenmari78
```

### 2) Create a granular access token

npm → Access Tokens → Granular Access Token:

- Permission: **Read and write**
- Packages/scopes: `@agentprodready`
- 2FA / account requirements per current npm policy

For GitHub Actions, add repository secret:

- `NPM_TOKEN` = that token

For local publish, either `npm login` or:

```bash
# PowerShell
$env:NPM_TOKEN="npm_..."
```

### 3) License

Repo now includes root `LICENSE` (MIT) and each package declares `"license": "MIT"`. Change both if you want Apache-2.0 or another license **before** the first publish.

---

## Local dry-run (safe, no upload)

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm npm:audit
pnpm npm:pack:dry
```

Inspect `.npm-pack/*.tgz` (created by dry-run). Confirm:

- compiled `.js` + `.d.ts`
- no `.env` / secrets
- dependencies show concrete versions after `pnpm pack` (not `workspace:*`)

Quick check of rewritten deps:

```bash
# example after pack
tar -tf .npm-pack/agentprodready-agent-framework-1.0.0.tgz | head
```

Or:

```bash
pnpm --filter @agentprodready/agent-framework exec pnpm pack --dry-run
```

---

## First real publish (manual, gated)

Only after dry-run looks correct and `@agentprodready` org/scope is yours:

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm build
pnpm npm:audit
pnpm npm:publish
```

`pnpm npm:publish` runs `scripts/npm-publish.mjs --publish`, which uses:

```bash
pnpm -r --filter ./packages/* publish --access public --no-git-checks
```

Then verify from a **different folder** (not the monorepo):

```bash
npm install @agentprodready/agent-framework@1.0.0
node -e "import('@agentprodready/agent-framework').then(m=>console.log(Object.keys(m).slice(0,10)))"
```

---

## GitHub Actions publish (recommended ongoing)

Workflow: `.github/workflows/release.yml`

- Always: validate on `v*` tags (lint/test/build/docker smoke)
- Optional job `publish-npm`: runs only when:
  - workflow input `publish_npm=true`, **or**
  - repository variable/secret path configured
  - and `NPM_TOKEN` is present

Suggested first release process:

1. Keep GitHub private if you want
2. Add `NPM_TOKEN` secret
3. Create org/scope `@agentprodready`
4. Run local dry-run
5. Either:
   - local `pnpm npm:publish`, or
   - Actions → Release validate → Run workflow → enable `publish_npm`

Do **not** publish from every commit. Publish from release tags / explicit workflow dispatch.

---

## Docker distribution (separate track)

npm does **not** replace Docker. For HTTP/SSE consumers:

```bash
# after you push an image (future)
docker pull ghcr.io/<org-or-user>/agentprodready-platform-host:1.0.0
```

Keep `platform-host` off npm (`private: true`). Publish the image to GHCR when ready.

---

## Publication order (conceptual)

Because of cycles, do **not** manually publish one package at a time for v1.0.0.

Use recursive publish once:

1. foundation, plugin-framework, composition, runtime, planning, workflow, …
2. …through agent-framework and the remaining packages in the same command

`pnpm -r publish` handles the batch. Consumers then install any entry package and npm resolves the graph.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `E404` on install | Never published / wrong name | Publish under owned scope |
| `402` / paid private | Scoped package published without `--access public` | `publishConfig.access=public` + `--access public` |
| `403` | Token/org mismatch | Token must allow `@agentprodready` |
| `workspace:*` in published tarball | Used `npm publish` instead of `pnpm publish` | Always use pnpm scripts in this repo |
| Install works but types missing | `dist` not built / not in `files` | `pnpm build` before publish |

---

## Checklist before first public npm release

- [ ] npm user `ameenmari78` can create/own org `agentprodready`
- [ ] Granular `NPM_TOKEN` created and stored (local + GitHub secret)
- [ ] `pnpm npm:audit` passes
- [ ] `pnpm npm:pack:dry` inspected
- [ ] License accepted (MIT currently)
- [ ] Decide GitHub remains private or goes public (optional)
- [ ] Run `pnpm npm:publish` **once**
- [ ] Confirm `npm view @agentprodready/agent-framework version` → `1.0.0`
- [ ] Fresh-folder `npm install @agentprodready/agent-framework` succeeds
