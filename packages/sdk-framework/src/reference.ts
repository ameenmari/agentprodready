import type { ApiResponse, StreamFrame } from '@agentprodready/api-framework';
import type {
  SdkAuthenticationProvider,
  SdkCancellationSignal,
  SdkConfiguration,
  SdkConfigurationSource,
  SdkDiagnostic,
  SdkDiagnostics,
  SdkRetryScheduler,
  SdkStreamingTransport,
  SdkTransport,
  SdkTransportRequest,
} from './index.js';
export class StaticSdkConfiguration implements SdkConfigurationSource {
  public constructor(private readonly value: SdkConfiguration) {}
  public async load(): Promise<SdkConfiguration> {
    return this.value;
  }
}
export class HeaderAuthentication implements SdkAuthenticationProvider {
  public constructor(private readonly factory: () => Promise<Readonly<Record<string, string>>>) {}
  public credentials(): Promise<Readonly<Record<string, string>>> {
    return this.factory();
  }
}
export class RecordingSdkTransport implements SdkTransport {
  public readonly requests: SdkTransportRequest[] = [];
  public constructor(
    private readonly handler: (request: SdkTransportRequest) => Promise<ApiResponse>,
  ) {}
  public send(request: SdkTransportRequest): Promise<ApiResponse> {
    this.requests.push(request);
    return this.handler(request);
  }
}
export class StaticStreamingTransport implements SdkStreamingTransport {
  public constructor(private readonly frames: readonly StreamFrame[]) {}
  public async *open(
    _request: SdkTransportRequest,
    cancellation: SdkCancellationSignal,
  ): AsyncIterable<StreamFrame> {
    for (const frame of this.frames) {
      if (cancellation.cancelled) return;
      yield frame;
    }
  }
}
export class ImmediateRetryScheduler implements SdkRetryScheduler {
  public readonly delays: number[] = [];
  public async wait(delayMs: number): Promise<void> {
    this.delays.push(delayMs);
  }
}
export class InMemorySdkDiagnostics implements SdkDiagnostics {
  public readonly values: SdkDiagnostic[] = [];
  public record(diagnostic: SdkDiagnostic): void {
    this.values.push(diagnostic);
  }
}
