import type {
  GovernanceAudit,
  GovernanceAuditReference,
  GovernanceDiagnostic,
  GovernanceDiagnostics,
  GovernanceEvent,
  GovernanceEvents,
} from './index.js';
export class InMemoryGovernanceEvents implements GovernanceEvents {
  public readonly values: GovernanceEvent[] = [];
  public publish(event: GovernanceEvent): void {
    this.values.push(event);
  }
}
export class InMemoryGovernanceAudit implements GovernanceAudit {
  public readonly values: GovernanceAuditReference[] = [];
  public record(reference: GovernanceAuditReference): void {
    this.values.push(reference);
  }
}
export class InMemoryGovernanceDiagnostics implements GovernanceDiagnostics {
  public readonly values: GovernanceDiagnostic[] = [];
  public record(value: GovernanceDiagnostic): void {
    this.values.push(value);
  }
}
