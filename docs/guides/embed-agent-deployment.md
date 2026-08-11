# Embed an agent in a Node service (deployment recipe)

Answer: **“How do I ship this somewhere?”** for the Simple Agent path.

This is a **recipe**, not a Kubernetes platform and not a distributed Runtime.

Production-oriented architecture with a young ecosystem.

---

## Target shape

```text
Your Node HTTP service
  → createAgent(...) in-process
  → environment variables for providers
  → Docker image (optional)
  → /health + /ready (your routes)
  → graceful shutdown
  → production auth you supply
```

For the composed **platform-host** operator path (Postgres, recovery flags, host probes), see [production-deployment.md](./production-deployment.md).

---

## 1. Node service sketch

```js
import http from "node:http";
import { createAgent, openai } from "@agentprodready/agent-framework";

const agent = createAgent({
  model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
  instructions: "You help with short operational questions.",
});

let ready = true;

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (req.url === "/ready") {
    res.writeHead(ready ? 200 : 503).end(ready ? "ready" : "not-ready");
    return;
  }
  // Authenticate HERE before invoking the agent on user input.
  res.writeHead(404).end("not found");
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, process.env.HOST ?? "0.0.0.0");

async function shutdown(signal) {
  console.log(`shutdown on ${signal}`);
  ready = false;
  server.close();
  await agent.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
```

### Environment

| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | For `openai()` |
| `OPENAI_COMPATIBLE_*` | For `openaiCompatible()` — never reuse OpenAI key silently |
| `HOST` / `PORT` | Bind `0.0.0.0` in containers |
| `NODE_ENV=production` | Standard Node practice |

The library does **not** load `.env` files.

---

## 2. Docker (optional)

Minimal pattern:

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
```

Rules:

- Do **not** bake API keys into the image
- Prefer orchestration readiness on `/ready`
- Run as non-root when possible

No Kubernetes manifests are required for this recipe.

---

## 3. Health / readiness / shutdown

| Probe | Meaning |
|---|---|
| `/health` | Process alive |
| `/ready` | Safe to send traffic (flip false during shutdown) |

On `SIGTERM` / `SIGINT`: stop accepting → drain briefly → `agent.close()` → exit.

For platform-host defaults (`SHUTDOWN_TIMEOUT_MS`, contributor readiness), see [production-deployment.md](./production-deployment.md).

---

## 4. Production authentication (mandatory for public HTTP)

- Simple/embedded `createAgent` is **not** production HTTP auth
- Authenticate and authorize **in your service** before calling `invoke` / `stream`
- Do not expose LocalReference host auth on the internet
- Details: [security.md](./security.md)

AgentProdReady does not ship a fake “production auth middleware” for demos.

---

## 5. What this recipe does **not** include

- Kubernetes operators
- Distributed / multi-node Runtime
- Multi-region failover
- Exactly-once external tool effects for **non-idempotent** tools
- Hosted SaaS control plane

Durable Simple Memory, HITL, and stream replay are available on the embedded `createAgent` path — see [durable-memory.md](./durable-memory.md), [hitl-approval.md](./hitl-approval.md), [stream-replay.md](./stream-replay.md).

---

## Next

- [production-deployment.md](./production-deployment.md) — operator host
- [adopting-agentprodready.md](./adopting-agentprodready.md) — graduation
- [why-agentprodready.md](./why-agentprodready.md) — positioning
- Example wow path: [`examples/backend-agent`](../../examples/backend-agent)
