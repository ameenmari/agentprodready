export type ApiMethod = 'GET' | 'POST';
export type TransportKind = 'rest' | 'graphql' | 'grpc' | 'websocket' | 'sse' | 'internal-rpc';
export interface RawApiRequest {
  readonly transport: TransportKind;
  readonly method: ApiMethod;
  readonly path: string;
  readonly requestedVersion?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly authenticationCredentialReference: string;
  readonly remoteReference: string;
}
export interface ApiRoute {
  readonly id: string;
  readonly method: ApiMethod;
  readonly pathTemplate: string;
  readonly versions: readonly string[];
  readonly requestSchema: Readonly<{ requiredBodyFields: readonly string[]; maximumBytes: number }>;
  readonly responseSchemaReference: string;
  readonly streaming: boolean;
  readonly securityAction: string;
  readonly resourceType: string;
  readonly deprecatedVersions: readonly string[];
}
export interface ApiCatalog {
  readonly version: string;
  readonly routes: readonly ApiRoute[];
}
export interface AuthenticationResult {
  readonly authenticated: boolean;
  readonly principalId?: string;
  readonly authenticationContextReference: string;
  readonly strength: 'anonymous' | 'single-factor' | 'multi-factor' | 'hardware-backed';
  readonly expiresAt: string;
}
export interface ApiAuthorizationDecision {
  readonly id: string;
  readonly authorized: boolean;
  readonly state: 'active' | 'expired' | 'revoked' | 'superseded';
  readonly principalId: string;
  readonly action: string;
  readonly resourceId: string;
  readonly tenantId: string;
  readonly visibleFields: readonly string[];
  readonly policyVersion: string;
}
export interface NormalizedApiRequest {
  readonly id: string;
  readonly apiVersion: string;
  readonly routeId: string;
  readonly method: ApiMethod;
  readonly pathParameters: Readonly<Record<string, string>>;
  readonly principalId: string;
  readonly authenticationContextReference: string;
  readonly payload: unknown;
  readonly metadata: Readonly<{ transport: TransportKind; remoteReference: string }>;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly receivedAt: string;
  readonly authorizationDecisionId: string;
  readonly transportIndependent: true;
}
export interface ApiWarning {
  readonly code: string;
  readonly message: string;
}
export interface ApiError {
  readonly code:
    | 'REQUEST_INVALID'
    | 'AUTHENTICATION_FAILED'
    | 'AUTHORIZATION_DENIED'
    | 'VERSION_UNSUPPORTED'
    | 'VALIDATION_FAILED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'RESOURCE_NOT_FOUND'
    | 'INTERNAL_ERROR';
  readonly message: string;
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, string>>;
}
export interface ApiResponse<T = unknown> {
  readonly id: string;
  readonly status: 'success' | 'accepted' | 'failed';
  readonly httpStatusHint: number;
  readonly result?: T;
  readonly errors: readonly ApiError[];
  readonly warnings: readonly ApiWarning[];
  readonly metadata: Readonly<{ apiVersion: string; routeId: string }>;
  readonly diagnosticsReference: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly normalized: true;
}
export interface StreamFrame {
  readonly streamId: string;
  readonly sequence: number;
  readonly type: 'started' | 'progress' | 'incremental' | 'completed' | 'failed';
  readonly payloadReference: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly terminal: boolean;
}
export interface ApiStream {
  frames(streamId: string, request: NormalizedApiRequest): AsyncIterable<StreamFrame>;
}
export interface ApiAuthentication {
  authenticate(credentialReference: string, request: RawApiRequest): Promise<AuthenticationResult>;
}
export interface ApiAuthorization {
  authorize(
    input: Readonly<{
      principalId: string;
      action: string;
      resourceId: string;
      tenantId: string;
      authenticationContextReference: string;
      correlationId: string;
    }>,
  ): Promise<ApiAuthorizationDecision>;
}
export interface ApiHandler {
  handle(request: NormalizedApiRequest): Promise<unknown>;
}
export interface ApiHandlerRegistry {
  handler(routeId: string): ApiHandler | undefined;
}
export interface ApiVersionManager {
  negotiate(
    requested: string | undefined,
    supported: readonly string[],
  ): Readonly<{ selected: string; deprecated: boolean }>;
}
export interface ApiRateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: string;
  readonly policyVersion: string;
}
export interface ApiRateLimiter {
  consume(key: string, routeId: string, at: string): ApiRateLimitDecision;
}
export interface TransportAdapter {
  readonly kind: TransportKind;
  normalize(input: RawApiRequest): RawApiRequest;
  respond(value: ApiResponse | readonly StreamFrame[]): unknown;
}
export interface ApiFact {
  readonly type:
    | 'api.request-received'
    | 'api.request-completed'
    | 'api.request-failed'
    | 'api.streaming-started'
    | 'api.streaming-completed';
  readonly requestId: string;
  readonly routeId: string;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly outcome: 'completed' | 'failed';
  readonly diagnosticsReference: string;
}
export interface ApiEvents {
  publish(value: ApiFact): Promise<void>;
}
export interface ApiAudit {
  record(
    value: Readonly<{
      type: 'api.privileged-operation' | 'api.authentication-failure' | 'api.sensitive-access';
      requestId: string;
      routeId: string;
      principalId: string;
      authorizationDecisionId: string;
      correlationId: string;
    }>,
  ): Promise<void>;
}
export interface ApiDiagnostics {
  record(
    value: Readonly<{
      id: string;
      phase: string;
      outcome: 'completed' | 'failed';
      routeId?: string;
      apiVersion?: string;
      transport: TransportKind;
      errorCode?: ApiError['code'];
    }>,
  ): void;
  list(): readonly unknown[];
}
export class ApiFrameworkError extends Error {
  public constructor(
    public readonly apiError: ApiError,
    public readonly diagnosticId: string,
  ) {
    super(apiError.message);
    this.name = 'ApiFrameworkError';
  }
}
export interface ApiFrameworkDependencies {
  readonly catalog: ApiCatalog;
  readonly authentication: ApiAuthentication;
  readonly authorization: ApiAuthorization;
  readonly handlers: ApiHandlerRegistry;
  readonly versions: ApiVersionManager;
  readonly rateLimits: ApiRateLimiter;
  readonly stream: ApiStream;
  readonly events: ApiEvents;
  readonly audit: ApiAudit;
  readonly diagnostics: ApiDiagnostics;
  readonly now?: () => Date;
}
export class ApiFramework {
  public constructor(private readonly dependencies: ApiFrameworkDependencies) {}
  public async handle(raw: RawApiRequest): Promise<ApiResponse> {
    const id = raw.headers['x-request-id'] ?? `request:${raw.method}:${raw.path}`,
      correlationId = raw.headers['x-correlation-id'] ?? id,
      causationId = raw.headers['x-causation-id'] ?? null;
    try {
      const match = route(this.dependencies.catalog, raw.method, raw.path);
      if (match === undefined) throw failure('RESOURCE_NOT_FOUND', 'API route not found', id);
      const version = this.dependencies.versions.negotiate(
          raw.requestedVersion,
          match.route.versions,
        ),
        authentication = await this.dependencies.authentication.authenticate(
          raw.authenticationCredentialReference,
          raw,
        );
      if (!authentication.authenticated || authentication.principalId === undefined)
        throw failure('AUTHENTICATION_FAILED', 'Authentication failed', id);
      validate(raw, match.route, id);
      const tenantId = raw.headers['x-tenant-id'];
      if (tenantId === undefined || tenantId.trim() === '')
        throw failure('REQUEST_INVALID', 'Tenant header is required', id);
      const decision = await this.dependencies.authorization.authorize({
        principalId: authentication.principalId,
        action: match.route.securityAction,
        resourceId: match.route.id,
        tenantId,
        authenticationContextReference: authentication.authenticationContextReference,
        correlationId,
      });
      if (
        !decision.authorized ||
        decision.state !== 'active' ||
        decision.principalId !== authentication.principalId ||
        decision.tenantId !== tenantId
      )
        throw failure('AUTHORIZATION_DENIED', 'Authorization denied', id);
      const limit = this.dependencies.rateLimits.consume(
        `${tenantId}:${authentication.principalId}`,
        match.route.id,
        (this.dependencies.now?.() ?? new Date()).toISOString(),
      );
      if (!limit.allowed)
        throw failure('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', id, { resetAt: limit.resetAt });
      const normalized: NormalizedApiRequest = freeze({
        id,
        apiVersion: version.selected,
        routeId: match.route.id,
        method: raw.method,
        pathParameters: match.parameters,
        principalId: authentication.principalId,
        authenticationContextReference: authentication.authenticationContextReference,
        payload: copy(raw.body ?? {}),
        metadata: { transport: raw.transport, remoteReference: raw.remoteReference },
        tenantId,
        correlationId,
        causationId,
        receivedAt: (this.dependencies.now?.() ?? new Date()).toISOString(),
        authorizationDecisionId: decision.id,
        transportIndependent: true,
      });
      await this.dependencies.events.publish(fact('api.request-received', normalized, 'completed'));
      const handler = this.dependencies.handlers.handler(match.route.id);
      if (handler === undefined) throw failure('RESOURCE_NOT_FOUND', 'API handler not found', id);
      const result = filter(await handler.handle(normalized), decision.visibleFields),
        response = freeze({
          id: `response:${id}`,
          status: match.route.id === 'jobs.create' ? ('accepted' as const) : ('success' as const),
          httpStatusHint: match.route.id === 'jobs.create' ? 202 : 200,
          result,
          errors: [],
          warnings: version.deprecated
            ? [{ code: 'API_VERSION_DEPRECATED', message: 'Requested API version is deprecated' }]
            : [],
          metadata: { apiVersion: version.selected, routeId: match.route.id },
          diagnosticsReference: `api:${id}`,
          correlationId,
          causationId,
          normalized: true as const,
        });
      await this.dependencies.events.publish(
        fact('api.request-completed', normalized, 'completed'),
      );
      this.dependencies.diagnostics.record({
        id: `api:${id}`,
        phase: 'complete',
        outcome: 'completed',
        routeId: match.route.id,
        apiVersion: version.selected,
        transport: raw.transport,
      });
      if (match.route.securityAction === 'admin')
        await this.dependencies.audit.record({
          type: 'api.privileged-operation',
          requestId: id,
          routeId: match.route.id,
          principalId: authentication.principalId,
          authorizationDecisionId: decision.id,
          correlationId,
        });
      return response;
    } catch (error) {
      const normalized =
        error instanceof ApiFrameworkError
          ? error
          : failure('INTERNAL_ERROR', 'Internal API failure', id);
      this.dependencies.diagnostics.record({
        id: normalized.diagnosticId,
        phase: 'request',
        outcome: 'failed',
        transport: raw.transport,
        errorCode: normalized.apiError.code,
      });
      return freeze({
        id: `response:${id}`,
        status: 'failed',
        httpStatusHint: status(normalized.apiError.code),
        errors: [normalized.apiError],
        warnings: [],
        metadata: { apiVersion: raw.requestedVersion ?? 'unknown', routeId: 'unresolved' },
        diagnosticsReference: normalized.diagnosticId,
        correlationId,
        causationId,
        normalized: true,
      });
    }
  }
  public async streaming(raw: RawApiRequest): Promise<readonly StreamFrame[]> {
    const response = await this.handle(raw);
    if (response.status === 'failed')
      throw new ApiFrameworkError(
        response.errors[0] ?? error('INTERNAL_ERROR', 'Stream failed'),
        response.diagnosticsReference,
      );
    const requestId = raw.headers['x-request-id'] ?? `request:${raw.method}:${raw.path}`,
      match = route(this.dependencies.catalog, raw.method, raw.path);
    if (match === undefined || !match.route.streaming)
      throw failure('REQUEST_INVALID', 'Route is not streaming', requestId);
    const frames: StreamFrame[] = [];
    for await (const frame of this.dependencies.stream.frames(
      match.parameters.streamId ?? requestId,
      {
        id: requestId,
        apiVersion: response.metadata.apiVersion,
        routeId: match.route.id,
        method: raw.method,
        pathParameters: match.parameters,
        principalId: 'authorized',
        authenticationContextReference: 'authenticated',
        payload: copy(raw.body ?? {}),
        metadata: { transport: raw.transport, remoteReference: raw.remoteReference },
        tenantId: raw.headers['x-tenant-id'] ?? '',
        correlationId: response.correlationId,
        causationId: response.causationId,
        receivedAt: (this.dependencies.now?.() ?? new Date()).toISOString(),
        authorizationDecisionId: 'enforced-by-handle',
        transportIndependent: true,
      },
    ))
      frames.push(freeze(copy(frame)));
    return freeze(frames);
  }
}
function route(
  catalog: ApiCatalog,
  method: ApiMethod,
  path: string,
): Readonly<{ route: ApiRoute; parameters: Readonly<Record<string, string>> }> | undefined {
  for (const candidate of catalog.routes) {
    if (candidate.method !== method) continue;
    const expected = candidate.pathTemplate.split('/'),
      actual = path.split('/');
    if (expected.length !== actual.length) continue;
    const parameters: Record<string, string> = {};
    if (
      expected.every((part, index) =>
        part.startsWith(':')
          ? ((parameters[part.slice(1)] = actual[index] ?? ''), true)
          : part === actual[index],
      )
    )
      return { route: candidate, parameters };
  }
  return undefined;
}
function validate(raw: RawApiRequest, routeValue: ApiRoute, id: string): void {
  const encoded = new TextEncoder().encode(JSON.stringify(raw.body ?? {})).byteLength;
  if (encoded > routeValue.requestSchema.maximumBytes)
    throw failure('REQUEST_INVALID', 'Request is too large', id);
  const body =
    typeof raw.body === 'object' && raw.body !== null ? (raw.body as Record<string, unknown>) : {};
  if (routeValue.requestSchema.requiredBodyFields.some((field) => body[field] === undefined))
    throw failure('VALIDATION_FAILED', 'Required request field is missing', id);
}
function filter(value: unknown, fields: readonly string[]): unknown {
  if (fields.length === 0 || typeof value !== 'object' || value === null || Array.isArray(value))
    return copy(value);
  return Object.fromEntries(Object.entries(value).filter(([key]) => fields.includes(key)));
}
function fact(
  type: ApiFact['type'],
  request: NormalizedApiRequest,
  outcome: ApiFact['outcome'],
): ApiFact {
  return {
    type,
    requestId: request.id,
    routeId: request.routeId,
    tenantId: request.tenantId,
    correlationId: request.correlationId,
    outcome,
    diagnosticsReference: `api:${request.id}`,
  };
}
function error(
  code: ApiError['code'],
  message: string,
  details: Readonly<Record<string, string>> = {},
): ApiError {
  return freeze({
    code,
    message,
    retryable: code === 'RATE_LIMIT_EXCEEDED' || code === 'INTERNAL_ERROR',
    details,
  });
}
function failure(
  code: ApiError['code'],
  message: string,
  id: string,
  details: Readonly<Record<string, string>> = {},
): ApiFrameworkError {
  return new ApiFrameworkError(error(code, message, details), `api:${id}`);
}
function status(code: ApiError['code']): number {
  return {
    REQUEST_INVALID: 400,
    AUTHENTICATION_FAILED: 401,
    AUTHORIZATION_DENIED: 403,
    VERSION_UNSUPPORTED: 406,
    VALIDATION_FAILED: 422,
    RATE_LIMIT_EXCEEDED: 429,
    RESOURCE_NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  }[code];
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export * from './reference.js';
