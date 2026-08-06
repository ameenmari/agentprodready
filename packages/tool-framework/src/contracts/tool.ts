import type { CapabilityBinding } from '@agentforge/capability-resolution';
import type { ExecutionContext,HealthResult } from '@agentforge/foundation';
import type { NodeExecutionContract } from '@agentforge/workflow';

export type ToolSideEffect='read-only'|'mutating'|'external-side-effect';
export type ToolIdempotency='idempotent'|'non-idempotent';
export interface ToolContract {readonly id:string;readonly capability:string;readonly version:string;readonly inputSchema:Readonly<Record<string,unknown>>;readonly outputSchema:Readonly<Record<string,unknown>>;readonly sideEffect:ToolSideEffect;readonly idempotency:ToolIdempotency;readonly metadata:Readonly<Record<string,string>>;readonly pluginId:string;readonly contributionId:string;}
export interface AuthorizationFact {readonly authorized:true;readonly decisionId:string;}
export interface ToolExecutionRequest {readonly requestId:string;readonly binding:CapabilityBinding;readonly node:NodeExecutionContract;readonly context:ExecutionContext;readonly parameters:Readonly<Record<string,unknown>>;readonly authorization:AuthorizationFact;readonly idempotencyKey?:string;readonly metadata:Readonly<Record<string,string>>;readonly validation:Readonly<{schemaVersion:string}>;readonly constraints:Readonly<Record<string,string|number|boolean>>;}
export interface ToolValidationResult {readonly valid:true;readonly contractId:string;readonly contractVersion:string;readonly checkedFields:readonly string[];}
export interface NormalizedToolResult {readonly requestId:string;readonly status:'completed';readonly data:unknown;readonly tool:Readonly<{id:string;version:string;sideEffect:ToolSideEffect;idempotency:ToolIdempotency}>;readonly execution:Readonly<{executionId:string;correlationId:string;idempotencyKey?:string}>;readonly validation:ToolValidationResult;readonly diagnosticId:string;readonly metadata:Readonly<Record<string,string>>;}
export type ToolErrorCode='TOOL_AUTHENTICATION'|'TOOL_AUTHORIZATION'|'TOOL_VALIDATION'|'TOOL_RATE_LIMITED'|'TOOL_CONNECTION'|'TOOL_UNAVAILABLE'|'TOOL_NOT_FOUND'|'TOOL_CONFLICT'|'TOOL_TIMEOUT'|'TOOL_REJECTED'|'TOOL_UNKNOWN';
export type ExternalFailureKind='authentication'|'authorization'|'validation'|'rate-limit'|'connection'|'unavailable'|'not-found'|'conflict'|'timeout'|'rejected'|'unknown';
export interface ToolAdapter {readonly id:string;invoke(request:ToolExecutionRequest):Promise<NormalizedToolResult>;health():Promise<HealthResult>;}
/** Composition-owned resolver for an already-selected binding. */
export interface ToolAdapterResolver {resolve(binding:CapabilityBinding):Promise<ToolAdapter>;}
export interface ToolStore {register(contract:ToolContract):void;get(id:string):ToolContract|undefined;forCapability(capability:string):readonly ToolContract[];list():readonly ToolContract[];}
export interface ToolDiagnostic {readonly id:string;readonly requestId:string;readonly toolId:string;readonly outcome:'completed'|'failed';readonly errorCode?:ToolErrorCode;}
export interface ToolDiagnostics {record(value:ToolDiagnostic):void;get(id:string):ToolDiagnostic|undefined;list():readonly ToolDiagnostic[];}
export interface ToolFact {readonly type:'tool.completed'|'tool.failed';readonly requestId:string;readonly executionId:string;readonly diagnosticId:string;readonly sideEffect:ToolSideEffect;readonly idempotency:ToolIdempotency;}
export interface ToolEventPublisher {publish(value:ToolFact):Promise<void>;}
export interface ToolTelemetry {completed(toolId:string,durationMs:number):void;failed(toolId:string,code:ToolErrorCode,durationMs:number):void;}
