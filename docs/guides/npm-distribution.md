# npm Distribution Guide (AgentProdReady)

This guide turns AgentProdReady from a private monorepo into installable public packages:

```bash
npm install @agentprodready/agent-framework
```

GitHub can stay **private**. npm visibility is independent of GitHub visibility.

---

## Registry status

Public packages under `@agentprodready/*` are published to npm. Baseline synchronized release was `1.0.0` (35 packages). Selective bumps followed (for example `@agentprodready/agent-framework@1.1.0` for the Simple Agent API).

```bash
npm install @agentprodready/agent-framework
```

If you still see `E404`, check the package name/scope spelling and that you are not behind a registry mirror that has not synced yet.

### Versioning policy (keep intact)

- Do **not** mechanically bump every package on each release.
- Bump only packages whose production/public surface changed.
- `pnpm npm:publish` skips versions already present on the registry.
- Every GitHub push runs `pnpm verify-versioning` + `pnpm test:public-dx` in CI.
- npm publish happens from release tags / explicit publish — **not** from ordinary commits.

---

## Distribution model

| Channel | Audience | Status |
|---|---|---|
| **npm `@agentprodready/*`** | Node/TypeScript integrators | **Published** @ `1.0.0` |
| **Docker `platform-host`** | Language-agnostic HTTP/SSE consumers | Separate (GHCR) — see production-deployment guide |
| **GitHub source** | Contributors / advanced forks | Available |

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

## Publication order

- **First synchronized baseline** (`1.0.0`): publish all public packages together (dependency cycles).
- **Later selective releases** (example `agent-framework@1.1.0`): bump and publish only changed packages. `pnpm npm:publish` skips already-published versions automatically.

```bash
pnpm build
pnpm verify-versioning
pnpm npm:publish
```

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

## Checklist — public npm distribution

- [x] npm org / scope `@agentprodready` owned
- [x] First recursive publish completed (35 packages @ `1.0.0`)
- [x] Selective DX release path for `@agentprodready/agent-framework@1.1.0`
- [x] Fresh-folder / `pnpm test:public-dx` install succeeds
- [x] On-push CI: `verify-versioning` + `test:public-dx`
- [ ] Granular `NPM_TOKEN` stored as GitHub Actions secret `NPM_TOKEN` (for gated release workflow)
- [ ] Prefer Trusted Publishing / short-lived tokens for future releases
- [ ] Docker / GHCR `platform-host` image (optional separate track)
