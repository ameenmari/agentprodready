import type {
  AuditPublisher,
  AuditRecord,
  AuthorizationDecision,
  AuthorizationRequest,
  AuthorizationService,
  EventPublisher,
  PlatformEvent,
  PluginDescriptor,
  PluginDiscovery,
  Telemetry,
} from '../contracts/foundation.js';

export class EmptyPluginDiscovery implements PluginDiscovery {
  public async discover(): Promise<readonly PluginDescriptor[]> { return []; }
}

export class DenyByDefaultAuthorizationService implements AuthorizationService {
  public async authorize(request: AuthorizationRequest): Promise<AuthorizationDecision> {
    return Object.freeze({ authorized: false, decisionId: `deny:${request.principalId}:${request.operation}`, reason: 'No Blueprint 15 policy implementation is installed' });
  }
}

export class InMemoryEventPublisher implements EventPublisher {
  readonly #events: PlatformEvent[] = [];
  public async publish<T>(event: PlatformEvent<T>): Promise<void> { this.#events.push(Object.freeze({ ...event })); }
  public events(): readonly PlatformEvent[] { return Object.freeze([...this.#events]); }
}

export class InMemoryAuditPublisher implements AuditPublisher {
  readonly #records: AuditRecord[] = [];
  public async publish(record: AuditRecord): Promise<void> { this.#records.push(Object.freeze({ ...record })); }
  public records(): readonly AuditRecord[] { return Object.freeze([...this.#records]); }
}

export class NoopTelemetry implements Telemetry {
  public log(_message: string, _attributes?: Readonly<Record<string, string>>): void {}
  public record(_metric: string, _value: number): void {}
}
