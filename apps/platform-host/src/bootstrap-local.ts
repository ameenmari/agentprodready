import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';
import { buildLocalReferenceComposition } from './composition/local-reference-composition.js';
import { startLocalReferenceServer, stopLocalReferenceServer } from './http/local-reference-server.js';

export interface LocalReferenceHost {
  readonly composition: Awaited<ReturnType<typeof buildLocalReferenceComposition>>;
  readonly server: Server;
  stop(): Promise<void>;
}

export async function bootstrapLocalReferenceHost(config = loadLocalReferenceConfig()): Promise<LocalReferenceHost> {
  const composition = await buildLocalReferenceComposition(config);
  await composition.seed();
  const server = await startLocalReferenceServer(composition);

  async function stop(): Promise<void> {
    await stopLocalReferenceServer(server);
    await composition.dispose();
  }

  return Object.freeze({ composition, server, stop });
}

export async function bootstrap(): Promise<void> {
  const host = await bootstrapLocalReferenceHost();
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    process.stderr.write(`Received ${signal}, shutting down...\n`);
    await host.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.stderr.write(`AgentForge local reference listening on http://${host.composition.config.host}:${String(host.composition.config.port)}\n`);
}

const entry = process.argv[1];
const modulePath = fileURLToPath(import.meta.url);
if (entry !== undefined && resolve(entry) === modulePath) {
  await bootstrap();
}
