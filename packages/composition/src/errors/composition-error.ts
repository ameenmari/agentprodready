export type CompositionErrorCode =
  | 'COMPOSITION_DUPLICATE_REGISTRATION'
  | 'COMPOSITION_MISSING_DEPENDENCY'
  | 'COMPOSITION_DEPENDENCY_CYCLE'
  | 'COMPOSITION_INVALID_LIFETIME'
  | 'COMPOSITION_SCOPE_REQUIRED'
  | 'COMPOSITION_ROOT_FROZEN'
  | 'COMPOSITION_RESOLUTION_FAILED'
  | 'COMPOSITION_INVALID_DECORATOR'
  | 'COMPOSITION_IMPLEMENTATION_NOT_REGISTERED'
  | 'COMPOSITION_DISPOSED';

export class CompositionError extends Error {
  public constructor(public readonly code: CompositionErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CompositionError';
  }
}
