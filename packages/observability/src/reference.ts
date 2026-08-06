import type {
  ComponentHealth,
  CorrelationContext,
  DiagnosticRecord,
  DiagnosticsProvider,
  GovernanceOperationalAudit,
  HealthProvider,
  LoggingProvider,
  MetricObservation,
  MetricsProvider,
  MetricSeries,
  ObservabilityEvents,
  ObservabilityFact,
  OperationalLog,
  Trace,
  TracingProvider,
} from './index.js';
import { freeze } from './index.js';

export class InMemoryLoggingProvider implements LoggingProvider {
  public readonly values: OperationalLog[] = [];
  public async write(value: OperationalLog): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class ConsoleLoggingProvider implements LoggingProvider {
  public constructor(private readonly sink: (value: string) => void) {}
  public async write(value: OperationalLog): Promise<void> {
    this.sink(JSON.stringify(value));
  }
}
export class InMemoryMetricsProvider implements MetricsProvider {
  readonly #values: MetricObservation[] = [];
  public async record(value: MetricObservation): Promise<void> {
    this.#values.push(freeze(copy(value)));
  }
  public series(): readonly MetricSeries[] {
    const groups = new Map<string, MetricObservation[]>();
    for (const value of this.#values) {
      const key = JSON.stringify({
          name: value.name,
          kind: value.kind,
          unit: value.unit,
          labels: Object.fromEntries(
            Object.entries(value.labels).sort(([a], [b]) => a.localeCompare(b)),
          ),
        }),
        items = groups.get(key) ?? [];
      items.push(value);
      groups.set(key, items);
    }
    return freeze(
      [...groups.values()].map((values) => {
        const first = values[0] as MetricObservation,
          numbers = values.map((value) => value.value),
          times = values.map((value) => value.timestamp).sort();
        return {
          name: first.name,
          kind: first.kind,
          unit: first.unit,
          count: values.length,
          sum: numbers.reduce((total, value) => total + value, 0),
          minimum: Math.min(...numbers),
          maximum: Math.max(...numbers),
          latest: values.at(-1)?.value ?? 0,
          labels: copy(first.labels),
          observedFrom: times[0] ?? '',
          observedTo: times.at(-1) ?? '',
        };
      }),
    );
  }
}
export class InMemoryTracingProvider implements TracingProvider {
  readonly #values: Trace[] = [];
  public async complete(value: Trace): Promise<void> {
    this.#values.push(freeze(copy(value)));
  }
  public list(): readonly Trace[] {
    return freeze(copy(this.#values));
  }
}
export class BasicHealthProvider implements HealthProvider {
  public constructor(
    private readonly component: string,
    private status: ComponentHealth['status'] = 'healthy',
    private responseTimeMs = 1,
    private readonly details: Readonly<Record<string, string | number | boolean>> = {},
  ) {}
  public set(status: ComponentHealth['status'], responseTimeMs = this.responseTimeMs): void {
    this.status = status;
    this.responseTimeMs = responseTimeMs;
  }
  public async check(_correlation: CorrelationContext, at: string): Promise<ComponentHealth> {
    return freeze({
      component: this.component,
      status: this.status,
      checkedAt: at,
      responseTimeMs: this.responseTimeMs,
      details: copy(this.details),
      authorizationImplied: false,
      executionPermissionImplied: false,
    });
  }
}
export class InMemoryDiagnosticsProvider implements DiagnosticsProvider {
  readonly #values: DiagnosticRecord[] = [];
  public async record(value: DiagnosticRecord): Promise<void> {
    this.#values.push(freeze(copy(value)));
  }
  public query(): readonly DiagnosticRecord[] {
    return freeze(copy(this.#values));
  }
}
export class InMemoryObservabilityEvents implements ObservabilityEvents {
  public readonly values: ObservabilityFact[] = [];
  public async publish(value: ObservabilityFact): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryGovernanceOperationalAudit implements GovernanceOperationalAudit {
  public readonly values: unknown[] = [];
  public async record(value: Parameters<GovernanceOperationalAudit['record']>[0]): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
