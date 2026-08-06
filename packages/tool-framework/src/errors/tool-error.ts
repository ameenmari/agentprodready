import type { ExternalFailureKind,ToolErrorCode } from '../contracts/tool.js';
export class ExternalToolError extends Error {public constructor(public readonly kind:ExternalFailureKind,message:string,public readonly retryable:boolean){super(message);this.name='ExternalToolError';}}
export class NormalizedToolError extends Error {public constructor(public readonly code:ToolErrorCode,message:string,public readonly retryable:boolean,public readonly diagnosticId:string){super(message);this.name='NormalizedToolError';}}
