import type { CompositionTelemetry, ServiceLifetime } from '../contracts/composition.js';

export class NoopCompositionTelemetry implements CompositionTelemetry {
  public registration(_token: string, _lifetime: ServiceLifetime, _provenance: string): void {}
  public built(_registrationCount: number): void {}
  public scopeCreated(_executionId: string): void {}
  public scopeDisposed(_executionId: string): void {}
  public resolutionFailed(_token: string, _code: string): void {}
}
