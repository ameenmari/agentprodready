import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertProductionAuthPolicy,
  loadLocalReferenceConfig,
  type LocalReferenceConfig,
} from './config/local-reference-config.js';
import { mergeLocalReferenceConfig } from './config/merge-local-reference-config.js';
import { buildLocalReferenceComposition } from './composition/local-reference-composition.js';
import { startLocalReferenceServer, stopLocalReferenceServer } from './http/local-reference-server.js';

export interface LocalReferenceHost {
  readonly composition: Awaited<ReturnType<typeof buildLocalReferenceComposition>>;
  readonly server: Server;
  stop(): Promise<void>;
}

function isCompleteLocalReferenceConfig(
  config: LocalReferenceConfig | Parameters<typeof mergeLocalReferenceConfig>[0],
): config is LocalReferenceConfig {
  return (
    'aiRoutingMode' in config &&
    'shutdownTimeoutMs' in config &&
    'maxJsonBodyBytes' in config &&
    'allowReferenceAuth' in config
  );
}

export async function bootstrapLocalReferenceHost(
  config: LocalReferenceConfig | Parameters<typeof mergeLocalReferenceConfig>[0] = loadLocalReferenceConfig(),
): Promise<LocalReferenceHost> {
  const resolved = isCompleteLocalReferenceConfig(config)
    ? config
    : mergeLocalReferenceConfig(config);
  assertProductionAuthPolicy(resolved);
  const composition = await buildLocalReferenceComposition(resolved);
  await composition.seed();
  const server = await startLocalReferenceServer(composition);

  let stopping = false;
  async function stop(): Promise<void> {
    if (stopping) return;
    stopping = true;
    const timeout = resolved.shutdownTimeoutMs;
    await Promise.race([
      stopLocalReferenceServer(server),
      new Promise<void>((resolveStop) => {
        setTimeout(resolveStop, timeout);
      }),
    ]);
    await composition.dispose();
  }

  return Object.freeze({ composition, server, stop });
}

export async function bootstrap(): Promise<void> {
  const host = await bootstrapLocalReferenceHost();
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`Received ${signal}, shutting down...\n`);
    await host.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.stderr.write(
    `AgentProdReady local reference listening on http://${host.composition.config.host}:${String(host.composition.config.port)}\n`,
  );
}

const entry = process.argv[1];
const modulePath = fileURLToPath(import.meta.url);
if (entry !== undefined && resolve(entry) === modulePath) {
  await bootstrap();
}
