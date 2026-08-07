export type MemoryErrorCode =
  | 'MEMORY_VALIDATION'
  | 'MEMORY_DUPLICATE'
  | 'MEMORY_VERSION_CONFLICT'
  | 'MEMORY_STORAGE_UNAVAILABLE'
  | 'MEMORY_RETRIEVAL_FAILURE'
  | 'MEMORY_INDEX_UNAVAILABLE'
  | 'MEMORY_CONSOLIDATION_FAILURE'
  | 'MEMORY_ENRICHMENT_FAILURE'
  | 'MEMORY_SERIALIZATION_FAILURE'
  | 'MEMORY_RETENTION_FAILURE'
  | 'MEMORY_ARCHIVE_FAILURE'
  | 'MEMORY_DELETION_FAILURE'
  | 'MEMORY_THROTTLED'
  | 'MEMORY_TIMEOUT'
  | 'MEMORY_UNAVAILABLE'
  | 'MEMORY_UNKNOWN';

export class ExternalMemoryError extends Error {
  public constructor(
    public readonly kind:
      | 'duplicate'
      | 'version-conflict'
      | 'storage-unavailable'
      | 'retrieval-failure'
      | 'index-unavailable'
      | 'consolidation-failure'
      | 'enrichment-failure'
      | 'serialization-failure'
      | 'retention-failure'
      | 'archive-failure'
      | 'deletion-failure'
      | 'throttled'
      | 'timeout'
      | 'unavailable'
      | 'unknown',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ExternalMemoryError';
  }
}

export class NormalizedMemoryError extends Error {
  public constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    public readonly diagnosticId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'NormalizedMemoryError';
  }
}
