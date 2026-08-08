# Plan — v1.5 Simple Diagnostics & Debugging

**Implementation Mode:** Autonomous  
**Product:** [agentprodready-v1.5-simple-diagnostics.md](../../product/agentprodready-v1.5-simple-diagnostics.md)

## Workstreams

| ID | Work |
|---|---|
| W1 | Extend `AgentResultMetadata` + result mapper + platform model/tool context |
| W2 | Embed tool-call summary from tool loop into capability output |
| W3 | Time `invoke` → `durationMs`; unit + tools/memory specs |
| W4 | Guide, example, Simple API / README links, CHANGELOG, ROADMAP |
| W5 | Bump `@agentprodready/agent-framework@1.5.0`, scaffold `0.1.2` |
| W6 | Gates: verify, verify-versioning, public-dx (scaffold-dx as applicable) |

## Versions

| Package | Version |
|---|---|
| `@agentprodready/agent-framework` | **1.5.0** |
| `create-agentprodready` | **0.1.2** (framework pin only) |

Publish/tag only after gates + user deploy authorization (this cycle: authorized).
