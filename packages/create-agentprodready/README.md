# create-agentprodready

Scaffold a small TypeScript AgentProdReady project.

```bash
npm create agentprodready@latest my-agent
cd my-agent
npm install
npm run dev
```

## Options

```bash
npm create agentprodready@latest my-agent -- --template reference
npm create agentprodready@latest my-agent -- --template openai
npm create agentprodready@latest my-agent -- --template openai-compatible
```

Non-interactive default template: `reference` (zero secrets).

## Generated stack

- ESM + TypeScript (`src/index.ts`)
- `tsx` for `npm run dev`
- Public npm dependencies only (`@agentprodready/agent-framework`, optional `@agentprodready/ai-provider-openai`)

Requires Node.js `>=22 <25`.

Part of [AgentProdReady](https://github.com/ameenmari/agentprodready).
