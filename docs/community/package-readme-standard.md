# Package README Standard

Every published package under `packages/` must pass `pnpm verify-package-readmes`.

## Required sections

1. **Title** — `# @agentprodready/<name>` or `# create-agentprodready`
2. **Promise** — one bold product sentence (not “Blueprint NN”)
3. **Meta table** — status / install / ESM / license (recommended)
4. **When to use / not use** — especially “prefer `@agentprodready/agent-framework` Simple API”
5. **Install** — `npm install …` + Node `>=22 <25`
6. **Sample** — fenced code developers can copy (or honest host/composition sample)
7. **Owns / does not own** — short table or bullets (architecture truth)
8. **Links** — monorepo README + relevant guide + LICENSE

## Tone

- Honest maturity. No fake adoption.
- Lead with jobs (“run work”, “authorize”, “remember turns”), not blueprint IDs.
- Blueprint links belong at the bottom under Documentation.

## Entry vs platform

| Tier | Packages | Sample style |
|---|---|---|
| Entry | `agent-framework`, `create-agentprodready`, AI peers | Runnable Simple API |
| Core platform | `runtime`, `security`, `memory`, `tool-framework`, `ai-provider` | Contracts + host wiring note |
| Deep / transitive | foundation, composition, workflow, … | Small typed sample + “usually transitive” |

## Visuals

Root README may embed `docs/community/assets/demo.svg` (always) and `demo.gif` (after recording). Package READMEs stay text-first for npm.

## Search metadata

`package.json` `description` and `keywords` feed npm search. Prefer a short honest description plus a **small, role-specific** keyword set.

| Package role | Intent keywords (examples) |
|---|---|
| Entry (`agent-framework`, scaffold) | `ai-agent`, `llm-agent`, `agentic-ai`, `agent-framework`, `production-ai` |
| Providers | vendor name + `llm` + `ai-provider` |
| Memory / knowledge / vectors | `rag`, `memory` / `knowledge`, `vector-search` |
| Multi-agent | `multi-agent`, `ai-agent` |

Avoid dumping every trendy AI term on every package. GitHub repo topics: [manual-actions/github-repository-metadata.md](../implementation/manual-actions/github-repository-metadata.md).
