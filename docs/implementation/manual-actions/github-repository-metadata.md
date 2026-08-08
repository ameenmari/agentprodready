# Manual GitHub repository metadata

Apply these settings in the GitHub UI if `gh` / tokens are unavailable:

**Repository → Settings → General** (or the pencil next to **About** on the repo home page)

| Field | Value |
|---|---|
| Description | `TypeScript agents you can ship this week — with a clean path to production controls when you need them.` |
| Website / Homepage | `https://github.com/ameenmari/agentprodready#readme` |
| Topics | `ai-agents`, `agent-framework`, `typescript`, `nodejs`, `llm`, `openai`, `ai`, `developer-tools` |

### GitHub Releases (manual — `gh` unavailable on some machines)

Create releases for tags already pushed:

- `v1.3.1` — Developer Adoption Sprint  
- `v1.4.0` — Anthropic provider  

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
  --add-topic agent-framework \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic llm \
  --add-topic openai \
  --add-topic ai \
  --add-topic developer-tools

gh repo edit ameenmari/agentprodready --enable-discussions
```
