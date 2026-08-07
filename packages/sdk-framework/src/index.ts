import type { ApiResponse, StreamFrame } from '@agentforge/api-framework';

export type SdkErrorCode =
  | 'CONFIGURATION_INVALID'
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'SERIALIZATION_FAILED'
  | 'TIMEOUT'
  | 'API_ERROR'
  | 'STREAMING_ERROR'
  | 'UNSUPPORTED_VERSION'
  | 'CANCELLED'
  | 'RESPONSE_INVALID';
export class SdkError extends Error {
  public constructor(
    public readonly code: SdkErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly requestId: string | null = null,
    public readonly correlationId: string | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SdkError';
  }
}
export interface SdkRetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
}
export interface SdkConfiguration {
  readonly endpoint: string;
  readonly sdkVersion: string;
  readonly clientVersion: string;
  readonly apiVersion: string;
  readonly timeoutMs: number;
  readonly retry: SdkRetryPolicy;
  readonly metadata: Readonly<Record<string, string>>;
}
export interface SdkConfigurationSource {
  load(): Promise<SdkConfiguration>;
}
export interface SdkAuthenticationProvider {
  credentials(): Promise<Readonly<Record<string, string>>>;
}
export interface SdkCancellationSignal {
  readonly cancelled: boolean;
}
export interface SdkTransportRequest {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Readonly<Record<string, unknown>> | null;
  readonly requestedVersion: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly timeoutMs: number;
  readonly idempotent: boolean;
}
export interface SdkTransport {
  send(request: SdkTransportRequest): Promise<ApiResponse>;
}
export interface SdkStreamingTransport {
  open(
    request: SdkTransportRequest,
    cancellation: SdkCancellationSignal,
  ): AsyncIterable<StreamFrame>;
}
export interface SdkSerializationInput {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly body: Readonly<Record<string, unknown>> | null;
  readonly credentials: Readonly<Record<string, string>>;
  readonly configuration: SdkConfiguration;
  readonly requestId: string;
  readonly correlationId: string;
  readonly idempotent: boolean;
}
export interface SdkSerializer {
  serialize(input: SdkSerializationInput): SdkTransportRequest;
}
export interface SdkRetryScheduler {
  wait(delayMs: number): Promise<void>;
}
export type SdkDiagnosticType =
  | 'sdk.request-started'
  | 'sdk.request-completed'
  | 'sdk.request-failed'
  | 'sdk.retry-attempted'
  | 'sdk.stream-opened'
  | 'sdk.stream-closed';
export interface SdkDiagnostic {
  readonly type: SdkDiagnosticType;
  readonly requestId: string;
  readonly correlationId: string;
  readonly sdkVersion: string;
  readonly clientVersion: string;
  readonly apiVersion: string;
  readonly latencyMs: number;
  readonly errorCode: SdkErrorCode | null;
  readonly occurredAt: string;
}
export interface SdkDiagnostics {
  record(diagnostic: SdkDiagnostic): void;
}
export interface HealthResult {
  readonly healthReference: string;
}
export interface CreateJobInput {
  readonly jobDefinitionReference: string;
}
export interface CreateJobResult {
  readonly operationReference: string;
  readonly accepted: boolean;
}
export interface OperationResult {
  readonly operationReference: string;
  readonly status: string;
}
export interface SdkClientDependencies {
  readonly configuration: SdkConfigurationSource;
  readonly authentication: SdkAuthenticationProvider;
  readonly transport: SdkTransport;
  readonly streamingTransport: SdkStreamingTransport;
  readonly serializer: SdkSerializer;
  readonly retryScheduler: SdkRetryScheduler;
  readonly diagnostics: SdkDiagnostics;
  readonly identifiers: () => Readonly<{ requestId: string; correlationId: string }>;
  readonly now: () => Date;
}

export class StandardSdkSerializer implements SdkSerializer {
  public serialize(input: SdkSerializationInput): SdkTransportRequest {
    try {
      JSON.stringify(input.body);
    } catch (error: unknown) {
      throw new SdkError(
        'SERIALIZATION_FAILED',
        'Request body is not serializable.',
        false,
        null,
        null,
        { cause: error },
      );
    }
    return freeze({
      method: input.method,
      path: input.path,
      headers: freeze({
        ...input.credentials,
        'x-sdk-version': input.configuration.sdkVersion,
        'x-client-version': input.configuration.clientVersion,
        'x-api-version': input.configuration.apiVersion,
        'x-request-id': input.requestId,
        'x-correlation-id': input.correlationId,
        ...input.configuration.metadata,
      }),
      body: input.body === null ? null : freeze({ ...input.body }),
      requestedVersion: input.configuration.apiVersion,
      requestId: input.requestId,
      correlationId: input.correlationId,
      timeoutMs: input.configuration.timeoutMs,
      idempotent: input.idempotent,
    });
  }
}
interface Prepared {
  readonly request: SdkTransportRequest;
  readonly configuration: SdkConfiguration;
  readonly startedAt: number;
}
export class TypeScriptSdkClient {
  public constructor(private readonly dependencies: SdkClientDependencies) {}
  public health(): Promise<HealthResult> {
    return this.invoke<HealthResult>('GET', '/v1/health', null, true);
  }
  public createJob(input: CreateJobInput): Promise<CreateJobResult> {
    return this.invoke<CreateJobResult>(
      'POST',
      '/v1/jobs',
      { jobDefinitionReference: input.jobDefinitionReference },
      false,
    );
  }
  public getOperation(id: string): Promise<OperationResult> {
    return this.invoke<OperationResult>(
      'GET',
      `/v1/operations/${encodeURIComponent(id)}`,
      null,
      true,
    );
  }
  public async *streamOperation(
    id: string,
    cancellation: SdkCancellationSignal = { cancelled: false },
  ): AsyncIterable<StreamFrame> {
    const context = await this.prepare('GET', `/v1/streams/${encodeURIComponent(id)}`, null, true);
    this.record('sdk.stream-opened', context, 0, null);
    try {
      for await (const frame of this.dependencies.streamingTransport.open(
        context.request,
        cancellation,
      )) {
        if (cancellation.cancelled)
          throw new SdkError(
            'CANCELLED',
            'Streaming was cancelled.',
            false,
            context.request.requestId,
            context.request.correlationId,
          );
        yield freeze({ ...frame });
      }
      this.record('sdk.stream-closed', context, this.elapsed(context.startedAt), null);
    } catch (error: unknown) {
      const normalized = this.normalize(error, 'STREAMING_ERROR', context.request);
      this.record('sdk.stream-closed', context, this.elapsed(context.startedAt), normalized.code);
      throw normalized;
    }
  }
  private async invoke<T extends object>(
    method: 'GET' | 'POST',
    path: string,
    body: Readonly<Record<string, unknown>> | null,
    idempotent: boolean,
  ): Promise<T> {
    const context = await this.prepare(method, path, body, idempotent);
    this.record('sdk.request-started', context, 0, null);
    for (let attempt = 1; attempt <= context.configuration.retry.maxAttempts; attempt += 1) {
      try {
        const response = await this.dependencies.transport.send(context.request),
          result = this.parse(response, context.request) as T;
        this.record('sdk.request-completed', context, this.elapsed(context.startedAt), null);
        return result;
      } catch (error: unknown) {
        const normalized = this.normalize(error, 'CONNECTION_FAILED', context.request),
          retry =
            idempotent && normalized.retryable && attempt < context.configuration.retry.maxAttempts;
        if (!retry) {
          this.record(
            'sdk.request-failed',
            context,
            this.elapsed(context.startedAt),
            normalized.code,
          );
          throw normalized;
        }
        this.record(
          'sdk.retry-attempted',
          context,
          this.elapsed(context.startedAt),
          normalized.code,
        );
        await this.dependencies.retryScheduler.wait(
          context.configuration.retry.baseDelayMs * attempt,
        );
      }
    }
    throw new SdkError('CONNECTION_FAILED', 'Transport attempts exhausted.', false);
  }
  private async prepare(
    method: 'GET' | 'POST',
    path: string,
    body: Readonly<Record<string, unknown>> | null,
    idempotent: boolean,
  ): Promise<Prepared> {
    const configuration = await this.dependencies.configuration.load();
    validateConfiguration(configuration);
    let credentials: Readonly<Record<string, string>>;
    try {
      credentials = await this.dependencies.authentication.credentials();
    } catch (error: unknown) {
      throw new SdkError(
        'AUTHENTICATION_FAILED',
        'Authentication credentials are unavailable.',
        false,
        null,
        null,
        { cause: error },
      );
    }
    const identifiers = this.dependencies.identifiers(),
      request = this.dependencies.serializer.serialize({
        method,
        path,
        body,
        credentials,
        configuration,
        requestId: identifiers.requestId,
        correlationId: identifiers.correlationId,
        idempotent,
      });
    return { request, configuration, startedAt: this.dependencies.now().getTime() };
  }
  private parse(
    response: ApiResponse,
    request: SdkTransportRequest,
  ): Readonly<Record<string, unknown>> {
    if (!(response as Readonly<{ normalized: boolean }>).normalized)
      throw new SdkError(
        'RESPONSE_INVALID',
        'The API response is not normalized.',
        false,
        request.requestId,
        request.correlationId,
      );
    if (response.status === 'failed') {
      const first = response.errors[0];
      throw new SdkError(
        first?.code === 'VERSION_UNSUPPORTED' ? 'UNSUPPORTED_VERSION' : 'API_ERROR',
        first?.message ?? 'The API request failed.',
        false,
        request.requestId,
        request.correlationId,
      );
    }
    if (
      response.result === undefined ||
      response.result === null ||
      typeof response.result !== 'object'
    )
      throw new SdkError(
        'RESPONSE_INVALID',
        'The API response result is invalid.',
        false,
        request.requestId,
        request.correlationId,
      );
    return freeze({ ...response.result });
  }
  private normalize(
    error: unknown,
    fallback: SdkErrorCode,
    request: SdkTransportRequest,
  ): SdkError {
    if (error instanceof SdkError) return error;
    return new SdkError(
      fallback,
      fallback === 'STREAMING_ERROR' ? 'The stream failed.' : 'The transport request failed.',
      isRetryableTransportFailure(error),
      request.requestId,
      request.correlationId,
      { cause: error },
    );
  }
  private record(
    type: SdkDiagnosticType,
    context: Prepared,
    latencyMs: number,
    errorCode: SdkErrorCode | null,
  ): void {
    this.dependencies.diagnostics.record(
      freeze({
        type,
        requestId: context.request.requestId,
        correlationId: context.request.correlationId,
        sdkVersion: context.configuration.sdkVersion,
        clientVersion: context.configuration.clientVersion,
        apiVersion: context.configuration.apiVersion,
        latencyMs,
        errorCode,
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
  }
  private elapsed(startedAt: number): number {
    return Math.max(0, this.dependencies.now().getTime() - startedAt);
  }
}
export function validateConfiguration(configuration: SdkConfiguration): void {
  let endpoint: URL;
  try {
    endpoint = new URL(configuration.endpoint);
  } catch (error: unknown) {
    throw new SdkError('CONFIGURATION_INVALID', 'SDK endpoint is invalid.', false, null, null, {
      cause: error,
    });
  }
  const localHttp =
      endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname),
    versionsValid = [configuration.sdkVersion, configuration.clientVersion].every((value) =>
      /^\d+\.\d+\.\d+$/.test(value),
    );
  if (
    (endpoint.protocol !== 'https:' && !localHttp) ||
    configuration.timeoutMs <= 0 ||
    configuration.retry.maxAttempts < 1 ||
    configuration.retry.baseDelayMs < 0 ||
    !versionsValid
  )
    throw new SdkError('CONFIGURATION_INVALID', 'SDK configuration is invalid.', false);
  if (!/^1(?:\.\d+)?$/.test(configuration.apiVersion))
    throw new SdkError('UNSUPPORTED_VERSION', 'The requested API version is unsupported.', false);
}
export function isRetryableTransportFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'retryable' in error &&
    (error as Readonly<{ retryable: unknown }>).retryable === true
  );
}
function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}
export * from './reference.js';
