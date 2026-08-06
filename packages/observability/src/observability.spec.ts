import { describe, expect, it } from 'vitest';
import {
  BasicHealthProvider,
  ConsoleLoggingProvider,
  correlation,
  InMemoryDiagnosticsProvider,
  InMemoryGovernanceOperationalAudit,
  InMemoryLoggingProvider,
  InMemoryMetricsProvider,
  InMemoryObservabilityEvents,
  InMemoryTracingProvider,
  ObservabilityError,
  ObservabilityFramework,
  type CorrelationContext,
  type DiagnosticAuthorization,
  type ObservabilityDependencies,
  type TraceSpan,
} from './index.js';

const at = '2026-08-06T00:00:00.000Z',
  context: CorrelationContext = {
    correlationId: 'correlation-1',
    causationId: 'cause-1',
    executionReference: 'execution-1',
    agentReference: 'agent:1',
    workflowReference: 'workflow:1',
    requestId: 'request-1',
    tenantId: 'tenant-1',
    workspaceId: 'workspace-1',
  },
  policy = {
    version: '1',
    maximumMessageLength: 256,
    maximumAttributeCount: 8,
    allowedMetricLabelKeys: ['component', 'outcome'],
    maximumMetricLabelCount: 2,
  };
function authorization(overrides: Partial<DiagnosticAuthorization> = {}): DiagnosticAuthorization {
  return {
    decisionId: 'decision:query',
    principalId: 'operator-1',
    operation: 'query',
    authorized: true,
    state: 'active',
    tenantId: 'tenant-1',
    workspaceIds: ['workspace-1'],
    maximumClassification: 'restricted',
    policyVersion: '1',
    ...overrides,
  };
}
interface Fixture {
  readonly framework: ObservabilityFramework;
  readonly logs: InMemoryLoggingProvider;
  readonly metrics: InMemoryMetricsProvider;
  readonly traces: InMemoryTracingProvider;
  readonly health: BasicHealthProvider;
  readonly diagnostics: InMemoryDiagnosticsProvider;
  readonly events: InMemoryObservabilityEvents;
  readonly audit: InMemoryGovernanceOperationalAudit;
}
function fixture(overrides: Partial<ObservabilityDependencies> = {}): Fixture {
  const logs = new InMemoryLoggingProvider(),
    metrics = new InMemoryMetricsProvider(),
    traces = new InMemoryTracingProvider(),
    health = new BasicHealthProvider('runtime'),
    diagnostics = new InMemoryDiagnosticsProvider(),
    events = new InMemoryObservabilityEvents(),
    audit = new InMemoryGovernanceOperationalAudit();
  return {
    framework: new ObservabilityFramework({
      logs,
      metrics,
      traces,
      health: [health],
      diagnostics,
      events,
      governanceAudit: audit,
      policy,
      ...overrides,
    }),
    logs,
    metrics,
    traces,
    health,
    diagnostics,
    events,
    audit,
  };
}
function span(overrides: Partial<TraceSpan> = {}): TraceSpan {
  return {
    traceId: 'trace-1',
    spanId: 'span-1',
    component: 'runtime',
    operation: 'execute',
    startedAt: at,
    endedAt: '2026-08-06T00:00:00.025Z',
    durationMs: 25,
    status: 'completed',
    correlation: context,
    attributes: { outcome: 'completed' },
    ...overrides,
  };
}

describe('standardized operational artifacts and correlation', () => {
  it('normalizes immutable operational logs without becoming audit history', async () => {
    const value = fixture(),
      log = await value.framework.log({
        id: 'log-1',
        timestamp: at,
        severity: 'info',
        component: 'runtime',
        message: 'Execution accepted',
        correlation: context,
        classification: 'internal',
        attributes: { attempt: 1 },
      });
    expect(log).toMatchObject({ operationalOnly: true, systemOfRecord: false, auditRecord: false });
    expect(Object.isFrozen(log.correlation)).toBe(true);
    expect(value.logs.values).toHaveLength(1);
    expect(value.audit.values).toHaveLength(0);
  });
  it('rejects secret-like and unbounded log data', async () => {
    const value = fixture();
    await expect(
      value.framework.log({
        id: 'log-1',
        timestamp: at,
        severity: 'info',
        component: 'runtime',
        message: 'apiKey exposed',
        correlation: context,
        classification: 'internal',
        attributes: {},
      }),
    ).rejects.toThrowError(ObservabilityError);
    await expect(
      value.framework.log({
        id: 'log-2',
        timestamp: at,
        severity: 'info',
        component: 'runtime',
        message: 'valid',
        correlation: context,
        classification: 'internal',
        attributes: { password: 'value' },
      }),
    ).rejects.toThrow();
  });
  it('collects deterministic aggregated metrics with bounded labels', async () => {
    const value = fixture();
    for (const [id, amount] of [
      ['metric-1', 10],
      ['metric-2', 20],
    ] as const)
      await value.framework.metric({
        id,
        name: 'runtime.latency',
        kind: 'histogram',
        value: amount,
        unit: 'ms',
        timestamp: at,
        component: 'runtime',
        correlation: context,
        labels: { component: 'runtime' },
      });
    expect(value.metrics.series()[0]).toMatchObject({
      count: 2,
      sum: 30,
      minimum: 10,
      maximum: 20,
      latest: 20,
    });
    await expect(
      value.framework.metric({
        id: 'bad',
        name: 'bad',
        kind: 'gauge',
        value: 1,
        unit: 'count',
        timestamp: at,
        component: 'x',
        correlation: context,
        labels: { tenant: 'unbounded' },
      }),
    ).rejects.toThrow();
  });
  it('creates provider-independent completed traces with deterministic timing', async () => {
    const value = fixture(),
      trace = await value.framework.trace([
        span(),
        span({
          spanId: 'span-2',
          parentSpanId: 'span-1',
          startedAt: '2026-08-06T00:00:00.005Z',
          endedAt: '2026-08-06T00:00:00.020Z',
          durationMs: 15,
        }),
      ]);
    expect(trace).toMatchObject({
      rootSpanId: 'span-1',
      durationMs: 25,
      status: 'completed',
      providerIndependent: true,
    });
    expect(value.traces.list()).toHaveLength(1);
  });
  it('rejects inconsistent trace timing and correlation', async () => {
    const value = fixture();
    await expect(value.framework.trace([span({ durationMs: 99 })])).rejects.toThrowError(/timing/);
    await expect(
      value.framework.trace([
        span(),
        span({
          spanId: 'span-2',
          parentSpanId: 'span-1',
          correlation: { ...context, correlationId: 'other' },
        }),
      ]),
    ).rejects.toThrowError(/correlation/);
  });
  it('preserves complete correlation across logs, metrics, traces, and diagnostics', async () => {
    const value = fixture();
    const log = await value.framework.log({
        id: 'log',
        timestamp: at,
        severity: 'info',
        component: 'x',
        message: 'message',
        correlation: context,
        classification: 'internal',
        attributes: {},
      }),
      diagnostic = await value.framework.diagnose({
        id: 'diagnostic',
        timestamp: at,
        severity: 'warning',
        category: 'performance',
        component: 'x',
        code: 'SLOW',
        summary: 'Slow operation',
        correlation: context,
        classification: 'internal',
        evidenceReferences: ['trace-1'],
        attributes: { duration: 25 },
      });
    expect(log.correlation).toEqual(context);
    expect(diagnostic.correlation).toEqual(context);
    expect(correlation(context)).toEqual(context);
  });
});

describe('health, diagnostics, providers, events, and boundaries', () => {
  it('aggregates health transitions and publishes only status changes', async () => {
    const value = fixture();
    const first = await value.framework.health(context, at);
    await value.framework.health(context, '2026-08-06T00:01:00.000Z');
    value.health.set('degraded', 4);
    const changed = await value.framework.health(context, '2026-08-06T00:02:00.000Z');
    expect(first).toMatchObject({
      status: 'healthy',
      operationalReadinessOnly: true,
      authorizationImplied: false,
    });
    expect(changed).toMatchObject({ status: 'degraded', previousStatus: 'healthy' });
    expect(
      value.events.values.filter((item) => item.type === 'observability.health-changed'),
    ).toHaveLength(2);
  });
  it('keeps diagnostics descriptive and unable to execute, recover, or authorize', async () => {
    const value = fixture(),
      record = await value.framework.diagnose({
        id: 'diagnostic-1',
        timestamp: at,
        severity: 'error',
        category: 'provider',
        component: 'ai-provider',
        code: 'PROVIDER_TIMEOUT',
        summary: 'Provider response unavailable',
        correlation: context,
        classification: 'confidential',
        evidenceReferences: ['trace-1'],
        attributes: { latency: 500 },
      });
    expect(record).toMatchObject({
      descriptive: true,
      executionChangeImplied: false,
      recoveryImplied: false,
      authorizationImplied: false,
      auditAuthority: false,
    });
  });
  it('enforces supplied Security authority and scope for diagnostic queries', async () => {
    const value = fixture();
    await value.framework.diagnose({
      id: 'd',
      timestamp: at,
      severity: 'info',
      category: 'health',
      component: 'runtime',
      code: 'OK',
      summary: 'Ready',
      correlation: context,
      classification: 'internal',
      evidenceReferences: [],
      attributes: {},
    });
    const result = value.framework.query({
      id: 'query',
      authorization: authorization(),
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      from: at,
      to: at,
      components: [],
      categories: [],
      severities: [],
      correlationIds: [],
      limit: 10,
    });
    expect(result.records).toHaveLength(1);
    expect(() =>
      value.framework.query({
        id: 'denied',
        authorization: authorization({ authorized: false }),
        tenantId: 'tenant-1',
        from: at,
        to: at,
        components: [],
        categories: [],
        severities: [],
        correlationIds: [],
        limit: 10,
      }),
    ).toThrowError(/unauthorized/);
  });
  it('supports replaceable providers including a normalized console sink', async () => {
    const values: string[] = [],
      framework = new ObservabilityFramework({
        ...fixture(),
        logs: new ConsoleLoggingProvider((item) => values.push(item)),
        health: [],
        policy,
      } as unknown as ObservabilityDependencies);
    await framework.log({
      id: 'console',
      timestamp: at,
      severity: 'info',
      component: 'test',
      message: 'Normalized',
      correlation: context,
      classification: 'public',
      attributes: {},
    });
    expect(JSON.parse(values[0] ?? '{}')).toMatchObject({ id: 'console', operationalOnly: true });
  });
  it('publishes diagnostic, metric, trace, and health facts without routing events', async () => {
    const value = fixture();
    await value.framework.metric({
      id: 'm',
      name: 'count',
      kind: 'counter',
      value: 1,
      unit: 'count',
      timestamp: at,
      component: 'runtime',
      correlation: context,
      labels: {},
    });
    await value.framework.trace([span()]);
    await value.framework.diagnose({
      id: 'd',
      timestamp: at,
      severity: 'info',
      category: 'health',
      component: 'runtime',
      code: 'OK',
      summary: 'Ready',
      correlation: context,
      classification: 'public',
      evidenceReferences: [],
      attributes: {},
    });
    await value.framework.health(context, at);
    expect(value.events.values.map((item) => item.type)).toEqual([
      'observability.metrics-published',
      'observability.trace-completed',
      'observability.diagnostic-created',
      'observability.health-changed',
    ]);
  });
  it('creates operational snapshots that explicitly exclude durable accountability', async () => {
    const value = fixture();
    await value.framework.trace([span()]);
    const health = await value.framework.health(context, at),
      snapshot = value.framework.snapshot('snapshot-1', context, health, at);
    expect(snapshot).toMatchObject({ operationalOnly: true, durableAccountability: false });
    expect(snapshot.traces).toHaveLength(1);
  });
  it('normalizes provider failures without leaking vendor exception types', async () => {
    class VendorError extends Error {}
    const value = fixture({
      logs: { write: () => Promise.reject(new VendorError('vendor details')) },
    });
    await expect(
      value.framework.log({
        id: 'failure',
        timestamp: at,
        severity: 'error',
        component: 'provider',
        message: 'Provider failed',
        correlation: context,
        classification: 'internal',
        attributes: {},
      }),
    ).rejects.toMatchObject({
      code: 'LOGGING_FAILURE',
      message: 'Observability provider operation failed',
    });
  });
  it('sends only explicit provider-administration accountability to the Audit-owned port', async () => {
    const value = fixture();
    await value.framework.administerProvider(
      'provider:logs',
      authorization({ operation: 'administer-provider' }),
      at,
      'correlation-1',
    );
    expect(value.audit.values).toHaveLength(1);
    expect(value.logs.values).toHaveLength(0);
  });
});
