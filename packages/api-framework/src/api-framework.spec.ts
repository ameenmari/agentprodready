import { describe, expect, it } from 'vitest';
import {
  ApiFramework,
  DeterministicVersionManager,
  InMemoryApiAudit,
  InMemoryApiDiagnostics,
  InMemoryApiEvents,
  InMemoryRateLimiter,
  ReferenceTransportAdapter,
  referenceCatalog,
  StaticApiStream,
  StaticHandlerRegistry,
  type ApiAuthentication,
  type ApiAuthorization,
  type ApiFrameworkDependencies,
  type RawApiRequest,
} from './index.js';
const at = '2026-08-06T00:00:00.000Z';
function raw(overrides: Partial<RawApiRequest> = {}): RawApiRequest {
  return {
    transport: 'rest',
    method: 'GET',
    path: '/v1/health',
    headers: {
      'x-request-id': 'request-1',
      'x-correlation-id': 'correlation-1',
      'x-tenant-id': 'tenant-1',
    },
    authenticationCredentialReference: 'credential:1',
    remoteReference: 'remote:1',
    ...overrides,
  };
}
interface Fixture {
  readonly framework: ApiFramework;
  readonly events: InMemoryApiEvents;
  readonly audit: InMemoryApiAudit;
  readonly diagnostics: InMemoryApiDiagnostics;
}

function fixture(overrides: Partial<ApiFrameworkDependencies> = {}): Fixture {
  const authentication: ApiAuthentication = {
      authenticate: async () => ({
        authenticated: true,
        principalId: 'principal-1',
        authenticationContextReference: 'authn:1',
        strength: 'multi-factor',
        expiresAt: '2026-08-07T00:00:00.000Z',
      }),
    },
    authorization: ApiAuthorization = {
      authorize: async (input) => ({
        id: 'decision-1',
        authorized: true,
        state: 'active',
        principalId: input.principalId,
        action: input.action,
        resourceId: input.resourceId,
        tenantId: input.tenantId,
        visibleFields: [],
        policyVersion: '1',
      }),
    },
    events = new InMemoryApiEvents(),
    audit = new InMemoryApiAudit(),
    diagnostics = new InMemoryApiDiagnostics(),
    handlers = new StaticHandlerRegistry({
      'health.get': {
        handle: async (): Promise<Readonly<Record<string, unknown>>> => ({
          healthReference: 'health:1',
          secret: 'hidden',
        }),
      },
      'jobs.create': {
        handle: async (): Promise<Readonly<Record<string, unknown>>> => ({
          operationReference: 'operation:1',
          accepted: true,
        }),
      },
      'operations.get': {
        handle: async (request): Promise<Readonly<Record<string, unknown>>> => ({
          operationReference: request.pathParameters.operationId,
          status: 'pending',
        }),
      },
      'streams.get': {
        handle: async (): Promise<Readonly<Record<string, unknown>>> => ({
          streamReference: 'stream:1',
        }),
      },
    }),
    stream = new StaticApiStream([
      {
        sequence: 0,
        type: 'started',
        payloadReference: 'payload:0',
        correlationId: 'correlation-1',
        occurredAt: at,
        terminal: false,
      },
      {
        sequence: 1,
        type: 'completed',
        payloadReference: 'payload:1',
        correlationId: 'correlation-1',
        occurredAt: at,
        terminal: true,
      },
    ]);
  return {
    framework: new ApiFramework({
      catalog: referenceCatalog,
      authentication,
      authorization,
      handlers,
      versions: new DeterministicVersionManager(),
      rateLimits: new InMemoryRateLimiter(),
      stream,
      events,
      audit,
      diagnostics,
      now: (): Date => new Date(at),
      ...overrides,
    }),
    events,
    audit,
    diagnostics,
  };
}
describe('normalization, versions, security, and responses', () => {
  it('normalizes transport-independent requests and responses', async () => {
    const value = fixture(),
      response = await value.framework.handle(raw());
    expect(response).toMatchObject({
      status: 'success',
      normalized: true,
      result: { healthReference: 'health:1', secret: 'hidden' },
      metadata: { apiVersion: '1.1', routeId: 'health.get' },
    });
  });
  it('validates route schemas and request size', async () => {
    const value = fixture();
    expect(
      await value.framework.handle(raw({ method: 'POST', path: '/v1/jobs', body: {} })),
    ).toMatchObject({ status: 'failed', errors: [{ code: 'VALIDATION_FAILED' }] });
    expect(
      (
        await value.framework.handle(
          raw({
            method: 'POST',
            path: '/v1/jobs',
            body: { jobDefinitionReference: 'x'.repeat(5000) },
          }),
        )
      ).errors[0]?.code,
    ).toBe('REQUEST_INVALID');
  });
  it('negotiates latest minor deterministically and rejects unsupported major', async () => {
    const value = fixture();
    expect((await value.framework.handle(raw({ requestedVersion: '1' }))).metadata.apiVersion).toBe(
      '1.1',
    );
    expect((await value.framework.handle(raw({ requestedVersion: '2' }))).errors[0]?.code).toBe(
      'VERSION_UNSUPPORTED',
    );
  });
  it('keeps authentication identity separate from Security authorization', async () => {
    const denied = fixture({
      authorization: {
        authorize: async (input) => ({
          id: 'deny',
          authorized: false,
          state: 'active',
          principalId: input.principalId,
          action: input.action,
          resourceId: input.resourceId,
          tenantId: input.tenantId,
          visibleFields: [],
          policyVersion: '1',
        }),
      },
    });
    expect((await denied.framework.handle(raw())).errors[0]?.code).toBe('AUTHORIZATION_DENIED');
    const unauthenticated = fixture({
      authentication: {
        authenticate: async () => ({
          authenticated: false,
          authenticationContextReference: 'none',
          strength: 'anonymous',
          expiresAt: at,
        }),
      },
    });
    expect((await unauthenticated.framework.handle(raw())).errors[0]?.code).toBe(
      'AUTHENTICATION_FAILED',
    );
  });
  it('enforces Security response visibility filtering', async () => {
    const value = fixture({
      authorization: {
        authorize: async (input) => ({
          id: 'permit',
          authorized: true,
          state: 'active',
          principalId: input.principalId,
          action: input.action,
          resourceId: input.resourceId,
          tenantId: input.tenantId,
          visibleFields: ['healthReference'],
          policyVersion: '1',
        }),
      },
    });
    expect((await value.framework.handle(raw())).result).toEqual({ healthReference: 'health:1' });
  });
  it('normalizes missing resources and internal failures', async () => {
    const value = fixture();
    expect((await value.framework.handle(raw({ path: '/v1/missing' }))).errors[0]?.code).toBe(
      'RESOURCE_NOT_FOUND',
    );
    const failed = fixture({
      handlers: new StaticHandlerRegistry({
        'health.get': {
          handle: (): Promise<Readonly<Record<string, unknown>>> =>
            Promise.reject(new Error('provider')),
        },
      }),
    });
    expect((await failed.framework.handle(raw())).errors[0]?.code).toBe('INTERNAL_ERROR');
  });
});
describe('streaming, rate limits, events, audit, and transports', () => {
  it('standardizes immutable ordered streaming frames', async () => {
    const frames = await fixture().framework.streaming(raw({ path: '/v1/streams/stream-1' }));
    expect(frames.map((item) => item.type)).toEqual(['started', 'completed']);
    expect(frames[1]).toMatchObject({ sequence: 1, terminal: true, streamId: 'stream-1' });
    expect(Object.isFrozen(frames)).toBe(true);
  });
  it('applies configuration-driven normalized rate limits', async () => {
    const value = fixture({ rateLimits: new InMemoryRateLimiter(1) });
    expect((await value.framework.handle(raw())).status).toBe('success');
    expect((await value.framework.handle(raw())).errors[0]).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
    });
  });
  it('publishes request lifecycle facts without transporting them', async () => {
    const value = fixture();
    await value.framework.handle(raw());
    expect(value.events.values.map((item) => item.type)).toEqual([
      'api.request-received',
      'api.request-completed',
    ]);
    expect(value.diagnostics.list()).toHaveLength(1);
  });
  it('offers governance Audit references only for privileged routes', async () => {
    const catalog = {
        ...referenceCatalog,
        routes: referenceCatalog.routes.map((item) =>
          item.id === 'health.get' ? { ...item, securityAction: 'admin' } : item,
        ),
      },
      value = fixture({ catalog });
    await value.framework.handle(raw());
    expect(value.audit.values).toHaveLength(1);
  });
  it('keeps REST, GraphQL, WebSocket, and SSE adapters replaceable', () => {
    for (const kind of ['rest', 'graphql', 'websocket', 'sse'] as const) {
      const adapter = new ReferenceTransportAdapter(kind),
        normalized = adapter.normalize(raw());
      expect(normalized.transport).toBe(kind);
      expect(
        adapter.respond({
          id: 'r',
          status: 'success',
          httpStatusHint: 200,
          errors: [],
          warnings: [],
          metadata: { apiVersion: '1.1', routeId: 'health.get' },
          diagnosticsReference: 'd',
          correlationId: 'c',
          causationId: null,
          normalized: true,
        }),
      ).toBeDefined();
    }
  });
  it('delegates domain work and contains no Runtime or Workflow execution outcome', async () => {
    const response = await fixture().framework.handle(
      raw({ method: 'POST', path: '/v1/jobs', body: { jobDefinitionReference: 'job:1' } }),
    );
    expect(response).toMatchObject({
      status: 'accepted',
      result: { operationReference: 'operation:1', accepted: true },
    });
    expect(response).not.toHaveProperty('executionContext');
    expect(response).not.toHaveProperty('workflowState');
  });
});
