# memory-agent

Simple Memory demos for `@agentprodready/agent-framework`.

**Important:** Memory retrieval/injection is not the same as model intelligence.  
`reference()` verifies wiring; natural-language recall needs a reasoning-capable model.

## A. Wiring / demo path (zero-key)

Uses `reference()` + `memory: true`.

```bash
npm install
npm run start:reference
```

This path proves capture → retrieve → inject via `result.metadata.memory`.  
It does **not** claim that `result.text` answers with `"blue"`.

## B. Natural-language recall path (OpenAI)

Requires `OPENAI_API_KEY` and `@agentprodready/ai-provider-openai`.

```bash
# bash
export OPENAI_API_KEY="..."

# PowerShell
$env:OPENAI_API_KEY="..."

npm install
npm run start:openai
```

This example requires a reasoning-capable model.  
`reference()` verifies wiring but is not intended to demonstrate semantic conversation recall.

No secrets are committed in this example.
