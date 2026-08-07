# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm --filter @agentforge/platform-host deploy --prod --legacy /out \
  && rm -rf /out/src /out/tsconfig.json /out/tsconfig.tsbuildinfo \
  && find /out/node_modules -type d -path '*/@agentforge/*/src' -prune -exec rm -rf {} +

FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    LOG_LEVEL=info \
    REFERENCE_AGENT_ENABLED=true \
    AGENTFORGE_ALLOW_REFERENCE_AUTH=true

LABEL org.opencontainers.image.title="agentforge-platform-host" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.description="AgentForge v1.0 Local Reference Product"

COPY --from=build --chown=node:node /out /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/bootstrap-local.js"]
