import { describe, expect, it } from 'vitest';
import type { ApiResponse, StreamFrame } from '@agentprodready/api-framework';
import {
  HeaderAuthentication,
  ImmediateRetryScheduler,
  InMemorySdkDiagnostics,
  RecordingSdkTransport,
  SdkError,
  StandardSdkSerializer,
  StaticSdkConfiguration,
  StaticStreamingTransport,
  TypeScriptSdkClient,
  validateConfiguration,
  type SdkCancellationSignal,
  type SdkClientDependencies,
  type SdkConfiguration,
  type SdkStreamingTransport,
  type SdkTransportRequest,
} from './index.js';

const timestamp = '2026-08-06T00:00:00.000Z';
class RetryableTestError extends Error {
  public readonly retryable = true;
}
const configuration: SdkConfiguration = {
  endpoint: 'https://api.agentprodready.dev',
  sdkVersion: '0.1.0',
  clientVersion: '1.0.0',
  apiVersion: '1.1',
  timeoutMs: 1_000,
  retry: { maxAttempts: 3, baseDelayMs: 10 },
  metadata: { 'x-application': 'test' },
};
const frames: readonly [StreamFrame, StreamFrame] = [
  {
    streamId: 'stream-1',
    sequence: 0,
    type: 'started',
    payloadReference: 'p:0',
    correlationId: 'correlation-1',
    occurredAt: timestamp,
    terminal: false,
  },
  {
    streamId: 'stream-1',
    sequence: 1,
    type: 'completed',
    payloadReference: 'p:1',
    correlationId: 'correlation-1',
    occurredAt: timestamp,
    terminal: true,
  },
];

function response(result: Readonly<Record<string, unknown>>): ApiResponse {
  return {
    id: 'response-1',
    status: 'success',
    httpStatusHint: 200,
    result,
    errors: [],
    warnings: [],
    metadata: { apiVersion: '1.1', routeId: 'route' },
    diagnosticsReference: 'diagnostic-1',
    correlationId: 'correlation-1',
    causationId: null,
    normalized: true,
  };
}
interface Fixture {
  readonly client: TypeScriptSdkClient;
  readonly transport: RecordingSdkTransport;
  readonly diagnostics: InMemorySdkDiagnostics;
  readonly retries: ImmediateRetryScheduler;
}
function fixture(overrides: Partial<SdkClientDependencies> = {}): Fixture {
  const transport = new RecordingSdkTransport(async (request): Promise<ApiResponse> => {
    if (request.path === '/v1/health') return response({ healthReference: 'health:1' });
    if (request.path === '/v1/jobs')
      return {
        ...response({ operationReference: 'operation:1', accepted: true }),
        status: 'accepted',
      };
    return response({ operationReference: 'operation:1', status: 'pending' });
  });
  const diagnostics = new InMemorySdkDiagnostics(),
    retries = new ImmediateRetryScheduler();
  return {
    client: new TypeScriptSdkClient({
      configuration: new StaticSdkConfiguration(configuration),
      authentication: new HeaderAuthentication(
        async (): Promise<Readonly<Record<string, string>>> => ({
          authorization: 'Bearer ephemeral',
        }),
      ),
      transport,
      streamingTransport: new StaticStreamingTransport(frames),
      serializer: new StandardSdkSerializer(),
      retryScheduler: retries,
      diagnostics,
      identifiers: (): Readonly<{ requestId: string; correlationId: string }> => ({
        requestId: 'request-1',
        correlationId: 'correlation-1',
      }),
      now: (): Date => new Date(timestamp),
      ...overrides,
    }),
    transport,
    diagnostics,
    retries,
  };
}

describe('reference client and API compatibility', () => {
  it('maps equivalent methods to all Blueprint 26 resources', async () => {
    const value = fixture();
    expect(await value.client.health()).toEqual({ healthReference: 'health:1' });
    expect(await value.client.createJob({ jobDefinitionReference: 'job:1' })).toEqual({
      operationReference: 'operation:1',
      accepted: true,
    });
    expect(await value.client.getOperation('operation 1')).toEqual({
      operationReference: 'operation:1',
      status: 'pending',
    });
    expect(value.transport.requests.map((item) => [item.method, item.path])).toEqual([
      ['GET', '/v1/health'],
      ['POST', '/v1/jobs'],
      ['GET', '/v1/operations/operation%201'],
    ]);
  });
  it('standardizes immutable serialization and metadata', async () => {
    const value = fixture();
    await value.client.createJob({ jobDefinitionReference: 'job:1' });
    expect(value.transport.requests[0]).toMatchObject({
      requestedVersion: '1.1',
      timeoutMs: 1000,
      idempotent: false,
      headers: {
        authorization: 'Bearer ephemeral',
        'x-sdk-version': '0.1.0',
        'x-request-id': 'request-1',
      },
      body: { jobDefinitionReference: 'job:1' },
    });
    expect(Object.isFrozen(value.transport.requests[0])).toBe(true);
  });
  it('keeps authentication pluggable and does not retain credentials', async () => {
    let calls = 0;
    const value = fixture({
      authentication: new HeaderAuthentication(
        async (): Promise<Readonly<Record<string, string>>> => {
          calls += 1;
          return { 'x-api-key': `key-${String(calls)}` };
        },
      ),
    });
    await value.client.health();
    await value.client.health();
    expect(value.transport.requests.map((item) => item.headers['x-api-key'])).toEqual([
      'key-1',
      'key-2',
    ]);
    expect(value.client).not.toHaveProperty('credentials');
  });
  it('normalizes authentication acquisition failures', async () => {
    const value = fixture({
      authentication: new HeaderAuthentication((): Promise<Readonly<Record<string, string>>> =>
        Promise.reject(new Error('secret provider')),
      ),
    });
    await expect(value.client.health()).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
      retryable: false,
    });
  });
  it('parses normalized responses and rejects invalid responses', async () => {
    const transport = new RecordingSdkTransport(async (): Promise<ApiResponse> => ({
      ...response({ ok: true }),
      normalized: false as true,
    }));
    await expect(fixture({ transport }).client.health()).rejects.toMatchObject({
      code: 'RESPONSE_INVALID',
    });
  });
  it('maps API and version failures without retrying business outcomes', async () => {
    const transport = new RecordingSdkTransport(async (): Promise<ApiResponse> => ({
      ...response({}),
      status: 'failed',
      result: undefined,
      errors: [
        { code: 'VERSION_UNSUPPORTED', message: 'unsupported', retryable: false, details: {} },
      ],
    }));
    await expect(fixture({ transport }).client.health()).rejects.toMatchObject({
      code: 'UNSUPPORTED_VERSION',
    });
    expect(transport.requests).toHaveLength(1);
  });
});

describe('streaming, retry, configuration, diagnostics, and boundaries', () => {
  it('provides consistent immutable streaming frames', async () => {
    const value = fixture(),
      received: StreamFrame[] = [];
    for await (const frame of value.client.streamOperation('stream-1')) received.push(frame);
    expect(received.map((item) => item.type)).toEqual(['started', 'completed']);
    expect(received.every(Object.isFrozen)).toBe(true);
    expect(value.diagnostics.values.map((item) => item.type)).toEqual([
      'sdk.stream-opened',
      'sdk.stream-closed',
    ]);
  });
  it('normalizes streaming cancellation', async () => {
    const cancellation: { cancelled: boolean } = { cancelled: false };
    const streamingTransport: SdkStreamingTransport = {
      async *open(
        _request: SdkTransportRequest,
        _signal: SdkCancellationSignal,
      ): AsyncIterable<StreamFrame> {
        yield frames[0];
        cancellation.cancelled = true;
        yield frames[1];
      },
    };
    const iterable = fixture({ streamingTransport }).client.streamOperation(
      'stream-1',
      cancellation,
    );
    const iterator = iterable[Symbol.asyncIterator]();
    await iterator.next();
    await expect(iterator.next()).rejects.toMatchObject({ code: 'CANCELLED' });
  });
  it('retries only idempotent retryable transport failures', async () => {
    let attempts = 0;
    const transport = new RecordingSdkTransport(async (): Promise<ApiResponse> => {
      attempts += 1;
      if (attempts < 3) throw new RetryableTestError();
      return response({ healthReference: 'health:1' });
    });
    const value = fixture({ transport });
    await expect(value.client.health()).resolves.toEqual({ healthReference: 'health:1' });
    expect(value.retries.delays).toEqual([10, 20]);
    const postTransport = new RecordingSdkTransport(async (): Promise<ApiResponse> => {
      throw new RetryableTestError();
    });
    await expect(
      fixture({ transport: postTransport }).client.createJob({ jobDefinitionReference: 'job:1' }),
    ).rejects.toMatchObject({ code: 'CONNECTION_FAILED' });
    expect(postTransport.requests).toHaveLength(1);
  });
  it('validates local configuration and API compatibility', () => {
    expect(() => {
      validateConfiguration(configuration);
    }).not.toThrow();
    expect(() => {
      validateConfiguration({ ...configuration, endpoint: 'http://remote.example' });
    }).toThrowError(SdkError);
    expect(() => {
      validateConfiguration({ ...configuration, apiVersion: '2.0' });
    }).toThrowError(SdkError);
  });
  it('emits local diagnostics rather than Platform Events', async () => {
    const value = fixture();
    await value.client.health();
    expect(value.diagnostics.values.map((item) => item.type)).toEqual([
      'sdk.request-started',
      'sdk.request-completed',
    ]);
    expect(value.diagnostics.values[0]).toMatchObject({
      sdkVersion: '0.1.0',
      clientVersion: '1.0.0',
      apiVersion: '1.1',
    });
    expect(value.diagnostics.values[0]).not.toHaveProperty('eventId');
  });
  it('keeps transports replaceable and business execution server-side', async () => {
    const transports = [
      new RecordingSdkTransport(async (): Promise<ApiResponse> =>
        response({ healthReference: 'rest' }),
      ),
      new RecordingSdkTransport(async (): Promise<ApiResponse> =>
        response({ healthReference: 'custom' }),
      ),
    ];
    for (const transport of transports)
      await expect(fixture({ transport }).client.health()).resolves.toHaveProperty(
        'healthReference',
      );
    expect(fixture().client).not.toHaveProperty('runtime');
    expect(fixture().client).not.toHaveProperty('workflow');
  });
});
