import { describe, expect, it } from 'vitest';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';
import { buildLocalReferenceComposition } from './composition/local-reference-composition.js';
import { LOCAL_TENANT, LOCAL_WORKSPACE, LOCAL_PROJECT, REFERENCE_AGENT_ID } from './config/local-reference-config.js';

describe('local reference composition', () => {
  it('builds, seeds reference agent, and reports readiness', async () => {
    const composition = await buildLocalReferenceComposition(
      loadLocalReferenceConfig({ ...process.env, PORT: '3001', HOST: '127.0.0.1' }),
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
      loadLocalReferenceConfig({ ...process.env, PORT: '3002', REFERENCE_AGENT_ENABLED: 'false' }),
    );
    await composition.seed();
    const checks = await composition.healthService.check();
    expect(checks.find((item) => item.name === 'reference-agent')?.status).toBe('unhealthy');
    expect(await composition.readinessService.isReady()).toBe(false);
    await composition.dispose();
  });
});
