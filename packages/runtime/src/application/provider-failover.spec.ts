import { describe, expect, it } from 'vitest';
import { ProviderAttemptLedger, isFallbackEligibleAiError } from './provider-failover.js';

describe('ProviderAttemptLedger', () => {
  it('records provider attempts and resets runtime retries per provider', () => {
    const ledger = new ProviderAttemptLedger();
    ledger.beginProvider('primary');
    ledger.recordRuntimeRetry();
    ledger.recordRuntimeRetry();
    expect(ledger.snapshot().runtimeRetriesForCurrentProvider).toBe(2);
    ledger.recordOutcome('primary', 'failed', 'AI_UNAVAILABLE');
    ledger.beginProvider('secondary');
    expect(ledger.snapshot().runtimeRetriesForCurrentProvider).toBe(0);
    ledger.recordOutcome('secondary', 'success');
    const snap = ledger.snapshot();
    expect(snap.providerAttempts).toEqual([
      { implementationId: 'primary', outcome: 'failed', errorCode: 'AI_UNAVAILABLE' },
      { implementationId: 'secondary', outcome: 'success' },
    ]);
    expect(ledger.attemptedImplementationIds()).toEqual(['primary', 'secondary']);
  });

  it('classifies only approved retryable normalized codes as fallback-eligible', () => {
    expect(isFallbackEligibleAiError('AI_UNAVAILABLE', true)).toBe(true);
    expect(isFallbackEligibleAiError('AI_PROVIDER_TIMEOUT', true)).toBe(true);
    expect(isFallbackEligibleAiError('AI_RATE_LIMITED', true)).toBe(true);
    expect(isFallbackEligibleAiError('AI_UNAVAILABLE', false)).toBe(false);
    expect(isFallbackEligibleAiError('AI_INVALID_REQUEST', true)).toBe(false);
    expect(isFallbackEligibleAiError('AI_AUTHENTICATION', true)).toBe(false);
    expect(isFallbackEligibleAiError('AI_CONTEXT_LIMIT', true)).toBe(false);
    expect(isFallbackEligibleAiError('AI_UNKNOWN', true)).toBe(false);
  });
});
