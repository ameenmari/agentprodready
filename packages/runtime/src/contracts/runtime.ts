import type { CreateExecutionContextRequest, ExecutionContext, HealthResult } from '@agentforge/foundation';
import type { ExecutionScopeFactory } from '@agentforge/composition';

export type ExecutionState = 'created'|'initializing'|'planning'|'executing'|'waiting'|'recovering'|'cancelling'|'completing'|'completed'|'failed'|'cancelled';
export interface RuntimeRequest<T=unknown> { readonly context: CreateExecutionContextRequest; readonly input: T; readonly signal?: AbortSignal; }
export interface StateTransition { readonly state: ExecutionState; readonly occurredAt: string; }
export interface RuntimeResult<T=unknown> { readonly executionId: string; readonly state: 'completed'; readonly output: T; readonly attempts: number; readonly history: readonly StateTransition[]; }
export interface RuntimePolicy { readonly timeoutMs: number; readonly maxAttempts: number; readonly maxConcurrency: number; isRetryable(error: unknown): boolean; }
export interface RuntimePolicyProvider { get(context: ExecutionContext): RuntimePolicy|Promise<RuntimePolicy>; }
export interface PlanningPort { plan(input: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>; }
export interface WorkflowPort { execute(plan: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>; }
export interface CapabilityInvocationPort { invoke(work: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>; }
export interface SecurityAuthorizationPort { authorize(context: ExecutionContext): Promise<{readonly authorized:boolean; readonly decisionId:string}>; }
export interface RuntimeFact { readonly type:string; readonly executionId:string; readonly correlationId:string; readonly occurredAt:string; readonly state:ExecutionState; }
export interface RuntimeEventPublisher { publish(fact: RuntimeFact): Promise<void>; }
export interface RuntimeTelemetry { transition(fact: RuntimeFact): void; completed(executionId:string,durationMs:number,attempts:number):void; failed(executionId:string,code:string,durationMs:number):void; }
export interface ExecutionSnapshotPort { store(executionId:string, history:readonly StateTransition[]):Promise<void>; }
export interface RuntimeDependencies { readonly scopes:ExecutionScopeFactory; readonly policies:RuntimePolicyProvider; readonly planning:PlanningPort; readonly workflow:WorkflowPort; readonly capabilities:CapabilityInvocationPort; readonly security:SecurityAuthorizationPort; readonly events:RuntimeEventPublisher; readonly telemetry:RuntimeTelemetry; readonly snapshots:ExecutionSnapshotPort; readonly now?:()=>Date; }
export interface RuntimeDiagnostics { readonly active:number; readonly completed:number; readonly failed:number; readonly cancelled:number; }
export interface RuntimeHealth { health():Promise<HealthResult>; }
