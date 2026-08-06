import type { ResolutionDiagnostic } from '../contracts/capability.js';
export type ResolutionErrorCode='RESOLUTION_INVALID_REQUEST'|'RESOLUTION_UNKNOWN_CAPABILITY'|'RESOLUTION_NO_IMPLEMENTATION'|'RESOLUTION_INCOMPATIBLE_VERSION'|'RESOLUTION_CONFIGURED_IMPLEMENTATION_INVALID';
export class ResolutionError extends Error {public constructor(public readonly code:ResolutionErrorCode,message:string,public readonly diagnostic:ResolutionDiagnostic){super(message);this.name='ResolutionError';}}
