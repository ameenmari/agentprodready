import type {
  ApiAudit,
  ApiCatalog,
  ApiDiagnostics,
  ApiEvents,
  ApiFact,
  ApiHandler,
  ApiHandlerRegistry,
  ApiRateLimitDecision,
  ApiRateLimiter,
  ApiResponse,
  ApiStream,
  ApiVersionManager,
  RawApiRequest,
  StreamFrame,
  TransportAdapter,
  TransportKind,
} from './index.js';
import { ApiFrameworkError, freeze } from './index.js';
export const referenceCatalog: ApiCatalog = freeze({
  version: '1',
  routes: [
    {
      id: 'health.get',
      method: 'GET',
      pathTemplate: '/v1/health',
      versions: ['1.0', '1.1'],
      requestSchema: { requiredBodyFields: [], maximumBytes: 1024 },
      responseSchemaReference: 'health-response:1',
      streaming: false,
      securityAction: 'read',
      resourceType: 'health',
      deprecatedVersions: ['1.0'],
    },
    {
      id: 'jobs.create',
      method: 'POST',
      pathTemplate: '/v1/jobs',
      versions: ['1.0', '1.1'],
      requestSchema: { requiredBodyFields: ['jobDefinitionReference'], maximumBytes: 4096 },
      responseSchemaReference: 'job-operation-response:1',
      streaming: false,
      securityAction: 'create',
      resourceType: 'job',
      deprecatedVersions: ['1.0'],
    },
    {
      id: 'operations.get',
      method: 'GET',
      pathTemplate: '/v1/operations/:operationId',
      versions: ['1.0', '1.1'],
      requestSchema: { requiredBodyFields: [], maximumBytes: 1024 },
      responseSchemaReference: 'operation-response:1',
      streaming: false,
      securityAction: 'read',
      resourceType: 'operation',
      deprecatedVersions: ['1.0'],
    },
    {
      id: 'streams.get',
      method: 'GET',
      pathTemplate: '/v1/streams/:streamId',
      versions: ['1.0', '1.1'],
      requestSchema: { requiredBodyFields: [], maximumBytes: 1024 },
      responseSchemaReference: 'stream-frame:1',
      streaming: true,
      securityAction: 'read',
      resourceType: 'stream',
      deprecatedVersions: ['1.0'],
    },
  ],
});
export class DeterministicVersionManager implements ApiVersionManager {
  public negotiate(
    requested: string | undefined,
    supported: readonly string[],
  ): Readonly<{ selected: string; deprecated: boolean }> {
    const value = requested ?? supported.at(-1);
    if (value === undefined) throw apiVersion();
    const exact = supported.includes(value)
      ? value
      : !value.includes('.')
        ? supported.filter((item) => item.split('.')[0] === value).at(-1)
        : undefined;
    if (exact === undefined) throw apiVersion();
    return freeze({ selected: exact, deprecated: exact !== supported.at(-1) });
  }
}
export class StaticHandlerRegistry implements ApiHandlerRegistry {
  public constructor(private readonly values: Readonly<Record<string, ApiHandler>>) {}
  public handler(id: string): ApiHandler | undefined {
    return this.values[id];
  }
}
export class InMemoryRateLimiter implements ApiRateLimiter {
  readonly #counts = new Map<string, number>();
  public constructor(
    private readonly limit = 10,
    private readonly policyVersion = '1',
  ) {}
  public consume(key: string, routeId: string, at: string): ApiRateLimitDecision {
    const id = `${key}:${routeId}`,
      count = (this.#counts.get(id) ?? 0) + 1;
    this.#counts.set(id, count);
    return freeze({
      allowed: count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - count),
      resetAt: new Date(Date.parse(at) + 60000).toISOString(),
      policyVersion: this.policyVersion,
    });
  }
}
export class StaticApiStream implements ApiStream {
  public constructor(private readonly values: readonly Omit<StreamFrame, 'streamId'>[]) {}
  public async *frames(streamId: string): AsyncIterable<StreamFrame> {
    for (const value of this.values) yield freeze({ streamId, ...copy(value) });
  }
}
export class ReferenceTransportAdapter implements TransportAdapter {
  public constructor(public readonly kind: TransportKind) {}
  public normalize(input: RawApiRequest): RawApiRequest {
    return freeze({ ...copy(input), transport: this.kind });
  }
  public respond(value: ApiResponse | readonly StreamFrame[]): unknown {
    return copy(value);
  }
}
export class InMemoryApiEvents implements ApiEvents {
  public readonly values: ApiFact[] = [];
  public async publish(value: ApiFact): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryApiAudit implements ApiAudit {
  public readonly values: unknown[] = [];
  public async record(value: Parameters<ApiAudit['record']>[0]): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryApiDiagnostics implements ApiDiagnostics {
  readonly #values: unknown[] = [];
  public record(value: Parameters<ApiDiagnostics['record']>[0]): void {
    this.#values.push(freeze(copy(value)));
  }
  public list(): readonly unknown[] {
    return freeze(copy(this.#values));
  }
}
function apiVersion(): ApiFrameworkError {
  return new ApiFrameworkError(
    {
      code: 'VERSION_UNSUPPORTED',
      message: 'API version is unsupported',
      retryable: false,
      details: {},
    },
    'api:version',
  );
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
