export type RuntimeErrorCode='RUNTIME_INVALID_TRANSITION'|'RUNTIME_UNAUTHORIZED'|'RUNTIME_CANCELLED'|'RUNTIME_TIMEOUT'|'RUNTIME_CONCURRENCY_LIMIT'|'RUNTIME_EXECUTION_FAILED'|'RUNTIME_STREAM_UNSUPPORTED';
export class RuntimeError extends Error { public constructor(public readonly code:RuntimeErrorCode,message:string,options?:ErrorOptions){super(message,options);this.name='RuntimeError';} }
