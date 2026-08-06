export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';
export type HealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'recovering' | 'unknown';
export interface CorrelationContext {
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly executionReference?: string;
  readonly agentReference?: string;
  readonly workflowReference?: string;
  readonly requestId?: string;
  readonly tenantId: string;
  readonly workspaceId?: string;
}
export interface DiagnosticAuthorization {
  readonly decisionId: string;
  readonly principalId: string;
  readonly operation: 'query' | 'view-health' | 'administer-provider';
  readonly authorized: boolean;
  readonly state: 'active' | 'expired' | 'revoked' | 'superseded';
  readonly tenantId: string;
  readonly workspaceIds: readonly string[];
  readonly maximumClassification: Classification;
  readonly policyVersion: string;
}
export interface OperationalLog {
  readonly id: string;
  readonly timestamp: string;
  readonly severity: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  readonly component: string;
  readonly message: string;
  readonly correlation: CorrelationContext;
  readonly classification: Classification;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly operationalOnly: true;
  readonly systemOfRecord: false;
  readonly auditRecord: false;
}
export interface MetricObservation {
  readonly id: string;
  readonly name: string;
  readonly kind: 'counter' | 'gauge' | 'histogram';
  readonly value: number;
  readonly unit: string;
  readonly timestamp: string;
  readonly component: string;
  readonly correlation: CorrelationContext;
  readonly labels: Readonly<Record<string, string>>;
  readonly aggregatedObservation: true;
}
export interface MetricSeries {
  readonly name: string;
  readonly kind: MetricObservation['kind'];
  readonly unit: string;
  readonly count: number;
  readonly sum: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly latest: number;
  readonly labels: Readonly<Record<string, string>>;
  readonly observedFrom: string;
  readonly observedTo: string;
}
export interface TraceSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly component: string;
  readonly operation: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly status: 'completed' | 'failed';
  readonly correlation: CorrelationContext;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly errorReference?: string;
}
export interface Trace {
  readonly id: string;
  readonly rootSpanId: string;
  readonly spans: readonly TraceSpan[];
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly correlation: CorrelationContext;
  readonly status: 'completed' | 'failed';
  readonly providerIndependent: true;
}
export interface ComponentHealth {
  readonly component: string;
  readonly status: HealthStatus;
  readonly checkedAt: string;
  readonly responseTimeMs: number;
  readonly details: Readonly<Record<string, string | number | boolean>>;
  readonly authorizationImplied: false;
  readonly executionPermissionImplied: false;
}
export interface HealthReport {
  readonly id: string;
  readonly status: HealthStatus;
  readonly components: readonly ComponentHealth[];
  readonly generatedAt: string;
  readonly previousStatus?: HealthStatus;
  readonly operationalReadinessOnly: true;
  readonly authorizationImplied: false;
}
export interface DiagnosticRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly category:
    | 'validation'
    | 'resolution'
    | 'provider'
    | 'dependency'
    | 'performance'
    | 'configuration'
    | 'health'
    | 'unknown';
  readonly component: string;
  readonly code: string;
  readonly summary: string;
  readonly correlation: CorrelationContext;
  readonly classification: Classification;
  readonly evidenceReferences: readonly string[];
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly descriptive: true;
  readonly executionChangeImplied: false;
  readonly recoveryImplied: false;
  readonly authorizationImplied: false;
  readonly auditAuthority: false;
}
export interface DiagnosticQuery {
  readonly id: string;
  readonly authorization: DiagnosticAuthorization;
  readonly tenantId: string;
  readonly workspaceId?: string;
  readonly from: string;
  readonly to: string;
  readonly components: readonly string[];
  readonly categories: readonly DiagnosticRecord['category'][];
  readonly severities: readonly DiagnosticRecord['severity'][];
  readonly correlationIds: readonly string[];
  readonly limit: number;
  readonly cursor?: string;
}
export interface DiagnosticResult {
  readonly queryId: string;
  readonly records: readonly DiagnosticRecord[];
  readonly nextCursor?: string;
  readonly completion: 'complete';
  readonly diagnosticsReference: string;
}
export interface DiagnosticSnapshot {
  readonly id: string;
  readonly generatedAt: string;
  readonly correlation: CorrelationContext;
  readonly logs: readonly OperationalLog[];
  readonly metrics: readonly MetricSeries[];
  readonly traces: readonly Trace[];
  readonly health: HealthReport;
  readonly diagnostics: readonly DiagnosticRecord[];
  readonly operationalOnly: true;
  readonly durableAccountability: false;
}
export interface LoggingProvider {
  write(value: OperationalLog): Promise<void>;
}
export interface MetricsProvider {
  record(value: MetricObservation): Promise<void>;
  series(): readonly MetricSeries[];
}
export interface TracingProvider {
  complete(value: Trace): Promise<void>;
  list(): readonly Trace[];
}
export interface HealthProvider {
  check(correlation: CorrelationContext, at: string): Promise<ComponentHealth>;
}
export interface DiagnosticsProvider {
  record(value: DiagnosticRecord): Promise<void>;
  query(): readonly DiagnosticRecord[];
}
export interface ObservabilityFact {
  readonly type:
    | 'observability.health-changed'
    | 'observability.diagnostic-created'
    | 'observability.trace-completed'
    | 'observability.metrics-published';
  readonly operationId: string;
  readonly component: string;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly outcome: 'completed' | 'failed';
  readonly diagnosticReference: string;
}
export interface ObservabilityEvents {
  publish(value: ObservabilityFact): Promise<void>;
}
export interface GovernanceOperationalAudit {
  record(
    value: Readonly<{
      type: 'observability.provider-administered';
      providerReference: string;
      principalId: string;
      authorizationDecisionId: string;
      occurredAt: string;
      correlationId: string;
    }>,
  ): Promise<void>;
}
export interface ObservabilityPolicy {
  readonly version: string;
  readonly maximumMessageLength: number;
  readonly maximumAttributeCount: number;
  readonly allowedMetricLabelKeys: readonly string[];
  readonly maximumMetricLabelCount: number;
}
export interface ObservabilityDependencies {
  readonly logs: LoggingProvider;
  readonly metrics: MetricsProvider;
  readonly traces: TracingProvider;
  readonly health: readonly HealthProvider[];
  readonly diagnostics: DiagnosticsProvider;
  readonly events: ObservabilityEvents;
  readonly governanceAudit: GovernanceOperationalAudit;
  readonly policy: ObservabilityPolicy;
}
export type ObservabilityErrorCode =
  | 'LOGGING_FAILURE'
  | 'METRICS_FAILURE'
  | 'TRACE_FAILURE'
  | 'HEALTH_FAILURE'
  | 'DIAGNOSTICS_FAILURE'
  | 'PROVIDER_FAILURE'
  | 'OBSERVABILITY_INVALID'
  | 'OBSERVABILITY_UNAUTHORIZED'
  | 'OBSERVABILITY_SCOPE_VIOLATION';
export class ObservabilityError extends Error {
  public constructor(
    public readonly code: ObservabilityErrorCode,
    message: string,
    public readonly diagnosticId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ObservabilityError';
  }
}

export function correlation(value: CorrelationContext): CorrelationContext {
  if (
    blank(value.correlationId) ||
    blank(value.tenantId) ||
    value.causationId === value.correlationId
  )
    throw new ObservabilityError(
      'OBSERVABILITY_INVALID',
      'Correlation context is invalid',
      `observability:correlation:${value.correlationId}`,
    );
  return freeze(copy(value));
}
export class ObservabilityFramework {
  readonly #dependencies: ObservabilityDependencies;
  #previousHealth: HealthStatus | undefined;
  public constructor(dependencies: ObservabilityDependencies) {
    this.#dependencies = dependencies;
  }
  public async log(
    input: Omit<OperationalLog, 'operationalOnly' | 'systemOfRecord' | 'auditRecord'>,
  ): Promise<OperationalLog> {
    const value = freeze({
      ...copy(input),
      message: this.text(input.message),
      correlation: correlation(input.correlation),
      attributes: this.attributes(input.attributes),
      operationalOnly: true as const,
      systemOfRecord: false as const,
      auditRecord: false as const,
    });
    try {
      await this.#dependencies.logs.write(value);
      return value;
    } catch (error) {
      throw this.providerError('LOGGING_FAILURE', value.id, error);
    }
  }
  public async metric(
    input: Omit<MetricObservation, 'aggregatedObservation'>,
  ): Promise<MetricObservation> {
    if (
      !Number.isFinite(input.value) ||
      blank(input.name) ||
      Object.keys(input.labels).length > this.#dependencies.policy.maximumMetricLabelCount ||
      Object.keys(input.labels).some(
        (key) => !this.#dependencies.policy.allowedMetricLabelKeys.includes(key),
      )
    )
      throw new ObservabilityError(
        'OBSERVABILITY_INVALID',
        'Metric observation is invalid',
        `observability:metric:${input.id}`,
      );
    const value = freeze({
      ...copy(input),
      correlation: correlation(input.correlation),
      labels: copy(input.labels),
      aggregatedObservation: true as const,
    });
    try {
      await this.#dependencies.metrics.record(value);
      await this.#dependencies.events.publish(
        this.fact(
          'observability.metrics-published',
          value.id,
          value.component,
          value.correlation,
          value.timestamp,
        ),
      );
      return value;
    } catch (error) {
      throw this.providerError('METRICS_FAILURE', value.id, error);
    }
  }
  public async trace(spans: readonly TraceSpan[]): Promise<Trace> {
    if (spans.length === 0)
      throw new ObservabilityError(
        'OBSERVABILITY_INVALID',
        'Trace requires spans',
        'observability:trace:unknown',
      );
    const normalized = spans
        .map((span) => this.span(span))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.spanId.localeCompare(b.spanId)),
      root = normalized.find((span) => span.parentSpanId === undefined);
    if (
      root === undefined ||
      normalized.some(
        (span) =>
          span.traceId !== root.traceId ||
          span.correlation.correlationId !== root.correlation.correlationId,
      )
    )
      throw new ObservabilityError(
        'OBSERVABILITY_INVALID',
        'Trace correlation is inconsistent',
        `observability:trace:${root?.traceId ?? 'unknown'}`,
      );
    const endedAt =
        normalized
          .map((span) => span.endedAt)
          .sort()
          .at(-1) ?? root.endedAt,
      value = freeze({
        id: root.traceId,
        rootSpanId: root.spanId,
        spans: normalized,
        startedAt: root.startedAt,
        endedAt,
        durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(root.startedAt)),
        correlation: root.correlation,
        status: normalized.some((span) => span.status === 'failed')
          ? ('failed' as const)
          : ('completed' as const),
        providerIndependent: true as const,
      });
    try {
      await this.#dependencies.traces.complete(value);
      await this.#dependencies.events.publish(
        this.fact(
          'observability.trace-completed',
          value.id,
          root.component,
          value.correlation,
          value.endedAt,
          value.status,
        ),
      );
      return value;
    } catch (error) {
      throw this.providerError('TRACE_FAILURE', value.id, error);
    }
  }
  public async health(correlationValue: CorrelationContext, at: string): Promise<HealthReport> {
    const context = correlation(correlationValue);
    let components: readonly ComponentHealth[];
    try {
      components = await Promise.all(
        this.#dependencies.health.map((provider) => provider.check(context, at)),
      );
    } catch (error) {
      throw this.providerError('HEALTH_FAILURE', 'health', error);
    }
    const status = aggregateHealth(components),
      report = freeze({
        id: `health:${context.correlationId}:${at}`,
        status,
        components: components.map(copy),
        generatedAt: at,
        ...(this.#previousHealth === undefined ? {} : { previousStatus: this.#previousHealth }),
        operationalReadinessOnly: true as const,
        authorizationImplied: false as const,
      });
    if (this.#previousHealth !== status)
      await this.#dependencies.events.publish(
        this.fact('observability.health-changed', report.id, 'platform', context, at),
      );
    this.#previousHealth = status;
    return report;
  }
  public async diagnose(
    input: Omit<
      DiagnosticRecord,
      | 'descriptive'
      | 'executionChangeImplied'
      | 'recoveryImplied'
      | 'authorizationImplied'
      | 'auditAuthority'
    >,
  ): Promise<DiagnosticRecord> {
    const value = freeze({
      ...copy(input),
      summary: this.text(input.summary),
      correlation: correlation(input.correlation),
      attributes: this.attributes(input.attributes),
      descriptive: true as const,
      executionChangeImplied: false as const,
      recoveryImplied: false as const,
      authorizationImplied: false as const,
      auditAuthority: false as const,
    });
    try {
      await this.#dependencies.diagnostics.record(value);
      await this.#dependencies.events.publish(
        this.fact(
          'observability.diagnostic-created',
          value.id,
          value.component,
          value.correlation,
          value.timestamp,
          value.severity === 'error' || value.severity === 'critical' ? 'failed' : 'completed',
        ),
      );
      return value;
    } catch (error) {
      throw this.providerError('DIAGNOSTICS_FAILURE', value.id, error);
    }
  }
  public query(request: DiagnosticQuery): DiagnosticResult {
    enforceQuery(request);
    const rank = (value: Classification): number =>
        ['public', 'internal', 'confidential', 'restricted'].indexOf(value),
      values = this.#dependencies.diagnostics
        .query()
        .filter(
          (value) =>
            value.correlation.tenantId === request.tenantId &&
            (request.workspaceId === undefined ||
              value.correlation.workspaceId === request.workspaceId) &&
            rank(value.classification) <= rank(request.authorization.maximumClassification) &&
            Date.parse(value.timestamp) >= Date.parse(request.from) &&
            Date.parse(value.timestamp) <= Date.parse(request.to) &&
            (request.components.length === 0 || request.components.includes(value.component)) &&
            (request.categories.length === 0 || request.categories.includes(value.category)) &&
            (request.severities.length === 0 || request.severities.includes(value.severity)) &&
            (request.correlationIds.length === 0 ||
              request.correlationIds.includes(value.correlation.correlationId)),
        )
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
    const offset = Number.parseInt(request.cursor ?? '0', 10),
      selected = values.slice(offset, offset + request.limit),
      next =
        offset + selected.length < values.length ? String(offset + selected.length) : undefined;
    return freeze({
      queryId: request.id,
      records: selected.map(copy),
      ...(next === undefined ? {} : { nextCursor: next }),
      completion: 'complete',
      diagnosticsReference: `observability:query:${request.id}`,
    });
  }
  public snapshot(
    id: string,
    correlationValue: CorrelationContext,
    health: HealthReport,
    at: string,
  ): DiagnosticSnapshot {
    const context = correlation(correlationValue);
    return freeze({
      id,
      generatedAt: at,
      correlation: context,
      logs: [],
      metrics: this.#dependencies.metrics.series().map(copy),
      traces: this.#dependencies.traces
        .list()
        .filter((value) => value.correlation.correlationId === context.correlationId)
        .map(copy),
      health: copy(health),
      diagnostics: this.#dependencies.diagnostics
        .query()
        .filter((value) => value.correlation.correlationId === context.correlationId)
        .map(copy),
      operationalOnly: true,
      durableAccountability: false,
    });
  }
  public async administerProvider(
    providerReference: string,
    authorization: DiagnosticAuthorization,
    at: string,
    correlationId: string,
  ): Promise<void> {
    if (
      !authorization.authorized ||
      authorization.state !== 'active' ||
      authorization.operation !== 'administer-provider'
    )
      throw new ObservabilityError(
        'OBSERVABILITY_UNAUTHORIZED',
        'Provider administration is unauthorized',
        `observability:provider:${providerReference}`,
      );
    await this.#dependencies.governanceAudit.record({
      type: 'observability.provider-administered',
      providerReference,
      principalId: authorization.principalId,
      authorizationDecisionId: authorization.decisionId,
      occurredAt: at,
      correlationId,
    });
  }
  private span(value: TraceSpan): TraceSpan {
    const started = Date.parse(value.startedAt),
      ended = Date.parse(value.endedAt);
    if (
      !Number.isFinite(started) ||
      !Number.isFinite(ended) ||
      ended < started ||
      value.durationMs !== ended - started
    )
      throw new ObservabilityError(
        'OBSERVABILITY_INVALID',
        'Trace span timing is invalid',
        `observability:span:${value.spanId}`,
      );
    return freeze({
      ...copy(value),
      correlation: correlation(value.correlation),
      attributes: this.attributes(value.attributes),
    });
  }
  private text(value: string): string {
    if (
      blank(value) ||
      value.length > this.#dependencies.policy.maximumMessageLength ||
      secret(value)
    )
      throw new ObservabilityError(
        'OBSERVABILITY_INVALID',
        'Operational text is invalid',
        'observability:text',
      );
    return value;
  }
  private attributes(
    value: Readonly<Record<string, string | number | boolean>>,
  ): Readonly<Record<string, string | number | boolean>> {
    if (
      Object.keys(value).length > this.#dependencies.policy.maximumAttributeCount ||
      Object.entries(value).some(
        ([key, item]) => secret(key) || (typeof item === 'string' && secret(item)),
      )
    )
      throw new ObservabilityError(
        'OBSERVABILITY_INVALID',
        'Operational attributes are invalid',
        'observability:attributes',
      );
    return freeze(copy(value));
  }
  private fact(
    type: ObservabilityFact['type'],
    operationId: string,
    component: string,
    context: CorrelationContext,
    occurredAt: string,
    outcome: ObservabilityFact['outcome'] = 'completed',
  ): ObservabilityFact {
    return freeze({
      type,
      operationId,
      component,
      tenantId: context.tenantId,
      correlationId: context.correlationId,
      occurredAt,
      outcome,
      diagnosticReference: `observability:${operationId}`,
    });
  }
  private providerError(
    code: ObservabilityErrorCode,
    id: string,
    error: unknown,
  ): ObservabilityError {
    return new ObservabilityError(
      code,
      'Observability provider operation failed',
      `observability:${id}`,
      { cause: error },
    );
  }
}

function enforceQuery(request: DiagnosticQuery): void {
  const value = request.authorization;
  if (!value.authorized || value.state !== 'active' || value.operation !== 'query')
    throw new ObservabilityError(
      'OBSERVABILITY_UNAUTHORIZED',
      'Diagnostic query is unauthorized',
      `observability:query:${request.id}`,
    );
  if (
    value.tenantId !== request.tenantId ||
    (request.workspaceId !== undefined && !value.workspaceIds.includes(request.workspaceId))
  )
    throw new ObservabilityError(
      'OBSERVABILITY_SCOPE_VIOLATION',
      'Diagnostic query scope is unauthorized',
      `observability:query:${request.id}`,
    );
  if (
    request.limit < 1 ||
    request.limit > 1000 ||
    Date.parse(request.from) > Date.parse(request.to)
  )
    throw new ObservabilityError(
      'OBSERVABILITY_INVALID',
      'Diagnostic query is invalid',
      `observability:query:${request.id}`,
    );
}
function aggregateHealth(values: readonly ComponentHealth[]): HealthStatus {
  if (values.length === 0) return 'unknown';
  if (values.some((value) => value.status === 'unavailable')) return 'unavailable';
  if (values.some((value) => value.status === 'degraded')) return 'degraded';
  if (values.some((value) => value.status === 'recovering')) return 'recovering';
  if (values.every((value) => value.status === 'healthy')) return 'healthy';
  return 'unknown';
}
function secret(value: string): boolean {
  return /(password|secret|access.?token|api.?key|private.?key|credential)/i.test(value);
}
function blank(value: string): boolean {
  return value.trim() === '';
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
