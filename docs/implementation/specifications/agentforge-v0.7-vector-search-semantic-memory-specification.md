# AgentForge v0.7 Vector Search & Semantic Memory — Implementation Specification

**Document Type:** Product Implementation Specification  
**Product Version:** 0.7.0  
**Specification Version:** 1.0  
**Status:** Implemented  
**Implementation Mode:** Autonomous  
**Date:** 2026-08-07

---

# 1. Authority and Mode

```text
Implementation Mode: Review-Gated
```

This specification records exact design decisions. It does **not** authorize production code until approved, and it records **hard stop conditions** that block Autonomous implementation until the named amendments are approved with this design.

Architectural authority order remains Foundation → ADRs → Blueprints 08/11/12/24 → dependencies → Governance → this specification → conforming code.

---

# 2. Premises

1. `@agentforge/memory` already exposes `MemorySearchStrategy` including `semantic` / `hybrid` and `MemorySearchProvider.search → { candidates, partialReasons }`.
2. v0.5 durable Memory degrades `semantic`/`hybrid` to keyword with `partialReasons: ['semantic-unavailable']` (persistent provider).
3. `@agentforge/ai-provider` is **chat-only** today; BP08 already lists Embedding Generation as a capability category.
4. No approved Vector Store contracts exist in code.
5. Knowledge Engine owns corpus/knowledge retrieval separately; v0.7 does **not** implement Knowledge vectors.
6. Default local/CI remains vector-disabled, secret-free, and deterministic.

---

# 3. Contract Inventory

| Concern | Approved typed contract today? | v0.7 disposition |
|---|---|---|
| Embedding generation | **No** | **Amendment** to AI Provider implementation contracts |
| Vector representation / store | **No** | **New** `@agentforge/vector-store` package contracts |
| Vector indexing for Memory | Lifecycle `index` state only | **Additive** `MemoryIndexProvider` + engine coordination |
| Semantic / hybrid query tags | **Yes** | Keep; implement honestly when enabled |
| `MemorySearchProvider` | **Yes** | Sufficient — **no second search API** |
| Knowledge vector strategy tags | Yes (unused) | Out of scope |
| OpenAI embeddings | **No** | Extend openai package behind AI contracts |
| pgvector | **No** | First VectorStore adapter package |

---

# 4. Contract Sufficiency Gate

## 4.1 Memory search — sufficient

A vector-capable `MemorySearchProvider` can implement `search` honestly:

- `strategy: 'semantic'` → NN candidates with normalized `relevance`
- `strategy: 'hybrid'` → fused keyword + semantic candidates
- `strategy: 'keyword'|…` → existing behavior

Public output remains `MemoryCandidate[]` + `partialReasons`.  
`MemoryEngine.retrieve` continues to apply available/expiry/Security filters and `WeightedMemoryRanking`.

## 4.2 Embedding generation — **insufficient (STOP)**

BP11 requires embedding generation via Capability Resolution → AI Provider → normalized result.  
Current `AiProviderAdapter.execute(AiExecutionRequest)` returns chat-shaped `NormalizedAiResult` (`content` parts). Embedding vectors cannot be represented honestly without fabricating chat content.

### Smallest amendment (required before Autonomous code)

Create:

`docs/implementation/amendments/08-ai-provider-embedding-contract-amendment.md`

**Affects:** `@agentforge/ai-provider` implementation contracts (not Blueprint 08 rewrite).  
**Blueprint amendment required?** No — Embedding Generation already listed.  
**ADR required?** No.

Frozen contract shape for that amendment:

```ts
export type EmbeddingInput = Readonly<{
  readonly id: string;           // caller correlation id per text
  readonly text: string;
}>;

export interface AiEmbeddingRequest {
  readonly requestId: string;
  readonly binding: CapabilityBinding;
  readonly context: ExecutionContext;
  readonly inputs: readonly EmbeddingInput[];
  readonly model: Readonly<{ id: string; dimensions?: number }>;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface NormalizedEmbedding {
  readonly id: string;
  readonly vector: readonly number[];
  readonly dimensions: number;
}

export interface NormalizedEmbeddingResult {
  readonly requestId: string;
  readonly embeddings: readonly NormalizedEmbedding[];
  readonly model: AiModelMetadata; // reuse; capabilities include 'embedding'
  readonly usage: AiUsage;         // outputTokens may be 0; inputTokens = provider token count
  readonly diagnosticId: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface AiEmbeddingAdapter {
  readonly id: string;
  embed(request: AiEmbeddingRequest): Promise<NormalizedEmbeddingResult>;
  health(): Promise<HealthResult>;
}

export interface AiEmbeddingAdapterResolver {
  resolve(binding: CapabilityBinding): Promise<AiEmbeddingAdapter>;
}
```

Rules:

- Chat `AiProviderAdapter.execute/stream` **unchanged**.
- Embedding adapters are a **parallel** surface (same package, separate interface) so chat providers need not pretend to embed.
- Errors normalize to existing `AiErrorCode` / `AdapterFailure` kinds where applicable; add no Memory-specific codes in AI package.
- Empty `inputs` → `AI_INVALID_REQUEST`.
- Dimension mismatch vs requested `model.dimensions` → `AI_INVALID_REQUEST` (fail closed; no pad/truncate).

Capability id (host seed): `embedding`  
Binding examples: `reference-ai:embedding`, `openai-ai:embedding`.

## 4.3 Memory index coordination — **insufficient (STOP until amendment approved)**

Today `MemoryEngine.transition({ action: 'index' })` only persists `state: 'indexed'`. No provider hook writes derived search artifacts.

### Smallest additive Memory amendment

Document (Review-Gated, not Implemented until code succeeds):

`docs/implementation/amendments/11-memory-index-provider-contract-amendment.md`

Frozen shape:

```ts
export interface MemoryIndexProvider {
  /** Called with the *proposed* indexed MemoryRecord BEFORE canonical storage.replace. */
  index(record: MemoryRecord, context: ExecutionContext): Promise<void>;
  /**
   * Best-effort derived cleanup AFTER canonical delete/expire/archive persisted.
   * Failure must not roll back canonical Memory state.
   */
  remove(
    memoryId: string,
    tenantId: string,
    context: ExecutionContext,
    reason: 'deleted' | 'expired' | 'archived' | 'reindex',
  ): Promise<void>;
  health(): Promise<HealthResult>;
}

export class NoopMemoryIndexProvider implements MemoryIndexProvider { /* no-ops */ }
```

`MemoryEngine` constructor gains `indexProvider: MemoryIndexProvider` (host uses `NoopMemoryIndexProvider` when vector search disabled).

### INDEX ordering (corrected — mandatory)

No distributed transaction across Persistence and VectorStore.

```text
action = index
1. Load current; authorize; validate lifecycle transition organized→indexed; validate OCC expectation
2. Construct proposed MemoryRecord { state: 'indexed', lifecycleVersion: current+1, … }
3. await indexProvider.index(proposed, context)
     → Cap resolve "embedding" → AiEmbeddingAdapter.embed → VectorStore.upsert
4. ONLY if step 3 succeeds: await storage.replace(proposed, expectedLifecycleVersion)
5. ONLY if step 4 succeeds: publish memory.indexed + diagnostics/telemetry
```

| Failure | Result |
|---|---|
| Embed / vector upsert fails | Do **not** `storage.replace`; transition fails (`MEMORY_INDEX_UNAVAILABLE` / mapped); canonical remains `organized` |
| Vector upsert ok, Memory OCC/storage fails | Do **not** claim indexing success; return OCC/storage error; vector row is orphan/stale derived artifact; MemoryRecord remains authoritative at prior state |
| Both succeed | Canonical `indexed` + matching vector versions |

### REMOVE ordering (corrected — mandatory)

```text
action ∈ { delete, expire, archive }
1. Authorize; validate transition; construct proposed non-recallable MemoryRecord
2. await storage.replace(proposed, expectedLifecycleVersion)   # canonical FIRST
3. Publish lifecycle fact (memory.deleted | memory.expired | memory.archived)
4. Best-effort: await indexProvider.remove(..., reason)
5. If remove fails: keep canonical state; record diagnostics/telemetry for stale derived cleanup; do NOT roll back
```

Reason: once canonical Memory is deleted/expired/archived, Engine will not recall it even if a vector row temporarily remains.

**No second search API.** Index provider is write-side only.

## 4.4 Vector Store — greenfield (authorized by this design)

Not an amendment of Memory search. New package contracts (§7).

---

# 5. Ownership Model (Exact)

| Concern | Owner | Must not |
|---|---|---|
| Retrieval semantics, filters, hybrid fusion, ranking policy | Memory | Call OpenAI SDK; own pgvector SQL |
| Embedding generation / vendor translation | AI Provider | Persist MemoryRecords |
| Vector upsert / NN / metric / dimensions / store health | Vector Store provider | Authorize workspace/user/agent |
| Ordinary Persistence entities/OCC/migrations for generic repos | Persistence | Own semantic ranking |
| Cap selection for `embedding` | Capability Resolution | Instantiate adapters |
| Instantiation | Composition | — |
| Authorization | Security | Live in SQL WHERE alone |
| Context composition | Context Assembly | Know vectors / stores / models |

---

# 6. Recommended Architecture

## 6.1 Selected topology

```text
Composition
  ├── MemoryStorageProvider (in-memory | PersistenceBacked)
  ├── MemorySearchProvider
  │     └── VectorCapableMemorySearchProvider
  │           ├── keywordDelegate: MemorySearchProvider
  │           ├── embedding: AiEmbeddingAdapterResolver (+ Cap)
  │           └── vectors: VectorStorePort
  ├── MemoryIndexProvider
  │     └── VectorMemoryIndexProvider (embed + VectorStore upsert/remove)
  └── MemoryEngine(storage, search, ranking, ai, …, indexProvider)
```

## 6.2 Options evaluated

| Option | Verdict |
|---|---|
| A. MemorySearchProvider → Embedding → VectorStore → pgvector | **Selected** |
| B. New generalized Retrieval framework replacing BP10/BP11 | Rejected |
| C. Memory-only pgvector hardwiring | Rejected |

## 6.3 Future stores

Qdrant / Pinecone / Weaviate / Milvus / alternate Postgres vector impl implement `VectorStorePort` only. Memory Engine public retrieve behavior unchanged.

---

# 7. Vector Store Contracts (`@agentforge/vector-store@0.1.0`)

```ts
export type VectorDistanceMetric = 'cosine' | 'inner-product' | 'l2';

export interface VectorIndexIdentity {
  readonly memoryId: string;
  readonly tenantId: string;
}

export interface VectorRecord {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly vector: readonly number[];
  readonly dimensions: number;
  readonly embeddingModelId: string;
  readonly embeddingModelVersion?: string;
  readonly contentVersion: string;      // MemoryRecord.version
  readonly lifecycleVersion: number;    // MemoryRecord.lifecycleVersion at index time
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata: Readonly<Record<string, string>>; // non-sensitive only
}

export interface VectorUpsertRequest {
  readonly record: VectorRecord;
}

export interface VectorQueryRequest {
  readonly tenantId: string;            // mandatory partition
  readonly vector: readonly number[];
  readonly dimensions: number;
  readonly embeddingModelId: string;    // reject cross-model compare
  readonly limit: number;
  readonly metric: VectorDistanceMetric;
}

export interface VectorMatch {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly score: number;               // normalized similarity in [0,1], higher=better
  readonly embeddingModelId: string;
}

export interface VectorStorePort {
  readonly id: string;
  readonly metric: VectorDistanceMetric;
  readonly dimensions: number;
  readonly embeddingModelId: string;
  upsert(request: VectorUpsertRequest): Promise<void>;
  remove(identity: VectorIndexIdentity): Promise<void>;
  query(request: VectorQueryRequest): Promise<readonly VectorMatch[]>;
  health(): Promise<HealthResult>;
}
```

Normalization rules:

- Provider-native distances (cosine distance, L2, etc.) convert to **similarity score ∈ [0,1]** before leaving the adapter.
- Dimension mismatch / model mismatch → normalized vector-store error (fail closed; no silent compare).
- No raw SQL / pgvector types escape the adapter package.

Also ship `InMemoryVectorStore` reference implementation for unit tests (same contracts).

---

# 8. First Vector Provider — pgvector

## 8.1 Package

`@agentforge/vector-store-pgvector@0.1.0`

Depends on: `@agentforge/vector-store`, `pg` (or shared pool factory).  
Does **not** belong inside `@agentforge/persistence-postgres` as a Persistence feature.

May reuse connection env loading patterns (`DATABASE_URL`) but owns its own migrator entrypoint.

## 8.2 Why pgvector

PostgreSQL is already optional durable infrastructure (v0.3). pgvector is the smallest production-sensible first store that reuses ops knowledge without introducing a second data plane for v0.7.

## 8.3 Extension / schema / migrations

### Dimension lifecycle (corrected — mandatory)

`embedding vector(N)` is a **deployment/index migration property**, not a runtime host switch.

A pgvector deployment has exactly one active compatibility contract:

| Field | Meaning |
|---|---|
| `embeddingModelId` | e.g. `reference-embedding-32`, `text-embedding-3-small` |
| `dimensions` | `N` in `vector(N)` |
| `metric` | `cosine` (v0.7) |

Examples:

| Profile | Model | N |
|---|---|---|
| `reference-32` (CI/local vector job) | `reference-embedding-32` | **32** |
| `openai-1536-small` (optional live/staging) | `text-embedding-3-small` | **1536** |

A single `vector(32)` column **cannot** accept 1536-d OpenAI embeddings.  
Changing `EMBEDDING_DIMENSIONS` in `.env` **must not** mutate DDL at host startup.

Incompatible model/dimension change requires explicit:

```text
vector schema rebuild/recreate (new profile migration)
→ re-embed Memory
→ reindex
```

Forbidden: pad, truncate, silent cross-model compare, runtime DDL.

### Migration-rendering strategy — **Option C (selected)**

**Fixed by selected v0.7 deployment profile** with checked-in SQL artifacts (deterministic, reviewable).

| Env at migrate time | Applies |
|---|---|
| `VECTOR_INDEX_PROFILE=reference-32` | Checked-in SQL with `vector(32)` + contract row for reference model |
| `VECTOR_INDEX_PROFILE=openai-1536-small` | Checked-in SQL with `vector(1536)` + contract row for OpenAI small |

```bash
# CI / deterministic
VECTOR_INDEX_PROFILE=reference-32 pnpm db:migrate:vector

# Optional OpenAI-shaped deployment (separate DB or rebuild)
VECTOR_INDEX_PROFILE=openai-1536-small pnpm db:migrate:vector
```

Rules:

- SQL bind parameters **cannot** parameterize `vector(N)` DDL — do not pretend otherwise.
- Do **not** use Option B runtime string interpolation of arbitrary ints into DDL.
- Profile selection chooses among **pre-authored** migration files only.
- Migrator also upserts a small contract table/row, e.g. `memory_vector_schema_contract(embedding_model_id, dimensions, metric, profile_id, applied_at)`.
- Runtime `VectorStorePort` / Composition **assertReady**: configured `EMBEDDING_MODEL` + `EMBEDDING_DIMENSIONS` must equal frozen contract or fail closed.
- No runtime DDL.

### Dimension-change / reindex procedure

```text
1. Stop writers using the old index (or accept downtime window)
2. Apply new profile migration that drops/recreates memory_vector_index with new vector(N)
   (or migrate to a new schema version owned by vector-store-pgvector)
3. Reconfigure host EMBEDDING_* / VECTOR_* to the new profile contract
4. Re-embed and reindex eligible MemoryRecords through Memory lifecycle/index path
5. Verify contract table + sample semantic query
```

v0.7 does not ship an automatic cross-dimension online migrator.

### Owned SQL shape (per profile; N literal in file)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memory_vector_index (
  memory_id           text        NOT NULL,
  tenant_id           text        NOT NULL,
  embedding           vector(32)  NOT NULL,  -- literal N from profile file (32 or 1536)
  embedding_model     text        NOT NULL,
  embedding_model_ver text        NULL,
  dimensions          integer     NOT NULL,
  content_version     text        NOT NULL,
  lifecycle_version   integer     NOT NULL,
  created_at          timestamptz NOT NULL,
  updated_at          timestamptz NOT NULL,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, memory_id)
);

CREATE INDEX memory_vector_index_hnsw
  ON memory_vector_index
  USING hnsw (embedding vector_cosine_ops);

-- plus memory_vector_schema_contract seed for this profile
```

| Decision | Choice |
|---|---|
| Table location | Dedicated `memory_vector_index` — **not** a column on `persistence_entities` |
| Why separate | Generic Persistence must not own NN/ranking; vector rows are derived |
| Extension creation | Migration-owned (`CREATE EXTENSION`); no runtime DDL |
| Default metric | **cosine** (`vector_cosine_ops`) |
| Index type | **HNSW**; unit tests may use `InMemoryVectorStore` |
| Dimensions `N` | Frozen per `VECTOR_INDEX_PROFILE` SQL artifact |

Failure if extension unavailable: migrator fails; provider `health()` / operations normalize to unavailable — **no silent schema mutation**.

## 8.4 Compose / CI image

Replace Compose/CI Postgres image `postgres:16-alpine` with a **pgvector-enabled Postgres 16** image (e.g. `pgvector/pgvector:pg16` — pin digest/tag during implementation).

Rationale: one DB service continues to serve persistence, runtime recovery, memory persistence, evaluation persistence, **and** vector migrations. Existing suites remain green because they do not require the extension unless vector migrations run.

Vector migrations are **not** applied by default `pnpm db:migrate` unless explicitly included; prefer:

- `pnpm db:migrate` — Persistence migrations (unchanged)
- `pnpm db:migrate:vector` — vector-store-pgvector migrations (opt-in)

CI vector job runs both.

---

# 9. Embedding Providers

## 9.1 Deterministic reference (required for CI)

`ReferenceEmbeddingAdapter` in `@agentforge/ai-provider`:

- Fixed dimensions: **32** (test-only; not claimed semantic quality)
- Pure function of input text + model id (stable hash → floats in a bounded range, L2-normalized)
- No network
- `adapter.id = 'reference-embedding'`
- Clearly documented test/reference-only

## 9.2 OpenAI (optional live)

`OpenAiEmbeddingAdapter` in `@agentforge/ai-provider-openai`:

| Item | Decision |
|---|---|
| API | `embeddings.create` |
| Default model | `text-embedding-3-small` |
| Default dimensions | **1536** (or model-declared); honor optional `dimensions` when API supports |
| Input | `inputs[].text` only (no images in v0.7) |
| Output | `NormalizedEmbeddingResult` |
| Batching | Single request batch up to provider limit; if over limit → split sequentially (documented); fail closed on empty text |
| Usage | Map provider usage into `AiUsage` |
| Errors | Reuse openai error translation kinds → `AdapterFailure` / `AiErrorCode` |
| Chat path | **Unchanged** |

Host config when OpenAI embeddings selected reuses `OPENAI_API_KEY` / existing OpenAI config loader; does not invent a second key variable unless necessary.

## 9.3 Memory must not depend on OpenAI package

`@agentforge/memory` may depend on `@agentforge/ai-provider` embedding **contracts** / resolver types only.  
OpenAI package is wired only in Composition / host.

---

# 10. Configuration

Aligned with existing host loaders (`AI_PROVIDER`, `MEMORY_PROVIDER`, `PERSISTENCE_PROVIDER`).

| Variable | Default | Values |
|---|---|---|
| `VECTOR_SEARCH_ENABLED` | `false` | `true` \| `false` |
| `VECTOR_STORE_PROVIDER` | unset / `none` | `none` \| `pgvector` (v0.7) |
| `EMBEDDING_PROVIDER` | unset / `none` | `none` \| `reference` \| `openai` |
| `EMBEDDING_MODEL` | provider default | string (e.g. `reference-embedding-32`, `text-embedding-3-small`) |
| `EMBEDDING_DIMENSIONS` | provider/model default | positive int; **must equal** frozen vector schema contract |
| `VECTOR_INDEX_PROFILE` | required only for `db:migrate:vector` | `reference-32` \| `openai-1536-small` |

Rules:

- If `VECTOR_SEARCH_ENABLED=false` → noop index provider; search delegates keyword; `semantic`/`hybrid` degrade with `semantic-unavailable`.
- If `VECTOR_SEARCH_ENABLED=true` → require `VECTOR_STORE_PROVIDER` + `EMBEDDING_PROVIDER` + Postgres/pgvector; runtime model/dims must match migrated contract; fail closed at Composition seed if misconfigured.
- `EMBEDDING_DIMENSIONS` never triggers DDL.
- Default CI/smoke: vector disabled; no API key. Vector CI job uses `VECTOR_INDEX_PROFILE=reference-32`.

`MEMORY_PROVIDER` remains `in-memory` \| `persistent` (no `MEMORY_PROVIDER=postgres`, no `MEMORY_PROVIDER=pgvector`).

---

# 11. Vector Identity & Metadata

Derived `VectorRecord` fields (not on `MemoryRecord`):

| Field | Source |
|---|---|
| `memoryId` | `MemoryRecord.id` |
| `tenantId` | `MemoryRecord.ownership.tenantId` |
| `contentVersion` | `MemoryRecord.version` |
| `lifecycleVersion` | `MemoryRecord.lifecycleVersion` at index |
| `embeddingModelId` / version | Embedding result model metadata |
| `dimensions` | Vector length |
| `createdAt` / `updatedAt` | Indexer timestamps |

Do **not** store workspace/user/agent authorization decisions in the vector table as authority. Optional non-sensitive metadata keys only; never secrets; never full raw content blob duplication beyond what is required to embed at index time (content read from canonical MemoryRecord at index).

---

# 12. Source-of-Truth & Consistency

`MemoryRecord` = authority. Vector rows = derived search artifacts. No distributed transaction.

| Event | Ordering / vector behavior | Recall |
|---|---|---|
| Successful index | Vector upsert **then** `storage.replace(indexed)` | Later `available` may be recalled semantically |
| Index vector fails | No canonical `indexed` | Remains prior state (`organized`) |
| Index vector ok, Memory OCC fails | Orphan vector possible | Excluded: canonical not indexed/available or version mismatch |
| Delete / expire / archive | Canonical persist **first**; best-effort vector remove | Non-recallable via canonical state/expiry even if vector remains |
| Vector remove fails after canonical terminal | Keep canonical; diagnostics for cleanup repair | Still non-recallable |

**v0.7 physical remove** on delete/expire/archive (best-effort). No tombstone table. No rollback of canonical lifecycle because cleanup failed.

---

# 12.1 Stale-vector validation (mandatory)

After VectorStore NN matches, semantic/hybrid assembly **must** load canonical `MemoryRecord` and **exclude** the candidate when any of:

- canonical Memory missing  
- `tenantId` mismatch  
- Memory `state !== 'available'`  
- Memory expired (`expiresAt` reached)  
- `contentVersion` (MemoryRecord.version) ≠ vector row `content_version`  
- `lifecycleVersion` incompatible/stale vs vector row (vector versions must match the indexed MemoryRecord versions they were written for; if canonical advanced without reindex, exclude)  
- embedding model/dimensions ≠ active store contract  

VectorStore results alone **never** authorize recall. Engine Security/category/visibility filters still apply after candidate construction.

Orphan vectors (indexed in store but canonical never reached `indexed`/`available`) are naturally excluded by state/version checks.

---

# 13. Indexing Flow

Caller-driven (no background workers). Embedding execution boundary:

```text
MemoryEngine (action=index)
  → construct proposed indexed MemoryRecord
  → MemoryIndexProvider.index(proposed)
       → Capability Resolution (capability: "embedding")
       → normalized AI embedding boundary (AiEmbeddingAdapterResolver)
       → AiEmbeddingAdapter.embed
       → provider (reference | openai)     # Composition-owned; not imported by Memory
       → VectorStore.upsert(derived row with proposed versions)
  → storage.replace(proposed)             # only after upsert ok
  → publish memory.indexed
```

Memory may depend only on provider-neutral `@agentforge/ai-provider` embedding contracts / resolver types.  
Memory must **not** import `@agentforge/ai-provider-openai`, OpenAI SDK, or provider-specific embedding types.  
Chat `AiProviderAdapter` unchanged.

Embeddable text rules:

- JSON serialization of JSON-safe Memory content.  
- Sensitive-label skip policy (host list; default empty): fail index closed rather than embed.  
- Do not log content or vectors.

Semantic eligibility: matching non-stale vector **and** canonical `available` (and not expired). Indexing at `index` before `make-available` remains correct.

---

# 14. Re-indexing

| Change | Behavior |
|---|---|
| Content / `version` change | Re-enter index path with INDEX ordering; upsert overwrites derived row |
| Same profile reindex | remove+index or upsert with new versions |
| Embedding model / dimensions change | **Not** an `.env`-only switch — requires §8.3 profile rebuild + re-embed + reindex |
| Incompatible model compare | Fail closed at `VectorStore.query` / upsert |

No silent cross-model similarity.

---

# 15. Semantic Search Semantics

```text
strategy = semantic
1. Cap → AiEmbeddingAdapter.embed(query)   # same embedding boundary as index
2. VectorStore.query({ tenantId, vector, model, dims, limit: max(k, maximumResults) })
3. For each match: storage.get(memoryId)
4. Apply §12.1 stale-vector validation → exclude failures (count stale)
5. Build MemoryCandidate {
     record,
     relevance: match.score,          // already [0,1]
     frequency: 1,
     searchStrategy: 'semantic'
   }
6. Return candidates + partialReasons (empty if fully semantic)
7. Engine filters + WeightedMemoryRanking + limit
```

Similarity normalization occurs **inside** the vector-store adapter (ADR-011).

---

# 16. Hybrid Search Semantics

Selected fusion: **Reciprocal Rank Fusion (RRF)** — simple, transparent, deterministic.

```text
score_rrf(id) = Σ 1 / (k + rank_i(id))   // k = 60
lists = [keywordCandidates sorted by relevance desc, id asc,
         semanticCandidates sorted by score desc, id asc]
```

Algorithm:

1. Run keyword delegate search (ignore its semantic degrade reasons if vector path succeeded).  
2. Run semantic path (§15).  
3. If semantic path unavailable → keyword-only + `partialReasons` including `semantic-unavailable` (+ specific reason).  
4. Else fuse via RRF; set `searchStrategy: 'hybrid'` on fused candidates; `relevance` = min(1, rrf / rrfMax) with deterministic scaling documented in code comments/tests.  
5. Dedupe by `memoryId` keeping best fused score.  
6. Engine filters + `WeightedMemoryRanking` + limit.

Provenance: `partialReasons` may include `hybrid-fusion:rrf` when hybrid fully ran (optional, stable string). Never claim hybrid semantic contribution when semantic did not run.

---

# 17. Similarity Metric

| Decision | Value |
|---|---|
| Default | **cosine** similarity |
| Alternatives in v0.7 | Not selectable via public Memory API |
| Store metadata | `VectorStorePort.metric` must be `cosine` for pgvector adapter v0.7 |
| Reject | Query metric ≠ store metric |

---

# 18. Dimensions

- Schema `vector(N)` frozen by `VECTOR_INDEX_PROFILE` migration (§8.3 Option C).  
- Runtime `EMBEDDING_DIMENSIONS` / model must **match** `memory_vector_schema_contract` or fail closed at Composition/`assertReady`.  
- Upsert/query vectors with other lengths or other model ids → normalized error (no pad/truncate).  
- Reference profile: 32. OpenAI small profile: 1536.  
- Changing profiles = explicit rebuild/reindex procedure, not a hot config flip.

---

# 19. Tenant Isolation

1. **Defense-in-depth:** every `VectorStore.query` / upsert / remove requires `tenantId`; SQL `WHERE tenant_id = $1`.  
2. **Authoritative filters:** MemoryEngine applies workspace/user/agent/visibility/labels/category/time/available/expiry.  
3. pgvector must not be treated as authorization.

Cross-tenant proof required in tests.

---

# 20. Failure Behavior (Normalized)

| Failure | Retrieval | Indexing |
|---|---|---|
| Embedding unavailable / rate limit | Degrade keyword + `partialReasons` (`semantic-unavailable`, `embedding-unavailable`) | Fail before canonical `indexed`; `MEMORY_INDEX_UNAVAILABLE` / mapped |
| Invalid embedding / dim mismatch on query | Degrade or fail retrieval with `MEMORY_RETRIEVAL_FAILURE` if vector enabled and misconfigured at runtime | Fail before canonical `indexed` |
| Vector DB / extension unavailable | Degrade + `semantic-unavailable` / `vector-store-unavailable` | Fail before canonical `indexed` |
| Stale / orphan vector vs MemoryRecord | Exclude candidate (§12.1); count stale | — |
| Vector remove fails after delete/expire/archive | N/A (canonical already non-recallable) | Keep canonical; diagnostics only |
| Unauthorized scope | Engine/Security rejection (existing) | Engine rejects before index provider call |
| Raw OpenAI / SQL errors | Never leak | Never leak |

When `VECTOR_SEARCH_ENABLED=false`, behavior equals v0.5 degrade (no new reasons required beyond `semantic-unavailable`).

---

# 21. Degraded Search Policy

**Selected: Option B — keyword fallback + `partialReasons`.**

Aligns with v0.5 honesty. Never mark status complete as pure semantic when fallback occurred (`MemoryEngine` already maps non-empty `partialReasons` → `status: 'partial'`).

Also fix asymmetry in v0.7: `InMemoryMemoryProvider` should emit `semantic-unavailable` for semantic/hybrid when vector search is not wired (match persistent provider honesty) **or** host always wraps with `VectorCapableMemorySearchProvider` that owns degrade reasons. Prefer Composition always using the vector-capable wrapper when building MemoryEngine in host (wrapper no-ops to keyword when disabled).

---

# 22. Security / Privacy

- Embedding providers receive embeddable Memory content text / query text only.  
- Do not embed or log secrets; sensitive-label skip policy (§13).  
- Do not put vectors or full Memory content into ordinary logs/audit payloads.  
- Audit/events carry ids/diagnostic ids only.  
- Vector `metadata` jsonb: non-sensitive keys only.

---

# 23. Observability

Telemetry counters/histograms (names illustrative; implement via existing Memory/AI/host telemetry ports):

- embedding requests / failures / latency  
- vector upserts / removes / query latency  
- semantic queries / hybrid queries  
- semantic fallback count  
- stale embedding exclusions  
- candidate counts  

No content/vector payloads.

---

# 24. Events / Audit

Reuse existing Memory facts where possible:

| Fact | Use |
|---|---|
| `memory.indexed` | Already published as `memory.${nextState}` → `memory.indexed` |
| `memory.retrieval.complete\|partial\|empty` | Existing |

**v0.7 does not require new public event type unions** if `MemoryFact.type` remains `string` (current). Optional diagnostic-only counters cover vector specifics.

If implementation is forced to change a closed event-type union elsewhere, STOP.

Do not add Evaluation to the retrieval hot path.

---

# 25. Context Assembly

Unchanged contract:

```text
MemoryRetrievalResult → Context Assembly → memory source elements
```

Proof test: semantic retrieve → Context Assembly includes recalled memory ids/content references exactly as keyword path. No vector types imported by context-assembly package.

---

# 26. Evaluation Integration

v0.6 Evaluation remains unaffected. No Evaluation dependency from vector retrieval. Future retrieval-quality evaluation is explicitly deferred.

---

# 27. Existing Providers Preserved

| Provider | Fate |
|---|---|
| `InMemoryMemoryProvider` | Preserved (keyword) |
| `PersistenceBackedMemoryProvider` | Preserved (keyword + durable records) |
| Vector-capable search | **Additive** wrapper/delegate |
| Default CI | Vector disabled |

---

# 28. Package Structure

| Package | Change |
|---|---|
| `@agentforge/ai-provider` | Embedding contracts + reference embed adapter; version bump |
| `@agentforge/ai-provider-openai` | Embeddings adapter; chat unchanged; version bump |
| `@agentforge/vector-store` | **New** `0.1.0` |
| `@agentforge/vector-store-pgvector` | **New** `0.1.0` |
| `@agentforge/memory` | Index provider + vector-capable search + engine hook; version bump |
| `@agentforge/platform-host` | Config/composition/seed; `0.7.0` |
| `@agentforge/persistence-postgres` | Image/docs only if needed; **no** vector ranking ownership |

Memory package dependencies: may add `@agentforge/vector-store` and use `@agentforge/ai-provider` embedding types. Must **not** depend on `vector-store-pgvector` or `ai-provider-openai`.

---

# 29. Docker / Compose Impact

| Item | Decision |
|---|---|
| Postgres image | Switch profile image to pgvector-enabled PG16 |
| Default agentforge service | Vector env off |
| Existing durability | Continues against same Postgres service |
| Data volume | Existing volume may need recreate locally if image family changes — document in guide |

---

# 30. CI Strategy

| Job | Vector | Secrets |
|---|---|---|
| `verify` / `docker` | Off | None |
| existing postgres jobs | Off (extension unused) | None |
| **`vector-search-postgres`** (new) | On + deterministic embed + pgvector migrate | None |
| Live OpenAI embedding | Opt-in `AI_LIVE_TESTS=1` (skip by default) | Local/secret store only; not PR default |

---

# 31. Manual Probe

`scripts/vector-search-probe.mjs`:

1. Assume pgvector up + migrations applied  
2. Capture + lifecycle to available with indexing  
3. Recreate providers  
4. Semantic query  
5. Print safe: memory ids, scores, strategy, partialReasons  
6. Optional: Context Assembly summary ids only  

No vectors/content dumps.

---

# 32. Testing Strategy (Exact)

### Embedding

- Deterministic stability / dimensions / batch / empty input / normalized failures  
- OpenAI adapter unit tests with mocked fetch (no network)  
- Live opt-in skipped by default  

### Vector store

- In-memory + pgvector: upsert, update, remove, NN order, tenant isolation, dim/model mismatch, provider recreate durability  

### Memory

- Semantic / hybrid / keyword regression  
- Lifecycle index write + delete/expire remove  
- Expiry/delete not recallable  
- Cross-tenant  
- Fallback partialReasons  
- Dedupe + ranking stability  

### Context

- Semantic recall → Context Assembly memory sources  

### Boundaries

- memory ↛ openai / pg  
- context-assembly ↛ vector-store / pgvector  
- persistence-postgres ↛ Memory ranking APIs  

### Regression

All existing suites green.

---

# 33. Versioning

| Artifact | Version |
|---|---|
| Product / host | **0.7.0** |
| New vector packages | **0.1.0** |
| Touched AI / Memory packages | Semver bump appropriate to additive contracts |
| Untouched packages | No bump |

Docker/CI image tags follow host `0.7.0`.

---

# 34. Documentation Plan

Create/update:

- `docs/guides/vector-search.md`  
- `docs/guides/memory.md` (semantic vs keyword; fallback; privacy)  
- `docs/guides/persistence.md` (pgvector image note; migrate:vector)  
- README.md / docs/README.md / `.env.example`  
- READMEs: memory, ai-provider, ai-provider-openai, vector-store, vector-store-pgvector  

---

# 35. Files Plan (Implementation Phase — not this Review-Gated pass)

### Create

- `docs/implementation/amendments/08-ai-provider-embedding-contract-amendment.md`  
- `docs/implementation/amendments/11-memory-index-provider-contract-amendment.md`  
- `packages/vector-store/**`  
- `packages/vector-store-pgvector/**`  
- Memory vector search/index implementation files + specs  
- AI embedding contract/adapter files + specs  
- OpenAI embedding adapter + mocked/live specs  
- `scripts/vector-search-probe.mjs`  
- `scripts/run-vector-search-tests.mjs` + vitest config  
- `docs/guides/vector-search.md`  
- Report + checklist  

### Modify

- `packages/memory` engine constructor + exports  
- `packages/ai-provider`, `packages/ai-provider-openai`  
- Host config/composition/seed/package.json  
- `compose.yaml`, `.github/workflows/ci.yml`, root `package.json`  
- Guides/README/`.env.example`  
- Lockfile / tsconfig project references  

### Do not modify in v0.7

- Blueprint/ADR constitutional text  
- Context Assembly public contracts  
- Evaluation runtime path  
- Knowledge vector implementation  

---

# 36. Explicit Non-Goals

- Pinecone / Qdrant / Weaviate / Milvus production adapters  
- Multi-vector routing / model benchmarking  
- Knowledge graph / broad RAG redesign  
- Reranker-as-required-dependency  
- Distributed cluster / vector cache  
- Streaming / tool calling / multi-provider routing changes  
- Embedding fields on `MemoryRecord`  
- Mandatory paid OpenAI in default CI  

---

# 37. Stop Conditions

STOP and report if implementation requires:

- Rewriting Blueprint 11  
- Changing Context Assembly public contracts  
- Moving authorization out of Security into pgvector  
- Memory importing OpenAI SDK  
- Context Assembly importing vector store types  
- Generic Persistence becoming owner of vector ranking  
- Provider-specific vector types on public Memory results  
- Mandatory paid OpenAI calls in default CI  
- Destructive breaks to existing PostgreSQL durability flows  
- Runtime ownership changes / new Runtime public APIs  
- Public contract amendments beyond the two named amendments + new vector-store package  

---

# 38. Architectural Deviations

| Naive approach | This design |
|---|---|
| `vector` column on `persistence_entities` | Dedicated `memory_vector_index` owned by vector-store-pgvector |
| Memory calls OpenAI SDK | Cap → AI embedding adapter |
| Context Assembly queries pgvector | Consumes `MemoryRetrievalResult` only |
| Fail hard on every semantic miss in CI default | Default vector-off; degrade with `partialReasons` when unavailable |

No ADR/Blueprint deviations intended.

---

# 39. Deliverables Summary (Review Checklist)

| Item | Decision |
|---|---|
| Contract inventory | §3 |
| Contract amendment required? | **Yes** — AI embedding + Memory index provider |
| Vector/search architecture | Option A (§6) |
| Embedding architecture | Parallel `AiEmbeddingAdapter` (§4.2) |
| First vector provider | pgvector package (§8) |
| First embedding providers | reference (CI) + OpenAI (opt-in) (§9) |
| Package structure | §28 |
| MemorySearchProvider impact | Implement-only; no second API |
| Schema/migration impact | Extension + profile SQL `vector(N)` + contract table; `migrate:vector` |
| Dimension strategy | **Option C** — checked-in profile SQL; no runtime DDL |
| Compose impact | pgvector-enabled PG16 image |
| Tenant isolation | SQL tenant partition + Engine filters |
| INDEX consistency | Derived upsert **then** canonical `indexed` (§4.3) |
| REMOVE consistency | Canonical **then** best-effort vector remove (§4.3) |
| Stale-vector validation | §12.1 |
| Semantic flow | §15 |
| Hybrid algorithm | RRF (§16) |
| Fallback | Keyword + partialReasons (§21) |
| Embedding chain | Cap → AiEmbeddingAdapter → provider (§13) |
| Configuration | §10 |
| CI / live tests | §30 |
| Contracts beyond 08+11+vector-store? | **No** |
| Blueprint/ADR amendment? | **No** |
| Safe for Autonomous? | **PASS** after human approval of this corrected design + In Review amendments |

---

# 40. Review Gate

No production code until product doc, plan, this specification, and amendment texts `08` / `11` (Status: In Review) are approved.

Then Autonomous implementation may proceed through Stages 0–5 without redesigning ownership.

**Autonomous readiness after these corrections: PASS** (no new stop conditions beyond the two named amendments + greenfield vector-store package already in scope).
