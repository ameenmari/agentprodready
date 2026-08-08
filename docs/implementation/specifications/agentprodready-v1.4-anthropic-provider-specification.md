# Specification — v1.4 Anthropic Provider

## Decisions

- **D1** Package `@agentprodready/ai-provider-anthropic@1.0.0`
- **D2** Implementation id `anthropic-ai` (distinct from `openai-ai` / `openai-compatible-ai`)
- **D3** Credential: `ANTHROPIC_API_KEY` only (never `OPENAI_API_KEY`)
- **D4** Protocol: Anthropic Messages API via `@anthropic-ai/sdk` (pinned), not Chat Completions
- **D5** Simple helper: `anthropic(modelId: string)`
- **D6** Optional peerDep on agent-framework; clear `AGENT_MISSING_ANTHROPIC_*` errors
- **D7** Host: `AI_PROVIDER=anthropic` + seed contribution
- **D8** Tools + streaming required on adapter; embeddings deferred
- **D9** Test seam injectable client (no live key required in CI)

## Acceptance

A1 Adapter execute/stream/health with tools  
A2 Simple createAgent anthropic path  
A3 Missing package/key errors  
A4 Host config accepts anthropic  
A5 Docs + example honest  
A6 Gates green  
