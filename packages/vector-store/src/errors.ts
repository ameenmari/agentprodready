export type VectorStoreErrorCode =
  | 'VECTOR_INVALID_REQUEST'
  | 'VECTOR_DIMENSION_MISMATCH'
  | 'VECTOR_MODEL_MISMATCH'
  | 'VECTOR_METRIC_MISMATCH'
  | 'VECTOR_UNAVAILABLE'
  | 'VECTOR_UNKNOWN';

export class VectorStoreError extends Error {
  public constructor(
    public readonly code: VectorStoreErrorCode,
    message: string,
    public readonly diagnosticId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'VectorStoreError';
  }
}
