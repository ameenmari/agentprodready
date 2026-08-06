import type { CapabilityBinding } from '@agentforge/capability-resolution';
import type { ExecutionContext,HealthResult } from '@agentforge/foundation';

export type AiRole='system'|'user'|'assistant'|'tool';
export type AiContentPart={readonly type:'text';readonly text:string}|{readonly type:'image';readonly mediaType:string;readonly dataReference:string}|{readonly type:'audio';readonly mediaType:string;readonly dataReference:string};
export interface AiMessage {readonly role:AiRole;readonly content:readonly AiContentPart[];readonly name?:string;readonly toolCallId?:string;}
export interface GenerationRequirements {readonly maximumOutputTokens?:number;readonly temperature?:number;readonly topP?:number;readonly stop?:readonly string[];}
export interface StructuredOutputRequirements {readonly name:string;readonly schema:Readonly<Record<string,unknown>>;readonly strict:boolean;}
export interface AiToolDefinition {readonly name:string;readonly description:string;readonly inputSchema:Readonly<Record<string,unknown>>;}
export interface StreamingRequirements {readonly enabled:boolean;readonly includeUsage:boolean;}
export interface AiExecutionRequest {readonly requestId:string;readonly binding:CapabilityBinding;readonly context:ExecutionContext;readonly messages:readonly AiMessage[];readonly generation:GenerationRequirements;readonly structuredOutput?:StructuredOutputRequirements;readonly tools?:readonly AiToolDefinition[];readonly streaming?:StreamingRequirements;readonly metadata:Readonly<Record<string,string>>;readonly constraints:Readonly<Record<string,string|number|boolean>>;}
export type AiFinishReason='completed'|'length'|'tool-calls'|'content-filtered'|'stopped'|'unknown';
export interface NormalizedToolCall {readonly id:string;readonly name:string;readonly arguments:Readonly<Record<string,unknown>>;}
export interface AiUsage {readonly inputTokens:number;readonly outputTokens:number;readonly totalTokens:number;}
export interface AiModelMetadata {readonly id:string;readonly version?:string;readonly capabilities:readonly string[];readonly contextLimit?:number;}
export interface NormalizedAiResult {readonly requestId:string;readonly content:readonly AiContentPart[];readonly usage:AiUsage;readonly model:AiModelMetadata;readonly finishReason:AiFinishReason;readonly structuredOutput?:unknown;readonly toolCalls:readonly NormalizedToolCall[];readonly diagnosticId:string;readonly metadata:Readonly<Record<string,string>>;}
export type NormalizedAiStreamEvent={readonly type:'content';readonly sequence:number;readonly part:AiContentPart}|{readonly type:'tool-call';readonly sequence:number;readonly call:NormalizedToolCall}|{readonly type:'usage';readonly sequence:number;readonly usage:AiUsage}|{readonly type:'completed';readonly sequence:number;readonly finishReason:AiFinishReason;readonly diagnosticId:string};
export type AiErrorCode='AI_AUTHENTICATION'|'AI_RATE_LIMITED'|'AI_CONTEXT_LIMIT'|'AI_INVALID_REQUEST'|'AI_UNAVAILABLE'|'AI_PROVIDER_TIMEOUT'|'AI_UNKNOWN';
export interface AdapterFailure {readonly kind:'authentication'|'rate-limit'|'context-limit'|'invalid-request'|'unavailable'|'timeout'|'unknown';readonly message:string;readonly retryable:boolean;readonly providerDiagnosticCode?:string;}
export interface AiProviderAdapter {readonly id:string;execute(request:AiExecutionRequest):Promise<NormalizedAiResult>;stream(request:AiExecutionRequest):AsyncIterable<NormalizedAiStreamEvent>;health():Promise<HealthResult>;}
/** Composition-owned resolution boundary: resolves the already-selected binding to an adapter instance. */
export interface AiAdapterResolver {resolve(binding:CapabilityBinding):Promise<AiProviderAdapter>;}
export interface AiDiagnostic {readonly id:string;readonly requestId:string;readonly adapterId:string;readonly outcome:'completed'|'failed';readonly errorCode?:AiErrorCode;readonly finishReason?:AiFinishReason;}
export interface AiDiagnostics {record(value:AiDiagnostic):void;get(id:string):AiDiagnostic|undefined;list():readonly AiDiagnostic[];}
export interface AiFact {readonly type:'ai.completed'|'ai.failed'|'ai.stream.completed';readonly requestId:string;readonly executionId:string;readonly diagnosticId:string;}
export interface AiEventPublisher {publish(fact:AiFact):Promise<void>;}
export interface AiTelemetry {completed(adapterId:string,durationMs:number,usage:AiUsage):void;failed(adapterId:string,code:AiErrorCode,durationMs:number):void;streamed(adapterId:string,eventCount:number):void;}
