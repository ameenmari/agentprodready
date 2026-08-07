import { describe, expect, it } from 'vitest';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';
import { buildLocalReferenceComposition } from './composition/local-reference-composition.js';
import { LOCAL_TENANT, LOCAL_WORKSPACE, LOCAL_PROJECT, REFERENCE_AGENT_ID } from './config/local-reference-config.js';

describe('local reference composition', () => {
  it('builds, seeds reference agent, and reports readiness', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig({
        ...process.env,
        PORT: '3001',
        HOST: '127.0.0.1',
        PERSISTENCE_PROVIDER: 'in-memory',
      }),
    );
    await composition.seed();
    expect(await composition.readinessService.isReady()).toBe(true);
    const definition = composition.agentRegistry.definition(REFERENCE_AGENT_ID, '1.0.0', {
      tenantId: LOCAL_TENANT,
      workspaceId: LOCAL_WORKSPACE,
      projectId: LOCAL_PROJECT,
    });
    expect(definition?.agentId).toBe(REFERENCE_AGENT_ID);
    await composition.dispose();
  });

  it('marks readiness false when reference agent seeding is disabled', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig({
        ...process.env,
        PORT: '3002',
        REFERENCE_AGENT_ENABLED: 'false',
        PERSISTENCE_PROVIDER: 'in-memory',
      }),
    );
    await composition.seed();
    const checks = await composition.healthService.check();
    expect(checks.find((item) => item.name === 'reference-agent')?.status).toBe('unhealthy');
    expect(await composition.readinessService.isReady()).toBe(false);
    await composition.dispose();
  });

  it('defaults AI_PROVIDER to reference and requires OpenAI key in openai mode', () => {
    const config = loadLocalReferenceConfig({ PORT: '3000' });
    expect(config.aiProvider).toBe('reference');
    expect(config.openAi).toBeUndefined();
    expect(config.persistenceProvider).toBe('in-memory');
    expect(config.runtimeRecoveryEnabled).toBe(false);
    expect(config.memoryProvider).toBe('in-memory');
    expect(() => loadLocalReferenceConfig({ PORT: '3000', AI_PROVIDER: 'openai' })).toThrow(/OPENAI_API_KEY/);
    const openAi = loadLocalReferenceConfig({
      PORT: '3000',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test',
    });
    expect(openAi.aiProvider).toBe('openai');
    expect(openAi.openAi?.model).toBe('gpt-5');
  });

  it('requires PostgreSQL config when PERSISTENCE_PROVIDER=postgres', () => {
    expect(() =>
      loadLocalReferenceConfig({ PORT: '3000', PERSISTENCE_PROVIDER: 'postgres' }),
    ).toThrow(/DATABASE_URL/);
    const postgres = loadLocalReferenceConfig({
      PORT: '3000',
      PERSISTENCE_PROVIDER: 'postgres',
      DATABASE_URL: 'postgres://agentforge:agentforge@127.0.0.1:5432/agentforge',
    });
    expect(postgres.persistenceProvider).toBe('postgres');
    expect(postgres.postgres?.poolMax).toBe(10);
  });
});
