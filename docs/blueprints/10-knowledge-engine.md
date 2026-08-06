AgentForge
Engineering Blueprint 10
Knowledge Engine

Version: 2.0

Status: Approved

Classification: Core Platform Blueprint

1. Purpose

The Knowledge Engine defines the standardized architecture through which AgentForge acquires, processes, indexes, organizes, and retrieves knowledge from external and internal sources.

Its purpose is to provide provider-independent access to organizational and external knowledge while remaining isolated from storage technologies, indexing strategies, retrieval mechanisms, and AI providers.

The Knowledge Engine enables every platform component to retrieve relevant knowledge through normalized platform contracts without coupling consumers to any particular storage technology or retrieval implementation.

The Knowledge Engine is the platform's knowledge acquisition, processing, indexing, and retrieval layer.

2. Responsibilities

The Knowledge Engine owns:

Knowledge source abstraction
Knowledge connector architecture
Document ingestion
Document normalization
Metadata extraction
Document chunking
Knowledge indexing
Knowledge retrieval
Search
Filtering
Ranking
Knowledge diagnostics
Knowledge observability

The Knowledge Engine does not own:

Prompt construction
Context assembly
Memory persistence
Runtime scheduling
Workflow interpretation
AI provider interaction
Capability resolution
Tool orchestration
Security authorization
4. Blueprint Dependencies

Depends upon:

Blueprint 01–09

Future dependent blueprints:

Memory Engine
Context Assembly Engine
Prompt Builder
Evaluation Framework
5. Consumes → Produces → Owns
Consumes
Node Execution Contract
Capability Binding
ExecutionContext
Produces
Knowledge Retrieval Result
Owns

Provider-independent knowledge acquisition, processing, indexing, retrieval, and normalization.

6. Architectural Position
Runtime
      │
Node Execution Contract
      │
Capability Binding
      │
Knowledge Engine
      │
Knowledge Retrieval Result
      │
Context Assembly Engine (later)
      │
Prompt Builder (later)
      │
AI Provider Framework

Notice the direction.

Knowledge no longer feeds AI directly.

It feeds Context Assembly.

This dependency direction is a deliberate architectural boundary.

7. Knowledge Philosophy

Knowledge represents long-lived information managed by the platform, independent of any particular execution.

Knowledge may originate from:

enterprise documents,
structured databases,
APIs,
file systems,
websites,
object storage,
vector stores,
graph databases,
collaboration platforms,
plugin-provided sources.

The Knowledge Engine abstracts these sources behind a common retrieval architecture.

Knowledge itself remains independent of AI providers and prompt construction.




## Part II — Knowledge Sources, Ingestion & Indexing Architecture

---

# 8. Knowledge Source Model

## 8.1 Purpose

A Knowledge Source represents an external or internal location from which AgentForge can acquire information.

The Knowledge Source abstraction prevents the Knowledge Engine from depending directly on source-specific technologies, APIs, storage formats, or authentication mechanisms.

Every source is accessed through a standardized Knowledge Connector.

---

## 8.2 Knowledge Source Categories

The Knowledge Engine should support multiple source categories.

### Document Sources

Examples include:

* PDF
* DOCX
* Markdown
* Plain text
* HTML
* Presentation files
* Spreadsheets

---

### Structured Data Sources

Examples include:

* SQL databases
* NoSQL databases
* Data warehouses
* Data lakes
* Enterprise reporting systems

---

### Application Sources

Examples include:

* CRM platforms
* ERP systems
* Ticketing systems
* Internal business applications
* Knowledge-management systems

---

### Collaboration Sources

Examples include:

* SharePoint
* Confluence
* Notion
* Google Drive
* Microsoft Teams
* Slack

---

### Repository Sources

Examples include:

* GitHub
* GitLab
* Bitbucket
* Azure DevOps
* Source-code repositories

---

### Network Sources

Examples include:

* Websites
* REST APIs
* GraphQL APIs
* Internal services
* Enterprise search platforms

---

### Custom Sources

Plugins may contribute additional Knowledge Source types through the Plugin Framework.

The Knowledge Engine must not require changes when new source categories are introduced.

---

# 9. Knowledge Connector Architecture

## 9.1 Purpose

Knowledge Connectors translate source-specific access mechanisms into normalized Knowledge Engine contracts.

A connector represents the boundary between the Knowledge Engine and an external information source.

---

## 9.2 Architectural Model

```text
Knowledge Source
        │
        ▼
Knowledge Connector
        │
        ▼
Source-Specific API / Storage
        │
        ▼
Raw Knowledge Records
        │
        ▼
Knowledge Engine
```

The Knowledge Engine communicates only with connector contracts.

It must never access source-specific SDKs or APIs directly.

---

## 9.3 Connector Responsibilities

A Knowledge Connector is responsible for:

* Establishing source connectivity
* Retrieving source records
* Translating source metadata
* Detecting source updates
* Supporting incremental acquisition where available
* Reporting connector diagnostics
* Translating source-specific failures

A connector must not:

* Perform chunking
* Generate embeddings
* Rank retrieved content
* Assemble prompts
* Make authorization decisions
* Apply Runtime retry policies
* Select alternative connectors independently

These responsibilities belong to other platform components.

---

## 9.4 Connector Discovery

Knowledge Connectors may be registered through the Plugin Framework.

Connector discovery and plugin lifecycle management remain owned by Blueprint 02.

The Knowledge Engine consumes only validated connector metadata and connector contracts.

Connector discovery must not instantiate source connections during platform startup.

Connections are created lazily when required through the Composition Framework.

---

# 10. Knowledge Ingestion Request

## 10.1 Purpose

A Knowledge Ingestion Request represents a standardized request to acquire and process content from one or more Knowledge Sources.

It is the public input contract for ingestion operations.

---

## 10.2 Characteristics

Every Knowledge Ingestion Request must be:

* Immutable
* Tenant-aware
* Execution-scoped where initiated by Runtime
* Serializable
* Traceable
* Source-independent
* Observable

---

## 10.3 Conceptual Structure

```text
Knowledge Ingestion Request
│
├── Source Identifier
├── Connector Binding
├── ExecutionContext
├── Ingestion Mode
├── Filtering Rules
├── Processing Policy
├── Indexing Requirements
└── Ingestion Metadata
```

The implementation may refine this structure while preserving the architectural separation between source acquisition and knowledge processing.

---

## 10.4 Ingestion Modes

The Knowledge Engine should conceptually support:

### Full Ingestion

Processes all available content from a source.

---

### Incremental Ingestion

Processes only content added or changed since the previous ingestion checkpoint.

---

### Targeted Ingestion

Processes a selected subset of source content.

---

### Reindexing

Reprocesses existing knowledge using updated parsing, chunking, embedding, or indexing policies.

---

### Deletion Synchronization

Removes or archives knowledge records that no longer exist in the source, according to retention policy.

The exact scheduling of ingestion operations remains a Runtime responsibility.

---

# 11. Knowledge Ingestion Lifecycle

## 11.1 Purpose

Every ingestion operation follows a standardized lifecycle.

```text
Knowledge Ingestion Request
        │
        ▼
Source Validation
        │
        ▼
Connector Invocation
        │
        ▼
Raw Content Acquisition
        │
        ▼
Content Parsing
        │
        ▼
Document Normalization
        │
        ▼
Metadata Extraction
        │
        ▼
Chunking
        │
        ▼
Optional Enrichment
        │
        ▼
Index Preparation
        │
        ▼
Indexing
        │
        ▼
Ingestion Result
```

The Knowledge Engine coordinates the semantic stages of ingestion.

The Runtime controls operational scheduling, retry, timeout, cancellation, and recovery.

---

## 11.2 Lifecycle Ownership

The Knowledge Engine owns:

* Knowledge-processing semantics
* Stage ordering
* Content transformation
* Metadata preservation
* Chunk creation
* Index preparation
* Ingestion-result normalization

The Runtime owns:

* When ingestion runs
* Concurrency
* Cancellation
* Retry
* Timeout
* Recovery
* Execution resources

The Tool Framework or connectors may perform external interaction, but they do not own the ingestion pipeline.

---

# 12. Raw Knowledge Record

## 12.1 Purpose

A Raw Knowledge Record is the normalized output produced by a Knowledge Connector before document processing begins.

It represents acquired source content without exposing source-specific SDK models.

---

## 12.2 Conceptual Structure

```text
Raw Knowledge Record
│
├── Source Identifier
├── Record Identifier
├── Raw Content
├── Content Type
├── Source Metadata
├── Source Version
├── Source Timestamp
├── Security Labels
└── Connector Diagnostics
```

Raw Knowledge Records remain internal to the Knowledge Engine.

They are not returned to consumers as retrieval results.

---

# 13. Document Normalization

## 13.1 Purpose

Document Normalization converts heterogeneous source content into a stable internal Knowledge Document representation.

This creates a common processing model regardless of the original source or file format.

---

## 13.2 Normalization Responsibilities

Normalization includes:

* Text extraction
* Structural preservation
* Character encoding normalization
* Removal of irrelevant transport metadata
* Preservation of meaningful document hierarchy
* Content-type normalization
* Source-reference preservation

Normalization should retain the information necessary for traceability and citation.

---

## 13.3 Knowledge Document

A normalized Knowledge Document conceptually contains:

```text
Knowledge Document
│
├── Document Identifier
├── Source Identifier
├── Normalized Content
├── Document Structure
├── Metadata
├── Security Labels
├── Source Reference
├── Version
└── Processing Metadata
```

The Knowledge Document becomes the canonical internal representation used by downstream processing stages.

---

# 14. Metadata Model

## 14.1 Purpose

Metadata allows knowledge to be filtered, secured, traced, ranked, and explained.

Metadata must be preserved throughout ingestion, indexing, and retrieval.

---

## 14.2 Metadata Categories

Metadata may include:

### Identity Metadata

* Source identifier
* Document identifier
* Record identifier
* Chunk identifier

---

### Ownership Metadata

* Tenant
* Workspace
* Project
* Source owner
* Business owner

---

### Content Metadata

* Title
* Author
* Language
* Content type
* Tags
* Topic
* Classification

---

### Temporal Metadata

* Created timestamp
* Updated timestamp
* Effective date
* Expiration date
* Ingestion timestamp

---

### Security Metadata

* Access labels
* Sensitivity classification
* Visibility scope
* Policy references

---

### Processing Metadata

* Parser version
* Chunking strategy
* Embedding model reference
* Index version
* Processing pipeline version

Metadata must remain provider-independent and serializable.

---

# 15. Chunking Architecture

## 15.1 Purpose

Chunking divides normalized Knowledge Documents into smaller Knowledge Chunks suitable for indexing and retrieval.

Chunking is a Knowledge Engine responsibility because it determines how knowledge is represented and retrieved.

---

## 15.2 Chunking Principles

Chunking should:

* Preserve semantic meaning
* Preserve source traceability
* Avoid unnecessary duplication
* Support configurable strategies
* Retain security and ownership metadata
* Produce deterministic results for the same input and strategy version

---

## 15.3 Supported Strategy Categories

The Knowledge Engine may support:

### Fixed-Size Chunking

Divides content using configurable size and overlap rules.

---

### Structural Chunking

Uses headings, paragraphs, sections, tables, or document hierarchy.

---

### Semantic Chunking

Uses semantic boundaries identified through AI or language-processing capabilities.

---

### Source-Specific Chunking

Uses strategies optimized for code, tables, transcripts, policies, or other specialized formats.

Strategies remain pluggable and should be selected through configuration or policy.

---

## 15.4 Knowledge Chunk

Conceptually:

```text
Knowledge Chunk
│
├── Chunk Identifier
├── Document Identifier
├── Source Identifier
├── Content
├── Position
├── Structural Path
├── Metadata
├── Security Labels
├── Version
└── Processing Metadata
```

Every chunk must retain enough source information to support citations and traceability.

---

# 16. Knowledge Enrichment

## 16.1 Purpose

Optional enrichment may add metadata or representations that improve retrieval quality.

Examples include:

* Language detection
* Topic classification
* Entity extraction
* Summarization
* Keyword extraction
* Embedding generation
* Relationship extraction

---

## 16.2 Architectural Boundary

The Knowledge Engine coordinates enrichment requirements.

It does not implement AI-provider behavior directly.

AI-assisted enrichment must use capabilities exposed through Blueprint 07 and implemented through Blueprint 08.

For example:

```text
Knowledge Chunk
        │
        ▼
Embedding Capability Request
        │
        ▼
Capability Resolver
        │
        ▼
AI Provider Framework
        │
        ▼
Normalized Embedding Result
        │
        ▼
Knowledge Engine
```

The Knowledge Engine consumes normalized results only.

---

# 17. Indexing Architecture

## 17.1 Purpose

Indexing makes normalized knowledge searchable and retrievable.

The Knowledge Engine defines the indexing lifecycle and index contracts while remaining independent of storage-specific technologies.

---

## 17.2 Index Categories

The platform may support:

* Keyword indexes
* Vector indexes
* Hybrid indexes
* Metadata indexes
* Graph indexes
* Source-specific indexes

The Knowledge Engine may coordinate multiple index types for the same Knowledge Chunk.

---

## 17.3 Indexing Responsibilities

The Knowledge Engine owns:

* Preparing indexable records
* Selecting configured indexing strategies
* Coordinating index writes
* Preserving metadata
* Maintaining version relationships
* Producing normalized indexing results

Storage-specific index operations remain behind provider or adapter contracts.

---

## 17.4 Index Record

Conceptually:

```text
Knowledge Index Record
│
├── Chunk Identifier
├── Searchable Content
├── Vector Representation (optional)
├── Metadata
├── Security Labels
├── Index Version
└── Source Reference
```

The index record is an internal representation.

Consumers never depend directly on vector-store or search-engine schemas.

---

# 18. Knowledge Index Provider Boundary

Index technologies are treated as replaceable implementations.

Examples may include:

* Elasticsearch
* OpenSearch
* PostgreSQL full-text search
* pgvector
* Pinecone
* Weaviate
* Qdrant
* Azure AI Search
* Graph databases
* Custom enterprise indexes

The Knowledge Engine interacts with them through normalized index contracts.

No storage-specific response, identifier, query model, or SDK object may cross the Knowledge Engine boundary.

---

# 19. Index Versioning

## 19.1 Purpose

Knowledge processing strategies evolve over time.

Changes to parsing, chunking, embeddings, enrichment, or metadata may require new index versions.

---

## 19.2 Versioning Requirements

The Knowledge Engine should track:

* Document-processing version
* Chunking-strategy version
* Embedding-reference version
* Index-schema version
* Source-record version

Multiple index versions may temporarily coexist during migration or reindexing.

Consumers should retrieve only from active index versions according to policy.

---

# 20. Ingestion Result

## 20.1 Purpose

Every ingestion operation returns a normalized Knowledge Ingestion Result.

This result reports processing outcomes without exposing connector or index-provider internals.

---

## 20.2 Conceptual Structure

```text
Knowledge Ingestion Result
│
├── Source Identifier
├── Processed Record Count
├── Created Document Count
├── Created Chunk Count
├── Updated Record Count
├── Removed Record Count
├── Failed Record Count
├── Index Version
├── Diagnostics Reference
└── Completion Status
```

The Runtime consumes this result for execution-level reporting and operational decisions.

---

# 21. Ingestion Events

The Knowledge Engine publishes lifecycle events through the Event Bus.

Examples include:

* Knowledge Ingestion Started
* Source Connected
* Source Record Acquired
* Document Normalized
* Document Chunked
* Knowledge Enriched
* Indexing Started
* Indexing Completed
* Knowledge Updated
* Knowledge Removed
* Knowledge Ingestion Completed
* Knowledge Ingestion Failed

Events should remain immutable, versioned, tenant-aware, and correlated through the ExecutionContext.

---

# 22. Ingestion Observability

The Knowledge Engine contributes ingestion-specific telemetry.

Metrics may include:

* Source acquisition duration
* Parsing duration
* Chunking duration
* Enrichment duration
* Indexing duration
* Records processed
* Chunks generated
* Processing failures
* Incremental-ingestion lag
* Index size
* Reindexing frequency

The Runtime aggregates execution-level telemetry.

The Knowledge Engine owns only domain-specific knowledge telemetry.

---

# 23. Ingestion Security Boundary

Knowledge ingestion must preserve security and ownership metadata from source acquisition through indexing.

The Knowledge Engine consumes authorization outcomes and security context supplied by the Security Platform and ExecutionContext.

It must not independently grant source access.

The Security Platform's authorization outcome is authoritative. The Knowledge Engine may apply additional restrictions but must never expand the granted access.

A connector possessing valid credentials does not imply that the current execution is authorized to acquire or expose the source's content.

Security labels and visibility scopes must be retained in normalized documents, chunks, and index records so they can be enforced during retrieval.

---

# 24. Ingestion Failure Normalization

Source-specific and index-specific failures must not escape the Knowledge Engine in technology-specific form.

Connectors and index adapters translate failures into normalized Knowledge Errors.

Examples include:

* Source unavailable
* Authentication failure
* Authorization failure
* Unsupported content type
* Parsing failure
* Invalid document
* Chunking failure
* Enrichment failure
* Index write failure
* Version conflict
* Source synchronization failure

The Runtime consumes normalized Knowledge Errors and applies operational retry, recovery, or failure policies.

The Knowledge Engine describes the failure.

The Runtime determines what happens next.

---

# 25. Part II Ownership Boundaries

The Knowledge Engine may:

* Acquire source content through connectors
* Normalize documents
* Extract and preserve metadata
* Produce Knowledge Chunks
* Coordinate enrichment
* Prepare and write index records
* Produce ingestion results
* Publish knowledge-domain events

The Knowledge Engine must not:

* Schedule ingestion independently
* Apply Runtime retry policies
* Select concrete AI providers directly
* Build prompts
* Assemble execution context
* Make authorization decisions
* Expose source-specific or index-specific models
* Treat connector credentials as authorization

---

# End of Part II

## Chief Architect Notes

Part II defines the complete acquisition and indexing side of the Knowledge Engine.

The central architectural progression is:

```text
Knowledge Source
        │
        ▼
Knowledge Connector
        │
        ▼
Raw Knowledge Record
        │
        ▼
Knowledge Document
        │
        ▼
Knowledge Chunk
        │
        ▼
Knowledge Index Record
        │
        ▼
Index Provider
```

Each stage has a distinct responsibility and a normalized contract.

A particularly important boundary is the separation between **Knowledge Processing** and **AI Interaction**. The Knowledge Engine may request embeddings, summaries, classifications, or other enrichment capabilities, but it must do so through Capability Resolution and the AI Provider Framework. It must never depend directly on AI vendors or model SDKs.

The next part will complete Blueprint 10 by defining query processing, retrieval strategies, filtering, ranking, security trimming, result normalization, retrieval observability, Cursor implementation guidance, and acceptance criteria.




## Part III — Retrieval, Ranking & Knowledge Result Architecture

---

# 26. Knowledge Retrieval Request

## 26.1 Purpose

A Knowledge Retrieval Request represents a standardized request to locate relevant information from one or more managed knowledge sources.

It is the public input contract for retrieval operations.

The request describes the information need, retrieval constraints, security scope, and expected result characteristics without exposing search-engine, vector-store, connector, or provider-specific query models.

---

## 26.2 Request Derivation

The Runtime coordinates creation of the Knowledge Retrieval Request from:

* Node Execution Contract
* Capability Binding
* ExecutionContext
* Query or information need
* Retrieval constraints
* Security context

Conceptually:

```text
Node Execution Contract
        │
        ▼
Capability Binding
        │
        ▼
ExecutionContext
        │
        ▼
Knowledge Retrieval Request
        │
        ▼
Knowledge Engine
```

The Knowledge Engine does not create execution scopes or make Runtime-level execution decisions.

---

## 26.3 Characteristics

Every Knowledge Retrieval Request must be:

* Immutable
* Tenant-aware
* Workspace-aware
* Project-aware where applicable
* Provider-independent
* Serializable
* Traceable
* Security-scoped
* Observable

---

## 26.4 Conceptual Structure

```text
Knowledge Retrieval Request
│
├── Query
├── Capability Binding
├── ExecutionContext
├── Target Knowledge Scope
├── Retrieval Strategy
├── Metadata Filters
├── Security Constraints
├── Result Limits
├── Ranking Requirements
├── Quality Requirements
└── Retrieval Metadata
```

The exact implementation may evolve, but it must preserve the separation between the platform retrieval contract and storage-specific query representations.

---

# 27. Query Processing

## 27.1 Purpose

Query Processing transforms the caller’s information need into a normalized retrieval representation suitable for one or more retrieval strategies.

The Knowledge Engine owns query-processing semantics.

It must not expose provider-specific query syntax to callers.

---

## 27.2 Query Processing Responsibilities

Query processing may include:

* Input normalization
* Language detection
* Query validation
* Query classification
* Keyword extraction
* Metadata-filter preparation
* Query expansion
* Query decomposition
* Semantic-query preparation
* Source-scope resolution

Not every request requires every operation.

Processing behavior is selected through configuration and policy.

---

## 27.3 AI-Assisted Query Processing

AI-assisted operations such as query rewriting, decomposition, or expansion must use the Capability Resolution Framework and AI Provider Framework.

Conceptually:

```text
Knowledge Retrieval Request
        │
        ▼
Query Processing Policy
        │
        ▼
Optional AI Capability Request
        │
        ▼
Capability Resolver
        │
        ▼
AI Provider Framework
        │
        ▼
Normalized AI Result
        │
        ▼
Normalized Retrieval Query
```

The Knowledge Engine consumes normalized AI outputs only.

It must never reference vendor-specific models or APIs.

---

# 28. Retrieval Strategy Architecture

## 28.1 Purpose

A Retrieval Strategy determines how relevant knowledge candidates are located.

Strategies are replaceable and may be combined.

The Knowledge Engine selects configured strategy behavior but remains independent of the underlying search implementation.

---

## 28.2 Retrieval Strategy Categories

The Knowledge Engine should conceptually support the following strategy categories.

### Keyword Retrieval

Locates candidates using lexical matching, full-text search, or source-native search.

---

### Vector Retrieval

Locates semantically similar candidates using vector representations.

---

### Hybrid Retrieval

Combines lexical and semantic retrieval.

---

### Metadata Retrieval

Locates candidates primarily through structured metadata and filters.

---

### Graph Retrieval

Traverses relationships between entities, concepts, or knowledge records.

---

### Federated Retrieval

Queries multiple independent knowledge sources or indexes and combines their results.

---

### Source-Specific Retrieval

Uses a retrieval strategy optimized for a particular source category while returning normalized candidates.

---

## 28.3 Strategy Independence

Consumers request retrieval behavior through normalized requirements.

They must never specify vendor-specific query syntax, index names, SDK options, or storage-engine parameters.

---

# 29. Retrieval Pipeline

## 29.1 Purpose

Every retrieval operation follows a controlled semantic pipeline.

```text
Knowledge Retrieval Request
        │
        ▼
Request Validation
        │
        ▼
Security Scope Resolution
        │
        ▼
Query Processing
        │
        ▼
Retrieval Strategy Selection
        │
        ▼
Candidate Retrieval
        │
        ▼
Security Trimming
        │
        ▼
Deduplication
        │
        ▼
Ranking / Reranking
        │
        ▼
Quality Filtering
        │
        ▼
Result Assembly
        │
        ▼
Knowledge Retrieval Result
```

The Knowledge Engine owns the semantic sequence.

The Runtime owns operational scheduling, timeout, retry, cancellation, concurrency, and recovery.

---

# 30. Knowledge Candidate

## 30.1 Purpose

A Knowledge Candidate is an internal normalized representation of a potentially relevant knowledge item returned by a retrieval provider.

Candidates are evaluated, filtered, and ranked before becoming public retrieval results.

---

## 30.2 Conceptual Structure

```text
Knowledge Candidate
│
├── Chunk Identifier
├── Document Identifier
├── Source Identifier
├── Content
├── Source Reference
├── Metadata
├── Security Labels
├── Retrieval Score
├── Retrieval Strategy
├── Index Version
└── Provider Diagnostics
```

Knowledge Candidates remain internal to the Knowledge Engine.

Storage-specific hit objects must never leave the provider boundary.

---

# 31. Metadata Filtering

## 31.1 Purpose

Metadata filtering narrows retrieval to content matching explicit structural requirements.

Examples include:

* Tenant
* Workspace
* Project
* Source
* Document type
* Language
* Tags
* Classification
* Date range
* Version
* Business domain

---

## 31.2 Filter Ownership

The Knowledge Engine interprets normalized filter requirements.

Index providers translate those requirements into implementation-specific queries.

Consumers never depend on index-specific filtering syntax.

---

## 31.3 Security Distinction

Metadata filtering and security trimming are separate concerns.

Metadata filters express retrieval intent.

Security trimming enforces access boundaries.

A metadata filter must never be treated as a substitute for authorization.

---

# 32. Security Trimming

## 32.1 Purpose

Security Trimming ensures that retrieval returns only knowledge the current execution is authorized to access.

Unauthorized candidates must be removed before ranking results are exposed outside the Knowledge Engine.

---

## 32.2 Security Inputs

Security trimming may evaluate:

* Tenant scope
* Workspace scope
* Project scope
* User identity
* Agent identity
* Roles
* Permissions
* Claims
* Security labels
* Resource ownership
* Policy outcomes

---

## 32.3 Ownership Boundary

The Security Platform owns authorization decisions and policy interpretation.

The Knowledge Engine consumes the authorization context and applies the resulting access constraints to retrieval.

The Knowledge Engine must not independently grant access, expand permissions, or override security decisions.

---

## 32.4 Mandatory Enforcement

Security trimming is mandatory.

It must be applied consistently across:

* Keyword retrieval
* Vector retrieval
* Hybrid retrieval
* Graph retrieval
* Federated retrieval
* Cached retrieval
* Reranking

Unauthorized content must not be exposed to downstream ranking, context assembly, logs, diagnostics, or callers.

---

# 33. Candidate Deduplication

## 33.1 Purpose

Federated and hybrid retrieval may return overlapping or equivalent candidates.

Deduplication removes redundant knowledge while preserving the strongest available source and metadata references.

---

## 33.2 Deduplication Signals

Signals may include:

* Chunk identifier
* Document identifier
* Source reference
* Content fingerprint
* Semantic similarity
* Version relationship

Deduplication policy must remain deterministic for the same candidate set and policy version.

---

# 34. Ranking Architecture

## 34.1 Purpose

Ranking orders authorized Knowledge Candidates according to relevance and configured quality policies.

Ranking belongs to the Knowledge Engine because it determines which retrieved knowledge is most useful.

---

## 34.2 Ranking Inputs

Ranking may consider:

* Lexical relevance
* Semantic similarity
* Metadata importance
* Source authority
* Recency
* Document quality
* User or tenant policy
* Retrieval strategy confidence
* Business priority

---

## 34.3 Ranking Strategies

The Knowledge Engine may support:

### Score-Based Ranking

Uses scores supplied by retrieval providers.

---

### Weighted Ranking

Combines multiple normalized signals.

---

### Reciprocal Rank Fusion

Combines ranked results from multiple strategies.

---

### Rule-Based Ranking

Applies deterministic business or source-priority rules.

---

### AI-Assisted Reranking

Uses an AI capability to reassess candidate relevance.

---

## 34.4 AI-Assisted Reranking Boundary

AI-assisted reranking must use Capability Resolution and the AI Provider Framework.

The Knowledge Engine supplies candidates and consumes a normalized ranking result.

It must not invoke vendor-specific models directly.

---

# 35. Quality Filtering

## 35.1 Purpose

Quality Filtering removes candidates that do not satisfy configured result requirements.

Possible criteria include:

* Minimum relevance
* Minimum source confidence
* Active document version
* Content completeness
* Allowed language
* Result freshness
* Duplicate threshold
* Maximum result count

Quality policies should remain explainable and versioned.

---

# 36. Citation & Source Traceability

## 36.1 Purpose

Every public knowledge item must remain traceable to its originating source.

Traceability supports:

* Citations
* Auditing
* User verification
* Source updates
* Deletion propagation
* Compliance investigations
* Retrieval diagnostics

---

## 36.2 Citation Information

A result should preserve sufficient normalized information to identify:

* Source
* Document
* Chunk or record
* Structural location
* Version
* Retrieval timestamp
* Accessible source reference

The Knowledge Engine prepares citation-ready source metadata.

Prompt formatting remains the responsibility of later Context Assembly and Prompt Builder blueprints.

---

# 37. Knowledge Retrieval Result

## 37.1 Purpose

The **Knowledge Retrieval Result** is the sole public output of the Knowledge Engine’s retrieval pipeline.

It contains normalized, authorized, ranked, and traceable knowledge suitable for downstream platform consumption.

Consumers must not receive raw vector-store hits, search-engine results, connector records, or provider-specific objects.

---

## 37.2 Characteristics

Every Knowledge Retrieval Result must be:

* Immutable
* Provider-independent
* Tenant-aware
* Security-trimmed
* Ranked
* Serializable
* Traceable
* Citation-ready
* Observable

---

## 37.3 Conceptual Structure

```text
Knowledge Retrieval Result
│
├── Query Summary
├── Retrieved Knowledge Items
├── Retrieval Strategy Metadata
├── Ranking Metadata
├── Security Scope
├── Source References
├── Quality Metadata
├── Diagnostics Reference
└── Completion Status
```

Each retrieved Knowledge Item may conceptually contain:

```text
Retrieved Knowledge Item
│
├── Content
├── Chunk Identifier
├── Document Identifier
├── Source Identifier
├── Source Reference
├── Metadata
├── Security Labels
├── Relevance Score
├── Rank
├── Version
└── Citation Metadata
```

The concrete implementation may evolve while preserving the normalized semantic contract.

---

# 38. Empty & Partial Results

## 38.1 Empty Results

A valid retrieval operation may return no authorized or relevant knowledge.

An empty result is not automatically a failure.

The result must clearly distinguish:

* No matching knowledge
* Matching knowledge removed by security trimming
* Candidates below quality threshold
* Source unavailable
* Retrieval failure

Sensitive authorization information must not be leaked when explaining empty results.

---

## 38.2 Partial Results

The Knowledge Engine may return partial results when policy allows and some sources or strategies fail.

Partial-result status must be explicit.

The Runtime determines whether partial completion is acceptable for the broader execution.

---

# 39. Retrieval Caching Boundary

## 39.1 Purpose

Retrieval caching may improve latency and reduce provider load.

Caching is optional and policy-controlled.

---

## 39.2 Security Requirements

Cache keys and entries must include relevant security and scope dimensions.

A cached result produced for one tenant, workspace, project, user, or policy scope must never be exposed to another incompatible scope.

A cached result remains reusable only while its security, source, document, index, and policy versions remain valid.

---

## 39.3 Ownership

The Knowledge Engine may define retrieval-cache semantics.

The caching implementation remains replaceable through platform contracts.

The Runtime retains control over execution-level policy and invalidation triggers originating from execution recovery.

---

# 40. Retrieval Failure Normalization

Technology-specific retrieval failures must never cross the Knowledge Engine boundary.

Search providers, vector stores, graph stores, and federated connectors must translate failures into normalized Knowledge Errors.

Examples include:

* Invalid query
* Index unavailable
* Source unavailable
* Version incompatibility
* Query timeout
* Search-provider throttling
* Retrieval failure
* Ranking failure
* Reranking failure
* Security-filtering failure
* Result-normalization failure

The Knowledge Engine reports normalized failures.

The Runtime determines retry, recovery, fallback, partial completion, or failure behavior.

---

# 41. Retrieval Events

The Knowledge Engine publishes retrieval lifecycle events through the Event Bus.

Examples include:

* Knowledge Retrieval Started
* Query Processed
* Retrieval Strategy Selected
* Candidates Retrieved
* Security Trimming Completed
* Candidates Deduplicated
* Ranking Started
* Ranking Completed
* Knowledge Retrieval Completed
* Knowledge Retrieval Returned Empty
* Knowledge Retrieval Partially Completed
* Knowledge Retrieval Failed

Events must remain immutable, versioned, tenant-aware, and correlated through the ExecutionContext.

---

# 42. Retrieval Observability

The Knowledge Engine contributes domain-specific retrieval telemetry.

Metrics may include:

* Query-processing duration
* Retrieval-provider latency
* Candidate count
* Authorized-candidate count
* Deduplication count
* Ranking duration
* Reranking duration
* Result count
* Empty-result rate
* Partial-result rate
* Retrieval failure rate
* Cache hit rate
* Source contribution
* Retrieval strategy usage

The Runtime aggregates execution-level telemetry and cost.

The Knowledge Engine owns only retrieval-domain telemetry.

---

# 43. Knowledge Diagnostics

## 43.1 Purpose

Knowledge Diagnostics make retrieval behavior explainable without exposing sensitive content or provider internals.

---

## 43.2 Diagnostic Information

Diagnostics may include:

* Query-processing stages
* Strategies used
* Sources queried
* Candidate counts
* Filters applied
* Security-trimming counts
* Ranking policy version
* Index versions
* Provider durations
* Partial-result causes
* Failure categories

Diagnostics must never reveal unauthorized content, raw credentials, secrets, or source-specific sensitive payloads.

---

# 44. Retrieval Ownership Boundaries

The Knowledge Engine may:

* Process normalized information needs
* Select configured retrieval strategies
* Query normalized knowledge-index contracts
* Apply metadata filters
* Enforce supplied security constraints
* Deduplicate candidates
* Rank and rerank candidates
* Assemble Knowledge Retrieval Results
* Produce citation-ready metadata
* Publish knowledge-domain events and telemetry

The Knowledge Engine must not:

* Build prompts
* Decide final execution context
* Make authorization decisions
* Select concrete AI providers directly
* Schedule work
* Apply Runtime retry policies
* Expose storage-specific query or response models
* Return unauthorized knowledge
* Treat an empty result as an automatic execution failure

---

# 45. Cursor Implementation Guide

## 45.1 Objective

Cursor should implement a provider-independent Knowledge Engine supporting normalized ingestion, indexing, retrieval, ranking, security trimming, and result contracts.

The implementation should establish the framework and contracts rather than build every possible connector or search provider.

---

## 45.2 Required Deliverables

Implement:

* Knowledge Source contract
* Knowledge Connector abstraction
* Knowledge Ingestion Request
* Raw Knowledge Record
* Knowledge Document
* Knowledge Chunk
* Knowledge Index Record
* Knowledge Ingestion Coordinator
* Document Normalizer
* Metadata Extractor
* Chunking Strategy abstraction
* Enrichment Coordinator
* Knowledge Index Provider contract
* Knowledge Ingestion Result
* Knowledge Retrieval Request
* Query Processor
* Retrieval Strategy abstraction
* Knowledge Candidate
* Metadata Filter model
* Security Trimming integration
* Candidate Deduplicator
* Ranking abstraction
* Reranking abstraction
* Knowledge Retrieval Result
* Normalized Knowledge Errors
* Knowledge diagnostics
* Knowledge events
* Observability integration

---

## 45.3 Minimum Reference Implementations

Cursor may create lightweight in-memory reference implementations for testing:

* In-memory Knowledge Connector
* Plain-text parser
* Fixed-size chunking strategy
* In-memory keyword index
* In-memory retrieval provider
* Deterministic ranking strategy

These reference implementations must remain replaceable and must not become production assumptions.

---

## 45.4 Deferred Responsibilities

Do not implement within Blueprint 10:

* Vendor-specific vector databases
* Enterprise connector libraries
* Prompt construction
* Context Assembly
* Memory persistence
* AI provider SDK integration
* Runtime scheduling
* Security policy engine
* Human-facing search UI
* Production-grade distributed indexing
* Provider-specific query languages

These belong to other blueprints or plugin implementations.

---

# 46. Testing Requirements

The Knowledge Engine must include automated tests covering:

* Source normalization
* Metadata preservation
* Deterministic chunking
* Connector isolation
* Incremental-ingestion behavior
* Index-version handling
* Query normalization
* Retrieval-strategy selection
* Security trimming
* Cross-tenant isolation
* Deduplication
* Ranking determinism
* Empty results
* Partial results
* Error normalization
* Provider-model isolation
* Citation traceability
* Serialization of public contracts
* Cancellation cooperation
* Observability and event publication

Contract tests should verify that connectors, index providers, and retrieval providers cannot leak implementation-specific models outside the Knowledge Engine.

---

# 47. Acceptance Criteria

Blueprint 10 is considered complete when:

* Knowledge Sources are accessed only through Knowledge Connectors.
* Source-specific records are converted into normalized Raw Knowledge Records.
* Raw records can be normalized into Knowledge Documents.
* Knowledge Documents can be deterministically divided into Knowledge Chunks.
* Metadata, ownership, source references, and security labels are preserved throughout processing.
* AI-assisted enrichment uses Capability Resolution and the AI Provider Framework.
* Index providers remain replaceable and storage-independent.
* Index versions and processing versions are tracked.
* Retrieval requests remain provider-independent and security-scoped.
* Multiple retrieval-strategy categories can be supported through contracts.
* Unauthorized candidates are removed before public results are produced.
* Ranking and reranking remain independent of concrete AI providers.
* Every successful retrieval produces an immutable Knowledge Retrieval Result.
* Empty and partial results are explicitly represented.
* Technology-specific failures are converted into normalized Knowledge Errors.
* Knowledge operations produce events, metrics, traces, diagnostics, and health information.
* No prompt-building or Context Assembly behavior exists inside the Knowledge Engine.

---

# 48. Ownership Boundaries

## This Blueprint Owns

* Knowledge Source abstraction
* Knowledge Connector contracts
* Knowledge ingestion semantics
* Document normalization
* Metadata preservation
* Chunking
* Knowledge enrichment coordination
* Indexing contracts
* Index versioning
* Query processing
* Retrieval strategies
* Metadata filtering
* Security trimming application
* Candidate deduplication
* Ranking and reranking coordination
* Knowledge Retrieval Result
* Knowledge Errors
* Knowledge diagnostics
* Knowledge-domain observability

---

## This Blueprint Does Not Own

* Runtime execution policy
* Capability Resolution
* AI provider implementations
* Tool execution
* Security policy decisions
* Memory
* Context Assembly
* Prompt construction
* Provider-specific storage technologies
* User interfaces
* Workflow planning
* General execution persistence

---

# 49. Chief Architect’s Notes

The Knowledge Engine is intentionally broader than Retrieval-Augmented Generation.

Its purpose is to provide a stable, secure, provider-independent knowledge capability for the entire AgentForge platform. RAG is one consumer of that capability, but search applications, deterministic workflows, evaluation systems, reporting tools, and future modules may use the same Knowledge Engine without involving prompt construction or AI generation.

The engine has two complementary responsibilities:

```text
Knowledge Acquisition
        │
        ▼
Ingestion → Normalization → Chunking → Enrichment → Indexing

Knowledge Consumption
        │
        ▼
Query Processing → Retrieval → Security Trimming
        → Ranking → Knowledge Retrieval Result
```

These responsibilities share a common metadata, security, versioning, and traceability model.

A critical architectural decision is that the Knowledge Engine does not build prompts. It produces normalized, citation-ready knowledge. The Context Assembly Engine later determines which retrieved knowledge should become part of an execution’s context, and the Prompt Builder determines how that context is presented to an AI provider.

Another critical boundary is security. The Security Platform decides access. The Knowledge Engine applies the resulting constraints throughout ingestion, indexing, caching, retrieval, ranking, and result production. No unauthorized content may appear in public results, diagnostics, events, or telemetry.

The final public retrieval artifact is the immutable `Knowledge Retrieval Result`. It protects the rest of AgentForge from vector-store schemas, search-engine hits, graph query results, connector records, and vendor-specific APIs.

---

# Appendix A — Architectural Clarifications

These clarifications strengthen the operational boundaries of the Knowledge Engine without changing its core architecture. They are authoritative for implementation.

---

# A.1 Knowledge Connector & Index Provider Execution-Policy Boundary

Knowledge Connectors and Index Providers are responsible solely for translating normalized Knowledge Engine contracts into source-specific or storage-specific interactions and translating external responses back into normalized Knowledge Engine contracts.

They must never independently determine operational execution policies.

This prohibition includes:

* Retry behavior
* Timeout policies
* Execution scheduling
* Cancellation handling
* Recovery strategies
* Failover behavior
* Concurrency decisions
* Alternative source selection
* Alternative index-provider selection

These responsibilities remain under the Runtime and applicable platform policy frameworks.

External SDKs, database clients, search clients, vector-store clients, and connector libraries that provide built-in retry, timeout, failover, or recovery behavior must be configured so that they do not conflict with AgentForge’s centralized execution policies.

The Knowledge Engine may describe which operation failed and return a normalized Knowledge Error. It must not independently decide whether the operation should be retried, redirected, recovered, or repeated.

This boundary preserves deterministic execution behavior and prevents source-specific or index-specific implementations from bypassing Runtime governance.

---

# A.2 Knowledge Operation Side-Effect & Idempotency Semantics

Knowledge operations may create persistent changes to platform-managed knowledge state.

This applies particularly to:

* Full ingestion
* Incremental ingestion
* Reindexing
* Enrichment
* Index writes
* Deletion synchronization
* Source synchronization
* Checkpoint updates
* Index-version activation
* Knowledge-record replacement

Every Knowledge processing contract must expose sufficient execution semantics to identify whether an operation is:

* Read-only
* State-producing
* Mutating
* Idempotent
* Conditionally idempotent
* Non-idempotent

Ingestion, enrichment, deletion synchronization, and indexing operations should be designed to be idempotent wherever technically possible.

Where applicable, operation identity must incorporate enough stable information to prevent unintended duplicate processing, including:

* Tenant identifier
* Source identifier
* Source-record identifier
* Source-record version
* Document identifier
* Document-processing version
* Chunking-strategy version
* Enrichment version
* Embedding-reference version
* Index-schema version
* Target index version

The Runtime consumes these semantics when deciding whether retry, replay, recovery, or compensation is safe.

The Knowledge Engine, Knowledge Connectors, and Index Providers must never independently retry an operation whose declared semantics do not permit safe repetition.

A timeout or incomplete response must not automatically be interpreted as proof that an external mutation did not occur.

Implementations must therefore support detection of already-completed or partially completed operations where technically possible.

This boundary prevents Runtime recovery policies from unintentionally creating:

* Duplicate documents
* Duplicate chunks
* Duplicate embeddings
* Duplicate index records
* Repeated deletions
* Conflicting source checkpoints
* Inconsistent index versions

---

# Chief Architect Amendment

The Knowledge Engine owns knowledge-processing semantics, while the Runtime owns operational execution policy.

Knowledge Connectors and Index Providers translate technology-specific interactions but must not introduce hidden retries, failover, scheduling, or recovery behavior.

Because ingestion and indexing modify persistent knowledge state, their side-effect and idempotency semantics must be explicit. The Runtime can make safe retry and recovery decisions only when those semantics are available through normalized contracts.

These rules are mandatory for all present and future Knowledge Connectors, indexing implementations, retrieval providers, and plugin-contributed knowledge extensions.



