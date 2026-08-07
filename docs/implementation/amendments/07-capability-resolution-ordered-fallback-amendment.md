# Amendment 07 — Capability Resolution Ordered Fallback

**Status:** Implemented  
**Blueprint:** 07 Capability Resolution  
**Product:** AgentProdReady v1.0  
**Related:** `04-runtime-provider-failover-attempt-amendment.md`

---

## 1. Purpose

Add explicit ordered fallback candidate selection without creating an AiRouter and without silent undocumented fallthrough.

---

## 2. Additive contracts

```typescript
export type ResolutionRoutingMode = 'fixed' | 'fallback';

export interface ResolutionRoutingConfiguration {
  readonly mode: ResolutionRoutingMode;
  readonly orderedImplementationIds: readonly string[];
}

// ResolutionConfiguration gains optional:
readonly routing?: Readonly<Record<string, ResolutionRoutingConfiguration>>;
```

`CapabilityResolver.resolveNext(request, excludeImplementationIds)` returns the next eligible unused candidate for `fallback` mode.

---

## 3. Semantics

| Mode | Behavior |
|---|---|
| `fixed` | Resolve primary only (first ordered id or legacy global/default). Ignore secondaries. |
| `fallback` | Ordered list authoritative; skip excluded/ineligible; exhaust → fail |

Unhealthy → ineligible. Degraded → eligible by default.

---

## 4. Status

**In Progress** during v1.0 Autonomous implementation. Mark **Implemented** only after `pnpm test:routing` and full gates pass.
