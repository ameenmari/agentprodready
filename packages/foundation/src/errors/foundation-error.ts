export type FoundationErrorCode =
  | 'FOUNDATION_INVALID_ARGUMENT'
  | 'FOUNDATION_DUPLICATE_REGISTRATION'
  | 'FOUNDATION_MISSING_DEPENDENCY'
  | 'FOUNDATION_DEPENDENCY_CYCLE'
  | 'FOUNDATION_STARTUP_FAILED'
  | 'FOUNDATION_NOT_READY'
  | 'FOUNDATION_CAPABILITY_NOT_FOUND';

export class FoundationError extends Error {
  public constructor(
    public readonly code: FoundationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'FoundationError';
  }
}
