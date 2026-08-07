export type ProviderAttemptOutcome = 'success' | 'failed' | 'cancelled';

export interface ProviderAttemptRecord {
  readonly implementationId: string;
  readonly outcome: ProviderAttemptOutcome;
  readonly errorCode?: string;
}

export interface ProviderAttemptLedgerSnapshot {
  readonly providerAttempts: readonly ProviderAttemptRecord[];
  readonly runtimeRetriesForCurrentProvider: number;
}

/** Runtime-owned ledger: same-binding retries vs provider fallback (Amendment 04 / v1.0). */
export class ProviderAttemptLedger {
  readonly #attempts: ProviderAttemptRecord[] = [];
  #runtimeRetriesForCurrentProvider = 0;
  #currentImplementationId: string | undefined;

  public beginProvider(implementationId: string): void {
    if (this.#currentImplementationId !== implementationId) {
      this.#currentImplementationId = implementationId;
      this.#runtimeRetriesForCurrentProvider = 0;
    }
  }

  public recordRuntimeRetry(): void {
    this.#runtimeRetriesForCurrentProvider += 1;
  }

  public recordOutcome(
    implementationId: string,
    outcome: ProviderAttemptOutcome,
    errorCode?: string,
  ): void {
    this.#attempts.push(
      Object.freeze({
        implementationId,
        outcome,
        ...(errorCode === undefined ? {} : { errorCode }),
      }),
    );
  }

  public attemptedImplementationIds(): readonly string[] {
    return Object.freeze([...new Set(this.#attempts.map((item) => item.implementationId))]);
  }

  public snapshot(): ProviderAttemptLedgerSnapshot {
    return Object.freeze({
      providerAttempts: Object.freeze([...this.#attempts]),
      runtimeRetriesForCurrentProvider: this.#runtimeRetriesForCurrentProvider,
    });
  }
}

const FALLBACK_ELIGIBLE = new Set([
  'AI_UNAVAILABLE',
  'AI_PROVIDER_TIMEOUT',
  'AI_RATE_LIMITED',
]);

/** Uses normalized AI error codes as strings — no provider SDK / ai-provider import (boundary). */
export function isFallbackEligibleAiError(code: string, retryable: boolean): boolean {
  if (!retryable) return false;
  return FALLBACK_ELIGIBLE.has(code);
}
