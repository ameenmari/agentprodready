# Manual GitHub repository metadata (P0)

`gh` CLI and `GH_TOKEN` / `GITHUB_TOKEN` were not available in the agent environment. Apply these settings in the GitHub UI (highest-leverage discoverability fix):

**Repository → Settings → General** (or the pencil next to **About** on the repo home page)

| Field | Value |
|---|---|
| Description | `Build an agent in minutes. Add production controls when you need them.` |
| Website / Homepage | `https://github.com/ameenmari/agentprodready#readme` |
| Topics | `ai-agents`, `typescript`, `nodejs`, `llm`, `openai`, `agent-framework` |

Optional: enable Discussions later (P1/P2) when community questions appear.

Do not invent stars, users, or adoption metrics in the description.

### If you have GitHub CLI locally

```bash
gh repo edit ameenmari/agentprodready \
  --description "Build an agent in minutes. Add production controls when you need them." \
  --homepage "https://github.com/ameenmari/agentprodready#readme" \
  --add-topic ai-agents \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic llm \
  --add-topic openai \
  --add-topic agent-framework
```
