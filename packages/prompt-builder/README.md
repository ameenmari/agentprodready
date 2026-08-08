# `@agentprodready/prompt-builder`

**Prompt package construction contracts — assemble model-facing prompts without owning AI I/O.**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | `npm install @agentprodready/prompt-builder` |
| **Module** | ESM · Node.js `>=22 <25` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

You customize prompt packaging for a host or advanced agent path.

**Prefer not to start here** if `createAgent({ instructions })` is enough for your app.

---

## Install

```bash
npm install @agentprodready/prompt-builder
```

---

## Sample

```ts
import type { PromptBuilder } from '@agentprodready/prompt-builder';

declare const prompts: PromptBuilder;
const pkg = await prompts.build(/* PromptBuildRequest */);
console.log(pkg.id);
```

---

## Ownership

| Owns | Does **not** own |
|---|---|
| Prompt package construction | Calling the model (AI Provider); Runtime execution |

---

## Documentation

- [Blueprint 13](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/13-prompt-builder.md)
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)


## License

MIT © 2026 ameenmari
