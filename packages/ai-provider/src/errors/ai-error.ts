import type { AiErrorCode } from '../contracts/ai.js';
export class NormalizedAiError extends Error {public constructor(public readonly code:AiErrorCode,message:string,public readonly retryable:boolean,public readonly diagnosticId:string){super(message);this.name='NormalizedAiError';}}
export class ProviderAdapterError extends Error {public constructor(public readonly kind:'authentication'|'rate-limit'|'context-limit'|'invalid-request'|'unavailable'|'timeout'|'unknown',message:string,public readonly retryable:boolean){super(message);this.name='ProviderAdapterError';}}
