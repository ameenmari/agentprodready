# AgentProdReady — 60–90 Second Demo Script

**Purpose:** Shareable proof for README GIF, GitHub social preview, X/Twitter, LinkedIn, Reddit/HN.  
**Rule:** Do not fabricate adoption, logos, or “used by” claims. Show a real local workflow.

**Status:** Script + reproducible workflow ready. Root README already embeds `docs/community/assets/demo.svg`. Recording `demo.gif` / MP4 is an **adoption artifact** — drop the file beside the SVG and uncomment the GIF embed in the root README.

---

## Target length

**60–90 seconds.** Prefer 75s. Cut ruthlessly.

## Story beat sheet

| T | Visual | Narration / on-screen text |
|---|---|---|
| 0–5s | Empty folder + terminal | “TypeScript agent in an existing Node app — this weekend.” |
| 5–15s | `npm create agentprodready@latest demo-agent` *(or `npm i @agentprodready/agent-framework` fallback)* | First install barrier gone |
| 15–25s | Open `src/index.ts` — `createAgent` + `openai`/`reference` | Normal application code |
| 25–40s | Add `tool({ name, description, execute })` | One useful tool |
| 40–55s | `npm run dev` / `node` — `invoke` result prints | First success |
| 55–70s | Show `stream` loop outputting tokens | First wow |
| 70–85s | Change model helper to `openaiCompatible({ baseUrl, model })` or swap `openai(...)` | Provider flexibility without rewrite |
| 85–90s | End card | Promise + maturity line + github.com/ameenmari/agentprodready |

### Fallback if scaffold not published yet

Use Getting Started path:

```bash
mkdir demo && cd demo && npm init -y
npm pkg set type=module
npm install @agentprodready/agent-framework
```

Still show createAgent → tool → invoke → stream → provider swap.

### Zero-key recording path (recommended for reproducibility)

Use `reference()` + `USE_TOOL:...` trigger for tools so the GIF never needs `OPENAI_API_KEY`. Caption: “Reference provider for the demo — swap to OpenAI in one line.”

---

## On-screen code (keep tiny)

```ts
import { createAgent, reference, tool } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: reference(),
  instructions: "You help with city facts.",
  tools: [
    tool({
      name: "city_info",
      description: "Return a short fact for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
        additionalProperties: false,
      },
      execute: async ({ city }) => ({ fact: `${city}: demo fact` }),
    }),
  ],
});

const result = await agent.invoke("USE_TOOL:city_info:{\"city\":\"Paris\"}");
console.log(result.text);
await agent.close();
```

Then cut to a 5-line `stream` snippet and a 3-line `openaiCompatible` swap.

---

## Easiest reproducible recording workflow

**Do not build a video subsystem.**

### Recommended (Windows / macOS / Linux)

1. **Terminal:** high-contrast theme, font ≥16px, 100×30 window  
2. **Editor:** VS Code / Cursor, hide sidebar, Zen mode  
3. **Record:**
   - **OBS Studio** → 1280×720 → MP4, or  
   - **asciinema** + `agg` → GIF for README  
4. **Edit:** Cut dead air; max 90s; export GIF ≤ ~8–12 MB for GitHub README  
5. **Store:** `docs/community/assets/demo.gif` (or `docs/media/demo.gif`) + link from README  
6. **Caption file:** keep this script as the source of truth; update timestamps if cuts change

### Checklist before recording

- [ ] Node version matches claimed engines  
- [ ] No secrets on screen  
- [ ] `node_modules` install pre-warmed **or** show abbreviated install  
- [ ] Deterministic reference output practiced twice  
- [ ] End card uses approved promise + maturity wording only  

### Distribution cutdowns

| Channel | Cut |
|---|---|
| README GIF | Full 60–90s or first 45s (install→invoke) |
| X/Twitter | 15–30s: invoke + stream + one-line provider swap |
| LinkedIn | Full with text post from content plan |
| HN/Reddit | Link repo + GIF; no hype adjectives |

---

## Claims forbidden in the video

- “Production-proven at scale”  
- “Enterprise-ready out of the box”  
- “Supports all providers”  
- Fake user counts or logos  

Allowed: “Production-oriented architecture with a young ecosystem.”
