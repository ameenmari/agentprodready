# Manual GitHub repository metadata

Apply these settings in the GitHub UI if `gh` / tokens are unavailable:

**Repository → Settings → General** (or the pencil next to **About** on the repo home page)

| Field | Value |
|---|---|
| Description | `TypeScript agents you can ship this week — with a clean path to production controls when you need them.` |
| Website / Homepage | `https://github.com/ameenmari/agentprodready#readme` |
| Topics | See list below (intent-oriented, no stuffing) |

### Topics (recommended)

Discovery-oriented topics that match what AgentProdReady actually is:

| Topic | Why |
|---|---|
| `ai-agents` | Primary product category |
| `ai-agent` | Common search intent |
| `agentic-ai` | Broader agentic tooling searches |
| `llm-agent` | LLM + agent intent |
| `agent-framework` | Framework positioning |
| `multi-agent` | Multi-agent package / platform capability |
| `typescript` | Language |
| `nodejs` | Runtime |
| `llm` | Model layer |
| `openai` | First-class provider |
| `anthropic` | First-class provider |
| `rag` | Knowledge / memory / vector path |
| `production-ai` | Production-controls positioning |
| `developer-tools` | GitHub classification |

Do **not** add unrelated trendy topics (e.g. random frameworks you do not ship).

### GitHub Releases (manual — `gh` unavailable on some machines)

Create releases for tags already pushed:

- `v1.3.1` — Developer Adoption Sprint  
- `v1.4.0` — Anthropic provider  
- `v1.5.0` — Simple diagnostics  
- `v1.5.1` — Community Gravity package surface  

**Releases → Draft a new release → Choose tag** and paste notes from CHANGELOG.

### Discussions (manual)

1. **Settings → General → Features → Discussions** → enable
2. Suggested categories: **Q&A**, **Ideas**, **Show and tell**
3. Optional: add a contact_link in `.github/ISSUE_TEMPLATE/config.yml` once live

### Labels (manual)

Create labels listed in [docs/community/labels.md](../../community/labels.md) if missing.

Do not invent stars, users, or adoption metrics in the description.

### If you have GitHub CLI locally

```bash
gh repo edit ameenmari/agentprodready \
  --description "TypeScript agents you can ship this week — with a clean path to production controls when you need them." \
  --homepage "https://github.com/ameenmari/agentprodready#readme" \
  --add-topic ai-agents \
  --add-topic ai-agent \
  --add-topic agentic-ai \
  --add-topic llm-agent \
  --add-topic agent-framework \
  --add-topic multi-agent \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic llm \
  --add-topic openai \
  --add-topic anthropic \
  --add-topic rag \
  --add-topic production-ai \
  --add-topic developer-tools

gh repo edit ameenmari/agentprodready --enable-discussions
```

### npm search metadata

Package `description` + `keywords` in `package.json` power npm search. Keep keywords **role-specific** (see [package README standard](../../community/package-readme-standard.md#search-metadata)). New keywords only appear on the registry after the next package publish.
