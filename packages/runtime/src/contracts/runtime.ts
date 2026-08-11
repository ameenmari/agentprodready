import type { CreateExecutionContextRequest, ExecutionContext, HealthResult } from '@agentprodready/foundation';
import type { ExecutionScopeFactory } from '@agentprodready/composition';

export type ExecutionState =
  | 'created'
  | 'initializing'
  | 'planning'
  | 'executing'
  | 'waiting'
  | 'recovering'
  | 'cancelling'
  | 'completing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ExecutionStage =
  | 'accepted'
  | 'post-planning'
  | 'post-workflow'
  | 'pre-invoke'
  | 'post-invoke'
  | 'terminal';

/** JSON-serializable CapabilityInvocationPort.invoke result (= RuntimeResult.output). */
export type CapabilityInvocationResult = unknown;

export interface RecoveryPolicyBundle {
  readonly onRestart: 'resume-immediately' | 'resume-if-safe' | 'manual-recovery';
  readonly failIfExpired: boolean;
  readonly failIfCancelled: boolean;
}

export interface RuntimeRequest<T = unknown> {
  readonly context: CreateExecutionContextRequest;
  readonly input: T;
  readonly signal?: AbortSignal;
}

export interface StateTransition {
  readonly state: ExecutionState;
  readonly occurredAt: string;
}

export interface RuntimeResult<T = unknown> {
  readonly executionId: string;
  readonly state: 'completed';
  readonly output: T;
  readonly attempts: number;
  readonly history: readonly StateTransition[];
}

export interface RuntimePolicy {
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly maxConcurrency: number;
  isRetryable(error: unknown): boolean;
  readonly recovery?: RecoveryPolicyBundle;
}

export interface RuntimePolicyProvider {
  get(context: ExecutionContext): RuntimePolicy | Promise<RuntimePolicy>;
}

export interface PlanningPort {
  plan(input: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>;
}

export interface WorkflowPort {
  execute(plan: unknown, context: ExecutionContext, signal: AbortSignal): Promise<unknown>;
}

export type RuntimeStreamUsage = Readonly<{
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}>;

/** Structural mirror of NormalizedToolCall — provider-neutral; no vendor SDK types. */
export type CheckpointNormalizedToolCall = Readonly<{
  id: string;
  name: string;
  arguments: Readonly<Record<string, unknown>>;
}>;

export type ToolLoopCallStage = 'pre-tool' | 'post-tool' | 'awaiting-approval';

export type ToolLoopCallCheckpoint = Readonly<{
  turn: number;
  toolCall: CheckpointNormalizedToolCall;
  toolId: string;
  sideEffect: 'read-only' | 'mutating' | 'external-side-effect';
  idempotency: 'idempotent' | 'non-idempotent';
  idempotencyKey: string;
  stage: ToolLoopCallStage;
  /** Human Interaction id when stage is awaiting-approval (Amendment D). */
  approvalId?: string;
  result?: unknown;
}>;

export type ToolLoopCheckpoint = Readonly<{
  turn: number;
  maxTurns: number;
  baseMessages: unknown;
  proposedCalls: readonly CheckpointNormalizedToolCall[];
  calls: readonly ToolLoopCallCheckpoint[];
}>;

export type CapabilityStreamEvent =
  | Readonly<{ type: 'delta'; sequence: number; payload: Readonly<{ kind: 'text'; text: string }> }>
  | Readonly<{
      type: 'delta';
      sequence: number;
      payload: Readonly<{
        kind: 'tool_call' | 'tool_result';
        toolCallId: string;
        toolId: string;
        status: string;
        errorCode?: string;
      }>;
    }>
  | Readonly<{ type: 'usage'; sequence: number; usage: RuntimeStreamUsage }>
  | Readonly<{ type: 'final'; sequence: number; result: unknown }>;

/** Mid-invoke tool-loop persistence owned by Runtime. */
export interface CapabilityExecutionControl {
  persistToolLoop(toolLoop: ToolLoopCheckpoint): Promise<void>;
  loadToolLoop(): Promise<ToolLoopCheckpoint | undefined>;
}

export interface CapabilityInvocationPort {
  invoke(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
  ): Promise<unknown>;
  stream?(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
  ): AsyncIterable<CapabilityStreamEvent>;
}

export type RuntimeFailedResult = Readonly<{
  executionId: string;
  state: 'failed';
  error: Readonly<{ code: string; message: string }>;
  attempts: number;
  history: readonly StateTransition[];
}>;

export type RuntimeCancelledResult = Readonly<{
  executionId: string;
  state: 'cancelled';
  error: Readonly<{ code: string; message: string }>;
  attempts: number;
  history: readonly StateTransition[];
}>;

export type RuntimeStreamEvent<T = unknown> =
  | Readonly<{
      type: 'delta';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      payload: Readonly<
        | { kind: 'text'; text: string }
        | { kind: 'usage'; usage: RuntimeStreamUsage }
        | {
            kind: 'tool_call' | 'tool_result';
            toolCallId: string;
            toolId: string;
            status: string;
            errorCode?: string;
          }
      >;
    }>
  | Readonly<{
      type: 'completed';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeResult<T>;
      terminal: true;
    }>
  | Readonly<{
      type: 'failed';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeFailedResult;
      terminal: true;
    }>
  | Readonly<{
      type: 'cancelled';
      sequence: number;
      executionId: string;
      correlationId: string;
      occurredAt: string;
      result: RuntimeCancelledResult;
      terminal: true;
    }>;

export interface SecurityAuthorizationPort {
  authorize(context: ExecutionContext): Promise<{ readonly authorized: boolean; readonly decisionId: string }>;
}

export interface RuntimeFact {
  readonly type: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly state: ExecutionState;
}

export interface RuntimeEventPublisher {
  publish(fact: RuntimeFact): Promise<void>;
}

export interface RuntimeTelemetry {
  transition(fact: RuntimeFact): void;
  completed(executionId: string, durationMs: number, attempts: number): void;
  failed(executionId: string, code: string, durationMs: number): void;
  recovery?(
    kind: 'started' | 'resumed' | 'completed' | 'failed' | 'deferred' | 'unsafe_fail',
    executionId: string,
  ): void;
}

export interface ExecutionCheckpoint {
  readonly executionId: string;
  readonly state: ExecutionState;
  readonly stage: ExecutionStage;
  readonly history: readonly StateTransition[];
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly startedAt: string;
  readonly deadlineAt: string;
  readonly timeoutMs: number;
  readonly cancelled: boolean;
  readonly cancellationReason?: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly tenantId: string;
  readonly workspaceId?: string;
  readonly projectId?: string;
  readonly input: unknown;
  readonly contextRequest: CreateExecutionContextRequest;
  readonly plan?: unknown;
  readonly workflowWork?: unknown;
  readonly capabilityResult?: CapabilityInvocationResult;
  /** Durable AI↔Tool loop state (Amendment C). Never vendor SDK types. */
  readonly toolLoop?: ToolLoopCheckpoint;
  readonly recoveryPolicy: RecoveryPolicyBundle;
  readonly terminal: boolean;
  readonly checkpointVersion: 1;
  readonly updatedAt: string;
  /** Opaque concurrency token for Persistence OCC adapters (optional for in-memory). */
  readonly concurrencyToken?: string;
  readonly concurrencyRevision?: number;
}

export interface ExecutionCheckpointPort {
  store(checkpoint: ExecutionCheckpoint): Promise<void>;
  load(executionId: string): Promise<ExecutionCheckpoint | undefined>;
  listIncomplete(options?: { readonly limit?: number }): Promise<readonly ExecutionCheckpoint[]>;
}

export interface RecoverIncompleteRequest {
  readonly now?: Date;
  readonly limit?: number;
}

export type RecoverOutcomeKind =
  | 'resumed-completed'
  | 'failed'
  | 'cancelled'
  | 'deferred'
  | 'ignored-terminal'
  | 'occ-lost';

export interface RecoverOutcome {
  readonly executionId: string;
  readonly kind: RecoverOutcomeKind;
  readonly detail?: string;
}

export interface RecoverIncompleteResult {
  readonly examined: number;
  readonly resumed: number;
  readonly failed: number;
  readonly deferred: number;
  readonly outcomes: readonly RecoverOutcome[];
}

export interface RuntimeDependencies {
  readonly scopes: ExecutionScopeFactory;
  readonly policies: RuntimePolicyProvider;
  readonly planning: PlanningPort;
  readonly workflow: WorkflowPort;
  readonly capabilities: CapabilityInvocationPort;
  readonly security: SecurityAuthorizationPort;
  readonly events: RuntimeEventPublisher;
  readonly telemetry: RuntimeTelemetry;
  readonly checkpoints: ExecutionCheckpointPort;
  readonly now?: () => Date;
}

export interface RuntimeDiagnostics {
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly recoveryStarted: number;
  readonly recoveryResumed: number;
  readonly recoveryCompleted: number;
  readonly recoveryFailed: number;
  readonly recoveryDeferred: number;
  readonly recoveryUnsafeFail: number;
}

export interface RuntimeHealth {
  health(): Promise<HealthResult>;
}

export const DEFAULT_RECOVERY_POLICY: RecoveryPolicyBundle = Object.freeze({
  onRestart: 'resume-if-safe',
  failIfExpired: true,
  failIfCancelled: true,
});
