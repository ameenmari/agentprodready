# Manual GitHub repository metadata (P0)

Apply these settings in the GitHub UI if `gh` / tokens are unavailable:

**Repository → Settings → General** (or the pencil next to **About** on the repo home page)

| Field | Value |
|---|---|
| Description | `Build an agent in minutes. Add production controls when you need them.` |
| Website / Homepage | `https://github.com/ameenmari/agentprodready#readme` |
| Topics | `ai-agents`, `agent-framework`, `typescript`, `nodejs`, `llm`, `openai`, `ai`, `developer-tools` |

Optional: enable Discussions later (P1/P2) when community questions appear.

Do not invent stars, users, or adoption metrics in the description.

### If you have GitHub CLI locally

```bash
gh repo edit ameenmari/agentprodready \
  --description "Build an agent in minutes. Add production controls when you need them." \
  --homepage "https://github.com/ameenmari/agentprodready#readme" \
  --add-topic ai-agents \
  --add-topic agent-framework \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic llm \
  --add-topic openai \
  --add-topic ai \
  --add-topic developer-tools
```
