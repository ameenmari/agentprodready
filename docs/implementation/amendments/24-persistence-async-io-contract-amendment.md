# Blueprint 24 Implementation Contract Amendment — Promise-Based Persistence I/O

**Amendment ID:** `24-persistence-async-io`  
**Status:** Implemented  
**Date:** 2026-08-07  
**Implementation Mode:** Autonomous (code migration)  
**Affects:** `@agentforge/persistence` implementation contracts (not Blueprint 24 constitutional text)  
**Related:** [v0.3 PostgreSQL design](../specifications/agentforge-v0.3-postgresql-persistence-specification.md)

---

## 1. Problem

The approved AgentForge v0.3 PostgreSQL design identified a hard stop condition:

- Current `@agentforge/persistence` `Repository` read/query methods and `SnapshotStore.save/get` are **synchronous**.
- Honest PostgreSQL access in Node.js via `pg` is **asynchronous**.
- Dual `AsyncRepository` APIs, or fake-sync bridges (`deasync`, worker blocking, Atomics waits), are rejected.

AgentForge needs one canonical persistence I/O surface that both in-memory and durable providers can implement.

---

## 2. Authority Review

| Source | Sync I/O required? | Finding |
|---|---|---|
| Blueprint 24 | **No** | Defines repositories, transactions, isolation, durability, optimistic concurrency, snapshots, migrations, and normalized errors. Contains **no** constitutional requirement that repository or snapshot access be synchronous. |
| Blueprint 31 | N/A | Governance; no sync I/O mandate. |
| ADR-003 | No change | Public contracts remain declared before implementations; this amends an implementation-level TypeScript contract shape. |
| ADR-004 | Preserved | Provider independence unchanged; enables real providers. |
| ADR-005 | Preserved | Composition still instantiates providers. |
| ADR-006 | Preserved | Runtime still owns operational retry/timeout/recovery. |
| ADR-011 | Preserved | Normalization at persistence boundary unchanged. |

### Blueprint amendment required?

**No.** Blueprint 24 does not require synchronous persistence access.

### ADR required?

**No.** Ownership, provider independence, Runtime ownership, transaction semantics, dependency direction, and consistency guarantees are unchanged. This is a versioned **implementation-contract** amendment to the TypeScript execution shape of already-approved persistence concepts.

---

## 3. Current Contract (sync)

```ts
export interface Repository<T = unknown> {
  readonly name: string;
  readonly providerBoundaryId: string;
  find(id: string, scope: PersistenceScope): PersistedEntity<T> | undefined;
  exists(id: string, scope: PersistenceScope): boolean;
  count(scope: PersistenceScope): number;
  query(request: RepositoryQuery): QueryResult<T>;
}

export interface SnapshotStore {
  save(value: PersistenceSnapshot): void;
  get(id: string): PersistenceSnapshot | undefined;
}

// PersistenceFramework.snapshot(...) currently returns PersistenceSnapshot synchronously
// UnitOfWork.begin(...) currently returns PersistenceTransaction synchronously
```

Already asynchronous (unchanged):

- `PersistenceTransaction.commit` / `rollback`
- `MigrationProvider.apply` / `rollback`
- `PersistenceEvents.publish`
- `PersistenceAudit.record`

---

## 4. Approved Replacement Contract (Promise-based)

### Repository

```ts
export interface Repository<T = unknown> {
  readonly name: string;
  readonly providerBoundaryId: string;
  find(id: string, scope: PersistenceScope): Promise<PersistedEntity<T> | undefined>;
  exists(id: string, scope: PersistenceScope): Promise<boolean>;
  count(scope: PersistenceScope): Promise<number>;
  query(request: RepositoryQuery): Promise<QueryResult<T>>;
}
```

### SnapshotStore

```ts
export interface SnapshotStore {
  save(value: PersistenceSnapshot): Promise<void>;
  get(id: string): Promise<PersistenceSnapshot | undefined>;
}
```

### UnitOfWork / PersistenceFramework.begin

`BEGIN` is provider I/O for durable providers. Convert:

```ts
export interface UnitOfWork {
  begin(request: TransactionRequest): Promise<PersistenceTransaction>;
}

// PersistenceFramework.begin → Promise<PersistenceTransaction>
```

### PersistenceFramework.snapshot

```ts
snapshot(...): Promise<PersistenceSnapshot<T>>
```

Must `await` repository query and snapshot store save.

### Remains synchronous (not provider I/O surfaces)

| API | Reason |
|---|---|
| `PersistenceProvider.repository(name)` | Factory returning a repository handle |
| `PersistenceProvider.unitOfWork()` | Factory returning a UoW handle |
| `PersistenceProvider.capabilities` | Immutable metadata |
| `PersistenceTransaction.stage(op)` | In-memory staging buffer only; no durable I/O |
| Value objects / errors / negotiate / enforce helpers | Pure computation |
| `PersistenceDiagnostics.record/list` | Local diagnostic sink (reference) |

### Explicitly rejected

- Parallel `AsyncRepository` / `AsyncSnapshotStore` hierarchy
- Deprecated sync aliases
- `deasync`, worker-thread blocking, Atomics waits, or any fake-sync DB bridge

---

## 5. Rationale

1. One canonical contract for all providers.  
2. Matches Node.js I/O model and Foundation’s already-async repository/snapshot bootstrap shapes.  
3. In-memory provider remains valid via immediately resolved Promises.  
4. Unlocks PostgreSQL v0.3 without further public contract invention.  
5. Pre-1.0: prefer one clean break over permanent dual APIs.

---

## 6. Impacted APIs

| API | Change |
|---|---|
| `Repository.find/exists/count/query` | → `Promise<...>` |
| `SnapshotStore.save/get` | → `Promise<...>` |
| `UnitOfWork.begin` | → `Promise<PersistenceTransaction>` |
| `PersistenceFramework.begin` | → `Promise<PersistenceTransaction>` |
| `PersistenceFramework.snapshot` | → `Promise<PersistenceSnapshot>` |
| `InMemoryRepository` methods | `async` returning resolved values |
| `InMemorySnapshotStore` methods | `async` |
| `InMemoryPersistenceProvider` UoW `begin` | `async` |
| `PersistenceFramework` internals | await provider I/O |

---

## 7. Consumer Impact

### Exact impacted file list

| File | Current usage | Required change | Public? | Behavior change beyond async? |
|---|---|---|---|---|
| `packages/persistence/src/index.ts` | Contract + framework sync I/O | Promise signatures; await in `snapshot`/`begin` | **Yes** (package public) | No |
| `packages/persistence/src/reference.ts` | Sync in-memory impl | `async` methods / resolved Promises | Yes (exports) | No |
| `packages/persistence/src/persistence.spec.ts` | Sync `.find/.exists/.count/.query/.get`; sync `begin`/`snapshot` | `await` throughout; reject-based assertions where sync throws become async | Test-only | No |
| `apps/platform-host/src/composition/local-reference-composition.ts` | Instantiates `InMemoryPersistenceProvider` only | None for I/O calls (no repository reads today) | Internal host | No |
| `apps/platform-host/src/composition/local-reference-composition-helpers.ts` | Types `persistence: InMemoryPersistenceProvider` | None for I/O; optional later type widen to `PersistenceProvider` for v0.3 | Internal host | No |
| `apps/platform-host/src/smoke/smoke.ts` | `instanceof InMemoryPersistenceProvider` | None | Internal | No |

### Non-consumers (do not confuse)

| Symbol | Package | Note |
|---|---|---|
| `SnapshotStore<T>` / `Repository<T>` | `@agentforge/foundation` | **Already Promise-based**; different contracts |
| `WorkflowSnapshotStore` | `@agentforge/workflow` | Already async; unrelated |
| `ExecutionSnapshotPort` | `@agentforge/runtime` | Already async; unrelated |

### External ecosystem

No published npm consumers outside this monorepo are known. AgentForge is pre-1.0. **No compatibility shim.**

---

## 8. Compatibility Classification

| Dimension | Classification |
|---|---|
| Change type | **Breaking public contract amendment** |
| Package | `@agentforge/persistence` |
| Suggested package version bump | `0.1.0` → `0.2.0` (semver minor/major discretionary pre-1.0; treat as breaking) |
| Product version | Does not by itself ship product v0.3; clears blocker for v0.3 PostgreSQL |
| Shim / deprecated sync aliases | **None** |
| Migration rule | All callers must `await` repository/snapshot/begin/framework.snapshot; treat returned Promises as unresolved until awaited |

### Migration guidance (for implementers)

```ts
// before
const entity = provider.repository('entities').find(id, scope);
const tx = framework.begin(request);
const snap = framework.snapshot(...);

// after
const entity = await provider.repository('entities').find(id, scope);
const tx = await framework.begin(request);
const snap = await framework.snapshot(...);
```

In-memory pattern:

```ts
public async find(id: string, scope: PersistenceScope): Promise<PersistedEntity<T> | undefined> {
  const value = this.#values.get(key(id, scope));
  return value === undefined ? undefined : freeze(copy(value));
}
```

---

## 9. Ownership Verification

| Concern | Owner after amendment |
|---|---|
| Persistence contracts / normalization | Blueprint 24 / `@agentforge/persistence` |
| Provider instantiation | Composition |
| Operational retry/timeout/recovery | Runtime |
| Authorization decisions | Security |
| Vendor DB SDKs | Concrete provider packages only |

No ownership transfer.

---

## 10. Architectural Impact

- **Unchanged:** transaction atomicity, isolation negotiation, durability declaration, optimistic concurrency, snapshot immutability, migration explicitness, error codes, dependency direction.  
- **Changed:** TypeScript asynchrony of persistence I/O methods.  
- **Aligns with:** Foundation bootstrap repository/snapshot Promise shapes; Node.js durable providers.

---

## 11. Test Requirements (for subsequent code migration)

Regression must prove:

1. `InMemoryPersistenceProvider` still satisfies `Repository` contracts under Promises.  
2. `InMemorySnapshotStore` still satisfies `SnapshotStore`.  
3. `PersistenceFramework` awaits repository/snapshot/begin operations.  
4. Rejected Promises surface as thrown/`PersistenceError` consistently (no swallowed rejections).  
5. Transaction commit/rollback/partial-failure semantics unchanged.  
6. Optimistic concurrency semantics unchanged.  
7. Snapshot immutability / non-audit semantics unchanged.  
8. Tests never treat a `Promise` as a resolved entity (no accidental `expect(promise).toMatchObject(entity)`).  
9. Non-persistence packages remain unaffected (full `pnpm verify`).

---

## 12. Acceptance Criteria

- [x] Authority review recorded (Blueprint sync not required; no ADR).  
- [x] Canonical Promise-based contracts documented (this amendment).  
- [x] Dual async hierarchy rejected.  
- [x] Consumer file list complete.  
- [x] Breaking classification + migration rule documented.  
- [x] Blueprint 24 implementation specification references this amendment.  
- [x] v0.3 PostgreSQL design confirmed implementable after code migration of this amendment.  
- [x] Code migration completed under Autonomous mode (see migration report).

---

## 13. Rollback Considerations

If the code migration must be reverted before release:

- Restore sync signatures in `@agentforge/persistence@0.1.x`.  
- PostgreSQL provider remains blocked.  
- This amendment document remains historical record of the stop condition.

After publication of Promise-based `@agentforge/persistence@0.2.0`, rollback would be another breaking change; prefer forward-only pre-1.0.

---

## 14. PostgreSQL Readiness Gate

Code migration is complete (`@agentforge/persistence@0.2.0`). Evidence: [migration report](../reports/24-persistence-async-io-contract-migration-report.md).

| Check | Result |
|---|---|
| Further public Persistence contract changes required for v0.3? | **No** (per approved v0.3 design) |
| v0.3 PostgreSQL plan remains valid? | **Yes** — do not redesign; `pg`, four tables, compose profile, explicit migrations |
| Safe for Autonomous PostgreSQL implementation? | **Yes** — async I/O migration is complete and green |

Next approved step: Autonomous PostgreSQL v0.3 implementation (**separate** cycle; do not re-open this contract migration).

---

## 15. Decision Summary

| Question | Answer |
|---|---|
| Blueprint amendment required? | **No** |
| ADR required? | **No** |
| Implementation contract change? | **Yes** |
| Breaking? | **Yes** |
| Safe before public v1? | **Yes** |
| Recommended API? | **Promise-based** |
| Dual APIs required? | **No** |
| Also convert `begin` / `framework.snapshot`? | **Yes** (provider I/O) |
| Keep `stage` sync? | **Yes** (buffer only) |
| Production code in documentation step? | **No** (docs only) |
| Production code in Autonomous migration? | **Yes** — `@agentforge/persistence@0.2.0` |
