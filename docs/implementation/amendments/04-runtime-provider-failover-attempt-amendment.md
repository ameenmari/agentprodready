# Amendment 04 — Runtime Provider Failover Attempt Ledger

**Status:** Implemented  
**Blueprint:** 04 Runtime  
**Product:** AgentProdReady v1.0  
**Related:** `07-capability-resolution-ordered-fallback-amendment.md`

---

## 1. Purpose

Runtime owns one logical attempt ledger distinguishing **same-binding retries** from **provider fallback** (next Cap Resolution candidate).

---

## 2. Additive contracts

```typescript
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
```

Helpers: `isFallbackEligibleAiError(code, retryable)`, ledger mutate/record APIs.

No provider SDK types in Runtime state.

---

## 3. Ordering

```text
resolve → invoke AI → (bounded same-binding retries)
  → if fallback-eligible + safety allows → resolveNext → invoke
  → else fail closed
```

OpenAI `maxRetries: 0` retained.

---

## 4. Status

**In Progress** during v1.0 Autonomous implementation. Mark **Implemented** only after routing/attempt-count tests pass.
