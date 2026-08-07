import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootstrapLocalReferenceHost } from './bootstrap-local.js';
import type { LocalReferenceHost } from './bootstrap-local.js';

const authHeader = 'LocalReference principalId=local-user;tenantId=local-tenant';

describe('local reference e2e', () => {
  let host: LocalReferenceHost;
  let baseUrl: string;

  beforeAll(async () => {
    host = await bootstrapLocalReferenceHost({
      host: '127.0.0.1',
      port: 0,
      logLevel: 'error',
      referenceAgentEnabled: true,
      aiProvider: 'reference',
    });
    const address = host.server.address();
    if (address === null || typeof address === 'string') throw new TypeError('Server address unavailable');
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  }, 30_000);

  afterAll(async () => {
    await host.stop();
  });

  async function request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${baseUrl}${path}`, init);
  }

  it('serves GET /health', async () => {
    const response = await request('/health');
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['status']).toBe('ok');
    expect(body['service']).toBe('agentforge-local-reference');
  });

  it('serves GET /ready', async () => {
    const response = await request('/ready');
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['ready']).toBe(true);
  });

  it('invokes reference-agent through the full chain', async () => {
    const response = await request('/v1/agents/reference-agent/invoke', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ objective: 'hello agentforge' }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['status']).toBe('success');
    const result = body['result'] as Record<string, unknown>;
    expect(result['text']).toBe('hello agentforge');
    const evidence = body['evidence'] as Record<string, unknown>;
    expect(evidence['planId']).toMatch(/^plan:/);
    expect(evidence['workflowId']).toBe('reference-workflow');
    expect(evidence['capabilityBindingId']).toMatch(/^binding:/);
    expect(evidence['adapterId']).toBe('reference-ai');
    const execution = body['execution'] as Record<string, unknown>;
    expect(execution['state']).toBe('completed');
  });

  it('records event, audit, and observability evidence', async () => {
    const beforeAudit = (await host.composition.auditPlatform.health()).records;
    const response = await request('/v1/agents/reference-agent/invoke', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Correlation-Id': 'e2e-evidence-correlation',
      },
      body: JSON.stringify({ objective: 'evidence-check' }),
    });
    expect(response.status).toBe(200);
    expect(host.composition.agentFacts.some((fact) => fact.type === 'agent.invocation.accepted')).toBe(true);
    expect((await host.composition.auditPlatform.health()).records).toBeGreaterThan(beforeAudit);
    expect(host.composition.logs.values.length).toBeGreaterThan(0);
    expect(host.composition.memory).toBeDefined();
    expect(host.composition.persistence).toBeDefined();
    expect((await host.composition.eventBus.health()).subscriptions).toBeGreaterThanOrEqual(0);
  });

  it('returns normalized auth failures', async () => {
    const response = await request('/v1/agents/reference-agent/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ objective: 'deny-me' }),
    });
    expect(response.status).toBe(401);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['status']).toBe('failed');
    const errors = body['errors'] as Array<Record<string, unknown>>;
    expect(errors[0]?.['code']).toBe('AUTHENTICATION_FAILED');
  });

  it('returns normalized request failures', async () => {
    const response = await request('/v1/agents/reference-agent/invoke', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ objective: '' }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    const errors = body['errors'] as Array<Record<string, unknown>>;
    expect(errors[0]?.['code']).toBe('REQUEST_INVALID');
  });
});
